#!/usr/bin/env python3
"""
从 46 个 Jupyter Notebook 中提取元数据 + 代码片段，
生成 JS 数据对象供 index.html 使用。
"""

import json
import os
import re
import glob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CATEGORIES = [
    {"id": "multi-factor", "dirName": "01_multi_factor", "name": "多因子选股", "nameEn": "Multi-Factor Selection", "icon": "bar_chart", "color": "#3B82F6", "description": "基于价值/动量/质量/技术等多维因子构建截面收益预测模型，通过机器学习方法在 A 股市场上进行月度调仓选股。", "descriptionEn": "Cross-sectional return prediction using multi-dimensional factors and machine learning methods with monthly rebalancing."},
    {"id": "deep-learning", "dirName": "02_deep_learning", "name": "深度学习", "nameEn": "Deep Learning", "icon": "psychology", "color": "#8B5CF6", "description": "利用 LSTM/GRU/Transformer/CNN 等深度神经网络捕捉价格序列中的非线性时序模式，预测未来收益走势。", "descriptionEn": "Capturing nonlinear temporal patterns in price series using deep neural networks for return forecasting."},
    {"id": "reinforcement-learning", "dirName": "03_reinforcement_learning", "name": "强化学习", "nameEn": "Reinforcement Learning", "icon": "smart_toy", "color": "#10B981", "description": "将交易决策建模为马尔可夫决策过程，智能体通过与市场环境交互自主学习最优买卖策略。", "descriptionEn": "Modeling trading decisions as MDPs where agents learn optimal policies through market interaction."},
    {"id": "alpha-mining", "dirName": "04_alpha_mining", "name": "Alpha 挖掘", "nameEn": "Alpha Mining", "icon": "diamond", "color": "#F59E0B", "description": "通过遗传编程、LLM 辅助、排序学习等方法自动化挖掘和评估新的 Alpha 因子。", "descriptionEn": "Automated discovery and evaluation of alpha factors using genetic programming, LLMs, and learning to rank."},
    {"id": "stat-arbitrage", "dirName": "05_stat_arbitrage", "name": "统计套利", "nameEn": "Statistical Arbitrage", "icon": "compare_arrows", "color": "#EF4444", "description": "利用协整关系、误差修正模型和机器学习方法识别价差异常，进行均值回归配对交易。", "descriptionEn": "Mean-reversion pairs trading using cointegration, error correction models, and ML-enhanced spread prediction."},
    {"id": "high-frequency", "dirName": "06_high_frequency", "name": "高频交易", "nameEn": "High-Frequency Trading", "icon": "bolt", "color": "#06B6D4", "description": "基于分钟级数据的短周期交易策略，包含改进技术指标、在线学习和 RL 动态调参。", "descriptionEn": "Short-horizon strategies on minute-level data with improved indicators, online learning, and RL parameter tuning."},
    {"id": "portfolio-optimization", "dirName": "07_portfolio_optimization", "name": "组合优化", "nameEn": "Portfolio Optimization", "icon": "pie_chart", "color": "#EC4899", "description": "运用 Black-Litterman、CVaR、高阶矩等现代组合理论方法，在风险约束下最优化资产配置权重。", "descriptionEn": "Optimal asset allocation under risk constraints using BL, CVaR, and higher-moment portfolio theory."},
]

DIR_TO_CATEGORY = {c["dirName"]: c["id"] for c in CATEGORIES}

COMPLEXITY_MAP = {
    # multi-factor
    "01_lightgbm_wang2023": 2, "02_xgboost_sun2024": 2, "03_random_forest_fu2020": 1,
    "04_svm_liu2023": 2, "05_lasso_elastic_ridge_xu2023": 1, "06_kpca_regression_zhou2020": 2,
    "07_fama_macbeth_cui2022": 2, "08_stacking_ensemble_zheng2024": 3,
    # deep learning
    "01_lstm_gru_cheng2024": 2, "02_quantformer_zhang2024": 3, "03_alphanet_v4_wu2024": 3,
    "04_cnn_lstm_zhuang2022": 2, "05_cnn_bilstm_attention_zhang2023": 3, "06_fcnn_chen2023": 1,
    "07_ranknet_li2021": 3, "08_wavelet_blstm_liang2023": 3, "09_mftr_guo2023": 3,
    "10_diff_lstm_emd_chen2024": 3,
    # reinforcement learning
    "01_ppo_a2c_sac_ensemble_li2022": 4, "02_mtl_ddpg_deng2023": 3,
    "03_edpg_gru_ddpg_zhu2022": 3, "04_ppo_futures_chen2023": 3,
    "05_garch_ppo_wang2021": 3, "06_mctg_wang2021a": 3, "07_drpo_han2023": 4,
    "08_bandit_tradebot_zhang2021": 2, "09_inverse_rl_zhang2023": 4,
    # alpha mining
    "01_autoalpha_zhang2020": 4, "02_warm_gp_ren2024": 3, "03_llm_alpha_kou2024": 2,
    "04_chatgpt_nlp_lstm_zhang2023": 3, "05_lambdamart_zhang2021": 2,
    # stat arbitrage
    "01_cointegration_kalman_he2023": 2, "02_ecm_pairs_wang2023": 2,
    "03_lstm_arbitrage_han2024": 3, "04_svm_pairs_yu2022": 2,
    # high frequency
    "01_improved_bollinger_gong2024": 1, "02_lever_yuan2024": 3,
    "03_rl_hft_tuning_zhang2023": 3, "04_hft_infra_chen2024": 2,
    # portfolio optimization
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
    """根据文件名匹配标签"""
    name_lower = filename.lower()
    for key, tags in TAG_MAP.items():
        if key in name_lower:
            return tags
    return ["quantitative", "a-shares"]


def extract_latex_formulas(text):
    """从 markdown 文本中提取 LaTeX 公式"""
    formulas = []
    # Match display math: $$...$$ (use raw string with escaped dollars)
    parts = text.split('$$')
    # parts[0] = before first $$, parts[1] = first formula, parts[2] = between, parts[3] = second formula, etc.
    for i in range(1, len(parts), 2):
        formula = parts[i].strip()
        if len(formula) > 5:
            # Try to find a label from preceding text (parts[i-1])
            preceding = parts[i-1] if i > 0 else ""
            label = ""
            # Look for **N. something** pattern
            label_match = re.search(r'\*\*\d+[\.\)]\s*(.+?)\*\*', preceding)
            if label_match:
                label = label_match.group(1).strip()
            else:
                # Look for ### heading (last one)
                heading_matches = re.findall(r'###?\s+(.+)', preceding)
                if heading_matches:
                    label = heading_matches[-1].strip()
            formulas.append({"label": label or "Core Formula", "latex": formula})
    return formulas[:4]  # max 4 formulas


def extract_steps(text):
    """从算法原理 markdown 中提取步骤列表"""
    steps = []
    # Look for **N. something** pattern (common in notebooks)
    for match in re.finditer(r'\*\*\d+[\.\)]\s*(.+?)\*\*', text):
        step = match.group(1).strip()
        if len(step) > 3 and len(step) < 200:
            steps.append(step)
    if not steps:
        # Fallback: look for numbered lines
        for match in re.finditer(r'(?:^|\n)\s*\d+[\.\)]\s*(.+?)(?=\n|$)', text):
            step = match.group(1).strip().strip('*').strip()
            if len(step) > 5 and len(step) < 200:
                steps.append(step)
    if not steps:
        # Fallback: look for - bullet points
        for match in re.finditer(r'(?:^|\n)\s*[-•]\s+\*\*(.+?)\*\*', text):
            step = match.group(1).strip()
            if len(step) > 3 and len(step) < 200:
                steps.append(step)
    return steps[:6]  # max 6 steps


def make_model_id(filename):
    """从文件名生成 URL-safe model ID"""
    # Remove leading number prefix and .ipynb
    name = re.sub(r'^\d+_', '', filename.replace('.ipynb', ''))
    return name.replace('_', '-')


def generate_sparkline(seed):
    """生成伪随机 sparkline 数据"""
    import hashlib
    h = hashlib.md5(seed.encode()).hexdigest()
    vals = []
    v = 100
    for i in range(0, 32, 2):
        delta = (int(h[i:i+2], 16) - 128) / 40
        v = max(50, min(200, v + delta))
        vals.append(round(v, 1))
    return vals


def extract_model_data(nb_path, category_id):
    """从单个 notebook 提取完整模型数据"""
    with open(nb_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)

    cells = nb.get('cells', [])
    filename = os.path.basename(nb_path)
    stem = filename.replace('.ipynb', '')

    # Collect markdown and code cells
    md_cells = []
    code_cells = []
    all_cells_content = []
    for cell in cells:
        content = ''.join(cell.get('source', []))
        all_cells_content.append((cell['cell_type'], content))
        if cell['cell_type'] == 'markdown':
            md_cells.append(content)
        elif cell['cell_type'] == 'code':
            code_cells.append(content)

    # --- Cell 0: Title + Paper reference ---
    first_md = md_cells[0] if md_cells else ""
    lines = first_md.split('\n')

    # Title
    title = lines[0].replace('#', '').strip()
    # Clean up leading numbers like "05 " or "08 "
    title = re.sub(r'^\d+\s+', '', title)

    # Author, Year, DOI
    author, year, doi = "", 0, ""
    abstract_lines = []
    in_abstract = False

    full_first_md = first_md

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

    # Fallback author/year extraction: "**论文参考**: Author Name (YYYY), *Title*"
    if not author:
        m = re.search(r'论文参考.*?[：:]\s*(.+?)\s*\((\d{4})\)', full_first_md)
        if m:
            author = m.group(1).strip().strip('*').strip()
            if not year:
                year = int(m.group(2))
    # Fallback: extract author from filename pattern  name_yearNNNN
    if not author:
        fname = os.path.basename(nb_path).replace('.ipynb', '')
        m = re.search(r'_([a-z]+)(\d{4})', fname)
        if m:
            author_last = m.group(1).capitalize()
            author = author_last
            if not year:
                year = int(m.group(2))

    # Fallback year from "核心指标" line or anywhere with (YYYY)
    if not year:
        m = re.search(r'\((\d{4})\)', full_first_md)
        if m:
            year = int(m.group(1))

    abstract = ' '.join(abstract_lines).strip()
    if not abstract:
        # Fallback: use descriptive lines (not metadata) from first_md
        for line in lines:
            stripped = line.strip()
            if (stripped and
                not stripped.startswith('#') and
                not stripped.startswith('-') and
                not stripped.startswith('*') and
                not stripped.startswith('>') and
                not stripped.startswith('|') and
                len(stripped) > 30):
                abstract = stripped
                break
    # If still empty, use first non-title line
    if not abstract and len(lines) > 2:
        abstract = ' '.join(l.strip() for l in lines[2:] if l.strip() and not l.startswith('#'))[:300]

    # --- Find Algorithm Principle cell (the one with $$ formulas or "算法原理") ---
    algo_md = ""
    for md in md_cells:
        if '$$' in md or '算法原理' in md or 'Algorithm' in md:
            algo_md = md
            break
    if not algo_md and len(md_cells) > 1:
        # Fallback: use the longest markdown cell (excluding first and last)
        candidates = md_cells[1:-1] if len(md_cells) > 2 else md_cells[1:]
        if candidates:
            algo_md = max(candidates, key=len)
    formulas = extract_latex_formulas(algo_md)
    steps = extract_steps(algo_md)

    # Extract algorithm name from first heading after ##
    algo_name = ""
    for line in algo_md.split('\n'):
        if line.startswith('###') and not line.startswith('####'):
            algo_name = line.replace('#', '').strip()
            break

    # Algorithm summary: first paragraph after headings
    algo_summary = ""
    for line in algo_md.split('\n'):
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and not stripped.startswith('$') and not stripped.startswith('**') and not stripped.startswith('-') and not stripped.startswith('|') and len(stripped) > 20:
            algo_summary = stripped
            break

    # --- Code cells: extract model training code (Cell 6 or 7, typically the one with model training) ---
    model_code = ""
    feature_code = ""
    for i, code in enumerate(code_cells):
        code_lower = code.lower()
        if any(kw in code_lower for kw in ['模型训练', 'model train', 'lgb.train', 'xgb.train', 'model.fit', '.fit(', 'def train']):
            model_code = code
        if any(kw in code_lower for kw in ['因子工程', '特征工程', 'feature', 'factor']):
            feature_code = code

    # If no model code found, use the longest code cell (heuristic)
    if not model_code and code_cells:
        model_code = max(code_cells, key=len)

    # Trim code to reasonable length (keep first 60 lines)
    def trim_code(code, max_lines=50):
        lines = code.split('\n')
        # Skip header comments
        start = 0
        for i, line in enumerate(lines):
            if not line.startswith('#') and not line.startswith('# ===') and line.strip():
                start = i
                break
        lines = lines[start:start + max_lines]
        return '\n'.join(lines)

    model_code = trim_code(model_code)

    # --- Cell 9 (last markdown): Results discussion ---
    last_md = md_cells[-1] if len(md_cells) > 2 else ""
    discussion = last_md.strip()

    # --- Performance metrics (extract from all cells) ---
    ann_return = 0
    sharpe = 0
    max_dd = 0
    all_text = '\n'.join(md for md in md_cells)
    # Also search code cell comments
    for code in code_cells:
        for line in code.split('\n'):
            if line.strip().startswith('#'):
                all_text += '\n' + line

    # Try multiple patterns for annualized return
    for pattern in [
        r'年化收益率?\s*[：:=]?\s*(\d+\.?\d*)\s*%',
        r'年化.*?(\d+\.?\d*)\s*%',
        r'annualized.*?(\d+\.?\d*)\s*%',
        r'(\d+\.?\d+)%.*年化',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 1 < val < 500:  # sanity check
                ann_return = val
                break

    # Sharpe ratio
    for pattern in [
        r'[Ss]harpe\s*(?:比率|Ratio)?\s*[：:=]?\s*(\d+\.?\d+)',
        r'夏普.*?(\d+\.?\d+)',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0 < val < 20:
                sharpe = val
                break

    # Max drawdown
    for pattern in [
        r'最大回撤\s*[：:=]?\s*-?(\d+\.?\d*)\s*%',
        r'[Mm]ax\s*[Dd]rawdown\s*[：:=]?\s*-?(\d+\.?\d*)\s*%',
        r'回撤\s*[：:=]?\s*-?(\d+\.?\d*)\s*%',
    ]:
        m = re.search(pattern, all_text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if 0 < val < 100:
                max_dd = -val
                break

    # Generate a model ID
    model_id = make_model_id(filename)

    # Sparkline
    sparkline = generate_sparkline(model_id)

    # Complexity
    complexity = COMPLEXITY_MAP.get(stem, 2)

    # Tags
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
        "annReturn": ann_return,
        "sharpe": sharpe,
        "maxDD": max_dd,
        "backtestPeriod": "2021—2024",
        "complexity": complexity,
        "tags": tags,
        "formulas": formulas,
        "steps": steps,
        "codeSnippet": model_code,
        "discussion": discussion[:1000],
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
                print(f"    ERROR: {e}")

    print(f"\nExtracted {len(all_models)} models from {len(CATEGORIES)} categories")

    # Write JS data file
    output_path = os.path.join(BASE_DIR, "web", "models_data.js")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated from Jupyter Notebooks — DO NOT EDIT\n")
        f.write("// Generated by extract_notebook_data.py\n\n")

        f.write("const CATEGORIES = ")
        # Write categories without code fields
        cats_clean = []
        for c in CATEGORIES:
            cats_clean.append({k: v for k, v in c.items() if k != "dirName"})
        f.write(json.dumps(cats_clean, ensure_ascii=False, indent=2))
        f.write(";\n\n")

        f.write("const MODELS = ")
        f.write(json.dumps(all_models, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(f"Written to: {output_path}")


if __name__ == "__main__":
    main()
