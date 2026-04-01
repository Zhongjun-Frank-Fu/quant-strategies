import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture, ArchLayer, ArchBranch } from '../../types';

const W = 800;
const H = 450;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Color mapping ──────────────────────────────────────────────
function layerColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('lstm') || t.includes('gru') || t.includes('bilstm') || t.includes('bigru')) return '#8B5CF6';
  if (t.includes('conv') || t.includes('cnn')) return '#06B6D4';
  if (t.includes('linear') || t.includes('dense') || t.includes('fc')) return '#3B82F6';
  if (t.includes('dropout')) return '#6B7280';
  if (t.includes('batchnorm') || t.includes('layernorm') || t.includes('norm')) return '#F59E0B';
  if (t.includes('relu') || t.includes('sigmoid') || t.includes('tanh') || t.includes('gelu') || t.includes('activation')) return '#EC4899';
  if (t.includes('pool') || t.includes('maxpool') || t.includes('avgpool')) return '#10B981';
  if (t.includes('attention') || t.includes('multihead')) return '#F97316';
  if (t.includes('embedding') || t.includes('positional')) return '#A855F7';
  if (t.includes('softmax') || t.includes('output')) return '#4EDEA3';
  if (t.includes('flatten') || t.includes('reshape')) return '#94A3B8';
  if (t.includes('concat') || t.includes('merge') || t.includes('add')) return '#FBBF24';
  return '#3B82F6';
}

function layerIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('lstm') || t.includes('gru') || t.includes('bilstm') || t.includes('bigru')) return '\u21BB'; // ↻
  if (t.includes('conv') || t.includes('cnn')) return '\u25A4'; // ▤
  if (t.includes('dropout')) return '\u2022\u2022'; // ••
  if (t.includes('pool') || t.includes('maxpool') || t.includes('avgpool')) return '\u2193'; // ↓
  if (t.includes('relu')) return '\u2215'; // /
  if (t.includes('sigmoid')) return 'S';
  if (t.includes('tanh')) return '~';
  if (t.includes('attention') || t.includes('multihead')) return '\u22C8'; // ⋈
  if (t.includes('softmax')) return '\u03C3'; // σ
  return '';
}

function formatDims(layer: ArchLayer): string {
  const p = layer.params;
  if (!p) return '';
  const parts: string[] = [];
  if (p.input_size !== undefined && p.hidden_size !== undefined) parts.push(`${p.input_size}\u2192${p.hidden_size}`);
  else if (p.in_features !== undefined && p.out_features !== undefined) parts.push(`${p.in_features}\u2192${p.out_features}`);
  else if (p.in_channels !== undefined && p.out_channels !== undefined) {
    parts.push(`${p.in_channels}\u2192${p.out_channels}`);
    if (p.kernel_size !== undefined) parts.push(`k=${p.kernel_size}`);
  }
  if (p.num_layers !== undefined && Number(p.num_layers) > 1) parts.push(`\u00D7${p.num_layers}`);
  if (p.nhead !== undefined) parts.push(`${p.nhead}h`);
  if (p.p !== undefined) parts.push(`p=${p.p}`);
  if (p.bidirectional === true || p.bidirectional === 'true') parts.push('bi');
  return parts.join(', ');
}

// ── Particle type ──────────────────────────────────────────────
interface Particle {
  segIdx: number; // index into the segments array
  progress: number; // 0..1 along this segment
  speed: number;
  branchIdx: number; // which branch (-1 = main)
}

// A segment is a line between two points for particle animation
interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
  branchIdx: number;
  color: string;
}

// ── Layout types ──────────────────────────────────────────────
interface BlockLayout {
  x: number; y: number;
  w: number; h: number;
  label: string;
  dims: string;
  color: string;
  icon: string;
  isDashed: boolean;
  isNorm: boolean;
  branchIdx: number;
}

// ── Fallback layers ──────────────────────────────────────────
const FALLBACK_LAYERS: ArchLayer[] = [
  { type: 'Input', label: 'Input', params: { in_features: 4 } },
  { type: 'Dense', label: 'Hidden 1', params: { in_features: 4, out_features: 8 } },
  { type: 'Dense', label: 'Hidden 2', params: { in_features: 8, out_features: 6 } },
  { type: 'Dense', label: 'Output', params: { in_features: 6, out_features: 1 } },
];

// ── Layout computation ──────────────────────────────────────
function computeSequentialLayout(layers: ArchLayer[]): { blocks: BlockLayout[]; segments: Segment[] } {
  const n = layers.length;
  const margin = 60;
  const availW = W - margin * 2;
  const blockW = Math.min(100, availW / n - 20);
  const blockH = 55;
  const gap = (availW - n * blockW) / Math.max(n - 1, 1);

  const blocks: BlockLayout[] = layers.map((layer, i) => {
    const x = margin + i * (blockW + gap);
    const y = H / 2 - blockH / 2;
    const t = layer.type.toLowerCase();
    const isDashed = t.includes('dropout');
    const isNorm = t.includes('norm');
    return {
      x, y,
      w: isNorm ? blockW : blockW,
      h: isNorm ? 12 : blockH,
      label: layer.label,
      dims: formatDims(layer),
      color: layerColor(layer.type),
      icon: layerIcon(layer.type),
      isDashed,
      isNorm,
      branchIdx: -1,
    };
  });

  const segments: Segment[] = [];
  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i];
    const b = blocks[i + 1];
    segments.push({
      x1: a.x + a.w, y1: a.y + a.h / 2,
      x2: b.x, y2: b.y + b.h / 2,
      branchIdx: -1,
      color: a.color,
    });
  }

  return { blocks, segments };
}

function computeBranchingLayout(
  branches: ArchBranch[],
  merger?: ArchLayer,
): { blocks: BlockLayout[]; segments: Segment[] } {
  const allBlocks: BlockLayout[] = [];
  const allSegments: Segment[] = [];
  const nBranches = branches.length;
  const branchH = Math.min(80, (H - 80) / nBranches);
  const startX = 60;
  const mergerX = W - 120;
  const blockW = 70;
  const blockH = 40;

  // Input block
  const inputBlock: BlockLayout = {
    x: startX, y: H / 2 - 25, w: 50, h: 50,
    label: 'Input', dims: '', color: '#3B82F6', icon: '', isDashed: false, isNorm: false, branchIdx: -1,
  };
  allBlocks.push(inputBlock);

  branches.forEach((branch, bi) => {
    const branchY = 40 + bi * branchH + branchH / 2;
    const nLayers = branch.layers.length;
    const availW = mergerX - startX - 100;
    const gap = nLayers > 0 ? availW / (nLayers + 1) : availW;

    // Fork segment from input to first layer of branch
    const firstX = startX + 80 + gap * 0;

    allSegments.push({
      x1: inputBlock.x + inputBlock.w, y1: inputBlock.y + inputBlock.h / 2,
      x2: firstX, y2: branchY,
      branchIdx: bi, color: '#6B7280',
    });

    // Branch label
    allBlocks.push({
      x: firstX - 30, y: branchY - 28, w: 0, h: 0,
      label: branch.name, dims: '', color: '#8C909F', icon: '', isDashed: false, isNorm: false, branchIdx: bi,
    });

    let prevX = firstX;
    let prevY = branchY;
    branch.layers.forEach((layer, li) => {
      const lx = firstX + li * gap;
      const ly = branchY - blockH / 2;
      const block: BlockLayout = {
        x: lx, y: ly, w: blockW, h: blockH,
        label: layer.label, dims: formatDims(layer),
        color: layerColor(layer.type), icon: layerIcon(layer.type),
        isDashed: layer.type.toLowerCase().includes('dropout'),
        isNorm: layer.type.toLowerCase().includes('norm'),
        branchIdx: bi,
      };
      allBlocks.push(block);
      if (li > 0) {
        allSegments.push({
          x1: prevX + blockW, y1: prevY,
          x2: lx, y2: branchY,
          branchIdx: bi, color: layerColor(branch.layers[li - 1].type),
        });
      }
      prevX = lx;
      prevY = branchY;
    });

    // Converge to merger
    allSegments.push({
      x1: prevX + blockW, y1: prevY,
      x2: mergerX, y2: H / 2,
      branchIdx: bi, color: '#6B7280',
    });
  });

  // Merger block
  if (merger) {
    allBlocks.push({
      x: mergerX, y: H / 2 - 25, w: 70, h: 50,
      label: merger.label, dims: formatDims(merger),
      color: layerColor(merger.type), icon: layerIcon(merger.type),
      isDashed: false, isNorm: false, branchIdx: -1,
    });
  } else {
    allBlocks.push({
      x: mergerX, y: H / 2 - 25, w: 70, h: 50,
      label: 'Merge', dims: '', color: '#FBBF24', icon: '\u2295', isDashed: false, isNorm: false, branchIdx: -1,
    });
  }

  return { blocks: allBlocks, segments: allSegments };
}

function computeMultiHeadLayout(
  shared: ArchLayer[],
  heads: ArchBranch[],
): { blocks: BlockLayout[]; segments: Segment[] } {
  const allBlocks: BlockLayout[] = [];
  const allSegments: Segment[] = [];
  const blockW = 70;
  const blockH = 45;
  const startX = 50;
  const headColors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899'];

  // Shared layers
  const nShared = shared.length;
  const sharedGap = 90;
  shared.forEach((layer, i) => {
    const x = startX + i * sharedGap;
    const y = H / 2 - blockH / 2;
    allBlocks.push({
      x, y, w: blockW, h: blockH,
      label: layer.label, dims: formatDims(layer),
      color: layerColor(layer.type), icon: layerIcon(layer.type),
      isDashed: layer.type.toLowerCase().includes('dropout'),
      isNorm: layer.type.toLowerCase().includes('norm'),
      branchIdx: -1,
    });
    if (i > 0) {
      const prev = allBlocks[i - 1];
      allSegments.push({
        x1: prev.x + prev.w, y1: prev.y + prev.h / 2,
        x2: x, y2: y + blockH / 2,
        branchIdx: -1, color: layerColor(shared[i - 1].type),
      });
    }
  });

  const forkX = startX + (nShared - 1) * sharedGap + blockW;
  const forkY = H / 2;
  const nHeads = heads.length;
  const headSpacing = Math.min(120, (H - 60) / nHeads);

  heads.forEach((head, hi) => {
    const headY = H / 2 - ((nHeads - 1) * headSpacing) / 2 + hi * headSpacing;
    const headStartX = forkX + 40;
    const hColor = headColors[hi % headColors.length];

    // Fork segment
    allSegments.push({
      x1: forkX, y1: forkY,
      x2: headStartX, y2: headY,
      branchIdx: hi, color: hColor,
    });

    // Head label
    allBlocks.push({
      x: headStartX, y: headY - 30, w: 0, h: 0,
      label: head.name, dims: '', color: hColor, icon: '', isDashed: false, isNorm: false, branchIdx: hi,
    });

    let prevX = headStartX;
    head.layers.forEach((layer, li) => {
      const lx = headStartX + li * 80;
      const ly = headY - blockH / 2;
      allBlocks.push({
        x: lx, y: ly, w: blockW, h: blockH,
        label: layer.label, dims: formatDims(layer),
        color: hColor, icon: layerIcon(layer.type),
        isDashed: layer.type.toLowerCase().includes('dropout'),
        isNorm: layer.type.toLowerCase().includes('norm'),
        branchIdx: hi,
      });
      if (li > 0) {
        allSegments.push({
          x1: prevX + blockW, y1: headY,
          x2: lx, y2: headY,
          branchIdx: hi, color: hColor,
        });
      }
      prevX = lx;
    });
  });

  return { blocks: allBlocks, segments: allSegments };
}

function computeTransformerLayout(arch: ModelArchitecture): { blocks: BlockLayout[]; segments: Segment[] } {
  const allBlocks: BlockLayout[] = [];
  const allSegments: Segment[] = [];
  const blockW = 90;
  const blockH = 50;
  const startX = 50;
  const gap = 110;

  const nhead = arch.params?.nhead ?? '8';
  const numLayers = arch.params?.num_layers ?? '6';

  const stages: { label: string; color: string; icon: string; dims: string }[] = [
    { label: 'Input Proj', color: '#3B82F6', icon: '', dims: '' },
    { label: 'Pos Encoding', color: '#A855F7', icon: '+', dims: '' },
    { label: `Encoder \u00D7${numLayers}`, color: '#F97316', icon: '\u22C8', dims: `${nhead} heads` },
    { label: 'FC Output', color: '#4EDEA3', icon: '', dims: '' },
  ];

  // Also include actual layers if provided
  if (arch.layers && arch.layers.length > 0) {
    stages.length = 0;
    arch.layers.forEach(l => {
      stages.push({
        label: l.label,
        color: layerColor(l.type),
        icon: layerIcon(l.type),
        dims: formatDims(l),
      });
    });
  }

  stages.forEach((s, i) => {
    const x = startX + i * gap;
    const y = H / 2 - blockH / 2;
    allBlocks.push({
      x, y, w: blockW, h: blockH,
      label: s.label, dims: s.dims,
      color: s.color, icon: s.icon,
      isDashed: false, isNorm: false, branchIdx: -1,
    });
    if (i > 0) {
      allSegments.push({
        x1: startX + (i - 1) * gap + blockW, y1: y + blockH / 2,
        x2: x, y2: y + blockH / 2,
        branchIdx: -1, color: stages[i - 1].color,
      });
    }
  });

  return { blocks: allBlocks, segments: allSegments };
}

function computeTreeEnsembleLayout(arch: ModelArchitecture): { blocks: BlockLayout[]; segments: Segment[] } {
  const allBlocks: BlockLayout[] = [];
  const allSegments: Segment[] = [];
  const nTrees = 4;
  const treeW = 120;
  const treeH = 200;
  const startX = 80;
  const gap = (W - startX * 2 - nTrees * treeW) / Math.max(nTrees - 1, 1);

  for (let t = 0; t < nTrees; t++) {
    const cx = startX + t * (treeW + gap) + treeW / 2;
    const topY = 80;
    // Root
    allBlocks.push({
      x: cx - 15, y: topY, w: 30, h: 30,
      label: '', dims: '', color: '#10B981', icon: '', isDashed: false, isNorm: false, branchIdx: t,
    });
    // Left child
    allBlocks.push({
      x: cx - treeW / 2 + 10, y: topY + 70, w: 25, h: 25,
      label: '', dims: '', color: '#10B981', icon: '', isDashed: false, isNorm: false, branchIdx: t,
    });
    // Right child
    allBlocks.push({
      x: cx + treeW / 2 - 35, y: topY + 70, w: 25, h: 25,
      label: '', dims: '', color: '#10B981', icon: '', isDashed: false, isNorm: false, branchIdx: t,
    });
    // Leaves
    for (let l = 0; l < 4; l++) {
      allBlocks.push({
        x: cx - treeW / 2 + 5 + l * 30, y: topY + 140, w: 20, h: 20,
        label: '', dims: '', color: '#4EDEA3', icon: '', isDashed: false, isNorm: false, branchIdx: t,
      });
    }
    // Segments: root to children
    allSegments.push({ x1: cx, y1: topY + 30, x2: cx - treeW / 2 + 22, y2: topY + 70, branchIdx: t, color: '#10B981' });
    allSegments.push({ x1: cx, y1: topY + 30, x2: cx + treeW / 2 - 22, y2: topY + 70, branchIdx: t, color: '#10B981' });
    // Children to leaves
    allSegments.push({ x1: cx - treeW / 2 + 22, y1: topY + 95, x2: cx - treeW / 2 + 15, y2: topY + 140, branchIdx: t, color: '#10B981' });
    allSegments.push({ x1: cx - treeW / 2 + 22, y1: topY + 95, x2: cx - treeW / 2 + 45, y2: topY + 140, branchIdx: t, color: '#10B981' });
    allSegments.push({ x1: cx + treeW / 2 - 22, y1: topY + 95, x2: cx + treeW / 2 - 55, y2: topY + 140, branchIdx: t, color: '#10B981' });
    allSegments.push({ x1: cx + treeW / 2 - 22, y1: topY + 95, x2: cx + treeW / 2 - 25, y2: topY + 140, branchIdx: t, color: '#10B981' });

    // Tree label
    allBlocks.push({
      x: cx - 25, y: topY + 170, w: 50, h: 0,
      label: `Tree ${t + 1}`, dims: '', color: '#8C909F', icon: '', isDashed: false, isNorm: false, branchIdx: t,
    });
  }

  // Ensemble vote block
  allBlocks.push({
    x: W / 2 - 50, y: H - 65, w: 100, h: 35,
    label: 'Ensemble Vote', dims: arch.algorithm ?? '', color: '#F59E0B', icon: '\u2295', isDashed: false, isNorm: false, branchIdx: -1,
  });

  return { blocks: allBlocks, segments: allSegments };
}

// ── Main Component ──────────────────────────────────────────
interface Props {
  architecture?: ModelArchitecture;
}

export default function NeuralNetworkFlowViz({ architecture }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rngRef = useRef(seededRandom(7));

  // Compute layout from architecture
  const { blocks, segments, title, subtitle } = useMemo(() => {
    if (!architecture) {
      const { blocks: b, segments: s } = computeSequentialLayout(FALLBACK_LAYERS);
      return { blocks: b, segments: s, title: '神经网络数据流动', subtitle: 'Forward Pass' };
    }

    const arch = architecture;
    let b: BlockLayout[] = [];
    let s: Segment[] = [];

    switch (arch.archType) {
      case 'sequential': {
        const result = computeSequentialLayout(arch.layers ?? FALLBACK_LAYERS);
        b = result.blocks;
        s = result.segments;
        break;
      }
      case 'branching': {
        const result = computeBranchingLayout(arch.branches ?? [], arch.merger);
        b = result.blocks;
        s = result.segments;
        break;
      }
      case 'multi-head': {
        const result = computeMultiHeadLayout(arch.shared ?? [], arch.heads ?? []);
        b = result.blocks;
        s = result.segments;
        break;
      }
      case 'transformer': {
        const result = computeTransformerLayout(arch);
        b = result.blocks;
        s = result.segments;
        break;
      }
      case 'tree-ensemble': {
        const result = computeTreeEnsembleLayout(arch);
        b = result.blocks;
        s = result.segments;
        break;
      }
      default: {
        // kernel-method, linear-regularized, statistical: show layers if available, else fallback
        const result = computeSequentialLayout(arch.layers ?? FALLBACK_LAYERS);
        b = result.blocks;
        s = result.segments;
        break;
      }
    }

    return {
      blocks: b,
      segments: s,
      title: arch.title || '模型架构',
      subtitle: arch.archType || 'Architecture',
    };
  }, [architecture]);

  const spawnParticle = useCallback(() => {
    if (segments.length === 0) return;
    const rng = rngRef.current;
    const segIdx = Math.floor(rng() * segments.length);
    particlesRef.current.push({
      segIdx,
      progress: 0,
      speed: 0.015 + rng() * 0.02,
      branchIdx: segments[segIdx].branchIdx,
    });
  }, [segments]);

  const animate = useCallback((time: number) => {
    const dt = time - lastTimeRef.current;
    if (dt > 30) {
      lastTimeRef.current = time;
      if (particlesRef.current.length < 50) {
        for (let i = 0; i < 3; i++) spawnParticle();
      }
      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, progress: p.progress + p.speed * speed }))
        .filter(p => p.progress < 1);
      setTick(t => t + 1);
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [speed, spawnParticle]);

  useEffect(() => {
    if (playing) {
      frameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, animate]);

  const handleReset = () => {
    setPlaying(false);
    particlesRef.current = [];
    setTick(0);
  };

  void tick;

  const stepText = !playing && particlesRef.current.length === 0
    ? '点击播放, 观察数据在网络中的流动'
    : `数据前向传播中... 活跃粒子: ${particlesRef.current.length}`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          {title}
        </h3>
        <span className="font-mono text-xs text-text-tertiary">{subtitle}</span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="nn-arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#6B7280" />
            </marker>
          </defs>

          {/* Segment connectors (arrows) */}
          {segments.map((seg, i) => (
            <line key={`seg-${i}`}
              x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1"
              markerEnd="url(#nn-arrowhead)" />
          ))}

          {/* Particles */}
          {particlesRef.current.map((p, i) => {
            if (p.segIdx >= segments.length) return null;
            const seg = segments[p.segIdx];
            const x = seg.x1 + (seg.x2 - seg.x1) * p.progress;
            const y = seg.y1 + (seg.y2 - seg.y1) * p.progress;
            return (
              <circle key={`p-${i}`} cx={x} cy={y} r="3"
                fill={seg.color} opacity={0.8 - p.progress * 0.4}>
                <animate attributeName="opacity"
                  values={`${0.9 - p.progress * 0.4};${0.4};${0.9 - p.progress * 0.4}`}
                  dur="0.5s" repeatCount="indefinite" />
              </circle>
            );
          })}

          {/* Blocks */}
          {blocks.map((block, i) => {
            // Skip zero-size label-only blocks
            if (block.w === 0 && block.h === 0) {
              return (
                <text key={`lbl-${i}`} x={block.x + 30} y={block.y + 12}
                  fill={block.color} fontSize="10" fontFamily="var(--font-mono)"
                  textAnchor="middle" opacity="0.7">{block.label}</text>
              );
            }

            if (block.isNorm) {
              return (
                <g key={`blk-${i}`}>
                  <rect x={block.x} y={block.y + 20} width={block.w} height={block.h}
                    rx="3" fill={`${block.color}33`} stroke={block.color} strokeWidth="1" />
                  <text x={block.x + block.w / 2} y={block.y + 28}
                    fill={block.color} fontSize="8" fontFamily="var(--font-mono)"
                    textAnchor="middle">{block.label}</text>
                </g>
              );
            }

            return (
              <g key={`blk-${i}`}>
                <rect x={block.x} y={block.y} width={block.w} height={block.h}
                  rx="8"
                  fill={`${block.color}15`}
                  stroke={block.color}
                  strokeWidth={block.isDashed ? 1 : 1.5}
                  strokeDasharray={block.isDashed ? '4 3' : 'none'}
                  opacity="0.85" />
                {/* Icon */}
                {block.icon && (
                  <text x={block.x + block.w / 2} y={block.y + block.h / 2 - 6}
                    fill={block.color} fontSize="14" fontFamily="var(--font-mono)"
                    textAnchor="middle" dominantBaseline="middle" opacity="0.6">
                    {block.icon}
                  </text>
                )}
                {/* Label */}
                <text x={block.x + block.w / 2} y={block.y + block.h / 2 + (block.icon ? 6 : 0)}
                  fill="#E0E0E0" fontSize="10" fontFamily="var(--font-body)"
                  textAnchor="middle" dominantBaseline="middle">
                  {block.label}
                </text>
                {/* Dims */}
                {block.dims && (
                  <text x={block.x + block.w / 2} y={block.y + block.h + 12}
                    fill="#8C909F" fontSize="8" fontFamily="var(--font-mono)"
                    textAnchor="middle">
                    {block.dims}
                  </text>
                )}
              </g>
            );
          })}

          {/* Params overlay for tree-ensemble */}
          {architecture?.archType === 'tree-ensemble' && architecture.params && (
            <g>
              {Object.entries(architecture.params).slice(0, 4).map(([key, val], i) => (
                <text key={key} x={W - 20} y={30 + i * 14}
                  fill="#8C909F" fontSize="9" fontFamily="var(--font-mono)"
                  textAnchor="end">
                  {key}: {val}
                </text>
              ))}
            </g>
          )}

          {/* Fallback notice */}
          {!architecture && (
            <text x={W / 2} y={H - 15} fill="#6B7280" fontSize="10"
              fontFamily="var(--font-mono)" textAnchor="middle" opacity="0.5">
              Architecture data not available
            </text>
          )}
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
