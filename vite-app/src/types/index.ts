export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  descriptionEn: string;
  count: number;
  surveyText: string;
  keyFindings: string[];
}

export interface Formula {
  label: string;
  latex: string;
}

export interface CodeCells {
  featureEngineering: string;
  modelTraining: string;
  backtestSignal: string;
}

export interface DiscussionStructured {
  strengths: string[];
  limitations: string[];
  improvements: string[];
}

export interface AnimationConfig {
  title: string;
  description: string;
  type: string;
}

export interface ArchLayer {
  type: string;
  label: string;
  params?: Record<string, number | string | boolean>;
}

export interface ArchBranch {
  name: string;
  layers: ArchLayer[];
}

export interface ModelArchitecture {
  modelId: string;
  archType: 'sequential' | 'branching' | 'multi-head' | 'transformer' | 'tree-ensemble' | 'kernel-method' | 'linear-regularized' | 'statistical';
  title: string;
  layers?: ArchLayer[];
  branches?: ArchBranch[];
  shared?: ArchLayer[];
  heads?: ArchBranch[];
  merger?: ArchLayer;
  algorithm?: string;
  params?: Record<string, number | string>;
}

export interface Model {
  id: string;
  categoryId: string;
  title: string;
  author: string;
  year: number;
  doi: string;
  scholarUrl: string;
  venue: string;
  paperTitle: string;
  abstract: string;
  algorithm: string;
  algorithmSummary: string;
  annReturn: number;
  sharpe: number;
  maxDD: number;
  winRate: number;
  calmarRatio: number;
  sortinoRatio: number;
  backtestPeriod: string;
  complexity: number;
  tags: string[];
  formulas: Formula[];
  steps: string[];
  codeSnippet: string;
  codeCells: CodeCells;
  discussion: string;
  discussionStructured: DiscussionStructured;
  animationConfig: AnimationConfig;
  notebookPath: string;
  sparkline: number[];
}
