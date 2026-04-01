import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

const W = 800;
const H = 450;
const PAD = { top: 30, right: 30, bottom: 20, left: 55 };
const PRICE_H = 200;
const PNL_H = 100;
const REWARD_H = 60;
const N_POINTS = 200;
const MAX_STEPS = N_POINTS;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generatePriceSeries(n: number): number[] {
  const rng = seededRandom(99);
  const prices: number[] = [100];
  for (let i = 1; i < n; i++) {
    const drift = 0.0002;
    const vol = 0.015;
    const ret = drift + vol * (rng() + rng() + rng() - 1.5);
    prices.push(prices[i - 1] * (1 + ret));
  }
  return prices;
}

// Simple momentum agent
function agentDecisions(prices: number[]): { action: 'buy' | 'sell' | 'hold'; position: -1 | 0 | 1 }[] {
  const decisions: { action: 'buy' | 'sell' | 'hold'; position: -1 | 0 | 1 }[] = [];
  let pos: -1 | 0 | 1 = 0;
  const lookback = 10;

  for (let i = 0; i < prices.length; i++) {
    if (i < lookback) {
      decisions.push({ action: 'hold', position: pos });
      continue;
    }
    const sma = prices.slice(i - lookback, i).reduce((s, p) => s + p, 0) / lookback;
    const momentum = (prices[i] - sma) / sma;

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    if (momentum > 0.005 && pos <= 0) {
      action = 'buy';
      pos = 1;
    } else if (momentum < -0.005 && pos >= 0) {
      action = 'sell';
      pos = -1 as -1;
    }
    decisions.push({ action, position: pos });
  }
  return decisions;
}

interface Props {
  architecture?: ModelArchitecture;
}

export default function RLTradingAgentViz({ architecture }: Props) {
  const prices = useMemo(() => generatePriceSeries(N_POINTS), []);
  const decisions = useMemo(() => agentDecisions(prices), [prices]);

  // PnL
  const pnl = useMemo(() => {
    const pnls: number[] = [0];
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
      const prev = decisions[i - 1].position;
      pnls.push(pnls[i - 1] + prev * ret * 100);
    }
    return pnls;
  }, [prices, decisions]);

  // Rewards (per-step PnL change)
  const rewards = useMemo(() => {
    return pnl.map((_, i) => i === 0 ? 0 : pnl[i] - pnl[i - 1]);
  }, [pnl]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const priceMin = Math.min(...prices) * 0.998;
  const priceMax = Math.max(...prices) * 1.002;
  const pnlSlice = pnl.slice(0, step + 1);
  const pnlMin = Math.min(0, ...pnlSlice);
  const pnlMax = Math.max(1, ...pnlSlice);

  const PLOT_W = W - PAD.left - PAD.right;
  const PNL_TOP = PAD.top + PRICE_H + 20;
  const REWARD_TOP = PNL_TOP + PNL_H + 15;

  const sx = (i: number) => PAD.left + (i / (N_POINTS - 1)) * PLOT_W;
  const spY = (p: number) => PAD.top + ((priceMax - p) / (priceMax - priceMin)) * PRICE_H;
  const spnlY = (v: number) => PNL_TOP + ((pnlMax - v) / (pnlMax - pnlMin || 1)) * PNL_H;

  // Price path up to current step
  const pricePath = useMemo(() => {
    return prices.slice(0, step + 1).map((p, i) => `${sx(i)},${spY(p)}`).join(' ');
  }, [step, prices, priceMin, priceMax]);

  // PnL path
  const pnlPath = useMemo(() => {
    return pnlSlice.map((v, i) => `${sx(i)},${spnlY(v)}`).join(' ');
  }, [step, pnlSlice, pnlMin, pnlMax]);

  // Position background bands
  const positionBands = useMemo(() => {
    const bands: { start: number; end: number; pos: number }[] = [];
    let curPos = decisions[0]?.position ?? 0;
    let start = 0;
    for (let i = 1; i <= step; i++) {
      if (decisions[i]?.position !== curPos || i === step) {
        bands.push({ start, end: i, pos: curPos });
        curPos = decisions[i]?.position ?? 0;
        start = i;
      }
    }
    return bands;
  }, [step, decisions]);

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 40 / speed) {
      lastTimeRef.current = time;
      setStep(s => {
        if (s >= MAX_STEPS - 1) { setPlaying(false); return s; }
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

  const currentPnL = pnl[step];
  const currentPos = decisions[step]?.position ?? 0;
  const posLabel = currentPos === 1 ? 'LONG' : currentPos === -1 ? 'SHORT' : 'FLAT';
  const posColor = currentPos === 1 ? 'text-signal-positive' : currentPos === -1 ? 'text-signal-negative' : 'text-text-tertiary';

  const stepText = step === 0
    ? '点击播放, 观察 RL 智能体交易决策'
    : `Step ${step}/${N_POINTS} | 持仓: ${posLabel} | 累计收益: ${currentPnL.toFixed(2)}%`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          {architecture?.title ?? 'RL 交易智能体'}
        </h3>
        <span className={`font-mono text-xs font-bold ${posColor}`}>{posLabel}</span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Position background bands on price chart */}
          {positionBands.map((b, i) => {
            const color = b.pos === 1
              ? 'rgba(78, 222, 163, 0.06)'
              : b.pos === -1
              ? 'rgba(255, 180, 171, 0.06)'
              : 'transparent';
            return (
              <rect key={i} x={sx(b.start)} y={PAD.top} width={sx(b.end) - sx(b.start)} height={PRICE_H}
                fill={color} />
            );
          })}

          {/* Price chart area */}
          <text x={PAD.left - 5} y={PAD.top + 10} fill="#6B7280" fontSize="9"
            fontFamily="var(--font-mono)" textAnchor="end">Price</text>

          {/* Price line */}
          {step > 0 && (
            <polyline points={pricePath} fill="none" stroke="#3B82F6" strokeWidth="1.5" />
          )}

          {/* Buy/Sell signals */}
          {decisions.slice(0, step + 1).map((d, i) => {
            if (d.action === 'hold') return null;
            const isBuy = d.action === 'buy';
            const y = spY(prices[i]);
            const x = sx(i);
            return (
              <polygon key={i}
                points={isBuy
                  ? `${x},${y + 12} ${x - 5},${y + 20} ${x + 5},${y + 20}`
                  : `${x},${y - 12} ${x - 5},${y - 20} ${x + 5},${y - 20}`}
                fill={isBuy ? '#4EDEA3' : '#FFB4AB'}
                opacity="0.9" />
            );
          })}

          {/* Divider */}
          <line x1={PAD.left} x2={W - PAD.right} y1={PNL_TOP - 5} y2={PNL_TOP - 5}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {/* PnL chart */}
          <text x={PAD.left - 5} y={PNL_TOP + 10} fill="#6B7280" fontSize="9"
            fontFamily="var(--font-mono)" textAnchor="end">P&L</text>
          <line x1={PAD.left} x2={W - PAD.right} y1={spnlY(0)} y2={spnlY(0)}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {step > 0 && (
            <polyline points={pnlPath} fill="none"
              stroke={currentPnL >= 0 ? '#4EDEA3' : '#FFB4AB'} strokeWidth="1.5" />
          )}

          {/* Reward bars */}
          <text x={PAD.left - 5} y={REWARD_TOP + 10} fill="#6B7280" fontSize="9"
            fontFamily="var(--font-mono)" textAnchor="end">Rwd</text>
          {rewards.slice(0, step + 1).map((r, i) => {
            if (Math.abs(r) < 0.001) return null;
            const barW = Math.max(1, PLOT_W / N_POINTS - 0.5);
            const barH = Math.min(Math.abs(r) * 20, REWARD_H / 2);
            const midY = REWARD_TOP + REWARD_H / 2;
            return (
              <rect key={i} x={sx(i)} y={r > 0 ? midY - barH : midY}
                width={barW} height={barH}
                fill={r > 0 ? 'rgba(78,222,163,0.5)' : 'rgba(255,180,171,0.5)'} />
            );
          })}

          {/* Current time indicator */}
          {step > 0 && (
            <line x1={sx(step)} x2={sx(step)} y1={PAD.top} y2={REWARD_TOP + REWARD_H}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
          )}

          {/* Legend */}
          <polygon points={`${W - 150},${PAD.top + 8} ${W - 155},${PAD.top + 16} ${W - 145},${PAD.top + 16}`}
            fill="#4EDEA3" />
          <text x={W - 138} y={PAD.top + 16} fill="#8C909F" fontSize="10" fontFamily="var(--font-body)">Buy</text>
          <polygon points={`${W - 100},${PAD.top + 16} ${W - 105},${PAD.top + 8} ${W - 95},${PAD.top + 8}`}
            fill="#FFB4AB" />
          <text x={W - 88} y={PAD.top + 16} fill="#8C909F" fontSize="10" fontFamily="var(--font-body)">Sell</text>

          {/* Architecture info overlay */}
          {architecture?.archType === 'multi-head' && architecture.heads && (
            <g>
              {architecture.heads.map((head, i) => (
                <text key={i} x={PAD.left + 5} y={REWARD_TOP + REWARD_H + 14 + i * 12}
                  fill="#8C909F" fontSize="9" fontFamily="var(--font-mono)">
                  {head.name}: {head.layers.map(l => l.label).join(' \u2192 ')}
                </text>
              ))}
            </g>
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
