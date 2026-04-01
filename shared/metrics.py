"""
绩效指标计算模块 - 年化收益、夏普比、最大回撤等
"""

import numpy as np
import pandas as pd
from .constants import TRADING_DAYS_PER_YEAR, RISK_FREE_RATE


def annualized_return(returns: pd.Series) -> float:
    """年化收益率"""
    if len(returns) == 0:
        return 0.0
    total = (1 + returns).prod()
    n_years = len(returns) / TRADING_DAYS_PER_YEAR
    if n_years <= 0:
        return 0.0
    return total ** (1 / n_years) - 1


def annualized_volatility(returns: pd.Series) -> float:
    """年化波动率"""
    if len(returns) < 2:
        return 0.0
    return returns.std() * np.sqrt(TRADING_DAYS_PER_YEAR)


def sharpe_ratio(returns: pd.Series, rf: float = None) -> float:
    """夏普比率"""
    if rf is None:
        rf = RISK_FREE_RATE
    ann_ret = annualized_return(returns)
    ann_vol = annualized_volatility(returns)
    if ann_vol == 0:
        return 0.0
    return (ann_ret - rf) / ann_vol


def sortino_ratio(returns: pd.Series, rf: float = None) -> float:
    """索提诺比率 (只考虑下行风险)

    使用标准下行偏差: sqrt(mean(min(R, 0)^2)) 而非仅负收益的std
    """
    if rf is None:
        rf = RISK_FREE_RATE
    ann_ret = annualized_return(returns)
    if len(returns) < 2:
        return 0.0
    # 标准下行偏差: 所有收益参与计算，正收益贡献0
    downside_diff = np.minimum(returns, 0)
    downside_vol = np.sqrt((downside_diff ** 2).mean()) * np.sqrt(TRADING_DAYS_PER_YEAR)
    if downside_vol == 0:
        return 0.0
    return (ann_ret - rf) / downside_vol


def max_drawdown(equity_curve: pd.Series) -> float:
    """最大回撤"""
    if len(equity_curve) < 2:
        return 0.0
    peak = equity_curve.cummax()
    drawdown = (equity_curve - peak) / peak
    return drawdown.min()


def max_drawdown_series(equity_curve: pd.Series) -> pd.Series:
    """回撤时序 (用于绘制水下图)"""
    peak = equity_curve.cummax()
    return (equity_curve - peak) / peak


def calmar_ratio(returns: pd.Series, equity_curve: pd.Series) -> float:
    """Calmar比率 = 年化收益 / |最大回撤|"""
    ann_ret = annualized_return(returns)
    mdd = abs(max_drawdown(equity_curve))
    if mdd == 0:
        return 0.0
    return ann_ret / mdd


def information_ratio(returns: pd.Series, benchmark_returns: pd.Series) -> float:
    """信息比率"""
    if len(returns) != len(benchmark_returns):
        min_len = min(len(returns), len(benchmark_returns))
        returns = returns.iloc[:min_len]
        benchmark_returns = benchmark_returns.iloc[:min_len]
    active = returns - benchmark_returns
    if active.std() == 0:
        return 0.0
    return (active.mean() * TRADING_DAYS_PER_YEAR) / (active.std() * np.sqrt(TRADING_DAYS_PER_YEAR))


def alpha_beta(returns: pd.Series, benchmark_returns: pd.Series) -> tuple:
    """计算Alpha和Beta"""
    if len(returns) != len(benchmark_returns):
        min_len = min(len(returns), len(benchmark_returns))
        returns = returns.iloc[:min_len]
        benchmark_returns = benchmark_returns.iloc[:min_len]

    cov = np.cov(returns, benchmark_returns)
    if cov[1, 1] == 0:
        return 0.0, 0.0
    beta = cov[0, 1] / cov[1, 1]
    # Jensen's Alpha: α = E[R] - [Rf + β(E[Rm] - Rf)]
    alpha = annualized_return(returns) - (RISK_FREE_RATE + beta * (annualized_return(benchmark_returns) - RISK_FREE_RATE))
    return alpha, beta


def win_rate(returns: pd.Series) -> float:
    """胜率"""
    if len(returns) == 0:
        return 0.0
    return (returns > 0).sum() / len(returns)


def profit_factor(returns: pd.Series) -> float:
    """盈亏比"""
    gains = returns[returns > 0].sum()
    losses = abs(returns[returns < 0].sum())
    if losses == 0:
        return float('inf') if gains > 0 else 0.0
    return gains / losses


def cumulative_return(returns: pd.Series) -> float:
    """累计收益率"""
    return (1 + returns).prod() - 1


def summary_table(returns: pd.Series, equity_curve: pd.Series = None,
                  benchmark_returns: pd.Series = None) -> dict:
    """
    生成完整绩效摘要

    Returns:
        dict: 包含所有关键绩效指标
    """
    if equity_curve is None:
        equity_curve = (1 + returns).cumprod()

    result = {
        "累计收益率": f"{cumulative_return(returns):.2%}",
        "年化收益率": f"{annualized_return(returns):.2%}",
        "年化波动率": f"{annualized_volatility(returns):.2%}",
        "夏普比率": f"{sharpe_ratio(returns):.2f}",
        "索提诺比率": f"{sortino_ratio(returns):.2f}",
        "最大回撤": f"{max_drawdown(equity_curve):.2%}",
        "Calmar比率": f"{calmar_ratio(returns, equity_curve):.2f}",
        "胜率": f"{win_rate(returns):.2%}",
        "盈亏比": f"{profit_factor(returns):.2f}",
        "交易天数": len(returns),
    }

    if benchmark_returns is not None:
        alpha, beta = alpha_beta(returns, benchmark_returns)
        result["Alpha"] = f"{alpha:.2%}"
        result["Beta"] = f"{beta:.2f}"
        result["信息比率"] = f"{information_ratio(returns, benchmark_returns):.2f}"
        result["基准累计收益"] = f"{cumulative_return(benchmark_returns):.2%}"

    return result
