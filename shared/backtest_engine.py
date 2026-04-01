"""
回测引擎 - 支持T+1约束、手续费、印花税的简易向量化回测
"""

import numpy as np
import pandas as pd
from .constants import (INITIAL_CAPITAL, COMMISSION_RATE, STAMP_TAX_RATE,
                        SLIPPAGE, TRADING_DAYS_PER_YEAR)
from .metrics import summary_table


class Backtester:
    """
    单资产回测引擎

    信号约定:
        1  = 买入/持有多头
        -1 = 卖出/做空
        0  = 空仓

    T+1约束: 当日买入的股票不能当日卖出
    """

    def __init__(self, initial_capital=INITIAL_CAPITAL,
                 commission=COMMISSION_RATE,
                 stamp_tax=STAMP_TAX_RATE,
                 slippage=SLIPPAGE,
                 t_plus_1=True):
        self.initial_capital = initial_capital
        self.commission = commission
        self.stamp_tax = stamp_tax
        self.slippage = slippage
        self.t_plus_1 = t_plus_1

    def run(self, prices: pd.Series, signals: pd.Series,
            benchmark_prices: pd.Series = None) -> dict:
        """
        执行回测

        Parameters:
            prices: 价格序列 (收盘价)
            signals: 信号序列 (1=买, -1=卖, 0=空仓)
            benchmark_prices: 基准价格 (可选)

        Returns:
            dict with: equity_curve, returns, trades, metrics, benchmark_returns
        """
        # 对齐数据
        common_idx = prices.index.intersection(signals.index)
        prices = prices.loc[common_idx].copy()
        signals = signals.loc[common_idx].copy()

        n = len(prices)
        if n < 2:
            return self._empty_result()

        # T+1约束: 买入信号的下一天才能生效卖出
        if self.t_plus_1:
            signals = self._apply_t_plus_1(signals)

        # 计算持仓变化和成本
        position = signals.copy()
        pos_change = position.diff().fillna(position.iloc[0])

        # 计算交易成本
        buy_cost = (pos_change > 0).astype(float) * (self.commission + self.slippage)
        sell_cost = (pos_change < 0).astype(float) * (self.commission + self.stamp_tax + self.slippage)
        total_cost = buy_cost + sell_cost

        # 计算日收益
        price_returns = prices.pct_change().fillna(0)
        strategy_returns = position.shift(1).fillna(0) * price_returns - total_cost

        # 计算权益曲线
        equity = self.initial_capital * (1 + strategy_returns).cumprod()

        # 基准收益
        benchmark_returns = None
        if benchmark_prices is not None:
            benchmark_prices = benchmark_prices.reindex(common_idx).ffill()
            benchmark_returns = benchmark_prices.pct_change().fillna(0)

        # 交易记录
        trade_dates = pos_change[pos_change != 0].index
        trades = pd.DataFrame({
            'date': trade_dates,
            'action': ['买入' if pos_change.loc[d] > 0 else '卖出' for d in trade_dates],
            'price': [prices.loc[d] for d in trade_dates],
        })

        # 绩效指标
        metrics = summary_table(strategy_returns, equity, benchmark_returns)

        return {
            'equity_curve': equity,
            'returns': strategy_returns,
            'trades': trades,
            'metrics': metrics,
            'benchmark_returns': benchmark_returns,
            'signals': signals,
            'prices': prices,
        }

    def _apply_t_plus_1(self, signals: pd.Series) -> pd.Series:
        """
        应用T+1约束: 买入当天不能卖出，最早次日可卖

        A股T+1规则: 当日买入的股票，最早要到下一个交易日才能卖出。
        即最短持仓周期为1个交易日（买入日收盘→次日收盘）。
        """
        result = signals.copy()
        holding = False
        buy_idx = -2  # 记录买入的bar索引

        for i in range(len(result)):
            if result.iloc[i] == 1 and not holding:
                # 新建仓
                holding = True
                buy_idx = i
            elif result.iloc[i] <= 0 and holding:
                if i == buy_idx:
                    # T+1: 买入当天不能卖出，强制持有
                    result.iloc[i] = 1
                else:
                    # 非买入当天，允许平仓
                    holding = False

        return result

    def _empty_result(self) -> dict:
        return {
            'equity_curve': pd.Series(dtype=float),
            'returns': pd.Series(dtype=float),
            'trades': pd.DataFrame(),
            'metrics': {},
            'benchmark_returns': None,
            'signals': pd.Series(dtype=float),
            'prices': pd.Series(dtype=float),
        }


class MultiStockBacktester:
    """
    多股票组合回测引擎

    适用于多因子选股策略: 每期选Top-N股票等权持有
    """

    def __init__(self, initial_capital=INITIAL_CAPITAL,
                 commission=COMMISSION_RATE,
                 stamp_tax=STAMP_TAX_RATE,
                 slippage=SLIPPAGE,
                 rebalance_freq='M'):
        self.initial_capital = initial_capital
        self.commission = commission
        self.stamp_tax = stamp_tax
        self.slippage = slippage
        self.rebalance_freq = rebalance_freq  # 'M'=月, 'W'=周

    def run(self, all_prices: dict, selections: dict,
            benchmark_prices: pd.Series = None) -> dict:
        """
        执行多股票组合回测

        Parameters:
            all_prices: {symbol: price_series} 所有股票的价格
            selections: {date: [symbol1, symbol2, ...]} 每期选股结果
            benchmark_prices: 基准价格

        Returns:
            dict with equity_curve, returns, metrics, etc.
        """
        # 构建价格矩阵
        price_df = pd.DataFrame(all_prices)
        price_df.sort_index(inplace=True)
        price_df.ffill(inplace=True)

        returns_df = price_df.pct_change().fillna(0)

        # 按调仓日期计算组合收益
        sorted_dates = sorted(selections.keys())
        portfolio_returns = pd.Series(0.0, index=returns_df.index)

        for i, rebal_date in enumerate(sorted_dates):
            # 确定持仓期
            start = rebal_date
            if i + 1 < len(sorted_dates):
                end = sorted_dates[i + 1]
            else:
                end = returns_df.index[-1]

            stocks = selections[rebal_date]
            if not stocks:
                continue

            # 等权配置
            available_stocks = [s for s in stocks if s in returns_df.columns]
            if not available_stocks:
                continue

            weight = 1.0 / len(available_stocks)
            mask = (returns_df.index > start) & (returns_df.index <= end)

            period_returns = returns_df.loc[mask, available_stocks].mean(axis=1)

            # 扣除调仓成本 (在调仓日)
            turnover_cost = self.commission * 2 + self.stamp_tax + self.slippage * 2
            if mask.sum() > 0:
                first_day = returns_df.index[mask][0]
                period_returns.loc[first_day] -= turnover_cost

            portfolio_returns.loc[mask] = period_returns

        # 权益曲线
        equity = self.initial_capital * (1 + portfolio_returns).cumprod()

        # 基准
        benchmark_returns = None
        if benchmark_prices is not None:
            benchmark_returns = benchmark_prices.reindex(equity.index).ffill().pct_change().fillna(0)

        metrics = summary_table(portfolio_returns, equity, benchmark_returns)

        return {
            'equity_curve': equity,
            'returns': portfolio_returns,
            'metrics': metrics,
            'benchmark_returns': benchmark_returns,
            'selections': selections,
        }


class PairsBacktester:
    """
    配对交易回测引擎

    交易逻辑:
        spread > upper_threshold → 做空价差 (卖A买B)
        spread < lower_threshold → 做多价差 (买A卖B)
        spread 回到均值附近 → 平仓
    """

    def __init__(self, initial_capital=INITIAL_CAPITAL,
                 commission=COMMISSION_RATE,
                 stamp_tax=STAMP_TAX_RATE,
                 entry_z=2.0, exit_z=0.5,
                 stop_loss_z=4.0):
        self.initial_capital = initial_capital
        self.commission = commission
        self.stamp_tax = stamp_tax
        self.entry_z = entry_z
        self.exit_z = exit_z
        self.stop_loss_z = stop_loss_z

    def run(self, price_a: pd.Series, price_b: pd.Series,
            hedge_ratio: float = None,
            benchmark_prices: pd.Series = None) -> dict:
        """
        执行配对交易回测

        Parameters:
            price_a, price_b: 配对股票的价格序列
            hedge_ratio: 对冲比率 (如果为None则自动计算)
        """
        common_idx = price_a.index.intersection(price_b.index)
        pa = price_a.loc[common_idx]
        pb = price_b.loc[common_idx]

        # 计算对冲比率
        if hedge_ratio is None:
            from numpy.polynomial import polynomial as P
            hedge_ratio = np.polyfit(pb, pa, 1)[0]

        # 计算价差
        spread = pa - hedge_ratio * pb

        # Z-score
        lookback = 60
        spread_mean = spread.rolling(lookback).mean()
        spread_std = spread.rolling(lookback).std()
        z_score = (spread - spread_mean) / spread_std

        # 生成信号
        position = pd.Series(0.0, index=common_idx)
        current_pos = 0

        for i in range(lookback, len(z_score)):
            z = z_score.iloc[i]
            if np.isnan(z):
                continue

            if current_pos == 0:
                if z > self.entry_z:
                    current_pos = -1  # 做空价差
                elif z < -self.entry_z:
                    current_pos = 1   # 做多价差
            elif current_pos == 1:
                if z > -self.exit_z or z > self.stop_loss_z:
                    current_pos = 0
            elif current_pos == -1:
                if z < self.exit_z or z < -self.stop_loss_z:
                    current_pos = 0

            position.iloc[i] = current_pos

        # 计算配对收益
        ret_a = pa.pct_change().fillna(0)
        ret_b = pb.pct_change().fillna(0)
        spread_returns = position.shift(1).fillna(0) * (ret_a - hedge_ratio * ret_b)

        # 扣除交易成本
        pos_change = position.diff().fillna(0)
        trade_cost = pos_change.abs() * (self.commission * 2 + self.stamp_tax)
        strategy_returns = spread_returns - trade_cost

        equity = self.initial_capital * (1 + strategy_returns).cumprod()

        benchmark_returns = None
        if benchmark_prices is not None:
            benchmark_returns = benchmark_prices.reindex(common_idx).ffill().pct_change().fillna(0)

        metrics = summary_table(strategy_returns, equity, benchmark_returns)

        return {
            'equity_curve': equity,
            'returns': strategy_returns,
            'metrics': metrics,
            'spread': spread,
            'z_score': z_score,
            'position': position,
            'benchmark_returns': benchmark_returns,
        }
