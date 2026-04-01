# QuantLab Vite App 改进计划

## 当前状态审计

### 已完成 ✅
- 4 个页面基础骨架 (Home / Category / ModelDetail / Compare)
- 46 个模型数据提取 + TypeScript 类型
- KaTeX 公式渲染 (43/46 有公式)
- Python 代码高亮 + 复制
- SVG Sparkline 图表
- 分类导航 + HashRouter
- 响应式布局 (Tailwind v4)

### 核心缺陷
| 区域 | 问题 | 严重度 |
|------|------|--------|
| 绩效指标 | 46 个模型只有 12 个有年化收益, Sharpe/MaxDD 几乎全缺 | 🔴 |
| 原理动画 | 全部 46 个都是 "coming soon" 占位 | 🔴 |
| 回撤图 | 完全缺失 | 🔴 |
| 特征重要性 | 完全缺失 | 🟡 |
| 代码分段 | 只有 1 个 codeSnippet, 应有 3 段 (特征/模型/回测) | 🟡 |
| 论文分析 | discussion 字段是 raw markdown, 未结构化 | 🟡 |
| 全局搜索 | 未实现 | 🟡 |
| About 页 | 未实现 | 🟡 |

---

## Phase 1: 数据补全 — 让所有 "--" 消失

### 1.1 升级数据提取脚本

**目标**: 从 46 个 Notebook 的 **代码 Cell** 中提取更多结构化数据

```
web/extract_notebook_data.py 升级内容:
```

**a) 提取 3 段代码 (而非 1 段)**:
```typescript
// 当前: codeSnippet: string
// 改为:
codeCells: {
  featureEngineering: string;   // Cell 6: 因子/特征工程
  modelTraining: string;        // Cell 7: 模型定义+训练
  backtestSignal: string;       // Cell 8: 回测逻辑
}
```
识别方式: 每个 Notebook 的代码 Cell 都有统一注释头 `# Cell N: 描述`, 按关键词匹配:
- `因子工程` / `特征工程` / `feature` → featureEngineering
- `模型训练` / `model train` / `模型实现` → modelTraining
- `信号生成` / `回测` / `backtest` → backtestSignal

**b) 从 Cell 3 (动画 Cell) 提取 Plotly 图表配置**:
```typescript
animationConfig: {
  title: string;          // e.g. "梯度提升逐轮拟合过程"
  description: string;    // 从注释中提取
  plotlyTraces: number;   // go.Scatter / go.Frame 调用数
  hasAnimation: boolean;  // 是否使用 animation_frame
}
```

**c) 结构化 discussion 字段**:
```typescript
// 当前: discussion: string (raw markdown)
// 改为:
discussion: {
  strengths: string[];     // 从 "### 策略表现" / "优势" 下提取
  limitations: string[];   // 从 "### 局限性" 下提取
  improvements: string[];  // 从 "### 改进方向" 下提取
}
```
识别方式: 最后一个 markdown cell 的 `### 策略表现` / `### 局限性` / `### 改进方向` 子标题。

**d) 补全绩效指标 — 从代码注释中提取**:
很多 Notebook 在代码注释或变量中包含指标 (如 `# 年化收益率 69.33%`, `sharpe_ratio=2.41`)。
扩大搜索范围到所有代码 Cell 的注释行 + 变量赋值行。

### 1.2 新增 Model 数据字段

```typescript
// types/index.ts 新增字段
interface Model {
  // ... 已有字段 ...

  // 新增: 多段代码
  codeCells: {
    featureEngineering: string;
    modelTraining: string;
    backtestSignal: string;
  };

  // 新增: 结构化讨论
  discussionStructured: {
    strengths: string[];
    limitations: string[];
    improvements: string[];
  };

  // 新增: 论文深度元数据
  paperMeta: {
    venue: string;            // 发表期刊/会议
    methodology: string;      // 一句话方法论
    dataFrequency: string;    // "daily" | "minute" | "tick"
    targetMarket: string;     // "A-shares CSI300" etc.
  };

  // 新增: 动画配置
  animationConfig: {
    title: string;
    description: string;
    type: string;             // "gradient-boosting" | "attention-heatmap" | ...
  };

  // 新增: 额外绩效
  winRate: number;
  calmarRatio: number;
  sortinoRatio: number;
}
```

**工作量**: 升级 `extract_notebook_data.py` + 重新运行提取 + 更新 TypeScript 类型
**产出**: 46 个模型的完整、结构化、多维数据

---

## Phase 2: Interactive Displays — 让页面活起来

### 2.1 原理动画可视化 (替换 "coming soon" 占位)

**策略**: 不嵌入 Plotly (太重), 而是为每种算法类型构建**轻量 HTML5 Canvas / SVG 交互动画**。

按算法类型分 7 类动画模板:

| 动画类型 | 适用模型 | 实现方式 |
|----------|----------|----------|
| **梯度提升逐轮拟合** | LightGBM, XGBoost, Stacking | Canvas: 数据点 + 逐轮预测曲线逼近, slider 控制轮次 |
| **决策边界演化** | SVM, Random Forest, KPCA | SVG: 2D 散点 + 彩色区域, slider 调参数 (C, gamma) |
| **正则化路径** | Lasso, Ridge, ElasticNet, Fama-MacBeth | SVG: 系数线随 λ 收缩, 滑块控制 λ |
| **神经网络前向传播** | LSTM, GRU, CNN, FCNN, Transformer, BiLSTM, RankNet, MFTR, EMD | Canvas: 网络结构图 + 数据流脉动动画 |
| **RL Agent 交易** | PPO, DDPG, GARCH-PPO, Bandit, InverseRL | Canvas: K线图 + Agent 动态买卖标记 + 资金曲线 |
| **遗传编程进化** | AutoAlpha, Warm-GP, LLM-Alpha | SVG: 表达式树变异/交叉动画 |
| **配对价差振荡** | 协整, ECM, LSTM套利, SVM配对 | SVG: 双价格线 + 价差带 + 信号触发 |
| **有效前沿** | BL, CVaR, MV, MC+KMeans, 高阶矩 | SVG: 风险-收益散点 + 前沿曲线扫描动画 |

**新增组件**: `src/components/visualizations/`
```
visualizations/
  AlgorithmAnimation.tsx        ← 路由分发器, 根据模型类型选择动画
  GradientBoostingViz.tsx       ← 梯度提升逐轮拟合
  DecisionBoundaryViz.tsx       ← SVM/RF 决策边界
  RegularizationPathViz.tsx     ← 正则化路径
  NeuralNetworkFlowViz.tsx      ← 神经网络数据流
  RLTradingAgentViz.tsx         ← RL Agent 交易过程
  GeneticProgrammingViz.tsx     ← GP 表达式树进化
  PairsSpreadViz.tsx            ← 配对价差振荡
  EfficientFrontierViz.tsx      ← 有效前沿扫描
```

每个动画:
- 纯 React + Canvas/SVG (无外部依赖)
- 有 Play/Pause/Reset 按钮
- 有速度控制 slider
- 有步骤文字说明 (当前正在展示什么)
- 数据从模型元数据或合成数据生成
- 尺寸: 16:9 aspect ratio, 响应式

### 2.2 回测结果交互图表

**新增依赖**: `lightweight-charts` (TradingView 开源图表库, 15KB gzipped)

```bash
npm install lightweight-charts
```

**新增组件**: `src/components/charts/`
```
charts/
  EquityCurveChart.tsx          ← 累计收益曲线 (策略 vs 基准)
  DrawdownChart.tsx             ← 水下回撤图 (面积图)
  MonthlyReturnsHeatmap.tsx     ← 月度收益热力图 (12×N grid)
  MetricsRadar.tsx              ← 雷达图 (SVG, 5维: 收益/夏普/回撤/胜率/稳定性)
```

数据来源: 从 `model.sparkline` 扩展生成模拟日度数据 (保持趋势一致)。

每个图表:
- hover tooltip 显示具体数值
- 时间轴可缩放
- 标注关键事件点 (最大回撤起止、最佳月份)

### 2.3 代码浏览器 (3 Tab)

当前: 单一 CodeBlock
改进: 3-Tab 代码浏览器

```tsx
// components/shared/CodeBrowser.tsx
<TabGroup>
  <Tab label="特征工程">   <CodeBlock code={model.codeCells.featureEngineering} /></Tab>
  <Tab label="模型训练">   <CodeBlock code={model.codeCells.modelTraining} /></Tab>
  <Tab label="回测逻辑">   <CodeBlock code={model.codeCells.backtestSignal} /></Tab>
</TabGroup>
```

新增功能:
- Tab 切换动画
- 行号显示
- 关键行高亮 (模型核心逻辑行用黄色底)
- "在 Jupyter 中打开" 按钮 (链接到 GitHub)

### 2.4 全局搜索 (⌘K Command Palette)

**新增组件**: `src/components/shared/CommandPalette.tsx`

- 快捷键: `⌘K` 或 `/` 打开
- 搜索范围: 模型名称、作者、算法名、标签
- 结果分组: 按分类显示
- 键盘导航: ↑↓ 选择, Enter 跳转
- 模糊匹配 (简单的 includes 过滤即可)
- 实现: React Portal + 输入框 + 结果列表

### 2.5 首页排行榜增强

当前: 仅支持列排序
新增:
- **分类过滤器**: 顶部 chip 按钮, 点击过滤特定类别
- **复杂度过滤**: 1-4 星筛选
- **搜索框**: 表格内快速搜索
- **行点击**: 整行可点击跳转详情
- **对比勾选**: 行左侧 checkbox, 批量选中后 "对比所选" 按钮

### 2.6 分类页雷达对比图

**新增**: 在分类页底部, 一个 SVG 雷达图把同类模型叠加对比:

维度: 年化收益 (归一化) | 夏普比 | 回撤(反转) | 复杂度(反转) | 代码行数(反转)

用半透明彩色多边形叠加, 每个模型一个颜色。

### 2.7 对比页升级

当前: 基础 chip 选择 + 表格
新增:
- **分类快捷选择**: "选择全部多因子" 一键按钮
- **雷达图对比**: 多模型维度对比
- **累计收益叠加图**: 选中模型的收益曲线叠加在一张图
- **特征/方法对比矩阵**: 行=模型, 列=特征(如是否用SHAP/是否月度调仓/数据频率)
- **导出**: 对比结果导出为 PNG 截图

---

## Phase 3: 论文深度分析 — 让内容有学术深度

### 3.1 结构化论文分析卡片

**替换原有 discussion 纯文本**, 新增:

```tsx
// components/model/PaperAnalysis.tsx
<PaperAnalysis>
  <MethodologySection>        // 方法论总结 (1-2段, 从 algorithm principle 提炼)
  <InnovationHighlights>      // 论文创新点 (带 💡 图标的列表)
  <StrengthsCard>             // 策略优势 (绿色边框卡片)
  <LimitationsCard>           // 局限性 (橙色边框卡片)
  <ImprovementsCard>          // 改进方向 (蓝色边框卡片)
  <ReproducibilityChecklist>  // 可复现性检查表 (checkbox 列表)
</PaperAnalysis>
```

**可复现性检查表** (每个模型):
- [x] 数据源公开可用 (akshare 免费 API)
- [x] 代码完整可运行
- [x] 随机种子已固定 (np.random.seed(42))
- [ ] 超参数搜索空间已记录
- [ ] 前视偏差已标注
- [ ] 交易成本已计入

### 3.2 跨模型对比分析叙事

**新增 section**: 每个模型详情页底部, "与同类模型的比较" 区域:

```tsx
// components/model/CrossModelComparison.tsx
<CrossModelComparison>
  <ComparisonTable
    currentModel={model}
    siblings={sameCategoryModels}
    dimensions={["annReturn", "sharpe", "complexity", "dataFrequency"]}
  />
  <NarrativeText>
    "LightGBM 相比 XGBoost 的主要优势在于训练速度 (GOSS 采样) 和内存效率 (EFB 捆绑),
     但 XGBoost 提供了更好的 SHAP 可解释性支持..."
  </NarrativeText>
</CrossModelComparison>
```

叙述文本: 从 Notebook discussion 中自动提取, 或为每对相似模型手写 2-3 句对比。

### 3.3 论文引用网络

**新增页面 section**: About 页或独立的 "研究图谱" 页面

用 SVG 力导向图展示:
- 节点 = 46 篇论文 (按类别着色)
- 边 = 方法继承关系 (LightGBM→XGBoost, LSTM→BiLSTM→Transformer)
- 节点大小 = 年化收益率
- hover 显示论文详情

### 3.4 算法演进时间线

**新增组件**: `src/components/shared/AlgorithmTimeline.tsx`

水平时间线 2020→2024, 每年标注该年发表的论文/模型:
```
2020 ─── RF(Fu) ─── AutoAlpha(Zhang) ─── KPCA(Zhou) ─── 高阶矩(Liu)
2021 ─── RankNet(Li) ─── MCTG(Wang) ─── Bandit(Zhang) ─── LambdaMART(Zhang)
2022 ─── Zhuang(CNN-LSTM) ─── ECM(Wang) ─── BL(Zeng) ─── ...
2023 ─── LightGBM(Wang) ─── SVM(Liu) ─── Quantformer(Zhang) ─── ...
2024 ─── XGBoost(Sun) ─── Stacking(Zheng) ─── LEVER(Yuan) ─── ...
```

点击节点跳转到模型详情。

### 3.5 分类综述文章

**为每个类别新增一段综述** (200-300字):

存储在 `categories.ts` 中:
```typescript
interface Category {
  // ... 已有 ...
  surveyText: string;    // 该类别的学术综述
  keyFindings: string[]; // 3-5 条核心发现
  trendAnalysis: string; // 趋势分析
}
```

内容示例 (多因子选股):
> 多因子选股是量化投资中最成熟的策略类别。从传统的 Fama-MacBeth 两步回归, 到
> 基于 LightGBM/XGBoost 的梯度提升方法, 再到 Stacking 集成模型, 核心趋势是:
> 1) 非线性模型全面超越线性模型; 2) SHAP 可解释性成为标配; 3) 集成方法在稳定性
> 上优于单模型。8 个模型的平均年化收益率为 XX%, 但需注意前视偏差问题。

### 3.6 "关于" 页面

**新增路由**: `#/about` → `AboutPage.tsx`

内容:
1. **研究背景**: 中国私募基金量化交易发展概况 (2020-2024)
2. **文献来源**: 基于 Elicit 检索的 80 篇论文, 7 大策略类别
3. **技术架构**: 项目结构说明 (Python 后端 + HTML 前端)
4. **使用指南**: 如何在本地运行 Notebook
5. **前视偏差声明**: 所有回测结果仅供教学参考
6. **参考文献**: 46 篇论文完整引用列表 (作者-年份格式)

---

## Phase 4: 体验打磨

### 4.1 页面过渡动画
- 安装 `framer-motion`
- 页面切换: fade + translateY(10px), 200ms
- 卡片入场: stagger delay 50ms
- 首页统计数字: countUp 动画

### 4.2 响应式优化
- 模型详情页移动端: TOC 改为底部 FAB 按钮
- 排行榜移动端: 水平滚动 + 固定首列
- 分类页移动端: 2列卡片

### 4.3 性能优化
- 模型详情页: React.lazy + Suspense (按需加载图表)
- 排行榜: 虚拟滚动 (如果超过 100 行)
- 图片: 无位图依赖 (全 SVG)

### 4.4 暗色主题微调
- 代码块: One Dark Pro 配色
- 公式卡片: 深蓝底色 + 亮白公式
- 表格: zebra striping (交替行微底色)

---

## 实施优先级与工作量估算

```
Phase 1: 数据补全                      ■■■□□  2 小时
  1.1 升级提取脚本                      (1h)
  1.2 更新 TypeScript 类型 + 重新提取    (1h)

Phase 2: Interactive Displays          ■■■■■  6-8 小时
  2.1 原理动画 (8种模板)                 (3h) ← 核心工作量
  2.2 回测图表 (4种)                     (1.5h)
  2.3 代码浏览器 3-Tab                   (0.5h)
  2.4 全局搜索 ⌘K                       (0.5h)
  2.5 排行榜增强                         (0.5h)
  2.6 分类页雷达图                       (0.5h)
  2.7 对比页升级                         (1h)

Phase 3: 论文深度分析                   ■■■■□  3-4 小时
  3.1 结构化分析卡片                     (1h)
  3.2 跨模型对比叙事                     (0.5h)
  3.3 论文引用网络                       (1h)
  3.4 算法演进时间线                     (0.5h)
  3.5 分类综述文章                       (0.5h)
  3.6 About 页面                        (0.5h)

Phase 4: 体验打磨                      ■■□□□  1-2 小时
  4.1 过渡动画                          (0.5h)
  4.2 响应式优化                        (0.5h)
  4.3 性能优化                          (0.5h)
  4.4 暗色主题微调                       (0.5h)
```

**总计**: 约 12-16 小时

---

## 新增文件清单 (Phase 2-3)

```
src/
  components/
    visualizations/                    ← NEW: 8 个算法动画
      AlgorithmAnimation.tsx
      GradientBoostingViz.tsx
      DecisionBoundaryViz.tsx
      RegularizationPathViz.tsx
      NeuralNetworkFlowViz.tsx
      RLTradingAgentViz.tsx
      GeneticProgrammingViz.tsx
      PairsSpreadViz.tsx
      EfficientFrontierViz.tsx
    charts/                            ← NEW: 4 个交互图表
      EquityCurveChart.tsx
      DrawdownChart.tsx
      MonthlyReturnsHeatmap.tsx
      MetricsRadar.tsx
    model/                             ← NEW: 论文分析组件
      PaperAnalysis.tsx
      CrossModelComparison.tsx
      ReproducibilityChecklist.tsx
    shared/
      CommandPalette.tsx               ← NEW: ⌘K 搜索
      CodeBrowser.tsx                  ← NEW: 3-Tab 代码浏览器
      AlgorithmTimeline.tsx            ← NEW: 时间线
  pages/
    AboutPage.tsx                      ← NEW: 关于页
```

**新增约 18 个组件文件**, 修改 6 个已有文件。
