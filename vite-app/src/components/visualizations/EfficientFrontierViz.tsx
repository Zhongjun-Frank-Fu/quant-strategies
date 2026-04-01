import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

const W = 800;
const H = 450;
const PAD = { top: 50, right: 40, bottom: 60, left: 60 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const N_ASSETS = 15;
const MAX_PORTFOLIOS = 600;
const BATCH_SIZE = 8;
const RF_RATE = 2; // risk-free rate %

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface Asset {
  risk: number; // standard deviation %
  ret: number;  // expected return %
  label: string;
}

interface Portfolio {
  risk: number;
  ret: number;
}

function generateAssets(): Asset[] {
  const rng = seededRandom(55);
  const labels = [
    'AAPL', 'MSFT', 'GOOG', 'AMZN', 'TSLA', 'JPM', 'BAC', 'GS',
    'XOM', 'CVX', 'PFE', 'JNJ', 'WMT', 'KO', 'PG',
  ];
  return labels.map((label) => ({
    risk: 8 + rng() * 30,
    ret: 2 + rng() * 18,
    label,
  }));
}

function generateRandomPortfolios(assets: Asset[], n: number, seed: number): Portfolio[] {
  const rng = seededRandom(seed);
  const portfolios: Portfolio[] = [];
  for (let i = 0; i < n; i++) {
    // Random weights
    const rawWeights = assets.map(() => rng());
    const sum = rawWeights.reduce((s, w) => s + w, 0);
    const weights = rawWeights.map(w => w / sum);

    // Portfolio return = weighted average
    const ret = assets.reduce((s, a, j) => s + weights[j] * a.ret, 0);
    // Portfolio risk (simplified - ignoring correlations, just weighted)
    // Add diversification benefit
    const weightedRisk = assets.reduce((s, a, j) => s + weights[j] * a.risk, 0);
    const diversification = 0.5 + rng() * 0.3; // random diversification factor
    const risk = weightedRisk * diversification;

    portfolios.push({ risk, ret });
  }
  return portfolios;
}

interface Props {
  architecture?: ModelArchitecture;
}

export default function EfficientFrontierViz({ architecture: _architecture }: Props) {
  const assets = useMemo(() => generateAssets(), []);
  const allPortfolios = useMemo(() => generateRandomPortfolios(assets, MAX_PORTFOLIOS, 200), [assets]);

  const [visibleCount, setVisibleCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const riskMin = 0;
  const riskMax = 42;
  const retMin = -2;
  const retMax = 22;

  const sx = (risk: number) => PAD.left + ((risk - riskMin) / (riskMax - riskMin)) * PLOT_W;
  const sy = (ret: number) => PAD.top + ((retMax - ret) / (retMax - retMin)) * PLOT_H;

  // Compute efficient frontier (upper envelope)
  const frontier = useMemo(() => {
    const visible = allPortfolios.slice(0, visibleCount);
    if (visible.length < 10) return [];

    // Bucket by risk and find max return in each bucket
    const nBuckets = 30;
    const buckets: { risk: number; maxRet: number }[] = [];
    for (let i = 0; i < nBuckets; i++) {
      const rLow = riskMin + (i / nBuckets) * (riskMax - riskMin);
      const rHigh = riskMin + ((i + 1) / nBuckets) * (riskMax - riskMin);
      const inBucket = visible.filter(p => p.risk >= rLow && p.risk < rHigh);
      if (inBucket.length > 0) {
        const best = inBucket.reduce((max, p) => p.ret > max.ret ? p : max, inBucket[0]);
        buckets.push({ risk: (rLow + rHigh) / 2, maxRet: best.ret });
      }
    }
    return buckets.sort((a, b) => a.risk - b.risk);
  }, [allPortfolios, visibleCount]);

  // Special portfolios
  const minVariance = useMemo(() => {
    const visible = allPortfolios.slice(0, visibleCount);
    if (visible.length < 5) return null;
    return visible.reduce((min, p) => p.risk < min.risk ? p : min, visible[0]);
  }, [allPortfolios, visibleCount]);

  const tangency = useMemo(() => {
    const visible = allPortfolios.slice(0, visibleCount);
    if (visible.length < 5) return null;
    // Max Sharpe ratio
    return visible.reduce((best, p) => {
      const sharpe = (p.ret - RF_RATE) / (p.risk || 1);
      const bestSharpe = (best.ret - RF_RATE) / (best.risk || 1);
      return sharpe > bestSharpe ? p : best;
    }, visible[0]);
  }, [allPortfolios, visibleCount]);

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 50 / speed) {
      lastTimeRef.current = time;
      setVisibleCount(c => {
        if (c >= MAX_PORTFOLIOS) { setPlaying(false); return c; }
        return Math.min(c + BATCH_SIZE, MAX_PORTFOLIOS);
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

  const frontierPath = frontier.length > 2
    ? frontier.map(p => `${sx(p.risk)},${sy(p.maxRet)}`).join(' ')
    : '';

  // CML from risk-free to tangency
  const cmlPath = tangency
    ? `${sx(0)},${sy(RF_RATE)} ${sx(tangency.risk * 2)},${sy(RF_RATE + (tangency.ret - RF_RATE) / tangency.risk * tangency.risk * 2)}`
    : '';

  const stepText = visibleCount === 0
    ? '点击播放, 蒙特卡洛模拟构建有效前沿'
    : visibleCount >= MAX_PORTFOLIOS
    ? `模拟完成! ${MAX_PORTFOLIOS} 个组合 | Tangency Sharpe: ${tangency ? ((tangency.ret - RF_RATE) / tangency.risk).toFixed(2) : '--'}`
    : `模拟中... ${visibleCount}/${MAX_PORTFOLIOS} 个组合`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          有效前沿 Monte Carlo 模拟
        </h3>
        <span className="font-mono text-xs text-text-tertiary">{visibleCount}/{MAX_PORTFOLIOS}</span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {[0, 5, 10, 15, 20].map(v => (
            <g key={`ret-${v}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={sy(v)} y2={sy(v)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={PAD.left - 8} y={sy(v) + 4} fill="#6B7280" fontSize="9"
                fontFamily="var(--font-mono)" textAnchor="end">{v}%</text>
            </g>
          ))}
          {[0, 10, 20, 30, 40].map(v => (
            <g key={`risk-${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={PAD.top} y2={H - PAD.bottom}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={sx(v)} y={H - PAD.bottom + 18} fill="#6B7280" fontSize="9"
                fontFamily="var(--font-mono)" textAnchor="middle">{v}%</text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={W / 2} y={H - 8} fill="#8C909F" fontSize="11"
            fontFamily="var(--font-body)" textAnchor="middle">Risk (Std Dev %)</text>
          <text x={14} y={H / 2} fill="#8C909F" fontSize="11"
            fontFamily="var(--font-body)" textAnchor="middle"
            transform={`rotate(-90, 14, ${H / 2})`}>Expected Return %</text>

          {/* Random portfolios */}
          {allPortfolios.slice(0, visibleCount).map((p, i) => (
            <circle key={i} cx={sx(p.risk)} cy={sy(p.ret)} r="2"
              fill="rgba(59, 130, 246, 0.25)" />
          ))}

          {/* Efficient frontier */}
          {frontierPath && (
            <polyline points={frontierPath} fill="none"
              stroke="#4EDEA3" strokeWidth="2.5" strokeLinejoin="round" />
          )}

          {/* CML */}
          {cmlPath && visibleCount > 100 && (
            <polyline points={cmlPath} fill="none"
              stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.6" />
          )}

          {/* Risk-free rate */}
          <circle cx={sx(0)} cy={sy(RF_RATE)} r="4" fill="#F59E0B" />
          <text x={sx(0) + 8} y={sy(RF_RATE) + 4} fill="#F59E0B" fontSize="9"
            fontFamily="var(--font-mono)">Rf={RF_RATE}%</text>

          {/* Asset dots */}
          {assets.map((a, i) => (
            <g key={`asset-${i}`}>
              <circle cx={sx(a.risk)} cy={sy(a.ret)} r="4"
                fill="rgba(139, 92, 246, 0.6)" stroke="#8B5CF6" strokeWidth="1" />
              <text x={sx(a.risk) + 6} y={sy(a.ret) - 6} fill="#8C909F" fontSize="7"
                fontFamily="var(--font-mono)">{a.label}</text>
            </g>
          ))}

          {/* Min variance portfolio */}
          {minVariance && visibleCount > 50 && (
            <g>
              <polygon
                points={`${sx(minVariance.risk)},${sy(minVariance.ret) - 10} ${sx(minVariance.risk) - 7},${sy(minVariance.ret) + 5} ${sx(minVariance.risk) + 7},${sy(minVariance.ret) + 5}`}
                fill="none" stroke="#06B6D4" strokeWidth="2" />
              <text x={sx(minVariance.risk) + 10} y={sy(minVariance.ret)} fill="#06B6D4" fontSize="9"
                fontFamily="var(--font-mono)">Min Var</text>
            </g>
          )}

          {/* Tangency portfolio */}
          {tangency && visibleCount > 100 && (
            <g>
              {/* Diamond shape */}
              <polygon
                points={`${sx(tangency.risk)},${sy(tangency.ret) - 8} ${sx(tangency.risk) + 6},${sy(tangency.ret)} ${sx(tangency.risk)},${sy(tangency.ret) + 8} ${sx(tangency.risk) - 6},${sy(tangency.ret)}`}
                fill="none" stroke="#F59E0B" strokeWidth="2" />
              <text x={sx(tangency.risk) + 10} y={sy(tangency.ret)} fill="#F59E0B" fontSize="9"
                fontFamily="var(--font-mono)">Tangency</text>
            </g>
          )}

          {/* Legend */}
          <circle cx={W - 200} cy={PAD.top + 5} r="3" fill="rgba(59,130,246,0.4)" />
          <text x={W - 192} y={PAD.top + 9} fill="#8C909F" fontSize="9" fontFamily="var(--font-body)">Portfolio</text>
          <line x1={W - 140} x2={W - 122} y1={PAD.top + 5} y2={PAD.top + 5}
            stroke="#4EDEA3" strokeWidth="2" />
          <text x={W - 118} y={PAD.top + 9} fill="#8C909F" fontSize="9" fontFamily="var(--font-body)">Frontier</text>
          <line x1={W - 70} x2={W - 52} y1={PAD.top + 5} y2={PAD.top + 5}
            stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={W - 48} y={PAD.top + 9} fill="#8C909F" fontSize="9" fontFamily="var(--font-body)">CML</text>
        </svg>
      </div>

      <div className="px-6 py-3 border-t border-border-subtle flex items-center gap-4 flex-wrap">
        <button onClick={() => setPlaying(!playing)}
          className="w-8 h-8 rounded-full bg-accent-blue/20 hover:bg-accent-blue/30 flex items-center justify-center transition-colors">
          <span className="material-symbols-outlined text-accent-blue text-lg">
            {playing ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button onClick={() => { setPlaying(false); setVisibleCount(0); }}
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
