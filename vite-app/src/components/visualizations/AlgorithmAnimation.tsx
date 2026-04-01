import { useMemo, lazy, Suspense } from 'react';
import type { ModelArchitecture } from '../../types';

const GradientBoostingViz = lazy(() => import('./GradientBoostingViz'));
const DecisionBoundaryViz = lazy(() => import('./DecisionBoundaryViz'));
const RegularizationPathViz = lazy(() => import('./RegularizationPathViz'));
const NeuralNetworkFlowViz = lazy(() => import('./NeuralNetworkFlowViz'));
const RLTradingAgentViz = lazy(() => import('./RLTradingAgentViz'));
const GeneticProgrammingViz = lazy(() => import('./GeneticProgrammingViz'));
const PairsSpreadViz = lazy(() => import('./PairsSpreadViz'));
const EfficientFrontierViz = lazy(() => import('./EfficientFrontierViz'));

function getVizType(categoryId: string, tags: string[]): string {
  if (tags.some(t => ['gradient-boosting', 'lightgbm', 'xgboost'].includes(t))) return 'gradient-boosting';
  if (tags.some(t => ['svm', 'kernel-method', 'random-forest', 'kpca'].includes(t))) return 'decision-boundary';
  if (tags.some(t => ['regularization', 'linear-model', 'fama-macbeth', 'two-pass-regression'].includes(t))) return 'regularization-path';
  if (categoryId === 'deep-learning') return 'neural-network';
  if (categoryId === 'reinforcement-learning') return 'rl-trading';
  if (categoryId === 'alpha-mining') return 'genetic-programming';
  if (categoryId === 'stat-arbitrage') return 'pairs-spread';
  if (categoryId === 'portfolio-optimization') return 'efficient-frontier';
  if (categoryId === 'high-frequency') return 'rl-trading';
  if (tags.some(t => t.includes('ensemble') || t.includes('stacking'))) return 'gradient-boosting';
  return 'neural-network';
}

const VIZ_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<{ architecture?: ModelArchitecture }>>> = {
  'gradient-boosting': GradientBoostingViz,
  'decision-boundary': DecisionBoundaryViz,
  'regularization-path': RegularizationPathViz,
  'neural-network': NeuralNetworkFlowViz,
  'rl-trading': RLTradingAgentViz,
  'genetic-programming': GeneticProgrammingViz,
  'pairs-spread': PairsSpreadViz,
  'efficient-frontier': EfficientFrontierViz,
};

interface AlgorithmAnimationProps {
  categoryId: string;
  tags: string[];
  architecture?: ModelArchitecture;
}

export default function AlgorithmAnimation({ categoryId, tags, architecture }: AlgorithmAnimationProps) {
  const vizType = useMemo(() => getVizType(categoryId, tags), [categoryId, tags]);
  const VizComponent = VIZ_MAP[vizType] || NeuralNetworkFlowViz;

  return (
    <Suspense
      fallback={
        <div className="aspect-video w-full rounded-2xl bg-bg-card flex items-center justify-center">
          <div className="flex items-center gap-3 text-text-tertiary">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-mono text-sm">Loading visualization...</span>
          </div>
        </div>
      }
    >
      <VizComponent architecture={architecture} />
    </Suspense>
  );
}
