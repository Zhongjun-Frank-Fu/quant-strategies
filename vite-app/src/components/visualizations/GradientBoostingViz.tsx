import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateData(n: number) {
  const rng = seededRandom(42);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 * Math.PI;
    const noise = (rng() - 0.5) * 0.6;
    points.push({ x, y: Math.sin(x) + noise });
  }
  return points;
}

function trueFunction(x: number) {
  return Math.sin(x);
}

// Simple stump: split at best point, predict mean of each side
function fitStump(points: { x: number; r: number }[]): { splitX: number; leftVal: number; rightVal: number } {
  let bestSplit = points[0].x;
  let bestErr = Infinity;
  let bestLeft = 0;
  let bestRight = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const splitX = (points[i].x + points[i + 1].x) / 2;
    const left = points.filter(p => p.x <= splitX);
    const right = points.filter(p => p.x > splitX);
    if (left.length === 0 || right.length === 0) continue;
    const leftMean = left.reduce((s, p) => s + p.r, 0) / left.length;
    const rightMean = right.reduce((s, p) => s + p.r, 0) / right.length;
    const err = left.reduce((s, p) => s + (p.r - leftMean) ** 2, 0) +
                right.reduce((s, p) => s + (p.r - rightMean) ** 2, 0);
    if (err < bestErr) {
      bestErr = err;
      bestSplit = splitX;
      bestLeft = leftMean;
      bestRight = rightMean;
    }
  }
  return { splitX: bestSplit, leftVal: bestLeft, rightVal: bestRight };
}

const W = 800;
const H = 450;
const PAD = { top: 40, right: 30, bottom: 100, left: 50 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const MAX_ROUNDS = 50;
const LR = 0.3;

interface Stump {
  splitX: number;
  leftVal: number;
  rightVal: number;
}

interface Props {
  architecture?: ModelArchitecture;
}

export default function GradientBoostingViz({ architecture }: Props) {
  const data = useMemo(() => generateData(30), []);
  const xMin = 0;
  const xMax = 2 * Math.PI;
  const yMin = -2;
  const yMax = 2;

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const sy = (y: number) => PAD.top + ((yMax - y) / (yMax - yMin)) * PLOT_H;

  // Precompute all stumps
  const allStumps = useMemo(() => {
    const stumps: Stump[] = [];
    const predictions = data.map(() => 0);
    const sorted = data.map((p, i) => ({ ...p, idx: i })).sort((a, b) => a.x - b.x);

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const residuals = sorted.map(p => ({
        x: p.x,
        r: p.y - predictions[p.idx],
      }));
      const stump = fitStump(residuals);
      stumps.push(stump);
      // Update predictions
      for (const p of sorted) {
        const pred = p.x <= stump.splitX ? stump.leftVal : stump.rightVal;
        predictions[p.idx] += LR * pred;
      }
    }
    return stumps;
  }, [data]);

  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 200 / speed) {
      lastTimeRef.current = time;
      setRound(r => {
        if (r >= MAX_ROUNDS) {
          setPlaying(false);
          return r;
        }
        return r + 1;
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

  // Compute current prediction curve
  const predCurve = useMemo(() => {
    const nPts = 100;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= nPts; i++) {
      const x = xMin + (i / nPts) * (xMax - xMin);
      let pred = 0;
      for (let r = 0; r < round; r++) {
        const s = allStumps[r];
        pred += LR * (x <= s.splitX ? s.leftVal : s.rightVal);
      }
      pts.push({ x, y: pred });
    }
    return pts;
  }, [round, allStumps, xMin, xMax]);

  // MSE over rounds
  const mseHistory = useMemo(() => {
    const history: number[] = [];
    const preds = data.map(() => 0);
    history.push(data.reduce((s, p, i) => s + (p.y - preds[i]) ** 2, 0) / data.length);
    for (let r = 0; r < MAX_ROUNDS; r++) {
      const stump = allStumps[r];
      for (let i = 0; i < data.length; i++) {
        preds[i] += LR * (data[i].x <= stump.splitX ? stump.leftVal : stump.rightVal);
      }
      history.push(data.reduce((s, p, i) => s + (p.y - preds[i]) ** 2, 0) / data.length);
    }
    return history;
  }, [data, allStumps]);

  const mseMax = Math.max(...mseHistory);
  const MSE_H = 50;
  const MSE_Y = H - MSE_H - 10;

  const trueCurve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = xMin + (i / 100) * (xMax - xMin);
      pts.push(`${sx(x)},${sy(trueFunction(x))}`);
    }
    return pts.join(' ');
  }, []);

  const predPath = predCurve.map(p => `${sx(p.x)},${sy(p.y)}`).join(' ');

  const algoName = architecture?.algorithm ?? 'Gradient Boosting';
  const algoParams = architecture?.params;
  const paramStr = algoParams
    ? Object.entries(algoParams).map(([k, v]) => `${k}=${v}`).join(', ')
    : '';

  const stepText = round === 0
    ? `点击播放开始${algoName}迭代${paramStr ? ` (${paramStr})` : ''}`
    : round >= MAX_ROUNDS
    ? `迭代完成! 最终 MSE: ${mseHistory[round].toFixed(4)}`
    : `第 ${round} 轮: 拟合残差, MSE = ${mseHistory[round].toFixed(4)}`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          {architecture?.title ?? 'Gradient Boosting'} 逐轮拟合
        </h3>
        <span className="font-mono text-xs text-text-tertiary">Round {round}/{MAX_ROUNDS}</span>
      </div>

      {/* SVG */}
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[-1, 0, 1].map(v => (
            <line key={v} x1={PAD.left} x2={W - PAD.right} y1={sy(v)} y2={sy(v)}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
          {/* Axes */}
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(0)} y2={sy(0)}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          {/* True function (dashed) */}
          <polyline points={trueCurve} fill="none" stroke="#3B82F6" strokeWidth="2"
            strokeDasharray="6 4" opacity="0.5" />
          {/* Prediction curve */}
          {round > 0 && (
            <polyline points={predPath} fill="none" stroke="#4EDEA3" strokeWidth="2.5" />
          )}
          {/* Data points */}
          {data.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="4"
              fill="#6B7280" stroke="#8C909F" strokeWidth="1" opacity="0.8" />
          ))}
          {/* MSE bar chart at bottom */}
          <text x={PAD.left} y={MSE_Y - 4} fill="#8C909F" fontSize="10" fontFamily="var(--font-mono)">
            MSE
          </text>
          {mseHistory.slice(0, round + 1).map((mse, i) => {
            const barW = (PLOT_W / (MAX_ROUNDS + 1)) * 0.8;
            const barH = (mse / mseMax) * MSE_H;
            const bx = PAD.left + (i / (MAX_ROUNDS + 1)) * PLOT_W;
            return (
              <rect key={i} x={bx} y={MSE_Y + MSE_H - barH} width={barW} height={barH}
                fill={i === round ? '#3B82F6' : 'rgba(59,130,246,0.3)'} rx="1" />
            );
          })}
          {/* Legend */}
          <line x1={W - 180} x2={W - 160} y1={20} y2={20} stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 3" />
          <text x={W - 155} y={24} fill="#8C909F" fontSize="11" fontFamily="var(--font-body)">True f(x)</text>
          <line x1={W - 180} x2={W - 160} y1={36} y2={36} stroke="#4EDEA3" strokeWidth="2" />
          <text x={W - 155} y={40} fill="#8C909F" fontSize="11" fontFamily="var(--font-body)">Prediction</text>
        </svg>
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-t border-border-subtle flex items-center gap-4 flex-wrap">
        <button onClick={() => { setPlaying(!playing); }}
          className="w-8 h-8 rounded-full bg-accent-blue/20 hover:bg-accent-blue/30 flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-accent-blue text-lg">
            {playing ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button onClick={() => { setPlaying(false); setRound(0); }}
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
