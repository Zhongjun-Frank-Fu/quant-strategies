import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { MODELS } from '../data/models';

export default function AboutPage() {
  const totalPapers = MODELS.length;
  const yearRange = `${Math.min(...MODELS.filter(m => m.year > 0).map(m => m.year))}–${Math.max(...MODELS.map(m => m.year))}`;

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-8">
        {/* Header */}
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-text-primary mb-4">
            关于 QuantLab
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            中国私募基金量化交易策略全景图 — 基于学术论文的系统性实现与可视化
          </p>
        </header>

        {/* Research Background */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-blue font-mono text-lg">01</span>
            研究背景
          </h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              本项目源自对中国私募基金量化交易策略的系统性研究。通过 Elicit 学术搜索引擎,
              检索了 2020–2024 年间发表的约 80 篇相关论文, 涵盖多因子选股、深度学习、
              强化学习、Alpha 挖掘、统计套利、高频交易和组合优化等 7 大策略类别。
            </p>
            <p>
              从中筛选出 {totalPapers} 个代表性策略模型, 每个模型以独立的 Jupyter Notebook
              形式完整实现, 包含论文摘要、算法原理 (LaTeX 公式)、交互式动画可视化、
              真实 A 股数据回测、以及绩效分析。
            </p>
          </div>
        </section>

        {/* Bias Disclaimer */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-gold font-mono text-lg">02</span>
            前视偏差声明
          </h2>
          <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-400 mt-0.5">warning</span>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p className="font-semibold text-amber-300">
                  所有回测收益率仅供学习参考, 不代表策略的实际可期望表现, 不可直接用于实盘交易。
                </p>
                <ul className="space-y-1 text-sm list-disc list-inside">
                  <li>训练标签使用了未来收益率 (Look-ahead Bias)</li>
                  <li>预处理 (StandardScaler 等) 可能在全量数据上拟合</li>
                  <li>模型参数选择可能基于完整样本期</li>
                  <li>A 股 T+1 约束和涨跌停限制已在回测引擎中部分实现, 但不完全覆盖所有边界情况</li>
                  <li>回测使用 20 只代表性股票简化了实际全样本选股场景</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Architecture */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-purple font-mono text-lg">03</span>
            技术架构
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-bg-card rounded-xl border border-border-subtle">
              <h3 className="font-headline font-bold text-text-primary mb-3">Python 后端</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  Jupyter Notebook — 46 个独立策略实现
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  akshare — 免费 A 股数据 API (无需注册)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  shared/ — 公共模块 (回测引擎、因子计算、可视化)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  scikit-learn, PyTorch, LightGBM, XGBoost
                </li>
              </ul>
            </div>
            <div className="p-6 bg-bg-card rounded-xl border border-border-subtle">
              <h3 className="font-headline font-bold text-text-primary mb-3">Web 前端</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  Vite + React 18 + TypeScript
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  Tailwind CSS v4 — 自定义暗色设计系统
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  KaTeX — 数学公式渲染
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                  SVG/Canvas — 交互式算法动画
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How to Run */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-green font-mono text-lg">04</span>
            使用指南
          </h2>
          <div className="p-6 bg-bg-card rounded-xl border border-border-subtle font-mono text-sm space-y-3">
            <p className="text-text-tertiary"># 克隆项目</p>
            <p className="text-signal-positive">git clone &lt;repo-url&gt;</p>
            <p className="text-text-tertiary"># 安装 Python 依赖</p>
            <p className="text-signal-positive">pip install -r requirements.txt</p>
            <p className="text-text-tertiary"># 启动 Jupyter</p>
            <p className="text-signal-positive">jupyter notebook</p>
            <p className="text-text-tertiary"># 打开任意 .ipynb, Kernel → Restart & Run All</p>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-cyan font-mono text-lg">05</span>
            数据来源
          </h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              所有策略使用 <span className="text-text-primary font-medium">akshare</span> 开源库获取 A 股市场数据,
              包括日线 OHLCV、指数行情、CSI300 成分股列表等。数据本地缓存为 parquet 格式,
              避免重复网络请求。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: '回测区间', value: '2021–2024' },
                { label: '股票池', value: 'CSI300 成分股' },
                { label: '基准指数', value: '沪深300' },
                { label: '初始资金', value: '100 万元' },
              ].map(item => (
                <div key={item.label} className="p-4 bg-bg-elevated rounded-lg text-center">
                  <div className="tabular text-lg font-bold text-text-primary">{item.value}</div>
                  <div className="text-xs text-text-tertiary mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategy Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-pink font-mono text-lg">06</span>
            策略类别总览
          </h2>
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const catModels = MODELS.filter(m => m.categoryId === cat.id);
              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  className="flex items-center gap-4 p-4 bg-bg-card rounded-xl border border-border-subtle hover:border-border-hover transition-all group"
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ color: cat.color }}
                  >
                    {cat.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-headline font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                      {cat.name}
                      <span className="text-text-tertiary font-normal text-sm ml-2">{cat.nameEn}</span>
                    </div>
                    <div className="text-sm text-text-secondary mt-1">{cat.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-xl font-bold" style={{ color: cat.color }}>
                      {String(catModels.length).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-text-tertiary uppercase tracking-widest">Models</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* References */}
        <section className="mb-16">
          <h2 className="text-2xl font-headline font-bold text-text-primary mb-6 flex items-center gap-3">
            <span className="text-accent-red font-mono text-lg">07</span>
            参考文献 ({yearRange})
          </h2>
          <div className="space-y-3">
            {MODELS.filter(m => m.author && m.year).map((model, i) => {
              const cat = CATEGORIES.find(c => c.id === model.categoryId);
              return (
                <div key={model.id} className="flex items-baseline gap-3 text-sm">
                  <span className="tabular text-text-tertiary w-8 text-right shrink-0">[{i + 1}]</span>
                  <div className="text-text-secondary">
                    <span className="text-text-primary font-medium">{model.author}</span>
                    {' '}({model.year}).{' '}
                    <Link to={`/model/${model.id}`} className="text-accent-blue hover:underline">
                      {model.title}
                    </Link>.
                    {model.doi && (
                      <> DOI: <a href={`https://doi.org/${model.doi}`} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-accent-blue">{model.doi}</a></>
                    )}
                    {cat && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border" style={{ color: cat.color, borderColor: cat.color + '40' }}>
                        {cat.nameEn}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
