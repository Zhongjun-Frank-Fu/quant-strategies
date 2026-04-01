# 🏦 量化交易策略算法样例全集

> 基于 Elicit 报告《中国私募基金计算机交易策略研究》(80篇论文, 2020-2024)

本项目为报告中涵盖的 **7大策略类别、46个独立模型** 各自建立了完整的量化交易算法实现。每个模型以独立 Jupyter Notebook 形式呈现。

## 📊 项目特色

- ✅ **46个独立模型** — 每个模型都有完整的代码实现
- ✅ **真实A股数据** — 基于akshare获取真实沪深市场数据
- ✅ **完整回测** — 包含T+1约束、手续费、印花税
- ✅ **算法原理** — LaTeX公式推导 + 交互式动画解释
- ✅ **论文引用** — 每个模型标注对应论文、作者、DOI

## 🗂 策略分类

| 类别 | 数量 | 代表模型 | 论文报告业绩* |
|------|------|----------|--------------|
| **01 多因子选股** | 8 | LightGBM, XGBoost, SVM, Stacking | 年化 69.33% |
| **02 深度学习** | 10 | LSTM, Transformer, AlphaNet, CNN-BiLSTM | 年化 32%-127% |
| **03 强化学习** | 9 | PPO/A2C/SAC, DDPG, Bandit, Inverse RL | 累计 ~70% |
| **04 Alpha挖掘** | 5 | 遗传规划, LLM挖掘, LambdaMART | 累计 53.17% |
| **05 统计套利** | 4 | 协整+卡尔曼, ECM, LSTM套利 | 夏普 ~1.5 |
| **06 高频交易** | 4 | 改进布林带, LEVER, RL参数调优 | 年化 123.9% |
| **07 组合优化** | 6 | Black-Litterman, CVaR, Monte Carlo | 年化 ~36.6% |

> \* 业绩数据来源于对应论文的样本内回测结果，包含前视偏差，不代表策略的实际可期望收益。

## 🚀 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动Jupyter
jupyter notebook

# 3. 打开任意notebook运行
# 推荐从简单模型开始:
#   01_multi_factor/05_lasso_elastic_ridge_xu2023.ipynb
#   06_high_frequency/01_improved_bollinger_gong2024.ipynb
```

## 📁 目录结构

```
quant-strategies/
├── shared/                          # 公共工具模块
│   ├── data_fetcher.py              # 数据获取 (akshare + 缓存)
│   ├── backtest_engine.py           # 回测引擎 (T+1, 手续费)
│   ├── visualization.py             # 可视化 (收益曲线/回撤/信号)
│   ├── factors.py                   # 因子计算 (动量/波动率/技术指标)
│   ├── metrics.py                   # 绩效指标 (夏普/回撤/Calmar)
│   └── animation_helpers.py         # 动画可视化辅助
├── 01_multi_factor/                 # 多因子选股 (8个)
├── 02_deep_learning/                # 深度学习 (10个)
├── 03_reinforcement_learning/       # 强化学习 (9个)
├── 04_alpha_mining/                 # Alpha挖掘 (5个)
├── 05_stat_arbitrage/               # 统计套利 (4个)
├── 06_high_frequency/               # 高频交易 (4个)
├── 07_portfolio_optimization/       # 组合优化 (6个)
└── data_cache/                      # 数据缓存
```

## 📓 每个Notebook包含

1. **论文引用** — 标题、作者、年份、DOI、摘要
2. **算法原理** — LaTeX公式推导、理论基础
3. **原理动画** — Plotly交互式动画展示算法工作机制
4. **数据获取** — akshare真实A股数据
5. **特征工程** — 因子构建与预处理
6. **模型实现** — 完整训练代码
7. **回测评估** — 累计收益、回撤、夏普比
8. **结果讨论** — 与论文结果对比分析

## ⚙️ 技术栈

- **数据**: akshare (免费、无需注册)
- **机器学习**: scikit-learn, XGBoost, LightGBM
- **深度学习**: PyTorch
- **强化学习**: Gymnasium + PyTorch
- **组合优化**: PyPortfolioOpt, SciPy
- **可视化**: Matplotlib, Seaborn, Plotly

## 📖 参考文献

本项目基于以下核心论文 (完整80篇文献列表见Elicit报告):

- Kerang Wang (2023) - LightGBM多因子选股
- Zhaofeng Zhang (2024) - Quantformer
- Fang-Tao Li (2022) - PPO/A2C/SAC集成RL
- Zhizhuo Kou (2024) - LLM Alpha挖掘
- Chengying He (2023) - 协整+卡尔曼套利
- L. Gong (2024) - 改进布林带HFT
- Huixian Zeng (2022) - Black-Litterman增强

## ⚠️ 免责声明

本项目仅用于**学术研究和教育目的**。

- 所有回测结果均为**样本内结果**，包含前视偏差（Look-ahead Bias），不代表策略的实际可期望表现
- 训练标签使用了未来收益率（`shift(-N)`），部分模型的预处理步骤在全量数据上拟合
- 回测收益率显著高于实际可实现水平，请勿将本项目直接用于实盘交易
- 投资有风险，入市需谨慎
