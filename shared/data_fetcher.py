"""
数据获取模块 - 基于akshare的A股数据下载与本地缓存
所有数据以parquet格式缓存到 data_cache/ 目录，避免重复API请求
"""

import os
import time
import hashlib
import pandas as pd
import akshare as ak
from pathlib import Path

# 缓存根目录
_PROJECT_ROOT = Path(__file__).parent.parent
CACHE_DIR = _PROJECT_ROOT / "data_cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_path(category: str, key: str) -> Path:
    """生成缓存文件路径"""
    safe_key = hashlib.md5(key.encode()).hexdigest()[:12]
    sub_dir = CACHE_DIR / category
    sub_dir.mkdir(exist_ok=True)
    return sub_dir / f"{safe_key}.parquet"


def _load_cache(path: Path, max_age_hours: int = 24) -> pd.DataFrame:
    """加载缓存数据，超过max_age_hours小时则视为过期"""
    if path.exists():
        age_hours = (time.time() - path.stat().st_mtime) / 3600
        if age_hours < max_age_hours:
            try:
                return pd.read_parquet(path)
            except Exception:
                pass
    return None


def _save_cache(df: pd.DataFrame, path: Path):
    """保存数据到缓存"""
    try:
        df.to_parquet(path, index=True)
    except Exception as e:
        print(f"[Cache] 保存缓存失败: {e}")


def get_stock_daily(symbol: str, start_date: str = "20210101",
                    end_date: str = "20241231", adjust: str = "qfq") -> pd.DataFrame:
    """
    获取A股日线行情数据 (前复权)

    Parameters:
        symbol: 股票代码，如 "600519"
        start_date: 起始日期 YYYYMMDD
        end_date: 结束日期 YYYYMMDD
        adjust: 复权方式 qfq=前复权, hfq=后复权, ""=不复权

    Returns:
        DataFrame with columns: date, open, close, high, low, volume, turnover, ...
    """
    cache_key = f"stock_daily_{symbol}_{start_date}_{end_date}_{adjust}"
    cache_file = _cache_path("daily", cache_key)

    cached = _load_cache(cache_file, max_age_hours=72)
    if cached is not None:
        print(f"[Cache] 从缓存加载 {symbol} 日线数据")
        return cached

    print(f"[AKShare] 下载 {symbol} 日线数据 {start_date}-{end_date}...")
    try:
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust=adjust
        )
        if df is not None and len(df) > 0:
            # 标准化列名
            df.columns = [c.strip() for c in df.columns]
            col_map = {
                '日期': 'date', '开盘': 'open', '收盘': 'close',
                '最高': 'high', '最低': 'low', '成交量': 'volume',
                '成交额': 'amount', '振幅': 'amplitude',
                '涨跌幅': 'pct_change', '涨跌额': 'change',
                '换手率': 'turnover'
            }
            df.rename(columns=col_map, inplace=True)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df.set_index('date', inplace=True)
            df.sort_index(inplace=True)
            _save_cache(df, cache_file)
            return df
    except Exception as e:
        print(f"[Error] 下载 {symbol} 失败: {e}")

    return pd.DataFrame()


def get_index_daily(symbol: str = "sh000300", start_date: str = "20210101",
                    end_date: str = "20241231") -> pd.DataFrame:
    """
    获取指数日线数据

    Parameters:
        symbol: 指数代码，如 "sh000300"(沪深300), "sh000905"(中证500)
        start_date/end_date: YYYYMMDD
    """
    cache_key = f"index_daily_{symbol}_{start_date}_{end_date}"
    cache_file = _cache_path("index", cache_key)

    cached = _load_cache(cache_file, max_age_hours=72)
    if cached is not None:
        print(f"[Cache] 从缓存加载指数 {symbol} 日线数据")
        return cached

    print(f"[AKShare] 下载指数 {symbol} 日线数据...")
    try:
        # 使用东方财富接口
        code = symbol.replace("sh", "").replace("sz", "")
        df = ak.stock_zh_index_daily_em(symbol=symbol)
        if df is not None and len(df) > 0:
            df.columns = [c.strip() for c in df.columns]
            col_map = {
                'date': 'date', '日期': 'date',
                'open': 'open', '开盘': 'open',
                'close': 'close', '收盘': 'close',
                'high': 'high', '最高': 'high',
                'low': 'low', '最低': 'low',
                'volume': 'volume', '成交量': 'volume',
            }
            df.rename(columns=col_map, inplace=True)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df.set_index('date', inplace=True)
            df.sort_index(inplace=True)
            # 按日期范围过滤
            start = pd.Timestamp(start_date)
            end = pd.Timestamp(end_date)
            df = df.loc[start:end]
            _save_cache(df, cache_file)
            return df
    except Exception as e:
        print(f"[Error] 下载指数 {symbol} 失败: {e}")

    return pd.DataFrame()


def get_etf_daily(symbol: str, start_date: str = "20210101",
                  end_date: str = "20241231") -> pd.DataFrame:
    """
    获取ETF日线数据

    Parameters:
        symbol: ETF代码，如 "510300"
    """
    cache_key = f"etf_daily_{symbol}_{start_date}_{end_date}"
    cache_file = _cache_path("etf", cache_key)

    cached = _load_cache(cache_file, max_age_hours=72)
    if cached is not None:
        print(f"[Cache] 从缓存加载ETF {symbol}")
        return cached

    print(f"[AKShare] 下载ETF {symbol} 日线数据...")
    try:
        df = ak.fund_etf_hist_em(
            symbol=symbol,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust="qfq"
        )
        if df is not None and len(df) > 0:
            col_map = {
                '日期': 'date', '开盘': 'open', '收盘': 'close',
                '最高': 'high', '最低': 'low', '成交量': 'volume',
                '成交额': 'amount', '振幅': 'amplitude',
                '涨跌幅': 'pct_change', '涨跌额': 'change',
                '换手率': 'turnover'
            }
            df.rename(columns=col_map, inplace=True)
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df.set_index('date', inplace=True)
            df.sort_index(inplace=True)
            _save_cache(df, cache_file)
            return df
    except Exception as e:
        print(f"[Error] 下载ETF {symbol} 失败: {e}")

    return pd.DataFrame()


def get_csi300_constituents() -> list:
    """获取沪深300成分股列表"""
    cache_file = _cache_path("meta", "csi300_constituents")

    cached = _load_cache(cache_file, max_age_hours=168)  # 一周缓存
    if cached is not None:
        print("[Cache] 从缓存加载沪深300成分股列表")
        return cached['code'].tolist()

    print("[AKShare] 下载沪深300成分股列表...")
    try:
        df = ak.index_stock_cons_csindex(symbol="000300")
        if df is not None and len(df) > 0:
            col_map = {'成分券代码': 'code', '成分券名称': 'name'}
            df.rename(columns=col_map, inplace=True)
            if 'code' not in df.columns:
                df.columns = ['code', 'name'] + list(df.columns[2:])
            _save_cache(df, cache_file)
            return df['code'].tolist()
    except Exception as e:
        print(f"[Error] 获取沪深300成分股失败: {e}")

    # 备用: 返回一些常见大盘股
    return [
        "600519", "601318", "600036", "000858", "601166",
        "600276", "601398", "600030", "000333", "002415",
        "600900", "601888", "600809", "000568", "002304",
        "601012", "600031", "603259", "600585", "000661",
    ]


def get_multiple_stocks_daily(symbols: list, start_date: str = "20210101",
                               end_date: str = "20241231",
                               fields: list = None) -> dict:
    """
    批量下载多只股票日线数据

    Parameters:
        symbols: 股票代码列表
        fields: 需要的字段列表，默认全部

    Returns:
        dict: {symbol: DataFrame}
    """
    result = {}
    for i, sym in enumerate(symbols):
        df = get_stock_daily(sym, start_date, end_date)
        if len(df) > 0:
            if fields:
                available = [f for f in fields if f in df.columns]
                df = df[available]
            result[sym] = df
        if (i + 1) % 10 == 0:
            print(f"  已下载 {i+1}/{len(symbols)} 只股票")
            time.sleep(0.5)  # 避免请求过快
    print(f"[Done] 共成功下载 {len(result)}/{len(symbols)} 只股票数据")
    return result


def get_stock_minute(symbol: str, period: str = "5",
                     start_date: str = "20240101",
                     end_date: str = "20241231") -> pd.DataFrame:
    """
    获取A股分钟线数据 (用于高频交易策略)

    Parameters:
        symbol: 股票代码
        period: "1", "5", "15", "30", "60" 分钟
    """
    cache_key = f"minute_{symbol}_{period}_{start_date}_{end_date}"
    cache_file = _cache_path("minute", cache_key)

    cached = _load_cache(cache_file, max_age_hours=72)
    if cached is not None:
        print(f"[Cache] 从缓存加载 {symbol} {period}分钟线")
        return cached

    print(f"[AKShare] 下载 {symbol} {period}分钟线...")
    try:
        df = ak.stock_zh_a_hist_min_em(
            symbol=symbol,
            period=period,
            start_date=f"{start_date[:4]}-{start_date[4:6]}-{start_date[6:]}",
            end_date=f"{end_date[:4]}-{end_date[4:6]}-{end_date[6:]}",
            adjust="qfq"
        )
        if df is not None and len(df) > 0:
            col_map = {
                '时间': 'datetime', '开盘': 'open', '收盘': 'close',
                '最高': 'high', '最低': 'low', '成交量': 'volume',
                '成交额': 'amount', '涨跌幅': 'pct_change',
                '涨跌额': 'change', '振幅': 'amplitude',
                '换手率': 'turnover'
            }
            df.rename(columns=col_map, inplace=True)
            if 'datetime' in df.columns:
                df['datetime'] = pd.to_datetime(df['datetime'])
                df.set_index('datetime', inplace=True)
            df.sort_index(inplace=True)
            _save_cache(df, cache_file)
            return df
    except Exception as e:
        print(f"[Error] 下载分钟线 {symbol} 失败: {e}")

    return pd.DataFrame()
