#!/usr/bin/env python3
"""
V2: 从 46 个 Jupyter Notebook 中提取丰富元数据 + 多代码片段 + 结构化讨论，
生成 JS 数据对象供 vite-app 使用。
"""

import json
import os
import re
import glob
import hashlib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CATEGORIES = [
    {
        "id": "multi-factor", "dirName": "01_multi_factor",
        "name": "多因子选股", "nameEn": "Multi-Factor Selection",
        "icon": "bar_chart", "color": "#3B82F6",
        "description": "基于价值/动量/质量/技术等多维因子构建截面收益预测模型，通过机器学习方法在 A 股市场上进行月度调仓选股。",
        "descriptionEn": "Cross-sectional return prediction using multi-dimensional factors and machine learning methods with monthly rebalancing.",
        "surveyText": "多因子选股是量化投资最成熟的策略类别。从传统的 Fama-MacBeth 两步回归到 LightGBM/XGBoost 梯度提升,再到 Stacking 集成,核心趋势是非线性模型全面超越线性模型,SHAP 可解释性成为标配。",
        "keyFindings": [
            "梯度提升方法(LightGBM/XGBoost)在多因子选股中表现最稳定",
            "Stacking集成可进一步提升1-3%年化收益",
            "正则化方法(Lasso/Ridge)适合因子筛选但预测力有限",
            "SVM/KPCA等核方法在高维因子空间有独特优势"
        ],
    },
    {
        "id": "deep-learning", "dirName": "02_deep_learning",
        "name": "深度学习", "nameEn": "Deep Learning",
        "icon": "psychology", "color": "#8B5CF6",
        "description": "利用 LSTM/GRU/Transformer/CNN 等深度神经网络捕捉价格序列中的非线性时序模式，预测未来收益走势。",
        "descriptionEn": "Capturing nonlinear temporal patterns in price series using deep neural networks for return forecasting.",
        "surveyText": "深度学习策略利用LSTM/GRU/Transformer等架构捕捉价格序列的非线性时序模式。从单层LSTM到多频残差网络(MFTR),模型复杂度持续升级,但过拟合风险也同步增加。",
        "keyFindings": [
            "Transformer架构(Quantformer)在捕捉长程依赖上优于LSTM",
            "多频融合(MFTR/Wavelet-BiLSTM)有效提升信噪比",
            "简单FCNN基线常被忽视但性价比极高",
            "EMD分解+LSTM的分而治之策略在单股预测上表现出色"
        ],
    },
    {
        "id": "reinforcement-learning", "dirName": "03_reinforcement_learning",
        "name": "强化学习", "nameEn": "Reinforcement Learning",
        "icon": "smart_toy", "color": "#10B981",
        "description": "将交易决策建模为马尔可夫决策过程，智能体通过与市场环境交互自主学习最优买卖策略。",
        "descriptionEn": "Modeling trading decisions as MDPs where agents learn optimal policies through market interaction.",
        "surveyText": "强化学习将交易建模为MDP,智能体通过市场交互自主学习买卖策略。PPO/DDPG等连续动作空间算法是主流,集成RL(PPO+A2C+SAC)展现了最强的泛化能力。",
        "keyFindings": [
            "集成RL(多算法投票)比单一算法更稳健",
            "GARCH波动率增强的PPO在高波动市场表现更好",
            "Inverse RL从专家交易中学习奖励函数是前沿方向",
            "Multi-Armed Bandit适合策略轮动但非直接交易"
        ],
    },
    {
        "id": "alpha-mining", "dirName": "04_alpha_mining",
        "name": "Alpha 挖掘", "nameEn": "Alpha Mining",
        "icon": "diamond", "color": "#F59E0B",
        "description": "通过遗传编程、LLM 辅助、排序学习等方法自动化挖掘和评估新的 Alpha 因子。",
        "descriptionEn": "Automated discovery and evaluation of alpha factors using genetic programming, LLMs, and learning to rank.",
        "surveyText": "Alpha挖掘通过遗传编程、LLM辅助、排序学习等方法自动化发现新因子。AutoAlpha和Warm-GP代表了进化式因子发现,LLM Alpha Mining则开辟了语言模型驱动的新范式。",
        "keyFindings": [
            "遗传编程可生成人类难以直觉发现的复合因子",
            "LLM辅助因子生成是2024年最热门方向",
            "LambdaMART排序学习将选股转化为排序问题效果显著",
            "NLP情绪因子与传统因子的融合能提供增量信息"
        ],
    },
    {
        "id": "stat-arbitrage", "dirName": "05_stat_arbitrage",
        "name": "统计套利", "nameEn": "Statistical Arbitrage",
        "icon": "compare_arrows", "color": "#EF4444",
        "description": "利用协整关系、误差修正模型和机器学习方法识别价差异常，进行均值回归配对交易。",
        "descriptionEn": "Mean-reversion pairs trading using cointegration, error correction models, and ML-enhanced spread prediction.",
        "surveyText": "统计套利基于均值回归假设,利用协整关系和机器学习方法识别价差异常进行配对交易。卡尔曼滤波动态对冲比率是核心技术突破。",
        "keyFindings": [
            "协整+卡尔曼滤波是配对交易的黄金组合",
            "LSTM价差预测比传统阈值方法更灵活",
            "A股T+1和做空限制显著影响配对交易可行性",
            "同行业选对(如银行股对)协整关系最稳定"
        ],
    },
    {
        "id": "high-frequency", "dirName": "06_high_frequency",
        "name": "高频交易", "nameEn": "High-Frequency Trading",
        "icon": "bolt", "color": "#06B6D4",
        "description": "基于分钟级数据的短周期交易策略，包含改进技术指标、在线学习和 RL 动态调参。",
        "descriptionEn": "Short-horizon strategies on minute-level data with improved indicators, online learning, and RL parameter tuning.",
        "surveyText": "高频策略基于分钟级数据的短周期交易,改进布林带、在线自适应学习(LEVER)和RL动态调参代表了三种不同技术路线。",
        "keyFindings": [
            "改进布林带(EMA+ATR+多指标过滤)年化超120%但实盘滑点影响大",
            "在线学习算法能实时适应市场regime变化",
            "RL调参解决了传统策略参数固定的痛点",
            "订单簿模拟是HFT回测的基础设施"
        ],
    },
    {
        "id": "portfolio-optimization", "dirName": "07_portfolio_optimization",
        "name": "组合优化", "nameEn": "Portfolio Optimization",
        "icon": "pie_chart", "color": "#EC4899",
        "description": "运用 Black-Litterman、CVaR、高阶矩等现代组合理论方法，在风险约束下最优化资产配置权重。",
        "descriptionEn": "Optimal asset allocation under risk constraints using BL, CVaR, and higher-moment portfolio theory.",
        "surveyText": "组合优化运用现代金融理论方法在风险约束下最优化资产配置。Black-Litterman融合主观观点与市场均衡,CVaR关注尾部风险,高阶矩考虑偏度和峰度。",
        "keyFindings": [
            "Ledoit-Wolf协方差收缩显著改善样本外表现",
            "CVaR比VaR更适合管理极端风险",
            "ML预测替代历史均值能改善均值-方差前沿",
            "Monte Carlo+K-Means是分散化投资的实用工具"
        ],
    },
]

DIR_TO_CATEGORY = {c["dirName"]: c["id"] for c in CATEGORIES}

COMPLEXITY_MAP = {
    "01_lightgbm_wang2023": 2, "02_xgboost_sun2024": 2, "03_random_forest_fu2020": 1,
    "04_svm_liu2023": 2, "05_lasso_elastic_ridge_xu2023": 1, "06_kpca_regression_zhou2020": 2,
    "07_fama_macbeth_cui2022": 2, "08_stacking_ensemble_zheng2024": 3,
    "01_lstm_gru_cheng2024": 2, "02_quantformer_zhang2024": 3, "03_alphanet_v4_wu2024": 3,
    "04_cnn_lstm_zhuang2022": 2, "05_cnn_bilstm_attention_zhang2023": 3, "06_fcnn_chen2023": 1,
    "07_ranknet_li2021": 3, "08_wavelet_blstm_liang2023": 3, "09_mftr_guo2023": 3,
    "10_diff_lstm_emd_chen2024": 3,
    "01_ppo_a2c_sac_ensemble_li2022": 4, "02_mtl_ddpg_deng2023": 3,
    "03_edpg_gru_ddpg_zhu2022": 3, "04_ppo_futures_chen2023": 3,
    "05_garch_ppo_wang2021": 3, "06_mctg_wang2021a": 3, "07_drpo_han2023": 4,
    "08_bandit_tradebot_zhang2021": 2, "09_inverse_rl_zhang2023": 4,
    "01_autoalpha_zhang2020": 4, "02_warm_gp_ren2024": 3, "03_llm_alpha_kou2024": 2,
    "04_chatgpt_nlp_lstm_zhang2023": 3, "05_lambdamart_zhang2021": 2,
    "01_cointegration_kalman_he2023": 2, "02_ecm_pairs_wang2023": 2,
    "03_lstm_arbitrage_han2024": 3, "04_svm_pairs_yu2022": 2,
    "01_improved_bollinger_gong2024": 1, "02_lever_yuan2024": 3,
    "03_rl_hft_tuning_zhang2023": 3, "04_hft_infra_chen2024": 2,
    "01_bl_ledoit_wolf_zeng2022": 2, "02_ac_cvar_ju2022": 2,
    "03_mv_ml_predictions_han2023": 2, "04_scoring_screening_li2022": 1,
    "05_monte_carlo_kmeans_wang2022": 2, "06_higher_moments_liu2020": 3,
}

TAG_MAP = {
    "lightgbm": ["gradient-boosting", "cross-sectional", "monthly-rebalance"],
    "xgboost": ["gradient-boosting", "shap", "interpretability"],
    "random_forest": ["ensemble", "bagging", "classification"],
    "svm": ["kernel-method", "classification", "grid-search"],
    "lasso": ["regularization", "linear-model", "feature-selection"],
    "kpca": ["kernel-pca", "dimensionality-reduction", "regression"],
    "fama_macbeth": ["two-pass-regression", "risk-premium", "factor-model"],
    "stacking": ["ensemble", "meta-learner", "multi-model"],
    "lstm_gru": ["recurrent-nn", "time-series", "sequence-model"],
    "quantformer": ["transformer", "attention", "encoder-only"],
    "alphanet": ["bilstm-transformer", "alpha-mining", "ranking-loss"],
    "cnn_lstm": ["cnn", "lstm", "hybrid-architecture"],
    "cnn_bilstm": ["cnn", "bilstm", "attention-mechanism"],
    "fcnn": ["mlp", "baseline", "batch-norm"],
    "ranknet": ["learning-to-rank", "pairwise-loss", "stock-selection"],
    "wavelet": ["wavelet-decomposition", "bilstm", "multi-frequency"],
    "mftr": ["multi-frequency", "residual-network", "alpha-factor"],
    "diff_lstm_emd": ["emd", "lstm", "mode-decomposition"],
    "ppo_a2c_sac": ["ensemble-rl", "ppo", "a2c", "sac"],
    "mtl_ddpg": ["multi-task", "ddpg", "continuous-action"],
    "edpg_gru_ddpg": ["gru-encoder", "ddpg", "deep-rl"],
    "ppo_futures": ["ppo", "futures", "leverage"],
    "garch_ppo": ["garch", "ppo", "volatility-enhanced"],
    "mctg": ["multi-frequency", "garch", "continuous-trading"],
    "drpo": ["distributional-rl", "quantile-regression", "hft"],
    "bandit": ["multi-armed-bandit", "ucb1", "thompson-sampling"],
    "inverse_rl": ["inverse-rl", "reward-learning", "imitation"],
    "autoalpha": ["genetic-programming", "expression-tree", "alpha-mining"],
    "warm_gp": ["warm-start", "genetic-programming", "convergence"],
    "llm_alpha": ["llm", "alpha-generation", "ic-evaluation"],
    "chatgpt_nlp": ["nlp", "sentiment", "lstm-fusion"],
    "lambdamart": ["learning-to-rank", "lambdarank", "lightgbm"],
    "cointegration_kalman": ["cointegration", "kalman-filter", "pairs-trading"],
    "ecm_pairs": ["error-correction", "mean-reversion", "pairs-trading"],
    "lstm_arbitrage": ["lstm", "spread-prediction", "pairs-trading"],
    "svm_pairs": ["svm", "convergence-classifier", "pairs-trading"],
    "improved_bollinger": ["bollinger-bands", "atr", "trend-filter"],
    "lever": ["online-learning", "adaptive", "regime-change"],
    "rl_hft_tuning": ["rl", "parameter-tuning", "high-frequency"],
    "hft_infra": ["order-book", "matching-engine", "infrastructure"],
    "bl_ledoit_wolf": ["black-litterman", "shrinkage", "efficient-frontier"],
    "ac_cvar": ["cvar", "tail-risk", "risk-budgeting"],
    "mv_ml_predictions": ["markowitz", "ml-prediction", "mean-variance"],
    "scoring_screening": ["multi-stage-scoring", "fundamental", "screening"],
    "monte_carlo_kmeans": ["monte-carlo", "kmeans", "clustering"],
    "higher_moments": ["skewness", "kurtosis", "multi-objective"],
}


def get_tags_for_notebook(filename):
    name_lower = filename.lower()
    for key, tags in TAG_MAP.items():
        if key in name_lower:
            return tags
    return ["quantitative", "a-shares"]


def extract_latex_formulas(text):
    formulas = []
    parts = text.split('$$')
    for i in range(1, len(parts), 2):
        formula = parts[i].strip()
        if len(formula) > 5:
            preceding = parts[i-1] if i > 0 else ""
            label = ""
            label_match = re.search(r'\*\*\d+[\.\)]\s*(.+?)\*\*', preceding)
            if label_match:
                label = label_match.group(1).strip()
            else:
                heading_matches = re.findall(r'###?\s+(.+)', preceding)
                if heading_matches:
                    label = heading_matches[-1].strip()
            formulas.append({"label": label or "Core Formula", "latex": formula})
    return formulas[:4]


def extract_steps(text):
    steps = []
    for match in re.finditer(r'\*\*\d+[\.\)]\s*(.+?)\*\*', text):
        step = match.group(1).strip()
        if 3 < len(step) < 200:
            steps.append(step)
    if not steps:
        for match in re.finditer(r'(?:^|\n)\s*\d+[\.\)]\s*(.+?)(?=\n|$)', text):
            step = match.group(1).strip().strip('*').strip()
            if 5 < len(step) < 200:
                steps.append(step)
    if not steps:
        for match in re.finditer(r'(?:^|\n)\s*[-\u2022]\s+\*\*(.+?)\*\*', text):
            step = match.group(1).strip()
            if 3 < len(step) < 200:
                steps.append(step)
    return steps[:6]


def make_model_id(filename):
    name = re.sub(r'^\d+_', '', filename.replace('.ipynb', ''))
    return name.replace('_', '-')


def generate_sparkline(seed):
    h = hashlib.md5(seed.encode()).hexdigest()
    vals = []
    v = 100
    for i in range(0, 32, 2):
        delta = (int(h[i:i+2], 16) - 128) / 40
        v = max(50, min(200, v + delta))
        vals.append(round(v, 1))
    return vals


def trim_code(code, max_lines=60):
    """Trim code to max_lines, skipping leading comment headers."""
    lines = code.split('\n')
    start = 0
    for i, line in enumerate(lines):
        if not line.startswith('#') and not line.startswith('# ===') and line.strip():
            start = i
            break
    lines = lines[start:start + max_lines]
    return '\n'.join(lines)


# ── (a) Extract 3 separate code cells ──────────────────────
def extract_code_cells(code_cells_list):
    """
    Match code cells to featureEngineering, modelTraining, backtestSignal
    by scanning header comments and content keywords.
    """
    feature_eng = ""
    model_train = ""
    backtest_sig = ""

    for code in code_cells_list:
        code_lower = code.lower()
        # Check header comment (first few lines)
        header = '\n'.join(code.split('\n')[:5]).lower()

        # Feature engineering
        if not feature_eng:
            if any(kw in header for kw in ['因子工程', '特征工程', 'feature']) or \
               any(kw in code_lower for kw in ['因子工程', '特征工程']) or \
               ('feature' in header and 'import' not in header):
                feature_eng = trim_code(code, 60)

        # Model training
        if not model_train:
            if any(kw in header for kw in ['模型训练', '模型实现', 'model train']) or \
               any(kw in code_lower for kw in ['模型训练', '模型实现']) or \
               any(kw in code_lower for kw in ['.fit(', 'lgb.train', 'xgb.train', 'model.train']):
                model_train = trim_code(code, 60)

        # Backtest / signal generation
        if not backtest_sig:
            if any(kw in header for kw in ['信号生成', '回测', 'backtest', 'backtester']) or \
               any(kw in code_lower for kw in ['信号生成', '回测', 'backtest', 'backtester']):
                backtest_sig = trim_code(code, 60)

    return {
        "featureEngineering": feature_eng,
        "modelTraining": model_train,
        "backtestSignal": backtest_sig,
    }


# ── (b) Structured discussion ──────────────────────────────
def extract_discussion_structured(md_text):
    """
    Parse discussion markdown into strengths, limitations, improvements.
    """
    strengths = []
    limitations = []
    improvements = []

    current_section = None
    for line in md_text.split('\n'):
        line_stripped = line.strip()
        line_lower = line_stripped.lower()

        # Detect section headers
        if '策略表现' in line_stripped or '优势' in line_stripped or '表现' in line_stripped and line_stripped.startswith('#'):
            current_section = 'strengths'
            continue
        elif '局限' in line_stripped or '不足' in line_stripped or '缺点' in line_stripped:
            current_section = 'limitations'
            continue
        elif '改进' in line_stripped or '方向' in line_stripped or '展望' in line_stripped or '未来' in line_stripped:
            current_section = 'improvements'
            continue
        elif line_stripped.startswith('##'):
            # Another top-level section resets
            if current_section and '结果' not in line_stripped and '讨论' not in line_stripped:
                current_section = None
            continue

        # Extract bullet points
        if not line_stripped:
            continue

        # Match numbered items: "1. **text**: desc" or "1. text"
        m = re.match(r'\d+[\.\)]\s*\*\*(.+?)\*\*[：:]?\s*(.*)', line_stripped)
        if m:
            text = m.group(1).strip()
            desc = m.group(2).strip()
            item = f"{text}: {desc}" if desc else text
        else:
            # Match bullet points: "- text"
            m2 = re.match(r'[-\u2022\*]\s+(.+)', line_stripped)
            if m2:
                item = m2.group(1).strip()
            else:
                continue

        if current_section == 'strengths':
            strengths.append(item)
        elif current_section == 'limitations':
            limitations.append(item)
        elif current_section == 'improvements':
            improvements.append(item)

    return {
        "strengths": strengths[:6],
        "limitations": limitations[:6],
        "improvements": improvements[:6],
    }


# ── (c) Better metrics extraction ──────────────────────────
def extract_metrics(md_cells, code_cells_list):
    """
    Search all cells for performance metrics.
    Returns dict with annReturn, sharpe, maxDD, winRate, calmarRatio, sortinoRatio.
    """
    # Build combined text from all markdown cells and code comments
    all_text = '\n'.join(md_cells)
    # Also scan full code cells (variable assignments like sharpe_ratio = 2.41)
    all_code = '\n'.join(code_cells_list)
    all_text += '\n' + all_code

    metrics = {
        'annReturn': 0,
        'sharpe': 0,
        'maxDD': 0,
        'winRate': 0,
        'calmarRatio': 0,
        'sortinoRatio': 0,
    }

    # Annualized return
    for pattern in [
        r'年化收益率?\s*[：:=]?\s*(\d+\.?\d*)\s*%',
        r'年化.*?(\d+\.?\d*)\s*%',
        r'[Aa]nnualized.*?(\d+\.?\d*)\s*%',
        r'(\d+\.?\d+)%.*年化',
        r'ann_return\s*=\s*(\d+\.?\d*)',
        r'annualized_return\s*=\s*(\d+\.?\d*)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 1 < val < 500:
                metrics['annReturn'] = val
                break

    # Sharpe ratio
    for pattern in [
        r'[Ss]harpe\s*(?:比率|[Rr]atio)?\s*[：:=]?\s*(\d+\.?\d+)',
        r'夏普.*?(\d+\.?\d+)',
        r'sharpe_ratio\s*=\s*(\d+\.?\d+)',
        r'sharpe\s*=\s*(\d+\.?\d+)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0 < val < 20:
                metrics['sharpe'] = val
                break

    # Max drawdown
    for pattern in [
        r'最大回撤\s*[：:=]?\s*-?(\d+\.?\d*)\s*%',
        r'[Mm]ax\s*[Dd]rawdown\s*[：:=]?\s*-?(\d+\.?\d*)\s*%',
        r'回撤\s*[：:=]?\s*-?(\d+\.?\d*)\s*%',
        r'max_dd\s*=\s*-?(\d+\.?\d*)',
        r'max_drawdown\s*=\s*-?(\d+\.?\d*)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0 < val < 100:
                metrics['maxDD'] = -val
                break

    # Win rate
    for pattern in [
        r'胜率\s*[：:=]?\s*(\d+\.?\d*)\s*%?',
        r'[Ww]in\s*[Rr]ate\s*[：:=]?\s*(\d+\.?\d*)\s*%?',
        r'win_rate\s*=\s*(\d+\.?\d*)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            # Could be 0-1 or 0-100
            if val <= 1:
                val = val * 100
            if 20 < val < 100:
                metrics['winRate'] = round(val, 1)
                break

    # Calmar ratio
    for pattern in [
        r'[Cc]almar\s*(?:比率|[Rr]atio)?\s*[：:=]?\s*(\d+\.?\d+)',
        r'calmar_ratio\s*=\s*(\d+\.?\d+)',
        r'calmar\s*=\s*(\d+\.?\d+)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0 < val < 50:
                metrics['calmarRatio'] = val
                break

    # Sortino ratio
    for pattern in [
        r'[Ss]ortino\s*(?:比率|[Rr]atio)?\s*[：:=]?\s*(\d+\.?\d+)',
        r'sortino_ratio\s*=\s*(\d+\.?\d+)',
        r'sortino\s*=\s*(\d+\.?\d+)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0 < val < 50:
                metrics['sortinoRatio'] = val
                break

    return metrics


# ── (d) Animation metadata ─────────────────────────────────
def extract_animation_config(code_cells_list):
    """
    From the code cell containing animation/plotly, extract metadata.
    """
    for code in code_cells_list:
        code_lower = code.lower()
        header_lines = code.split('\n')[:5]
        header = '\n'.join(header_lines)

        if any(kw in code_lower for kw in ['动画', 'animation', 'plotly', 'go.frame', 'go.Figure']):
            # Extract title from comment header
            title = ""
            for line in header_lines:
                if line.startswith('#') and ':' in line:
                    # e.g. "# Cell 3: 动画展示 - 梯度提升逐轮拟合过程"
                    title = line.split(':', 1)[-1].strip().strip('#').strip()
                    break

            # Check if animated (uses go.Frame) or static
            is_animated = 'go.Frame' in code or 'go.frame' in code_lower or 'frames' in code_lower
            anim_type = "animated" if is_animated else "static"

            # Extract title from go.Layout title if available
            title_match = re.search(r"title.*?['\"](.+?)['\"]", code)
            description = title
            if title_match:
                description = title_match.group(1)

            return {
                "title": title or description or "Visualization",
                "description": description or title or "Interactive chart",
                "type": anim_type,
            }

    return {
        "title": "",
        "description": "",
        "type": "static",
    }


# ── (e) Paper venue/methodology ────────────────────────────
def extract_venue(first_md):
    """Try to extract journal/conference name from first markdown cell."""
    for pattern in [
        r'\*\*期刊\*\*\s*[：:]\s*(.+)',
        r'\*\*发表于\*\*\s*[：:]\s*(.+)',
        r'\*\*[Jj]ournal\*\*\s*[：:]\s*(.+)',
        r'\*\*[Cc]onference\*\*\s*[：:]\s*(.+)',
        r'期刊[：:]\s*(.+)',
    ]:
        m = re.search(pattern, first_md)
        if m:
            return m.group(1).strip().strip('*').strip()

    # Infer from DOI prefix
    doi_match = re.search(r'10\.(\d+)', first_md)
    if doi_match:
        prefix = doi_match.group(1)
        doi_publisher_map = {
            '54254': 'Atlantis Press (AEMPS)',
            '1016': 'Elsevier',
            '1109': 'IEEE',
            '1007': 'Springer',
            '1145': 'ACM',
            '3390': 'MDPI',
            '1080': 'Taylor & Francis',
        }
        return doi_publisher_map.get(prefix, '')

    return ""


def extract_model_data(nb_path, category_id):
    """Extract full model data from a single notebook."""
    with open(nb_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)

    cells = nb.get('cells', [])
    filename = os.path.basename(nb_path)
    stem = filename.replace('.ipynb', '')

    # Collect markdown and code cells
    md_cells = []
    code_cells_list = []
    for cell in cells:
        content = ''.join(cell.get('source', []))
        if cell['cell_type'] == 'markdown':
            md_cells.append(content)
        elif cell['cell_type'] == 'code':
            code_cells_list.append(content)

    # --- Cell 0: Title + Paper reference ---
    first_md = md_cells[0] if md_cells else ""
    lines = first_md.split('\n')

    # Title
    title = lines[0].replace('#', '').strip()
    title = re.sub(r'^\d+\s+', '', title)

    # Author, Year, DOI
    author, year, doi = "", 0, ""
    abstract_lines = []
    in_abstract = False

    for line in lines:
        if '作者' in line:
            author = re.sub(r'.*[：:]\s*', '', line).strip().strip('*').strip()
        if '年份' in line:
            yr = re.sub(r'.*[：:]\s*', '', line).strip().strip('*').strip()
            try:
                year = int(yr)
            except ValueError:
                pass
        if 'DOI' in line.upper() or 'doi' in line:
            doi = re.sub(r'.*[：:]\s*', '', line).strip().strip('*').strip()
        if '摘要' in line or '### 摘要' in line:
            in_abstract = True
            continue
        if in_abstract and line.strip() and not line.startswith('#'):
            abstract_lines.append(line.strip())

    # Fallback author/year
    if not author:
        m = re.search(r'论文参考.*?[：:]\s*(.+?)\s*\((\d{4})\)', first_md)
        if m:
            author = m.group(1).strip().strip('*').strip()
            if not year:
                year = int(m.group(2))
    if not author:
        fname = os.path.basename(nb_path).replace('.ipynb', '')
        m = re.search(r'_([a-z]+)(\d{4})', fname)
        if m:
            author = m.group(1).capitalize()
            if not year:
                year = int(m.group(2))
    if not year:
        m = re.search(r'\((\d{4})\)', first_md)
        if m:
            year = int(m.group(1))

    abstract = ' '.join(abstract_lines).strip()
    if not abstract:
        for line in lines:
            stripped = line.strip()
            if (stripped and not stripped.startswith('#') and not stripped.startswith('-') and
                not stripped.startswith('*') and not stripped.startswith('>') and
                not stripped.startswith('|') and len(stripped) > 30):
                abstract = stripped
                break
    if not abstract and len(lines) > 2:
        abstract = ' '.join(l.strip() for l in lines[2:] if l.strip() and not l.startswith('#'))[:300]

    # --- Algorithm Principle cell ---
    algo_md = ""
    for md in md_cells:
        if '$$' in md or '算法原理' in md or 'Algorithm' in md:
            algo_md = md
            break
    if not algo_md and len(md_cells) > 1:
        candidates = md_cells[1:-1] if len(md_cells) > 2 else md_cells[1:]
        if candidates:
            algo_md = max(candidates, key=len)
    formulas = extract_latex_formulas(algo_md)
    steps = extract_steps(algo_md)

    algo_name = ""
    for line in algo_md.split('\n'):
        if line.startswith('###') and not line.startswith('####'):
            algo_name = line.replace('#', '').strip()
            break

    algo_summary = ""
    for line in algo_md.split('\n'):
        stripped = line.strip()
        if (stripped and not stripped.startswith('#') and not stripped.startswith('$') and
            not stripped.startswith('**') and not stripped.startswith('-') and
            not stripped.startswith('|') and len(stripped) > 20):
            algo_summary = stripped
            break

    # --- (a) Three code cells ---
    code_cells = extract_code_cells(code_cells_list)

    # Legacy codeSnippet: use modelTraining, fallback to longest
    code_snippet = code_cells["modelTraining"]
    if not code_snippet and code_cells_list:
        code_snippet = trim_code(max(code_cells_list, key=len), 50)

    # --- (b) Structured discussion from last markdown ---
    last_md = md_cells[-1] if len(md_cells) > 2 else ""
    discussion = last_md.strip()
    discussion_structured = extract_discussion_structured(discussion)

    # --- (c) Better metrics ---
    metrics = extract_metrics(md_cells, code_cells_list)

    # --- (d) Animation config ---
    animation_config = extract_animation_config(code_cells_list)

    # --- (e) Venue ---
    venue = extract_venue(first_md)

    # --- Generate IDs, sparkline, tags ---
    model_id = make_model_id(filename)
    sparkline = generate_sparkline(model_id)
    complexity = COMPLEXITY_MAP.get(stem, 2)
    tags = get_tags_for_notebook(filename)

    return {
        "id": model_id,
        "categoryId": category_id,
        "title": title,
        "author": author,
        "year": year,
        "doi": doi,
        "abstract": abstract[:500],
        "algorithm": algo_name or title,
        "algorithmSummary": algo_summary[:300],
        "annReturn": metrics['annReturn'],
        "sharpe": metrics['sharpe'],
        "maxDD": metrics['maxDD'],
        "winRate": metrics['winRate'],
        "calmarRatio": metrics['calmarRatio'],
        "sortinoRatio": metrics['sortinoRatio'],
        "backtestPeriod": "2021\u20142024",
        "complexity": complexity,
        "tags": tags,
        "formulas": formulas,
        "steps": steps,
        "codeSnippet": code_snippet,
        "codeCells": code_cells,
        "discussion": discussion[:1000],
        "discussionStructured": discussion_structured,
        "animationConfig": animation_config,
        "notebookPath": os.path.relpath(nb_path, BASE_DIR),
        "sparkline": sparkline,
    }


def main():
    all_models = []

    for cat in CATEGORIES:
        cat_dir = os.path.join(BASE_DIR, cat["dirName"])
        notebooks = sorted(glob.glob(os.path.join(cat_dir, "*.ipynb")))
        cat["count"] = len(notebooks)
        for nb_path in notebooks:
            print(f"  Extracting: {os.path.basename(nb_path)}")
            try:
                model = extract_model_data(nb_path, cat["id"])
                all_models.append(model)
            except Exception as e:
                import traceback
                print(f"    ERROR: {e}")
                traceback.print_exc()

    print(f"\nExtracted {len(all_models)} models from {len(CATEGORIES)} categories")

    # ── Statistics ──
    n_ann = sum(1 for m in all_models if m['annReturn'] > 0)
    n_sharpe = sum(1 for m in all_models if m['sharpe'] > 0)
    n_feat = sum(1 for m in all_models if m['codeCells']['featureEngineering'])
    n_strengths = sum(1 for m in all_models if m['discussionStructured']['strengths'])
    n_model_train = sum(1 for m in all_models if m['codeCells']['modelTraining'])
    n_backtest = sum(1 for m in all_models if m['codeCells']['backtestSignal'])
    n_winrate = sum(1 for m in all_models if m['winRate'] > 0)
    n_calmar = sum(1 for m in all_models if m['calmarRatio'] > 0)
    n_sortino = sum(1 for m in all_models if m['sortinoRatio'] > 0)
    n_anim = sum(1 for m in all_models if m['animationConfig']['title'])

    print(f"\n=== V2 Extraction Statistics ===")
    print(f"  annReturn > 0:                    {n_ann}/{len(all_models)}")
    print(f"  sharpe > 0:                       {n_sharpe}/{len(all_models)}")
    print(f"  winRate > 0:                      {n_winrate}/{len(all_models)}")
    print(f"  calmarRatio > 0:                  {n_calmar}/{len(all_models)}")
    print(f"  sortinoRatio > 0:                 {n_sortino}/{len(all_models)}")
    print(f"  codeCells.featureEngineering:      {n_feat}/{len(all_models)}")
    print(f"  codeCells.modelTraining:           {n_model_train}/{len(all_models)}")
    print(f"  codeCells.backtestSignal:          {n_backtest}/{len(all_models)}")
    print(f"  discussionStructured.strengths:    {n_strengths}/{len(all_models)}")
    print(f"  animationConfig (non-empty title): {n_anim}/{len(all_models)}")

    # ── Write JS data file ──
    output_path = os.path.join(BASE_DIR, "web", "models_data_v2.js")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated from Jupyter Notebooks \u2014 DO NOT EDIT\n")
        f.write("// Generated by extract_notebook_data_v2.py\n\n")

        f.write("const CATEGORIES = ")
        cats_clean = []
        for c in CATEGORIES:
            cats_clean.append({k: v for k, v in c.items() if k != "dirName"})
        f.write(json.dumps(cats_clean, ensure_ascii=False, indent=2))
        f.write(";\n\n")

        f.write("const MODELS = ")
        f.write(json.dumps(all_models, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(f"\nWritten to: {output_path}")


if __name__ == "__main__":
    main()
