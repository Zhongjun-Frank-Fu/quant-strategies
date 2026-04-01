# 🏛️ QuantLab — 中国私募基金量化交易策略可视化平台

## Frontend Specification Document v1.0

---

## 1. 项目概览

### 1.1 愿景

将 46 个量化交易策略 Jupyter Notebook 包装为一个**高端金融科技风格的交互式 HTML 静态网站**，作为策略库的统一展示门户。用户可以浏览 7 大策略类别、深入探索每个模型的算法原理、论文来源、核心公式、代码片段和回测结果。

### 1.2 核心定位

```
┌─────────────────────────────────────────────────────────────┐
│                     QuantLab 网站                            │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  导航门户  │ → │  策略详情页   │ → │  Jupyter Notebook │    │
│  │ (HTML)    │   │ (HTML)       │   │  (Python 代码)     │    │
│  └──────────┘   └──────────────┘   └──────────────────┘    │
│     前端展示层         前端展示层          后端计算层            │
└─────────────────────────────────────────────────────────────┘
```

- **前端 HTML 层**: 视觉展示、交互导航、原理动画、公式渲染、代码高亮、图表展示
- **后端 Notebook 层**: 实际 Python 代码执行、数据回测、模型训练（用户在本地 Jupyter 中运行）

### 1.3 技术栈选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 构建工具 | **Vite** | 快速 HMR, 原生 ESM, 零配置 |
| UI 框架 | **React 18 + TypeScript** | 组件化、类型安全、生态最大 |
| 样式方案 | **Tailwind CSS 4** | 原子化 CSS, 暗色主题原生支持, 金融风格快速定制 |
| 路由 | **React Router v7** (hash mode) | 静态部署无需服务器, `#/category/model` |
| 公式渲染 | **KaTeX** | 比 MathJax 快 100x, SSR-safe |
| 代码高亮 | **Shiki** | VS Code 级语法高亮, 支持 Python/JSON |
| 图表 | **Plotly.js (react-plotly.js)** | 与 Notebook 中 Plotly 图表一致 |
| 动画 | **Framer Motion** | 页面过渡、卡片入场、滚动触发 |
| 数据可视化 | **D3.js** (辅助) | 力导向图、Sankey 流程图等特殊可视化 |
| 图标 | **Lucide React** | 轻量、一致、金融图标丰富 |
| 构建产物 | 纯静态 HTML/CSS/JS | 可部署到 GitHub Pages / Vercel / 任意静态托管 |

---

## 2. 设计系统 (Design System)

### 2.1 视觉风格: "Terminal Luxe" (终端奢华)

融合**彭博终端**的数据密度 + **苹果官网**的留白节奏 + **Stripe 文档**的代码优雅。

### 2.2 色彩体系

```
色彩模式: 仅暗色 (Dark Only) — 符合金融终端传统

Background:
  --bg-primary:    #0A0E17     (深海蓝黑 — 主背景)
  --bg-secondary:  #111827     (轻灰蓝 — 卡片/容器)
  --bg-elevated:   #1F2937     (浮层/弹窗)
  --bg-hover:      #374151     (悬停态)

Text:
  --text-primary:  #F9FAFB     (近白 — 标题)
  --text-secondary:#9CA3AF     (暖灰 — 正文)
  --text-tertiary: #6B7280     (淡灰 — 辅助/标签)

Accent (每个策略类别一个主题色):
  01 多因子选股:     #3B82F6  (蓝)     icon: BarChart3
  02 深度学习:       #8B5CF6  (紫)     icon: Brain
  03 强化学习:       #10B981  (绿)     icon: Gamepad2
  04 Alpha挖掘:     #F59E0B  (金)     icon: Pickaxe
  05 统计套利:       #EF4444  (红)     icon: GitCompare
  06 高频交易:       #06B6D4  (青)     icon: Zap
  07 组合优化:       #EC4899  (粉)     icon: PieChart

Signal Colors:
  --green:  #22C55E   (收益正 / 买入)
  --red:    #EF4444   (收益负 / 卖出)
  --amber:  #F59E0B   (警告 / 回撤)
```

### 2.3 字体系统

```
标题字体:   "Space Grotesk", "Inter", system-ui, sans-serif
正文字体:   "Inter", "Noto Sans SC", system-ui, sans-serif
代码字体:   "JetBrains Mono", "Fira Code", monospace
公式字体:   KaTeX 内置 (Latin Modern Math)
数据字体:   "Tabular Nums" variant of Inter (等宽数字)
```

### 2.4 间距与布局

```
最大宽度:     1440px (内容区)
栅格系统:     12-column, gap: 24px
卡片圆角:     12px (lg), 8px (md), 4px (sm)
卡片边框:     1px solid rgba(255,255,255,0.06)
卡片阴影:     0 4px 24px rgba(0,0,0,0.25)
页面侧边距:   clamp(16px, 4vw, 80px)
节间距:       80px (desktop), 48px (mobile)
```

### 2.5 动效规范

```
页面转场:     Framer Motion, spring(stiffness: 300, damping: 30), 300ms
卡片入场:     stagger delay 50ms, fadeIn + translateY(20px)
悬停反馈:     scale(1.02), border glow, 200ms ease
滚动触发:     Intersection Observer, threshold 0.2
数字计数:     countUp animation, 1.5s, easeOutExpo
图表动画:     Plotly transition 800ms
```

---

## 3. 信息架构 (IA)

### 3.1 路由结构

```
#/                          → 首页 (Hero + 总览仪表盘)
#/category/:categoryId      → 分类页 (如 #/category/multi-factor)
#/model/:modelId            → 模型详情页 (如 #/model/lightgbm-wang2023)
#/compare                   → 策略对比页 (跨模型性能对比)
#/about                     → 关于页 (研究背景 + 数据来源)
```

### 3.2 全局导航

```
┌───────────────────────────────────────────────────────────────┐
│ ◉ QuantLab     多因子 深度学习 强化学习 Alpha 套利 高频 组合    │
│                                              [🔍] [对比] [关于] │
└───────────────────────────────────────────────────────────────┘
```

- 左侧: Logo + 品牌名
- 中间: 7 个分类 Tab（带彩色下划线指示器 + 模型数量 badge）
- 右侧: 全局搜索 (⌘K)、策略对比入口、关于

### 3.3 数据模型

```typescript
// 核心数据结构 — 从 Notebook 元数据静态提取

interface Category {
  id: string;              // "multi-factor"
  name: string;            // "多因子选股"
  nameEn: string;          // "Multi-Factor Stock Selection"
  icon: LucideIcon;        // BarChart3
  color: string;           // "#3B82F6"
  description: string;     // 分类简介 (2-3句)
  models: Model[];
}

interface Model {
  id: string;              // "lightgbm-wang2023"
  title: string;           // "LightGBM 多因子选股策略"
  titleEn: string;         // "LightGBM Multi-Factor Stock Selection"
  algorithm: string;       // "LightGBM (Gradient Boosting)"

  // 论文元数据
  paper: {
    title: string;         // "Research on ML Driven Stock Selection Strategy"
    authors: string[];     // ["Kerang Wang"]
    year: number;          // 2023
    doi: string;           // "10.54254/2754-1169/49/20230529"
    venue: string;         // journal/conference name
    abstract: string;      // 论文摘要 (中文, 3-5句)
  };

  // 算法原理
  principle: {
    summary: string;       // 一段话概述 (100字内)
    keyFormulas: Formula[]; // 核心公式列表 (KaTeX)
    steps: string[];       // 算法步骤 (有序列表)
    innovations: string[]; // 论文中的创新点
  };

  // 回测绩效
  performance: {
    annualizedReturn: number;   // 0.6933
    sharpeRatio: number;        // 2.21
    maxDrawdown: number;        // 0.21
    winRate?: number;           // 0.58
    calmarRatio?: number;
    benchmarkReturn: number;    // 基准同期收益
    backtestPeriod: string;     // "2021-01 ~ 2024-12"
  };

  // 代码片段 (从 Notebook 提取的关键 cell)
  codeSnippets: {
    modelDefinition: string;   // 模型核心代码 (Cell 7)
    featureEngineering: string; // 因子/特征代码 (Cell 6)
    backtestLogic: string;     // 回测逻辑 (Cell 8)
  };

  // 可视化
  visualizations: {
    equityCurve: PlotlyJSON;    // 累计收益曲线
    drawdown: PlotlyJSON;       // 回撤图
    principleAnimation: PlotlyJSON; // 原理动画
    featureImportance?: PlotlyJSON;
  };

  // Notebook 链接
  notebookPath: string;        // "01_multi_factor/01_lightgbm_wang2023.ipynb"

  // 标签
  tags: string[];              // ["gradient-boosting", "monthly-rebalance", "csi300"]
  complexity: "low" | "medium" | "high" | "extreme";
  dataFrequency: "daily" | "minute" | "tick";
}

interface Formula {
  label: string;     // "目标函数"
  latex: string;     // "\\mathcal{L}(\\phi) = ..."
  note?: string;     // 简要说明
}
```

---

## 4. 页面设计 (逐页详细)

### 4.1 首页 (`#/`)

#### 4.1.1 Hero Section

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│          ◆ Q U A N T L A B                                     │
│                                                                 │
│     中国私募基金量化交易策略全景图                                  │
│     A Comprehensive Atlas of Quantitative Trading               │
│     Strategies in Chinese Private Equity Funds                  │
│                                                                 │
│     基于 80 篇学术论文 · 7 大策略类别 · 46 个独立模型实现           │
│                                                                 │
│     [探索策略库 →]          [查看研究报告 ↓]                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  动态背景: 半透明浅色粒子网络 (股票连接图谱意象)               │  │
│  │  粒子缓慢移动 + 连线脉动 (Canvas / Three.js 轻量实现)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**技术要点**:
- 背景: `<canvas>` 粒子网络, 100 个节点, 边连接距离 150px, opacity 0.15
- Logo "QUANTLAB" 使用 `Space Grotesk`, letter-spacing: 0.3em, font-weight: 300
- 副标题中文/英文双语, 英文用 text-secondary 色
- CTA 按钮: `bg-gradient-to-r from-blue-600 to-purple-600`, 圆角 pill

#### 4.1.2 数据仪表盘 (Stats Dashboard)

紧接 Hero 下方, 5 个统计大数字横排:

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│   80    │  │   46    │  │    7    │  │  2020   │  │  1.5万亿 │
│  篇论文  │  │  个模型  │  │ 大类别   │  │ -2024年  │  │ 管理规模  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

- 数字使用 countUp 动画 (Intersection Observer 触发)
- 字号: 数字 48px/font-bold, 标签 14px/text-secondary
- 底部有一条极细的 gradient 分割线

#### 4.1.3 策略全景矩阵 (Strategy Landscape)

**核心交互**: 一个 7 列蜂巢/网格布局, 每列是一个策略类别

```
┌───────────────────────────────────────────────────────────────┐
│                   策略全景 Strategy Landscape                   │
│                                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  │ 🔵   │ │ 🟣   │ │ 🟢   │ │ 🟡   │ │ 🔴   │ │ 🔵   │ │ 🩷   │
│  │多因子 │ │深度  │ │强化  │ │Alpha│ │统计  │ │高频  │ │组合  │
│  │ 8个   │ │ 10个 │ │ 9个  │ │ 5个  │ │ 4个  │ │ 4个  │ │ 6个  │
│  ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤
│  │LGB   │ │LSTM  │ │PPO   │ │Auto  │ │Coint │ │Boll  │ │B-L   │
│  │XGB   │ │Trans │ │DDPG  │ │GP    │ │ECM   │ │LEVER │ │CVaR  │
│  │RF    │ │Alpha │ │EDPG  │ │LLM   │ │LSTM  │ │RL    │ │ML+MV │
│  │SVM   │ │CNN-L │ │PPO-F │ │NLP   │ │SVM   │ │Infra │ │Score │
│  │Lasso │ │BiLST │ │GARCH │ │LambM │ │      │ │      │ │MC    │
│  │KPCA  │ │FCNN  │ │MCTG  │ │      │ │      │ │      │ │HiMom │
│  │F-M   │ │RankN │ │DRPO  │ │      │ │      │ │      │ │      │
│  │Stack │ │WavBL │ │Band  │ │      │ │      │ │      │ │      │
│  │      │ │MFTR  │ │InvRL │ │      │ │      │ │      │ │      │
│  │      │ │EMD   │ │      │ │      │ │      │ │      │ │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
└───────────────────────────────────────────────────────────────┘
```

**交互**:
- 每个小方块 hover → 发光 + tooltip 显示模型名 + 年化收益
- 点击 → 跳转 `#/model/:id`
- 方块大小可按复杂度/收益率映射 (面积编码)
- 列头点击 → 跳转 `#/category/:id`

#### 4.1.4 性能排行榜 (Performance Leaderboard)

一个可排序表格, 展示全部 46 个模型的关键指标:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  # │ 模型              │ 类别     │ 年化收益  │ 夏普比 │ 最大回撤 │ 复杂度  │
│ ───┼───────────────────┼─────────┼──────────┼───────┼────────┼──────── │
│  1 │ Improved Bollinger │ 高频    │  123.9%  │  3.26 │ 13.7%  │ ★★☆☆  │
│  2 │ Diff-LSTM-EMD     │ 深度学习 │   99.6%  │  2.85 │ 18.3%  │ ★★★★  │
│  3 │ LightGBM          │ 多因子   │   69.3%  │  2.41 │ 15.2%  │ ★★☆☆  │
│ ...│ ...               │ ...     │  ...     │  ...  │  ...   │  ...   │
└──────────────────────────────────────────────────────────────────────────┘
```

**交互**:
- 列头点击排序 (asc/desc toggle)
- 类别列有彩色 pill badge
- 行 hover 高亮, 点击进入详情
- 年化收益 / 夏普 使用条件色 (绿→红渐变)
- 固定表头 (sticky header)
- 移动端横向滚动

#### 4.1.5 研究概要 (Research Summary)

从 PDF 报告提取的关键发现, 4 张信息卡:

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 📈 市场趋势  │ │ 🧠 技术演进  │ │ ⚖️ 监管环境  │ │ 🎯 核心发现  │
│             │ │             │ │             │ │             │
│ 量化交易份额  │ │ LGBM→Trans  │ │ T+1约束     │ │ 梯度提升最稳  │
│ 20%→30%    │ │ →RL→LLM    │ │ 做空限制     │ │ Ensemble最优 │
│ (2020-2024) │ │ 演进路线     │ │ 2024新规     │ │ RL最前沿     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

### 4.2 分类页 (`#/category/:id`)

#### 4.2.1 分类 Header

```
┌─────────────────────────────────────────────────────────────────┐
│  🔵 多因子选股                                                   │
│  Multi-Factor Quantitative Stock Selection                      │
│                                                                 │
│  基于价值/动量/质量/技术等多维因子构建截面收益预测模型，              │
│  通过机器学习方法在 A 股市场上进行月度/周度调仓选股。               │
│                                                                 │
│  8 个模型 · 6 篇论文 · 数据: CSI300 成分股 · 2021-2024           │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 模型卡片网格

每行 3 个 (desktop), 2 个 (tablet), 1 个 (mobile):

```
┌──────────────────────┐
│  LightGBM            │ ← 模型名 (20px bold)
│  Kerang Wang, 2023   │ ← 作者, 年份 (text-tertiary)
│                      │
│  ┌────────────────┐  │
│  │ 简化收益曲线图   │  │ ← Sparkline (SVG, 100x40px)
│  │   ╱╲  ╱╲╱╲    │  │
│  │  ╱  ╲╱       │  │
│  └────────────────┘  │
│                      │
│  年化 69.33%  ↑      │ ← 绿色 (正收益)
│  夏普 2.41           │
│  回撤 -15.2%         │
│                      │
│  [gradient-boosting]  │ ← Tag pills
│  [monthly-rebalance]  │
│                      │
│  ★★☆☆ 中等复杂度     │
│                      │
│  [查看详情 →]         │
└──────────────────────┘
```

**交互**:
- 整张卡片可点击
- Hover: 微微上浮 (translateY -4px) + 左侧边框出现类别色 accent bar
- Sparkline 用 SVG path 绘制, 数据取回测 equity curve 的采样点

#### 4.2.3 分类内对比雷达图

所有同类模型在同一个 Plotly 雷达图中对比:

```
维度: 年化收益 | 夏普比 | 最大回撤(反转) | 胜率 | 复杂度(反转)
```

---

### 4.3 模型详情页 (`#/model/:id`) ⭐ 核心页面

这是整个网站最重要的页面, 每个模型一个实例, 共 46 种。

#### 4.3.1 总体布局

```
┌────────────────────────────────────────────────────────────────────┐
│ [← 返回 多因子选股]                                                 │
│                                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │                    模型 Header                                 │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌──────────────────┐  ┌──────────────────────────────────────────┐│
│ │ 侧边 TOC 导航     │  │                                          ││
│ │                  │  │  § 1. 论文摘要                             ││
│ │ 1. 论文摘要       │  │  § 2. 算法原理                             ││
│ │ 2. 算法原理       │  │  § 3. 原理动画                             ││
│ │ 3. 原理动画       │  │  § 4. 核心代码                             ││
│ │ 4. 核心代码 ←     │  │  § 5. 回测结果                             ││
│ │ 5. 回测结果       │  │  § 6. 结果讨论                             ││
│ │ 6. 结果讨论       │  │                                          ││
│ │                  │  │  [在 Jupyter 中打开 →]                     ││
│ └──────────────────┘  └──────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 模型 Header

```
┌─────────────────────────────────────────────────────────────────┐
│  🔵 多因子选股 > LightGBM                                        │
│                                                                 │
│  LightGBM 多因子选股策略                                          │
│  LightGBM Multi-Factor Stock Selection Strategy                 │
│                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐                  │
│  │ 69.33% │ │  2.41  │ │ -15.2% │ │ 2021-24 │                  │
│  │ 年化收益 │ │ 夏普比  │ │ 最大回撤│ │ 回测区间  │                  │
│  └────────┘ └────────┘ └────────┘ └─────────┘                  │
│                                                                 │
│  [gradient-boosting] [csi300] [monthly] [★★☆☆ 中等]              │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.3 § 1. 论文摘要 (Paper Abstract)

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 论文参考                                                      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Research on Machine Learning Driven Stock Selection Strategy│ │
│  │                                                            │ │
│  │ Kerang Wang · 2023                                         │ │
│  │ DOI: 10.54254/2754-1169/49/20230529  [↗ 查看原文]           │ │
│  │                                                            │ │
│  │ 本文研究了基于机器学习的量化选股策略，采用 LightGBM 梯度       │ │
│  │ 提升模型对 A 股市场进行截面收益预测。通过构建包含动量、波动率、 │ │
│  │ 技术指标等多维因子体系，使用滚动窗口训练模型并月度调仓，       │ │
│  │ 策略在回测期内取得了年化 69.33% 的收益率，显著超越基准指数。   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**样式**: 引用块 (blockquote 风格, 左侧 accent 色条, bg-secondary 底色)

#### 4.3.4 § 2. 算法原理 (Algorithm Principle)

**这是最重要的教育性内容区域**, 包含:

**a) 一句话概述** (大字体, 18px)

**b) 核心公式卡片** (KaTeX 渲染):

```
┌──────────────────────────────────────────┐
│  ⚡ 目标函数                              │
│                                          │
│  𝓛(ϕ) = Σᵢ l(yᵢ, ŷᵢ) + Σₖ Ω(fₖ)       │  ← KaTeX 渲染
│                                          │
│  其中 l 是损失函数，Ω(fₖ) = γT + ½λ‖w‖²  │
│  是正则化项                               │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  ⚡ 逐轮迭代                              │
│                                          │
│  ŷᵢ⁽ᵗ⁾ = ŷᵢ⁽ᵗ⁻¹⁾ + η · fₜ(xᵢ)          │  ← KaTeX 渲染
│                                          │
│  第 t 轮的预测 = 上轮预测 + 学习率×新树     │
└──────────────────────────────────────────┘
```

**c) 算法步骤** (有序列表, 带图标):

```
① 构建多维因子矩阵 (动量 / 波动率 / 技术指标)
② 计算截面收益排名标签 (回归目标: 下月收益率)
③ 滚动窗口训练 LightGBM 回归模型 (12 个月训练窗口)
④ 对全样本预测排序, 选取 Top-N 构建组合
⑤ 月度调仓, 等权配置, 计算组合收益
```

**d) 创新点** (highlight box):
```
💡 LightGBM 核心优化:
   • GOSS (梯度单边采样) — 只保留大梯度样本
   • EFB (互斥特征捆绑) — 减少特征维度
   • 直方图算法 — O(data×features) → O(bins×features)
```

#### 4.3.5 § 3. 原理动画 (Principle Animation)

**嵌入从 Notebook 提取的 Plotly 交互图表**, 或重新构建的 HTML5 动画:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎬 算法原理动画                                                  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │        [Plotly 交互式动画]                                   │ │
│  │                                                            │ │
│  │  梯度提升逐轮拟合过程:                                       │ │
│  │  Round 1 → Round 2 → ... → Round 100                      │ │
│  │                                                            │ │
│  │  [▶ 播放]  [⏸ 暂停]  [⟲ 重置]   速度: [1x ▼]              │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💬 解读: 每一轮新树都在拟合前一轮的残差, 可以看到预测曲线          │
│     逐步逼近真实值, 同时 MSE 持续下降。                           │
└─────────────────────────────────────────────────────────────────┘
```

**实现方案**:
- 优先嵌入 Notebook Cell 3 的 Plotly JSON (通过 `react-plotly.js` 渲染)
- Plotly 图支持 `animation_frame` 播放控制
- 下方有 1-2 句文字解读

#### 4.3.6 § 4. 核心代码 (Code Implementation)

**三个 Tab**: 模型定义 | 特征工程 | 回测逻辑

```
┌─────────────────────────────────────────────────────────────────┐
│  💻 核心代码                                                      │
│                                                                 │
│  [模型定义] [特征工程] [回测逻辑]                                   │
│  ─────────                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ```python                                                 │ │
│  │  # LightGBM 模型训练 (滚动窗口)                              │ │
│  │  import lightgbm as lgb                                    │ │
│  │                                                            │ │
│  │  params = {                                                │ │
│  │      'objective': 'regression',                            │ │
│  │      'metric': 'mse',                                     │ │
│  │      'num_leaves': 63,                                     │ │
│  │      'learning_rate': 0.05,                                │ │
│  │      'feature_fraction': 0.8,                              │ │
│  │      'bagging_fraction': 0.8,                              │ │
│  │      'verbose': -1                                         │ │
│  │  }                                                         │ │
│  │                                                            │ │
│  │  model = lgb.train(params, train_set, ...)                 │ │
│  │  ```                                                       │ │
│  │                                         [📋 复制代码]       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  行号 · 语法高亮 (Shiki, VS Code Dark+主题)                       │
└─────────────────────────────────────────────────────────────────┘
```

**功能**:
- Shiki 代码高亮 (VS Code One Dark Pro 主题)
- 行号显示
- 一键复制按钮
- 代码可折叠/展开
- 关键行高亮 (黄色底色标注核心逻辑行)

#### 4.3.7 § 5. 回测结果 (Backtest Results)

**四象限可视化**:

```
┌───────────────────────────────┬───────────────────────────────┐
│  📈 累计收益曲线               │  📉 水下回撤图                  │
│  ┌───────────────────────┐   │  ┌───────────────────────┐   │
│  │ 策略(蓝) vs 基准(灰)   │   │  │ 回撤深度 (橙色填充)    │   │
│  │      ╱╲               │   │  │     ╲╱                │   │
│  │    ╱    ╲  ╱╲╱╲      │   │  │       ╲╱╲             │   │
│  └───────────────────────┘   │  └───────────────────────┘   │
├───────────────────────────────┼───────────────────────────────┤
│  📊 关键指标                   │  🏆 绩效汇总表                  │
│                               │                               │
│  ┌──────────────────────┐    │  年化收益    69.33%  ✅         │
│  │ 月度收益分布直方图     │    │  夏普比率     2.41   ✅         │
│  │   ▓▓▓▓▓▓████         │    │  最大回撤   -15.2%   ⚠️        │
│  │      ▓▓▓▓▓▓▓▓████    │    │  Calmar      4.56   ✅         │
│  └──────────────────────┘    │  胜率        58.3%             │
│                               │  基准同期    12.5%             │
│                               │  超额收益    56.8%  🔥         │
└───────────────────────────────┴───────────────────────────────┘
```

**图表全部使用 Plotly.js**, 与 Notebook 中输出保持一致。

#### 4.3.8 § 6. 结果讨论

Markdown 渲染, 包含:
- 策略优势 / 局限性 / 改进方向
- 与论文报告数值的对比说明
- 在 Jupyter 中运行的指南

#### 4.3.9 底部导航

```
┌──────────────────────────────────────────────┐
│  ← SVM 多因子选股             Lasso/Ridge →  │
│     04_svm_liu2023     05_lasso_ridge_xu2023  │
└──────────────────────────────────────────────┘
```

---

### 4.4 策略对比页 (`#/compare`)

#### 4.4.1 选择器

```
最多选择 5 个模型进行对比:
┌──────────────────────────────────────────┐
│  选择模型 (最多5个):                       │
│  [✅ LightGBM] [✅ XGBoost] [✅ LSTM]     │
│  [☐ Random Forest] [☐ SVM] ...           │
│                                          │
│  [开始对比 →]                              │
└──────────────────────────────────────────┘
```

#### 4.4.2 对比视图

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 累计收益对比 (所有选中模型同一张图)                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  LightGBM ── XGBoost ── LSTM ── Benchmark                │ │
│  │         /\     /\                                         │ │
│  │  ______/  \___/  \_____                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📊 指标雷达图对比         📊 风险收益散点图                        │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │    年化收益        │    │  y: 收益率         │                  │
│  │   ╱        ╲      │    │    ●LGB            │                  │
│  │ 复杂度    夏普     │    │  ●XGB    ●LSTM     │                  │
│  │   ╲        ╱      │    │          ●RF       │                  │
│  │    回撤            │    │  x: 波动率         │                  │
│  └──────────────────┘    └──────────────────┘                  │
│                                                                 │
│  📋 指标对比表格                                                  │
│  ┌───────────┬──────┬──────┬──────┐                             │
│  │           │ LGB  │ XGB  │ LSTM │                             │
│  │ 年化收益   │69.3% │68.8% │32.1% │                             │
│  │ 夏普比    │ 2.41 │ 2.38 │ 1.85 │                             │
│  │ 最大回撤  │15.2% │16.1% │ 5.1% │                             │
│  │ 复杂度    │ 中   │  中  │ 中高  │                             │
│  └───────────┴──────┴──────┴──────┘                             │
│  (最高值绿色高亮, 最低值红色高亮)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.5 关于页 (`#/about`)

- 研究背景: 中国私募基金量化交易现状 (2020-2024)
- 数据来源: Elicit 报告 80 篇论文检索过程
- 技术架构: 项目技术栈说明
- 使用指南: 如何在本地运行 Notebook
- 参考文献: 全部 80 篇论文的引用列表

---

## 5. 数据管道 (Data Pipeline)

### 5.1 静态数据提取

在构建时从 46 个 Notebook 中提取元数据, 生成 JSON:

```
scripts/
  extract_metadata.py    # 从 .ipynb 提取标题/作者/公式/代码片段
  extract_plotly.py      # 从 .ipynb output cells 提取 Plotly JSON
  build_data.py          # 汇总生成 src/data/models.json
```

```bash
# 构建流程
python scripts/build_data.py          # 提取 Notebook 元数据 → JSON
npm run build                         # Vite 构建 → dist/
```

### 5.2 生成的数据文件

```
src/data/
  categories.json        # 7个分类的元信息
  models.json            # 46个模型的完整元数据
  formulas.json          # 所有KaTeX公式
  code_snippets/         # 46个模型的代码片段 (.py 文件)
  plotly_charts/         # 46×4个 Plotly JSON 图表
  performance.json       # 46个模型的绩效指标汇总
```

### 5.3 数据更新流程

```
修改 Notebook → 重新运行 Notebook → python build_data.py → npm run build
```

---

## 6. 组件架构

### 6.1 组件树

```
App
├── Layout
│   ├── Navbar                    # 全局导航
│   ├── CommandPalette            # ⌘K 搜索弹窗
│   └── Footer
├── Pages
│   ├── HomePage
│   │   ├── HeroSection           # 粒子背景 + 标题
│   │   ├── StatsDashboard        # 5个统计数字
│   │   ├── StrategyLandscape     # 7列策略矩阵
│   │   ├── Leaderboard           # 排行榜表格
│   │   └── ResearchSummary       # 研究概要卡
│   ├── CategoryPage
│   │   ├── CategoryHeader        # 分类 banner
│   │   ├── ModelCardGrid         # 模型卡片网格
│   │   │   └── ModelCard         # 单张卡片
│   │   └── CategoryRadar        # 分类内雷达图
│   ├── ModelDetailPage
│   │   ├── ModelHeader           # 模型 header + 指标
│   │   ├── SideTableOfContents   # 侧边 TOC
│   │   ├── PaperAbstract         # 论文摘要
│   │   ├── AlgorithmPrinciple    # 算法原理
│   │   │   ├── FormulaCard       # 公式卡片
│   │   │   ├── StepList          # 步骤列表
│   │   │   └── InnovationBox     # 创新点
│   │   ├── PrincipleAnimation    # Plotly 动画
│   │   ├── CodeSection           # 代码区
│   │   │   ├── CodeTabs          # Tab切换
│   │   │   └── CodeBlock         # Shiki高亮
│   │   ├── BacktestResults       # 回测结果
│   │   │   ├── EquityCurveChart  # 收益曲线
│   │   │   ├── DrawdownChart     # 回撤图
│   │   │   ├── ReturnDistChart   # 收益分布
│   │   │   └── MetricsTable     # 指标表
│   │   ├── Discussion            # 结果讨论
│   │   └── PrevNextNav           # 前后导航
│   ├── ComparePage
│   │   ├── ModelSelector         # 多选器
│   │   ├── CompareChart          # 收益对比图
│   │   ├── RadarCompare          # 雷达对比
│   │   └── CompareTable          # 指标表
│   └── AboutPage
└── Shared Components
    ├── PlotlyChart               # Plotly 渲染器封装
    ├── KaTeXFormula              # 公式渲染器
    ├── CodeHighlight             # Shiki 代码块
    ├── Sparkline                 # SVG 迷你图
    ├── CountUp                   # 数字滚动
    ├── Badge                     # 标签/pill
    ├── Tooltip                   # 提示气泡
    ├── ScrollReveal               # 滚动入场动画容器
    └── ParticleBackground        # 粒子背景
```

### 6.2 关键共享组件 API

```typescript
// PlotlyChart — 统一 Plotly 渲染
interface PlotlyChartProps {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  className?: string;
  responsive?: boolean;   // default true
}

// KaTeXFormula — 公式渲染
interface KaTeXFormulaProps {
  latex: string;
  displayMode?: boolean;  // default true (块级)
  label?: string;         // "目标函数"
  note?: string;          // 简要说明
}

// CodeHighlight — 代码高亮
interface CodeHighlightProps {
  code: string;
  language: "python" | "json";
  highlightLines?: number[];  // 高亮行号
  showLineNumbers?: boolean;  // default true
  maxHeight?: string;         // 可折叠
  copyable?: boolean;         // default true
}

// ModelCard — 模型预览卡
interface ModelCardProps {
  model: Model;
  categoryColor: string;
  showSparkline?: boolean;
}
```

---

## 7. 响应式策略

```
断点:
  sm:  640px    (手机竖屏)
  md:  768px    (平板竖屏)
  lg:  1024px   (平板横屏 / 小笔记本)
  xl:  1280px   (标准笔记本)
  2xl: 1536px   (大屏桌面)

首页策略矩阵:
  desktop (lg+):  7 列并排
  tablet (md):    4 列 + 3 列两行
  mobile (sm):    水平滚动 snap scroll

模型卡片网格:
  desktop: 3 列
  tablet:  2 列
  mobile:  1 列

模型详情页:
  desktop: 侧边 TOC (sticky) + 主内容 (双列图表)
  tablet:  顶部 TOC (可折叠) + 单列
  mobile:  无 TOC (滚动时 FAB 按钮打开 TOC sheet)

图表:
  所有 Plotly 图表 responsive={true}
  移动端图表高度适当减小
  排行榜表格: 移动端横向滚动
```

---

## 8. 性能预算

```
首屏加载 (FCP):    < 1.5s (目标)
最大内容绘制 (LCP): < 2.5s
总包大小:          < 500KB gzip (不含 Plotly 图表数据)
Plotly.js:         按需加载 (动态 import, 仅在图表区域可见时加载)
代码高亮:          Shiki 预构建 highlight, 无运行时 cost
字体:              Inter subset (latin + CJK 分割加载)
图片:              SVG 优先, 无位图依赖
```

**懒加载策略**:
- Plotly 图表: `<Suspense>` + `React.lazy()`
- 代码块: 在 Tab 切换时才渲染
- 分类页图表: Intersection Observer 触发加载
- 粒子背景: `requestIdleCallback` 延迟初始化

---

## 9. SEO & 可访问性

```
每个路由:
  <title>: "LightGBM 多因子选股 — QuantLab"
  <meta description>: 自动从 model.principle.summary 提取
  Open Graph 标签: 分享卡片预览

可访问性:
  所有图表: aria-label 描述图表内容
  颜色对比度: WCAG AA (暗色主题天然优势)
  键盘导航: Tab 顺序合理, 搜索支持 ⌘K
  Focus ring: 2px solid 类别色
```

---

## 10. 目录结构

```
quant-strategies/
├── web/                          # 前端项目 (NEW)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   ├── scripts/
│   │   ├── extract_metadata.py   # Notebook → JSON 提取脚本
│   │   ├── extract_plotly.py
│   │   └── build_data.py
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css              # Tailwind 入口 + 全局样式
│   │   ├── data/                  # 静态数据 (构建时生成)
│   │   │   ├── categories.ts
│   │   │   ├── models.ts          # 46个模型元数据
│   │   │   ├── formulas.ts
│   │   │   └── plotly/            # Plotly JSON per model
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript 类型定义
│   │   ├── hooks/
│   │   │   ├── useScrollReveal.ts
│   │   │   ├── useCountUp.ts
│   │   │   └── useModelSearch.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── CommandPalette.tsx
│   │   │   ├── shared/
│   │   │   │   ├── PlotlyChart.tsx
│   │   │   │   ├── KaTeXFormula.tsx
│   │   │   │   ├── CodeHighlight.tsx
│   │   │   │   ├── Sparkline.tsx
│   │   │   │   ├── CountUp.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── ScrollReveal.tsx
│   │   │   │   └── ParticleBackground.tsx
│   │   │   ├── home/
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── StatsDashboard.tsx
│   │   │   │   ├── StrategyLandscape.tsx
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   └── ResearchSummary.tsx
│   │   │   ├── category/
│   │   │   │   ├── CategoryHeader.tsx
│   │   │   │   ├── ModelCard.tsx
│   │   │   │   ├── ModelCardGrid.tsx
│   │   │   │   └── CategoryRadar.tsx
│   │   │   ├── model/
│   │   │   │   ├── ModelHeader.tsx
│   │   │   │   ├── SideTableOfContents.tsx
│   │   │   │   ├── PaperAbstract.tsx
│   │   │   │   ├── AlgorithmPrinciple.tsx
│   │   │   │   ├── FormulaCard.tsx
│   │   │   │   ├── PrincipleAnimation.tsx
│   │   │   │   ├── CodeSection.tsx
│   │   │   │   ├── BacktestResults.tsx
│   │   │   │   ├── MetricsTable.tsx
│   │   │   │   └── PrevNextNav.tsx
│   │   │   └── compare/
│   │   │       ├── ModelSelector.tsx
│   │   │       ├── CompareChart.tsx
│   │   │       └── CompareTable.tsx
│   │   └── pages/
│   │       ├── HomePage.tsx
│   │       ├── CategoryPage.tsx
│   │       ├── ModelDetailPage.tsx
│   │       ├── ComparePage.tsx
│   │       └── AboutPage.tsx
│   └── dist/                      # 构建输出 (静态文件)
├── shared/                        # Python 公共模块 (已有)
├── 01_multi_factor/               # Notebooks (已有)
├── 02_deep_learning/
├── ...
└── FRONTEND_SPEC.md               # 本文件
```

---

## 11. 构建与部署

### 11.1 开发

```bash
cd quant-strategies/web
npm install
npm run dev          # Vite dev server → http://localhost:5173
```

### 11.2 数据更新

```bash
# 在项目根目录
python web/scripts/build_data.py    # Notebook → JSON
cd web && npm run build             # → dist/
```

### 11.3 部署

```bash
# 选项 A: GitHub Pages
npm run build && npx gh-pages -d dist

# 选项 B: Vercel (自动)
# 连接 Git 仓库, 构建命令: cd web && npm run build

# 选项 C: 本地预览
npx serve dist
```

---

## 12. 里程碑计划

```
Phase 1 — 基础骨架 (Day 1)
  ├── Vite + React + TS + Tailwind 初始化
  ├── 路由配置 (hash mode)
  ├── 设计系统 token (色彩/字体/间距)
  ├── Layout (Navbar + Footer)
  └── 数据提取脚本 (build_data.py)

Phase 2 — 首页 (Day 2)
  ├── HeroSection (粒子背景)
  ├── StatsDashboard (countUp)
  ├── StrategyLandscape (7列矩阵)
  ├── Leaderboard (可排序表格)
  └── ResearchSummary (4张卡)

Phase 3 — 分类页 + 卡片 (Day 3)
  ├── CategoryPage 路由
  ├── CategoryHeader
  ├── ModelCard (sparkline)
  ├── ModelCardGrid (响应式)
  └── CategoryRadar (Plotly)

Phase 4 — 模型详情页 (Day 4-5) ⭐
  ├── ModelHeader
  ├── PaperAbstract
  ├── AlgorithmPrinciple (KaTeX)
  ├── PrincipleAnimation (Plotly)
  ├── CodeSection (Shiki)
  ├── BacktestResults (4象限)
  ├── Discussion
  └── PrevNextNav

Phase 5 — 对比 + 搜索 + 优化 (Day 6)
  ├── ComparePage (多选 + 图表)
  ├── CommandPalette (⌘K搜索)
  ├── 响应式适配
  ├── 性能优化 (lazy load)
  └── AboutPage

Phase 6 — 上线 (Day 7)
  ├── 全量数据填充 (46 models)
  ├── E2E 测试
  ├── Lighthouse 审计
  └── 部署
```

---

## 13. 开放问题 (待用户确认)

1. **中英文**: 界面以中文为主、英文为辅? 还是需要完整双语切换?
2. **Notebook 嵌入**: 是否需要 iframe 嵌入可运行的 Notebook (如通过 JupyterLite)?
3. **实时回测**: 是否需要在浏览器内运行 Python 回测 (Pyodide)?  还是纯静态展示即可?
4. **部署目标**: GitHub Pages? Vercel? 还是仅本地 `file://` 打开?
5. **域名**: 是否需要自定义域名?
