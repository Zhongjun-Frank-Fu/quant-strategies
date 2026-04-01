// Paper-reported metrics (from notebook markdown and original papers)
// Models WITHOUT metrics are marked null - the UI must show "未回测" instead of "--"

export interface PaperMetrics {
  annReturn: number | null;
  sharpe: number | null;
  maxDD: number | null;
  winRate: number | null;
  metricsSource: 'paper' | 'notebook' | 'estimated' | 'unavailable';
}

export const PAPER_METRICS: Record<string, PaperMetrics> = {
  // === Multi-Factor (from notebook markdown) ===
  'lightgbm-wang2023': { annReturn: 69.33, sharpe: 2.41, maxDD: -15.2, winRate: null, metricsSource: 'paper' },
  'xgboost-sun2024': { annReturn: 20.10, sharpe: 1.12, maxDD: -18.5, winRate: null, metricsSource: 'paper' },
  'random-forest-fu2020': { annReturn: 57.0, sharpe: 2.21, maxDD: -12.8, winRate: null, metricsSource: 'paper' },
  'svm-liu2023': { annReturn: 41.25, sharpe: 1.65, maxDD: -22.3, winRate: null, metricsSource: 'paper' },
  'lasso-elastic-ridge-xu2023': { annReturn: 35.96, sharpe: 1.48, maxDD: -16.7, winRate: null, metricsSource: 'paper' },
  'kpca-regression-zhou2020': { annReturn: 41.0, sharpe: 1.72, maxDD: -19.1, winRate: null, metricsSource: 'paper' },
  'fama-macbeth-cui2022': { annReturn: null, sharpe: 2.27, maxDD: null, winRate: null, metricsSource: 'paper' },
  'stacking-ensemble-zheng2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },

  // === Deep Learning ===
  'lstm-gru-cheng2024': { annReturn: 32.06, sharpe: 1.85, maxDD: -5.14, winRate: 58.3, metricsSource: 'paper' },
  'quantformer-zhang2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'alphanet-v4-wu2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'cnn-lstm-zhuang2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'cnn-bilstm-attention-zhang2023': { annReturn: 35.16, sharpe: 1.52, maxDD: -14.2, winRate: null, metricsSource: 'paper' },
  'fcnn-chen2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'ranknet-li2021': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'wavelet-blstm-liang2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'mftr-guo2023': { annReturn: 26.92, sharpe: 1.35, maxDD: -11.7, winRate: null, metricsSource: 'paper' },
  'diff-lstm-emd-chen2024': { annReturn: 71.85, sharpe: 2.45, maxDD: -9.8, winRate: null, metricsSource: 'paper' },

  // === Reinforcement Learning ===
  'ppo-a2c-sac-ensemble-li2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'mtl-ddpg-deng2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'edpg-gru-ddpg-zhu2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'ppo-futures-chen2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'garch-ppo-wang2021': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'mctg-wang2021a': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'drpo-han2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'bandit-tradebot-zhang2021': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'inverse-rl-zhang2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },

  // === Alpha Mining ===
  'autoalpha-zhang2020': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'warm-gp-ren2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'llm-alpha-kou2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'chatgpt-nlp-lstm-zhang2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'lambdamart-zhang2021': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },

  // === Statistical Arbitrage ===
  'cointegration-kalman-he2023': { annReturn: null, sharpe: null, maxDD: null, winRate: 81.0, metricsSource: 'paper' },
  'ecm-pairs-wang2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'lstm-arbitrage-han2024': { annReturn: 23.0, sharpe: 1.15, maxDD: -8.5, winRate: null, metricsSource: 'paper' },
  'svm-pairs-yu2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },

  // === High Frequency ===
  'improved-bollinger-gong2024': { annReturn: 123.9, sharpe: 3.26, maxDD: -13.7, winRate: null, metricsSource: 'paper' },
  'lever-yuan2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'rl-hft-tuning-zhang2023': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'hft-infra-chen2024': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },

  // === Portfolio Optimization ===
  'bl-ledoit-wolf-zeng2022': { annReturn: 36.6, sharpe: 1.82, maxDD: -11.2, winRate: null, metricsSource: 'paper' },
  'ac-cvar-ju2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'mv-ml-predictions-han2023': { annReturn: 59.4, sharpe: 2.28, maxDD: -14.6, winRate: null, metricsSource: 'paper' },
  'scoring-screening-li2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'monte-carlo-kmeans-wang2022': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
  'higher-moments-liu2020': { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' },
};

// Helper: get metrics for a model, falling back to model's own values
export function getModelMetrics(modelId: string, modelData: { annReturn: number; sharpe: number; maxDD: number }) {
  const pm = PAPER_METRICS[modelId];
  if (pm) return pm;
  // Fallback: if model has nonzero values in its own data, treat as notebook source
  if (modelData.annReturn > 0 || modelData.sharpe > 0 || modelData.maxDD < 0) {
    return {
      annReturn: modelData.annReturn > 0 ? modelData.annReturn : null,
      sharpe: modelData.sharpe > 0 ? modelData.sharpe : null,
      maxDD: modelData.maxDD < 0 ? modelData.maxDD : null,
      winRate: null,
      metricsSource: 'notebook' as const,
    };
  }
  return { annReturn: null, sharpe: null, maxDD: null, winRate: null, metricsSource: 'unavailable' as const };
}

// Check if model has any real metric data
export function hasRealMetrics(modelId: string): boolean {
  const pm = PAPER_METRICS[modelId];
  if (!pm) return false;
  return pm.metricsSource !== 'unavailable';
}
