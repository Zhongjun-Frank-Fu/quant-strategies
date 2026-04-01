import type { Category } from "../types";

export const CATEGORIES: Category[] = [
  {
    "id": "multi-factor",
    "name": "多因子选股",
    "nameEn": "Multi-Factor Selection",
    "icon": "bar_chart",
    "color": "#3B82F6",
    "description": "基于价值/动量/质量/技术等多维因子构建截面收益预测模型，通过机器学习方法在 A 股市场上进行月度调仓选股。",
    "descriptionEn": "Cross-sectional return prediction using multi-dimensional factors and machine learning methods with monthly rebalancing.",
    "surveyText": "多因子选股是量化投资最成熟的策略类别。从传统的 Fama-MacBeth 两步回归到 LightGBM/XGBoost 梯度提升,再到 Stacking 集成,核心趋势是非线性模型全面超越线性模型,SHAP 可解释性成为标配。",
    "keyFindings": [
      "梯度提升方法(LightGBM/XGBoost)在多因子选股中表现最稳定",
      "Stacking集成可进一步提升1-3%年化收益",
      "正则化方法(Lasso/Ridge)适合因子筛选但预测力有限",
      "SVM/KPCA等核方法在高维因子空间有独特优势"
    ],
    "count": 8
  },
  {
    "id": "deep-learning",
    "name": "深度学习",
    "nameEn": "Deep Learning",
    "icon": "psychology",
    "color": "#8B5CF6",
    "description": "利用 LSTM/GRU/Transformer/CNN 等深度神经网络捕捉价格序列中的非线性时序模式，预测未来收益走势。",
    "descriptionEn": "Capturing nonlinear temporal patterns in price series using deep neural networks for return forecasting.",
    "surveyText": "深度学习策略利用LSTM/GRU/Transformer等架构捕捉价格序列的非线性时序模式。从单层LSTM到多频残差网络(MFTR),模型复杂度持续升级,但过拟合风险也同步增加。",
    "keyFindings": [
      "Transformer架构(Quantformer)在捕捉长程依赖上优于LSTM",
      "多频融合(MFTR/Wavelet-BiLSTM)有效提升信噪比",
      "简单FCNN基线常被忽视但性价比极高",
      "EMD分解+LSTM的分而治之策略在单股预测上表现出色"
    ],
    "count": 10
  },
  {
    "id": "reinforcement-learning",
    "name": "强化学习",
    "nameEn": "Reinforcement Learning",
    "icon": "smart_toy",
    "color": "#10B981",
    "description": "将交易决策建模为马尔可夫决策过程，智能体通过与市场环境交互自主学习最优买卖策略。",
    "descriptionEn": "Modeling trading decisions as MDPs where agents learn optimal policies through market interaction.",
    "surveyText": "强化学习将交易建模为MDP,智能体通过市场交互自主学习买卖策略。PPO/DDPG等连续动作空间算法是主流,集成RL(PPO+A2C+SAC)展现了最强的泛化能力。",
    "keyFindings": [
      "集成RL(多算法投票)比单一算法更稳健",
      "GARCH波动率增强的PPO在高波动市场表现更好",
      "Inverse RL从专家交易中学习奖励函数是前沿方向",
      "Multi-Armed Bandit适合策略轮动但非直接交易"
    ],
    "count": 9
  },
  {
    "id": "alpha-mining",
    "name": "Alpha 挖掘",
    "nameEn": "Alpha Mining",
    "icon": "diamond",
    "color": "#F59E0B",
    "description": "通过遗传编程、LLM 辅助、排序学习等方法自动化挖掘和评估新的 Alpha 因子。",
    "descriptionEn": "Automated discovery and evaluation of alpha factors using genetic programming, LLMs, and learning to rank.",
    "surveyText": "Alpha挖掘通过遗传编程、LLM辅助、排序学习等方法自动化发现新因子。AutoAlpha和Warm-GP代表了进化式因子发现,LLM Alpha Mining则开辟了语言模型驱动的新范式。",
    "keyFindings": [
      "遗传编程可生成人类难以直觉发现的复合因子",
      "LLM辅助因子生成是2024年最热门方向",
      "LambdaMART排序学习将选股转化为排序问题效果显著",
      "NLP情绪因子与传统因子的融合能提供增量信息"
    ],
    "count": 5
  },
  {
    "id": "stat-arbitrage",
    "name": "统计套利",
    "nameEn": "Statistical Arbitrage",
    "icon": "compare_arrows",
    "color": "#EF4444",
    "description": "利用协整关系、误差修正模型和机器学习方法识别价差异常，进行均值回归配对交易。",
    "descriptionEn": "Mean-reversion pairs trading using cointegration, error correction models, and ML-enhanced spread prediction.",
    "surveyText": "统计套利基于均值回归假设,利用协整关系和机器学习方法识别价差异常进行配对交易。卡尔曼滤波动态对冲比率是核心技术突破。",
    "keyFindings": [
      "协整+卡尔曼滤波是配对交易的黄金组合",
      "LSTM价差预测比传统阈值方法更灵活",
      "A股T+1和做空限制显著影响配对交易可行性",
      "同行业选对(如银行股对)协整关系最稳定"
    ],
    "count": 4
  },
  {
    "id": "high-frequency",
    "name": "高频交易",
    "nameEn": "High-Frequency Trading",
    "icon": "bolt",
    "color": "#06B6D4",
    "description": "基于分钟级数据的短周期交易策略，包含改进技术指标、在线学习和 RL 动态调参。",
    "descriptionEn": "Short-horizon strategies on minute-level data with improved indicators, online learning, and RL parameter tuning.",
    "surveyText": "高频策略基于分钟级数据的短周期交易,改进布林带、在线自适应学习(LEVER)和RL动态调参代表了三种不同技术路线。",
    "keyFindings": [
      "改进布林带(EMA+ATR+多指标过滤)年化超120%但实盘滑点影响大",
      "在线学习算法能实时适应市场regime变化",
      "RL调参解决了传统策略参数固定的痛点",
      "订单簿模拟是HFT回测的基础设施"
    ],
    "count": 4
  },
  {
    "id": "portfolio-optimization",
    "name": "组合优化",
    "nameEn": "Portfolio Optimization",
    "icon": "pie_chart",
    "color": "#EC4899",
    "description": "运用 Black-Litterman、CVaR、高阶矩等现代组合理论方法，在风险约束下最优化资产配置权重。",
    "descriptionEn": "Optimal asset allocation under risk constraints using BL, CVaR, and higher-moment portfolio theory.",
    "surveyText": "组合优化运用现代金融理论方法在风险约束下最优化资产配置。Black-Litterman融合主观观点与市场均衡,CVaR关注尾部风险,高阶矩考虑偏度和峰度。",
    "keyFindings": [
      "Ledoit-Wolf协方差收缩显著改善样本外表现",
      "CVaR比VaR更适合管理极端风险",
      "ML预测替代历史均值能改善均值-方差前沿",
      "Monte Carlo+K-Means是分散化投资的实用工具"
    ],
    "count": 6
  }
];
