"""
统一可视化模块 - 收益曲线、回撤图、信号图、绩效表
支持中文字体 (macOS PingFang SC)
"""

import numpy as np
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from .constants import (COLOR_STRATEGY, COLOR_BENCHMARK, COLOR_BUY,
                        COLOR_SELL, COLOR_DRAWDOWN, COLOR_PALETTE)
from .metrics import max_drawdown_series

# ==================== 中文字体配置 ====================


def set_chinese_font():
    """配置matplotlib中文字体"""
    import platform
    system = platform.system()

    if system == 'Darwin':  # macOS
        font_list = ['PingFang SC', 'Heiti SC', 'STHeiti', 'Arial Unicode MS']
    elif system == 'Windows':
        font_list = ['SimHei', 'Microsoft YaHei', 'KaiTi']
    else:  # Linux
        font_list = ['WenQuanYi Micro Hei', 'Noto Sans CJK SC', 'SimHei']

    for font in font_list:
        try:
            matplotlib.rcParams['font.sans-serif'] = [font] + matplotlib.rcParams['font.sans-serif']
            matplotlib.rcParams['axes.unicode_minus'] = False
            # 测试是否可用
            fig, ax = plt.subplots(figsize=(1, 1))
            ax.set_title('测试')
            plt.close(fig)
            return
        except Exception:
            continue

    # 回退: 使用默认字体
    matplotlib.rcParams['axes.unicode_minus'] = False


# 初始化时设置中文字体
set_chinese_font()

# 全局风格
sns.set_style("whitegrid")
plt.rcParams['figure.dpi'] = 100
plt.rcParams['figure.figsize'] = (14, 5)


# ==================== 核心可视化函数 ====================

def plot_equity_curve(equity: pd.Series, benchmark_equity: pd.Series = None,
                      title: str = "策略收益曲线", save_path: str = None):
    """
    绘制策略vs基准的累计收益曲线
    """
    fig, ax = plt.subplots(figsize=(14, 6))

    # 标准化到起始值=1
    norm_equity = equity / equity.iloc[0]
    ax.plot(norm_equity.index, norm_equity.values,
            color=COLOR_STRATEGY, linewidth=2, label='策略收益', zorder=3)

    if benchmark_equity is not None:
        norm_bench = benchmark_equity / benchmark_equity.iloc[0]
        ax.plot(norm_bench.index, norm_bench.values,
                color=COLOR_BENCHMARK, linewidth=1.5, label='基准收益',
                linestyle='--', alpha=0.8, zorder=2)

    ax.set_title(title, fontsize=16, fontweight='bold')
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('累计净值', fontsize=12)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    plt.xticks(rotation=45)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_drawdown(equity: pd.Series, title: str = "策略回撤",
                  save_path: str = None):
    """绘制水下回撤图"""
    dd = max_drawdown_series(equity)

    fig, ax = plt.subplots(figsize=(14, 4))
    ax.fill_between(dd.index, dd.values, 0,
                    color=COLOR_DRAWDOWN, alpha=0.6, label='回撤')
    ax.plot(dd.index, dd.values, color=COLOR_DRAWDOWN, linewidth=0.8)

    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('回撤比例', fontsize=12)
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{x:.0%}'))
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    plt.xticks(rotation=45)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_signals(prices: pd.Series, buy_dates: list = None,
                 sell_dates: list = None, title: str = "交易信号",
                 save_path: str = None):
    """绘制价格+买卖信号"""
    fig, ax = plt.subplots(figsize=(14, 6))

    ax.plot(prices.index, prices.values,
            color='#333333', linewidth=1.2, label='价格', zorder=2)

    if buy_dates:
        buy_prices = prices.reindex(buy_dates).dropna()
        ax.scatter(buy_prices.index, buy_prices.values,
                   marker='^', color=COLOR_BUY, s=80, label='买入',
                   zorder=5, edgecolors='white', linewidth=0.5)

    if sell_dates:
        sell_prices = prices.reindex(sell_dates).dropna()
        ax.scatter(sell_prices.index, sell_prices.values,
                   marker='v', color=COLOR_SELL, s=80, label='卖出',
                   zorder=5, edgecolors='white', linewidth=0.5)

    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('价格', fontsize=12)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    plt.xticks(rotation=45)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_metrics_table(metrics: dict, title: str = "绩效指标",
                       save_path: str = None):
    """以表格形式渲染绩效指标"""
    fig, ax = plt.subplots(figsize=(8, max(3, len(metrics) * 0.4 + 1)))
    ax.axis('off')

    keys = list(metrics.keys())
    vals = list(metrics.values())

    table = ax.table(
        cellText=[[k, v] for k, v in zip(keys, vals)],
        colLabels=['指标', '数值'],
        loc='center',
        cellLoc='center',
        colWidths=[0.45, 0.45],
    )

    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1, 1.5)

    # 样式
    for (i, j), cell in table.get_celld().items():
        if i == 0:
            cell.set_facecolor('#2196F3')
            cell.set_text_props(color='white', fontweight='bold')
        elif i % 2 == 0:
            cell.set_facecolor('#f0f0f0')
        cell.set_edgecolor('#dddddd')

    ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_factor_importance(importance: dict, title: str = "因子重要性",
                           top_n: int = 20, save_path: str = None):
    """绘制因子重要性柱状图"""
    sorted_imp = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:top_n])

    fig, ax = plt.subplots(figsize=(10, max(5, top_n * 0.35)))

    bars = ax.barh(list(sorted_imp.keys())[::-1],
                   list(sorted_imp.values())[::-1],
                   color=COLOR_STRATEGY, alpha=0.8)

    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('重要性', fontsize=12)
    ax.grid(True, alpha=0.3, axis='x')
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_returns_distribution(returns: pd.Series, title: str = "收益率分布",
                              save_path: str = None):
    """绘制收益率分布直方图"""
    fig, ax = plt.subplots(figsize=(10, 5))

    ax.hist(returns.dropna(), bins=80, density=True,
            color=COLOR_STRATEGY, alpha=0.6, edgecolor='white')
    returns.dropna().plot.kde(ax=ax, color=COLOR_STRATEGY, linewidth=2)

    ax.axvline(x=0, color='red', linestyle='--', alpha=0.5)
    ax.axvline(x=returns.mean(), color='green', linestyle='--',
               alpha=0.7, label=f'均值={returns.mean():.4f}')

    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('日收益率', fontsize=12)
    ax.set_ylabel('密度', fontsize=12)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_cumulative_comparison(strategies: dict, title: str = "策略对比",
                               save_path: str = None):
    """多策略累计收益对比图"""
    fig, ax = plt.subplots(figsize=(14, 6))

    for i, (name, returns) in enumerate(strategies.items()):
        cum = (1 + returns).cumprod()
        color = COLOR_PALETTE[i % len(COLOR_PALETTE)]
        ax.plot(cum.index, cum.values, color=color, linewidth=1.8, label=name)

    ax.set_title(title, fontsize=16, fontweight='bold')
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('累计净值', fontsize=12)
    ax.legend(fontsize=10, ncol=2)
    ax.grid(True, alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    plt.xticks(rotation=45)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_correlation_heatmap(corr_matrix: pd.DataFrame, title: str = "因子相关性",
                             save_path: str = None):
    """因子相关性热力图"""
    fig, ax = plt.subplots(figsize=(12, 10))

    sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='RdBu_r',
                center=0, vmin=-1, vmax=1, ax=ax,
                square=True, linewidths=0.5)

    ax.set_title(title, fontsize=14, fontweight='bold')
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()
    return fig


def plot_full_report(result: dict, strategy_name: str = "策略"):
    """
    一键生成完整回测报告 (4张图)

    Parameters:
        result: Backtester.run() 返回的结果字典
        strategy_name: 策略名称
    """
    # 1. 收益曲线
    benchmark_equity = None
    if result.get('benchmark_returns') is not None:
        benchmark_equity = (1 + result['benchmark_returns']).cumprod() * result['equity_curve'].iloc[0]
    plot_equity_curve(result['equity_curve'], benchmark_equity,
                      title=f"{strategy_name} - 累计收益")

    # 2. 回撤图
    plot_drawdown(result['equity_curve'],
                  title=f"{strategy_name} - 回撤")

    # 3. 信号图 (如果有交易记录)
    if 'trades' in result and len(result.get('trades', pd.DataFrame())) > 0:
        trades = result['trades']
        buy_dates = trades[trades['action'] == '买入']['date'].tolist()
        sell_dates = trades[trades['action'] == '卖出']['date'].tolist()
        if 'prices' in result:
            plot_signals(result['prices'], buy_dates, sell_dates,
                         title=f"{strategy_name} - 交易信号")

    # 4. 绩效表
    plot_metrics_table(result['metrics'],
                       title=f"{strategy_name} - 绩效指标")
