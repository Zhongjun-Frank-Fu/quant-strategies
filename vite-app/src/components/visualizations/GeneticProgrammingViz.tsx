import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

const W = 800;
const H = 450;
const MAX_GEN = 30;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface TreeNode {
  id: number;
  label: string;
  children: TreeNode[];
  x: number;
  y: number;
  mutating?: boolean;
}

const OPS = ['+', '-', '*', '/', 'SMA', 'std', 'max', 'min', 'abs', 'log'];
const TERMS = ['close', 'open', 'high', 'low', 'volume', 'ret_5', 'ret_20', 'vwap'];

function makeTree(rng: () => number, depth: number, idRef: { v: number }): TreeNode {
  if (depth <= 0 || rng() < 0.3) {
    const label = TERMS[Math.floor(rng() * TERMS.length)];
    return { id: idRef.v++, label, children: [], x: 0, y: 0 };
  }
  const op = OPS[Math.floor(rng() * OPS.length)];
  const nChildren = op === 'SMA' || op === 'std' ? 2 : (rng() < 0.5 ? 2 : 1);
  const children: TreeNode[] = [];
  for (let i = 0; i < nChildren; i++) {
    children.push(makeTree(rng, depth - 1, idRef));
  }
  // For SMA/std, second child is a number
  if ((op === 'SMA' || op === 'std') && children.length >= 2) {
    children[1] = { id: idRef.v++, label: String(Math.floor(rng() * 20 + 5)), children: [], x: 0, y: 0 };
  }
  return { id: idRef.v++, label: op, children, x: 0, y: 0 };
}

function layoutTree(node: TreeNode, x: number, y: number, spread: number): void {
  node.x = x;
  node.y = y;
  const n = node.children.length;
  if (n === 0) return;
  const totalW = (n - 1) * spread;
  const startX = x - totalW / 2;
  node.children.forEach((child, i) => {
    const cx = n === 1 ? x : startX + i * spread;
    layoutTree(child, cx, y + 70, spread * 0.55);
  });
}

function flattenNodes(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenNodes(child));
  }
  return result;
}

function flattenEdges(node: TreeNode): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const child of node.children) {
    edges.push({ x1: node.x, y1: node.y, x2: child.x, y2: child.y });
    edges.push(...flattenEdges(child));
  }
  return edges;
}

function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    mutating: false,
    children: node.children.map(c => cloneTree(c)),
  };
}

function mutateRandom(node: TreeNode, rng: () => number): TreeNode {
  const nodes = flattenNodes(node);
  const target = nodes[Math.floor(rng() * nodes.length)];
  // Mutate the label
  if (target.children.length === 0) {
    target.label = TERMS[Math.floor(rng() * TERMS.length)];
  } else {
    target.label = OPS[Math.floor(rng() * OPS.length)];
  }
  target.mutating = true;
  return node;
}

interface Props {
  architecture?: ModelArchitecture;
}

export default function GeneticProgrammingViz({ architecture: _architecture }: Props) {
  const rngRef = useRef(seededRandom(42));
  const [generation, setGeneration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const initialTree = useMemo(() => {
    const rng = seededRandom(42);
    const idRef = { v: 0 };
    const tree = makeTree(rng, 3, idRef);
    layoutTree(tree, 400, 50, 240);
    return tree;
  }, []);

  const [tree, setTree] = useState<TreeNode>(() => cloneTree(initialTree));

  // Fitness improves over generations
  const fitness = useMemo(() => {
    const base = 0.15;
    const target = 2.8;
    const progress = generation / MAX_GEN;
    return base + (target - base) * (1 - Math.exp(-3 * progress));
  }, [generation]);

  const fitnessHistory = useRef<number[]>([0.15]);

  const doMutation = useCallback(() => {
    setTree(prev => {
      const newTree = cloneTree(prev);
      const rng = rngRef.current;
      mutateRandom(newTree, rng);
      layoutTree(newTree, 400, 50, 240);
      return newTree;
    });
  }, []);

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 600 / speed) {
      lastTimeRef.current = time;
      setGeneration(g => {
        if (g >= MAX_GEN) { setPlaying(false); return g; }
        const newG = g + 1;
        const base = 0.15;
        const target = 2.8;
        const progress = newG / MAX_GEN;
        fitnessHistory.current.push(base + (target - base) * (1 - Math.exp(-3 * progress)));
        return newG;
      });
      doMutation();
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [speed, doMutation]);

  useEffect(() => {
    if (playing) {
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, animate]);

  const handleReset = () => {
    setPlaying(false);
    setGeneration(0);
    setTree(cloneTree(initialTree));
    fitnessHistory.current = [0.15];
  };

  const nodes = useMemo(() => flattenNodes(tree), [tree]);
  const edges = useMemo(() => flattenEdges(tree), [tree]);

  // Fitness chart at bottom right
  const FIT_W = 180;
  const FIT_H = 60;
  const FIT_X = W - FIT_W - 30;
  const FIT_Y = H - FIT_H - 30;
  const fMax = 3;
  const fitPath = fitnessHistory.current
    .map((f, i) => `${FIT_X + (i / MAX_GEN) * FIT_W},${FIT_Y + FIT_H - (f / fMax) * FIT_H}`)
    .join(' ');

  const stepText = generation === 0
    ? '点击播放, 观察遗传编程进化 Alpha 因子'
    : generation >= MAX_GEN
    ? `进化完成! 最佳适应度: ${fitness.toFixed(3)}`
    : `第 ${generation} 代 | Fitness (Sharpe): ${fitness.toFixed(3)} | 变异中...`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          遗传编程 Alpha 因子进化
        </h3>
        <span className="font-mono text-xs text-text-tertiary">Gen {generation}/{MAX_GEN}</span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Edges */}
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1 + 14} x2={e.x2} y2={e.y2 - 14}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          ))}

          {/* Nodes */}
          {nodes.map((n) => {
            const isOp = n.children.length > 0;
            const r = isOp ? 22 : 18;
            const fill = n.mutating
              ? 'rgba(245, 158, 11, 0.3)'
              : isOp
              ? 'rgba(139, 92, 246, 0.15)'
              : 'rgba(59, 130, 246, 0.15)';
            const stroke = n.mutating
              ? '#F59E0B'
              : isOp
              ? '#8B5CF6'
              : '#3B82F6';
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={r} fill={fill}
                  stroke={stroke} strokeWidth={n.mutating ? 2.5 : 1.5} />
                {n.mutating && (
                  <circle cx={n.x} cy={n.y} r={r + 4} fill="none"
                    stroke="#F59E0B" strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" values={`${r + 2};${r + 8};${r + 2}`}
                      dur="0.8s" repeatCount="3" />
                    <animate attributeName="opacity" values="0.5;0;0.5"
                      dur="0.8s" repeatCount="3" />
                  </circle>
                )}
                <text x={n.x} y={n.y + 4} fill={n.mutating ? '#F59E0B' : '#DFE2EF'}
                  fontSize={n.label.length > 4 ? 8 : 10}
                  fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* Fitness chart box */}
          <rect x={FIT_X - 5} y={FIT_Y - 20} width={FIT_W + 10} height={FIT_H + 35}
            fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" rx="6" />
          <text x={FIT_X} y={FIT_Y - 6} fill="#8C909F" fontSize="10"
            fontFamily="var(--font-mono)">Fitness (Sharpe)</text>
          {/* Fitness area */}
          <line x1={FIT_X} x2={FIT_X + FIT_W} y1={FIT_Y + FIT_H} y2={FIT_Y + FIT_H}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {fitnessHistory.current.length > 1 && (
            <polyline points={fitPath} fill="none" stroke="#4EDEA3" strokeWidth="2" />
          )}
          <text x={FIT_X + FIT_W} y={FIT_Y + FIT_H + 12} fill="#6B7280" fontSize="9"
            fontFamily="var(--font-mono)" textAnchor="end">{fitness.toFixed(2)}</text>

          {/* Expression label at top */}
          <text x={20} y={H - 15} fill="#6B7280" fontSize="10" fontFamily="var(--font-mono)">
            Expression Tree - 每代通过变异/交叉优化因子结构
          </text>
        </svg>
      </div>

      <div className="px-6 py-3 border-t border-border-subtle flex items-center gap-4 flex-wrap">
        <button onClick={() => setPlaying(!playing)}
          className="w-8 h-8 rounded-full bg-accent-blue/20 hover:bg-accent-blue/30 flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-accent-blue text-lg">
            {playing ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button onClick={handleReset}
          className="w-8 h-8 rounded-full bg-bg-elevated hover:bg-bg-hover flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-text-secondary text-lg">replay</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary text-xs font-mono">Speed</span>
          <input type="range" min="0.5" max="5" step="0.5" value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-20 accent-accent-blue" />
          <span className="text-text-tertiary text-xs font-mono w-8">{speed}x</span>
        </div>
        <p className="text-text-secondary text-xs flex-1 text-right font-mono">{stepText}</p>
      </div>
    </div>
  );
}
