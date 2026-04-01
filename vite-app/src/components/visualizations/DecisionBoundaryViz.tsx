import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface Point {
  x: number;
  y: number;
  cls: 0 | 1;
}

function generateClusters(): Point[] {
  const rng = seededRandom(123);
  const pts: Point[] = [];
  // Cluster 0 centered at (3, 4)
  for (let i = 0; i < 25; i++) {
    pts.push({
      x: 3 + (rng() - 0.5) * 3,
      y: 4 + (rng() - 0.5) * 3,
      cls: 0,
    });
  }
  // Cluster 1 centered at (7, 6)
  for (let i = 0; i < 25; i++) {
    pts.push({
      x: 7 + (rng() - 0.5) * 3,
      y: 6 + (rng() - 0.5) * 3,
      cls: 1,
    });
  }
  return pts;
}

// Simplified RBF-SVM boundary simulation
// As C increases, boundary wraps more tightly around points
function classifyPoint(px: number, py: number, points: Point[], gamma: number): number {
  let score = 0;
  for (const p of points) {
    const dist2 = (px - p.x) ** 2 + (py - p.y) ** 2;
    const k = Math.exp(-gamma * dist2);
    score += (p.cls === 1 ? 1 : -1) * k;
  }
  return score;
}

const W = 800;
const H = 450;
const PAD = { top: 40, right: 30, bottom: 60, left: 50 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const GRID_RES = 40; // resolution of boundary grid
const MAX_STEPS = 40;

interface Props {
  architecture?: ModelArchitecture;
}

export default function DecisionBoundaryViz({ architecture }: Props) {
  const points = useMemo(() => generateClusters(), []);
  const xMin = 0, xMax = 10, yMin = 0, yMax = 10;

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const sy = (y: number) => PAD.top + ((yMax - y) / (yMax - yMin)) * PLOT_H;

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  // C goes from 0.1 to 100 exponentially
  const cValue = useMemo(() => {
    const t = step / MAX_STEPS;
    return 0.1 * Math.pow(1000, t);
  }, [step]);

  const gamma = useMemo(() => {
    // gamma increases with C for visual effect
    return 0.05 + (cValue / 100) * 0.8;
  }, [cValue]);

  // Compute grid classification
  const gridCells = useMemo(() => {
    const cells: { x: number; y: number; w: number; h: number; score: number }[] = [];
    const dx = (xMax - xMin) / GRID_RES;
    const dy = (yMax - yMin) / GRID_RES;
    for (let i = 0; i < GRID_RES; i++) {
      for (let j = 0; j < GRID_RES; j++) {
        const cx = xMin + (i + 0.5) * dx;
        const cy = yMin + (j + 0.5) * dy;
        const score = classifyPoint(cx, cy, points, gamma);
        cells.push({
          x: sx(xMin + i * dx),
          y: sy(yMin + (j + 1) * dy),
          w: (PLOT_W / GRID_RES) + 0.5,
          h: (PLOT_H / GRID_RES) + 0.5,
          score,
        });
      }
    }
    return cells;
  }, [points, gamma]);

  // Find support vectors (points near decision boundary)
  const supportVectors = useMemo(() => {
    return points.filter(p => {
      const score = classifyPoint(p.x, p.y, points, gamma);
      return Math.abs(score) < 0.5;
    });
  }, [points, gamma]);

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 250 / speed) {
      lastTimeRef.current = time;
      setStep(s => {
        if (s >= MAX_STEPS) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [speed]);

  useEffect(() => {
    if (playing) {
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, animate]);

  const archTitle = useMemo(() => {
    if (!architecture) return 'SVM';
    const p = architecture.params;
    if (architecture.archType === 'kernel-method') {
      const c = p?.C ?? '';
      const g = p?.gamma ?? '';
      return `SVM RBF${c ? ` (C=${c}` : ''}${g ? `, \u03B3=${g})` : c ? ')' : ''}`;
    }
    if (architecture.archType === 'tree-ensemble') {
      const n = p?.n_estimators ?? '';
      const d = p?.max_depth ?? '';
      return `Random Forest${n ? ` (n_estimators=${n}` : ''}${d ? `, max_depth=${d})` : n ? ')' : ''}`;
    }
    return architecture.title || 'SVM';
  }, [architecture]);

  const stepText = step === 0
    ? `点击播放, 观察 ${archTitle} 决策边界变化`
    : step >= MAX_STEPS
    ? `完成! C = ${cValue.toFixed(1)}, 高复杂度边界`
    : `C = ${cValue.toFixed(2)} | gamma = ${gamma.toFixed(3)} | 支持向量: ${supportVectors.length}`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          {archTitle} 决策边界可视化
        </h3>
        <span className="font-mono text-xs text-text-tertiary">C = {cValue.toFixed(2)}</span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Background grid classification */}
          {gridCells.map((cell, i) => {
            const alpha = Math.min(Math.abs(cell.score) * 0.3, 0.35);
            const color = cell.score > 0
              ? `rgba(239, 68, 68, ${alpha})`
              : `rgba(59, 130, 246, ${alpha})`;
            return (
              <rect key={i} x={cell.x} y={cell.y} width={cell.w} height={cell.h}
                fill={color} />
            );
          })}

          {/* Axes */}
          <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Support vectors (highlighted rings) */}
          {supportVectors.map((p, i) => (
            <circle key={`sv-${i}`} cx={sx(p.x)} cy={sy(p.y)} r="10"
              fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.7" />
          ))}

          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="5"
              fill={p.cls === 0 ? '#3B82F6' : '#EF4444'}
              stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          ))}

          {/* Legend */}
          <circle cx={W - 160} cy={18} r="5" fill="#3B82F6" />
          <text x={W - 150} y={22} fill="#8C909F" fontSize="11" fontFamily="var(--font-body)">Class 0</text>
          <circle cx={W - 100} cy={18} r="5" fill="#EF4444" />
          <text x={W - 90} y={22} fill="#8C909F" fontSize="11" fontFamily="var(--font-body)">Class 1</text>
          <circle cx={W - 160} cy={36} r="6" fill="none" stroke="#F59E0B" strokeWidth="2" />
          <text x={W - 150} y={40} fill="#8C909F" fontSize="11" fontFamily="var(--font-body)">Support Vector</text>
        </svg>
      </div>

      <div className="px-6 py-3 border-t border-border-subtle flex items-center gap-4 flex-wrap">
        <button onClick={() => setPlaying(!playing)}
          className="w-8 h-8 rounded-full bg-accent-blue/20 hover:bg-accent-blue/30 flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-accent-blue text-lg">
            {playing ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button onClick={() => { setPlaying(false); setStep(0); }}
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
