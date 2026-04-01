"""
因子计算模块 - 技术因子、价格因子、基本面因子
"""

import numpy as np
import pandas as pd


# ==================== 价格/动量因子 ====================

def momentum(close: pd.Series, periods: list = None) -> pd.DataFrame:
    """动量因子: 过去N日收益率"""
    if periods is None:
        periods = [5, 10, 20, 60]
    result = pd.DataFrame(index=close.index)
    for p in periods:
        result[f'mom_{p}'] = close.pct_change(p)
    return result


def volatility(close: pd.Series, windows: list = None) -> pd.DataFrame:
    """波动率因子: 过去N日收益率标准差"""
    if windows is None:
        windows = [5, 10, 20, 60]
    ret = close.pct_change()
    result = pd.DataFrame(index=close.index)
    for w in windows:
        result[f'vol_{w}'] = ret.rolling(w).std()
    return result


def turnover_factor(turnover: pd.Series, windows: list = None) -> pd.DataFrame:
    """换手率因子"""
    if windows is None:
        windows = [5, 10, 20]
    result = pd.DataFrame(index=turnover.index)
    result['turnover'] = turnover
    for w in windows:
        result[f'turnover_ma_{w}'] = turnover.rolling(w).mean()
    return result


def volume_price_corr(close: pd.Series, volume: pd.Series,
                      window: int = 20) -> pd.Series:
    """量价相关性因子"""
    return close.rolling(window).corr(volume)


def high_low_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    """日内波幅因子"""
    return (high - low) / close


def price_to_ma(close: pd.Series, windows: list = None) -> pd.DataFrame:
    """价格偏离均线因子"""
    if windows is None:
        windows = [5, 10, 20, 60]
    result = pd.DataFrame(index=close.index)
    for w in windows:
        ma = close.rolling(w).mean()
        result[f'price_to_ma_{w}'] = (close - ma) / ma
    return result


# ==================== 技术指标因子 ====================

def sma(series: pd.Series, window: int) -> pd.Series:
    """简单移动平均"""
    return series.rolling(window).mean()


def ema(series: pd.Series, window: int) -> pd.Series:
    """指数移动平均"""
    return series.ewm(span=window, adjust=False).mean()


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    """RSI 相对强弱指标"""
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)
    avg_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    avg_loss = loss.ewm(com=window - 1, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def macd(close: pd.Series, fast: int = 12, slow: int = 26,
         signal: int = 9) -> pd.DataFrame:
    """MACD 指标"""
    ema_fast = ema(close, fast)
    ema_slow = ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return pd.DataFrame({
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram,
    }, index=close.index)


def bollinger_bands(close: pd.Series, window: int = 20,
                    num_std: float = 2.0) -> pd.DataFrame:
    """布林带"""
    middle = sma(close, window)
    std = close.rolling(window).std()
    upper = middle + num_std * std
    lower = middle - num_std * std
    return pd.DataFrame({
        'bb_middle': middle,
        'bb_upper': upper,
        'bb_lower': lower,
        'bb_width': (upper - lower) / middle,
        'bb_pctb': (close - lower) / (upper - lower),
    }, index=close.index)


def atr(high: pd.Series, low: pd.Series, close: pd.Series,
        window: int = 14) -> pd.Series:
    """ATR 平均真实波幅"""
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.rolling(window).mean()


def adx(high: pd.Series, low: pd.Series, close: pd.Series,
        window: int = 14) -> pd.Series:
    """ADX 平均趋向指标 (使用Wilder平滑)"""
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0

    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr_val = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

    # 使用Wilder平滑 (α = 1/window) 替代SMA，与标准ADX一致
    wilder_alpha = 1.0 / window
    atr_val = tr_val.ewm(alpha=wilder_alpha, adjust=False, min_periods=window).mean()
    smooth_plus_dm = plus_dm.ewm(alpha=wilder_alpha, adjust=False, min_periods=window).mean()
    smooth_minus_dm = minus_dm.ewm(alpha=wilder_alpha, adjust=False, min_periods=window).mean()

    plus_di = 100 * (smooth_plus_dm / atr_val.replace(0, np.nan))
    minus_di = 100 * (smooth_minus_dm / atr_val.replace(0, np.nan))

    dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan))
    return dx.ewm(alpha=wilder_alpha, adjust=False, min_periods=window).mean()


def cci(high: pd.Series, low: pd.Series, close: pd.Series,
        window: int = 20) -> pd.Series:
    """CCI 顺势指标"""
    tp = (high + low + close) / 3
    sma_tp = tp.rolling(window).mean()
    mad = tp.rolling(window).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    return (tp - sma_tp) / (0.015 * mad.replace(0, np.nan))


# ==================== 因子预处理 ====================

def winsorize(series: pd.Series, lower: float = 0.01,
              upper: float = 0.99) -> pd.Series:
    """缩尾处理: 将极端值限制在分位数范围内"""
    q_low = series.quantile(lower)
    q_high = series.quantile(upper)
    return series.clip(q_low, q_high)


def standardize(series: pd.Series) -> pd.Series:
    """标准化: Z-score"""
    std = series.std()
    if std == 0 or np.isnan(std):
        return series * 0
    return (series - series.mean()) / std


def rank_normalize(series: pd.Series) -> pd.Series:
    """排名标准化: 转为 [0, 1] 排名"""
    return series.rank(pct=True)


def neutralize(factor: pd.Series, groups: pd.Series) -> pd.Series:
    """行业/市值中性化"""
    result = factor.copy()
    for g in groups.unique():
        mask = groups == g
        if mask.sum() > 1:
            sub = factor[mask]
            result[mask] = standardize(sub)
    return result


def build_factor_panel(stock_data: dict, date_range: pd.DatetimeIndex = None) -> pd.DataFrame:
    """
    为多只股票构建截面因子面板

    Parameters:
        stock_data: {symbol: DataFrame} 每只股票的OHLCV数据
        date_range: 需要的日期范围

    Returns:
        DataFrame: MultiIndex (date, symbol) x factors
    """
    records = []

    for symbol, df in stock_data.items():
        if len(df) < 60:
            continue

        try:
            # 动量因子
            mom = momentum(df['close'])
            # 波动率因子
            vol = volatility(df['close'])
            # 技术指标
            rsi_val = rsi(df['close'])
            macd_val = macd(df['close'])
            bb_val = bollinger_bands(df['close'])
            # 价格偏离
            ptm = price_to_ma(df['close'])

            # 合并
            factors = pd.concat([mom, vol, ptm], axis=1)
            factors['rsi'] = rsi_val
            factors['macd_hist'] = macd_val['histogram']
            factors['bb_pctb'] = bb_val['bb_pctb']
            factors['bb_width'] = bb_val['bb_width']

            if 'turnover' in df.columns:
                tf = turnover_factor(df['turnover'])
                factors = pd.concat([factors, tf], axis=1)

            if 'volume' in df.columns:
                factors['vp_corr'] = volume_price_corr(df['close'], df['volume'])

            if 'high' in df.columns and 'low' in df.columns:
                factors['hl_range'] = high_low_range(df['high'], df['low'], df['close'])

            # ⚠️ 未来收益率 (标签) — 仅用于模型训练/研究回测
            # 包含前视数据 (shift(-N) 使用未来价格), 绝对不可用于实盘交易信号
            factors['fwd_return_1d'] = df['close'].pct_change(1).shift(-1)
            factors['fwd_return_5d'] = df['close'].pct_change(5).shift(-5)
            factors['fwd_return_20d'] = df['close'].pct_change(20).shift(-20)

            factors['symbol'] = symbol
            records.append(factors)

        except Exception as e:
            continue

    if not records:
        return pd.DataFrame()

    panel = pd.concat(records, axis=0)
    panel = panel.reset_index()
    if 'date' not in panel.columns and 'index' in panel.columns:
        panel.rename(columns={'index': 'date'}, inplace=True)

    return panel
