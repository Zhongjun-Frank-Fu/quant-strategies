import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

const W = 800;
const H = 450;
const PAD = { top: 30, right: 30, bottom: 20, left: 55 };
const PRICE_H = 170;
const SPREAD_H = 150;
const N_POINTS = 250;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateCointegrated(n: number): { priceA: number[]; priceB: number[]; spread: number[] } {
  const rng = seededRandom(77);
  const priceA: number[] = [100];
  const priceB: number[] = [95];

  for (let i = 1; i < n; i++) {
    const common = (rng() - 0.48) * 1.2; // common factor with slight drift
    const noiseA = (rng() - 0.5) * 0.6;
    const noiseB = (rng() - 0.5) * 0.6;
    priceA.push(priceA[i - 1] + common + noiseA);
    // priceB follows A with mean-reverting spread
    const spreadError = (priceA[i - 1] - priceB[i - 1] * 1.05 - 0.5) * 0.03; // revert to mean
    priceB.push(priceB[i - 1] + common + noiseB + spreadError);
  }

  const beta = 1.05;
  const spread = priceA.map((a, i) => a - beta * priceB[i]);

  return { priceA, priceB, spread };
}

interface Props {
  architecture?: ModelArchitecture;
}

export default function PairsSpreadViz({ architecture: _architecture }: Props) {
  const { priceA, priceB, spread } = useMemo(() => generateCointegrated(N_POINTS), []);

  // Compute spread stats for bands
  const spreadMean = useMemo(() => spread.reduce((s, v) => s + v, 0) / spread.length, [spread]);
  const spreadStd = useMemo(() => {
    const variance = spread.reduce((s, v) => s + (v - spreadMean) ** 2, 0) / spread.length;
    return Math.sqrt(variance);
  }, [spread, spreadMean]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const PLOT_W = W - PAD.left - PAD.right;
  const SPREAD_TOP = PAD.top + PRICE_H + 30;

  // Price scaling
  const allPrices = [...priceA.slice(0, step + 1), ...priceB.slice(0, step + 1)];
  const pMin = allPrices.length > 0 ? Math.min(...allPrices) - 1 : 80;
  const pMax = allPrices.length > 0 ? Math.max(...allPrices) + 1 : 120;

  // Spread scaling
  const sMin = spreadMean - 3 * spreadStd;
  const sMax = spreadMean + 3 * spreadStd;

  const sx = (i: number) => PAD.left + (i / (N_POINTS - 1)) * PLOT_W;
  const spY = (p: number) => PAD.top + ((pMax - p) / (pMax - pMin)) * PRICE_H;
  const ssY = (s: number) => SPREAD_TOP + ((sMax - s) / (sMax - sMin)) * SPREAD_H;

  // Generate signals
  const signals = useMemo(() => {
    const sigs: { idx: number; type: 'long' | 'short' | 'close' }[] = [];
    let inPosition: 'long' | 'short' | null = null;
    for (let i = 0; i < spread.length; i++) {
      const normalized = (spread[i] - spreadMean) / spreadStd;
      if (normalized > 2 && inPosition !== 'short') {
        sigs.push({ idx: i, type: 'short' });
        inPosition = 'short';
      } else if (normalized < -2 && inPosition !== 'long') {
        sigs.push({ idx: i, type: 'long' });
        inPosition = 'long';
      } else if (Math.abs(normalized) < 0.3 && inPosition !== null) {
        sigs.push({ idx: i, type: 'close' });
        inPosition = null;
      }
    }
    return sigs;
  }, [spread, spreadMean, spreadStd]);

  const visibleSignals = useMemo(() => signals.filter(s => s.idx <= step), [signals, step]);

  const priceAPath = useMemo(() => {
    return priceA.slice(0, step + 1).map((p, i) => `${sx(i)},${spY(p)}`).join(' ');
  }, [step, priceA, pMin, pMax]);

  const priceBPath = useMemo(() => {
    return priceB.slice(0, step + 1).map((p, i) => `${sx(i)},${spY(p)}`).join(' ');
  }, [step, priceB, pMin, pMax]);

  const spreadPath = useMemo(() => {
    return spread.slice(0, step + 1).map((s, i) => `${sx(i)},${ssY(s)}`).join(' ');
  }, [step, spread]);

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 30 / speed) {
      lastTimeRef.current = time;
      setStep(s => {
        if (s >= N_POINTS - 1) { setPlaying(false); return s; }
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

  const currentSpread = spread[step];
  const normalizedSpread = (currentSpread - spreadMean) / spreadStd;

  const stepText = step === 0
    ? '点击播放, 观察配对交易价差与信号'
    : `Step ${step}/${N_POINTS} | Spread: ${normalizedSpread.toFixed(2)}sigma | 信号: ${visibleSignals.length}`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          配对交易价差分析
        </h3>
        <span className="font-mono text-xs text-text-tertiary">
          Spread: {normalizedSpread.toFixed(2)}sigma
        </span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Price chart */}
          <text x={PAD.left - 5} y={PAD.top + 10} fill="#6B7280" fontSize="9"
            fontFamily="var(--font-mono)" textAnchor="end">Price</text>

          {step > 0 && (
            <>
              <polyline points={priceAPath} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
              <polyline points={priceBPath} fill="none" stroke="#EF4444" strokeWidth="1.5" />
            </>
          )}

          {/* Legend */}
          <line x1={W - 180} x2={W - 160} y1={PAD.top + 8} y2={PAD.top + 8}
            stroke="#3B82F6" strokeWidth="2" />
          <text x={W - 155} y={PAD.top + 12} fill="#8C909F" fontSize="10" fontFamily="var(--font-body)">
            Stock A
          </text>
          <line x1={W - 100} x2={W - 80} y1={PAD.top + 8} y2={PAD.top + 8}
            stroke="#EF4444" strokeWidth="2" />
          <text x={W - 75} y={PAD.top + 12} fill="#8C909F" fontSize="10" fontFamily="var(--font-body)">
            Stock B
          </text>

          {/* Divider */}
          <line x1={PAD.left} x2={W - PAD.right} y1={SPREAD_TOP - 10} y2={SPREAD_TOP - 10}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {/* Spread chart */}
          <text x={PAD.left - 5} y={SPREAD_TOP + 10} fill="#6B7280" fontSize="9"
            fontFamily="var(--font-mono)" textAnchor="end">Spread</text>

          {/* Bands */}
          {[-2, -1, 0, 1, 2].map(sigma => {
            const val = spreadMean + sigma * spreadStd;
            const y = ssY(val);
            const color = Math.abs(sigma) === 2
              ? 'rgba(239, 68, 68, 0.3)'
              : sigma === 0
              ? 'rgba(255,255,255,0.2)'
              : 'rgba(245, 158, 11, 0.2)';
            return (
              <g key={sigma}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
                  stroke={color} strokeWidth="1" strokeDasharray={sigma === 0 ? '0' : '4 4'} />
                <text x={W - PAD.right + 5} y={y + 4} fill="#6B7280" fontSize="8"
                  fontFamily="var(--font-mono)">{sigma === 0 ? 'mean' : `${sigma > 0 ? '+' : ''}${sigma}sigma`}</text>
              </g>
            );
          })}

          {/* Spread fill between bands */}
          <rect x={PAD.left} y={ssY(spreadMean + spreadStd)}
            width={PLOT_W} height={ssY(spreadMean - spreadStd) - ssY(spreadMean + spreadStd)}
            fill="rgba(245, 158, 11, 0.03)" />
          <rect x={PAD.left} y={ssY(spreadMean + 2 * spreadStd)}
            width={PLOT_W} height={ssY(spreadMean - 2 * spreadStd) - ssY(spreadMean + 2 * spreadStd)}
            fill="rgba(239, 68, 68, 0.02)" />

          {/* Spread line */}
          {step > 0 && (
            <polyline points={spreadPath} fill="none" stroke="#F59E0B" strokeWidth="1.5" />
          )}

          {/* Trading signals on spread chart */}
          {visibleSignals.map((sig, i) => {
            const x = sx(sig.idx);
            const y = ssY(spread[sig.idx]);
            if (sig.type === 'long') {
              return (
                <g key={i}>
                  <polygon points={`${x},${y + 12} ${x - 5},${y + 20} ${x + 5},${y + 20}`}
                    fill="#4EDEA3" />
                  <text x={x} y={y + 30} fill="#4EDEA3" fontSize="7"
                    fontFamily="var(--font-mono)" textAnchor="middle">LONG</text>
                </g>
              );
            }
            if (sig.type === 'short') {
              return (
                <g key={i}>
                  <polygon points={`${x},${y - 12} ${x - 5},${y - 20} ${x + 5},${y - 20}`}
                    fill="#FFB4AB" />
                  <text x={x} y={y - 24} fill="#FFB4AB" fontSize="7"
                    fontFamily="var(--font-mono)" textAnchor="middle">SHORT</text>
                </g>
              );
            }
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="none" stroke="#8C909F" strokeWidth="1.5" />
                <text x={x} y={y + 14} fill="#8C909F" fontSize="7"
                  fontFamily="var(--font-mono)" textAnchor="middle">CLOSE</text>
              </g>
            );
          })}

          {/* Current time indicator */}
          {step > 0 && (
            <line x1={sx(step)} x2={sx(step)} y1={PAD.top} y2={SPREAD_TOP + SPREAD_H}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3 3" />
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
