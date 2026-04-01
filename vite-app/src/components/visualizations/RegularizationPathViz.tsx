import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ModelArchitecture } from '../../types';

const W = 800;
const H = 450;
const PAD = { top: 50, right: 40, bottom: 60, left: 60 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const N_COEFS = 8;
const MAX_STEPS = 80;
const LOG_LAMBDA_MIN = -3;
const LOG_LAMBDA_MAX = 3;

// Initial coefficient values
const INIT_COEFS = [1.8, -1.2, 0.9, -0.5, 2.1, -0.3, 0.15, -1.5];
// At which log-lambda each coef goes to zero (lasso behavior)
const ZERO_AT = [2.2, 1.8, 0.5, -0.5, 2.8, -1.0, -2.0, 1.5];
const COEF_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#4EDEA3',
];
const COEF_LABELS = [
  'momentum_5d', 'vol_20d', 'rsi_14', 'spread',
  'beta', 'skew', 'book_val', 'eps_growth',
];

function coefValueLasso(idx: number, logLambda: number): number {
  const init = INIT_COEFS[idx];
  const zeroAt = ZERO_AT[idx];
  if (logLambda >= zeroAt) return 0;
  const t = (logLambda - LOG_LAMBDA_MIN) / (zeroAt - LOG_LAMBDA_MIN);
  const shrink = Math.max(0, 1 - t * t);
  return init * shrink;
}

function coefValueRidge(idx: number, logLambda: number): number {
  const init = INIT_COEFS[idx];
  // Ridge: coefficients shrink but never reach zero
  const lambda = Math.pow(10, logLambda);
  const shrink = 1 / (1 + lambda * 0.3);
  return init * shrink;
}

function coefValueElasticNet(idx: number, logLambda: number): number {
  const init = INIT_COEFS[idx];
  const zeroAt = ZERO_AT[idx];
  // Mix: some go to zero (like lasso) but later, others just shrink (like ridge)
  const lambda = Math.pow(10, logLambda);
  const ridgeShrink = 1 / (1 + lambda * 0.15);
  if (logLambda >= zeroAt + 0.5) return 0;
  if (logLambda >= zeroAt) {
    const fade = 1 - (logLambda - zeroAt) / 0.5;
    return init * ridgeShrink * fade;
  }
  return init * ridgeShrink;
}

type CoefFn = (idx: number, logLambda: number) => number;

function getCoefFn(regType: string): CoefFn {
  const t = regType.toLowerCase();
  if (t.includes('ridge')) return coefValueRidge;
  if (t.includes('elastic')) return coefValueElasticNet;
  return coefValueLasso;
}

interface Props {
  architecture?: ModelArchitecture;
}

export default function RegularizationPathViz({ architecture }: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const regName = useMemo(() => {
    if (!architecture) return 'Lasso';
    return architecture.algorithm ?? architecture.title ?? 'Lasso';
  }, [architecture]);

  const coefFn = useMemo(() => getCoefFn(regName), [regName]);

  const currentLogLambda = LOG_LAMBDA_MIN + (step / MAX_STEPS) * (LOG_LAMBDA_MAX - LOG_LAMBDA_MIN);

  const sx = (logL: number) => PAD.left + ((logL - LOG_LAMBDA_MIN) / (LOG_LAMBDA_MAX - LOG_LAMBDA_MIN)) * PLOT_W;
  const sy = (v: number) => PAD.top + ((2.5 - v) / 5) * PLOT_H; // range -2.5 to 2.5

  // Precompute paths
  const paths = useMemo(() => {
    return Array.from({ length: N_COEFS }, (_, idx) => {
      const pts: string[] = [];
      for (let i = 0; i <= 200; i++) {
        const logL = LOG_LAMBDA_MIN + (i / 200) * (LOG_LAMBDA_MAX - LOG_LAMBDA_MIN);
        pts.push(`${sx(logL)},${sy(coefFn(idx, logL))}`);
      }
      return pts.join(' ');
    });
  }, [coefFn]);

  // Current coef values
  const currentCoefs = useMemo(() => {
    return INIT_COEFS.map((_, idx) => coefFn(idx, currentLogLambda));
  }, [currentLogLambda, coefFn]);

  const eliminatedCount = currentCoefs.filter(c => c === 0).length;

  const animate = useCallback((time: number) => {
    if (time - lastTimeRef.current > 100 / speed) {
      lastTimeRef.current = time;
      setStep(s => {
        if (s >= MAX_STEPS) { setPlaying(false); return s; }
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

  const alphaStr = architecture?.params?.alpha ? ` (\u03B1=${architecture.params.alpha})` : '';
  const stepText = step === 0
    ? `点击播放, 观察 ${regName} 正则化路径${alphaStr}`
    : step >= MAX_STEPS
    ? `正则化完成! ${eliminatedCount} 个系数被消除`
    : `log(\u03BB) = ${currentLogLambda.toFixed(2)} | 剩余特征: ${N_COEFS - eliminatedCount}/${N_COEFS}`;

  return (
    <div className="aspect-video w-full rounded-2xl bg-bg-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h3 className="font-headline font-bold text-text-primary text-sm">
          {regName} 正则化路径
        </h3>
        <span className="font-mono text-xs text-text-tertiary">
          Eliminated: {eliminatedCount}/{N_COEFS}
        </span>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {[-2, -1, 0, 1, 2].map(v => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={sy(v)} y2={sy(v)}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD.left - 8} y={sy(v) + 4} fill="#6B7280" fontSize="10"
                fontFamily="var(--font-mono)" textAnchor="end">{v}</text>
            </g>
          ))}
          {/* Zero line */}
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(0)} y2={sy(0)}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

          {/* X-axis labels */}
          {[-2, -1, 0, 1, 2, 3].map(v => (
            <text key={v} x={sx(v)} y={H - PAD.bottom + 20} fill="#6B7280" fontSize="10"
              fontFamily="var(--font-mono)" textAnchor="middle">{v}</text>
          ))}
          <text x={W / 2} y={H - 10} fill="#8C909F" fontSize="12"
            fontFamily="var(--font-body)" textAnchor="middle">log(lambda)</text>
          <text x={15} y={H / 2} fill="#8C909F" fontSize="12"
            fontFamily="var(--font-body)" textAnchor="middle"
            transform={`rotate(-90, 15, ${H / 2})`}>Coefficient</text>

          {/* Coefficient paths */}
          {paths.map((path, idx) => (
            <polyline key={idx} points={path} fill="none"
              stroke={COEF_COLORS[idx]}
              strokeWidth={currentCoefs[idx] === 0 ? 1 : 2}
              opacity={currentCoefs[idx] === 0 ? 0.3 : 0.8} />
          ))}

          {/* Current lambda vertical line */}
          <line x1={sx(currentLogLambda)} x2={sx(currentLogLambda)}
            y1={PAD.top} y2={H - PAD.bottom}
            stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="6 4" />

          {/* Current coef dots on the vertical line */}
          {currentCoefs.map((val, idx) => (
            <circle key={idx} cx={sx(currentLogLambda)} cy={sy(val)} r={val === 0 ? 2 : 4}
              fill={COEF_COLORS[idx]} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          ))}

          {/* Labels for surviving coefficients on right side */}
          {currentCoefs.map((val, idx) => (
            val !== 0 && (
              <text key={`label-${idx}`} x={W - PAD.right + 5} y={sy(val) + 4}
                fill={COEF_COLORS[idx]} fontSize="9" fontFamily="var(--font-mono)">
                {COEF_LABELS[idx]}
              </text>
            )
          ))}

          {/* Eliminated labels */}
          {currentCoefs.map((val, idx) => (
            val === 0 && (
              <text key={`elim-${idx}`}
                x={sx(ZERO_AT[idx])} y={sy(0) + 14 + (idx % 3) * 12}
                fill={COEF_COLORS[idx]} fontSize="8" fontFamily="var(--font-mono)"
                textAnchor="middle" opacity="0.5">
                x {COEF_LABELS[idx]}
              </text>
            )
          ))}
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
