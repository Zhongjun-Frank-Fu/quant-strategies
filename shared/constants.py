"""
常量定义 - 交易参数、市场代码、默认设置
"""

# 交易日历
TRADING_DAYS_PER_YEAR = 244

# 费率
COMMISSION_RATE = 0.0003      # 佣金 万三 (机构费率)
STAMP_TAX_RATE = 0.001        # 印花税 千一 (仅卖方)
SLIPPAGE = 0.001              # 滑点 千一

# 无风险利率 (年化)
RISK_FREE_RATE = 0.025

# 指数代码
CSI300_CODE = "sh000300"      # 沪深300
CSI500_CODE = "sh000905"      # 中证500
SSE_CODE = "sh000001"         # 上证综指

# 默认回测区间
DEFAULT_START = "20210101"
DEFAULT_END = "20241231"

# 初始资金
INITIAL_CAPITAL = 1_000_000

# 代表性个股代码 (用于单股策略)
STOCK_MOUTAI = "600519"       # 贵州茅台
STOCK_ICBC = "601398"         # 工商银行
STOCK_CCB = "601939"          # 建设银行
STOCK_PINGAN = "601318"       # 中国平安
STOCK_ZHAOSHANG = "600036"    # 招商银行

# ETF代码
ETF_CSI300 = "510300"         # 沪深300ETF
ETF_CSI500 = "510500"         # 中证500ETF

# 行业ETF (用于组合优化)
SECTOR_ETFS = {
    "银行": "512800",
    "券商": "512000",
    "医药": "512010",
    "消费": "159928",
    "科技": "515000",
    "新能源": "516160",
    "军工": "512660",
    "地产": "512200",
}

# 可视化颜色方案
COLOR_STRATEGY = "#2196F3"    # 策略蓝
COLOR_BENCHMARK = "#9E9E9E"   # 基准灰
COLOR_BUY = "#4CAF50"         # 买入绿
COLOR_SELL = "#F44336"        # 卖出红
COLOR_DRAWDOWN = "#FF9800"    # 回撤橙
COLOR_PALETTE = [
    "#2196F3", "#F44336", "#4CAF50", "#FF9800",
    "#9C27B0", "#00BCD4", "#795548", "#607D8B",
]
