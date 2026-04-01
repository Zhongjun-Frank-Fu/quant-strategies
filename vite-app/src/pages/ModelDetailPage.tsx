import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { MODELS } from '../data/models'
import { getModelMetrics, hasRealMetrics } from '../data/paper_metrics'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import FormulaCard from '../components/shared/FormulaCard'
import CodeBrowser from '../components/shared/CodeBrowser'
import AlgorithmAnimation from '../components/visualizations/AlgorithmAnimation'
import { MODEL_ARCHITECTURES } from '../data/model_architectures'
import EquityCurveChart from '../components/charts/EquityCurveChart'
import DrawdownChart from '../components/charts/DrawdownChart'
import MonthlyReturnsHeatmap from '../components/charts/MonthlyReturnsHeatmap'
import MetricsRadar from '../components/charts/MetricsRadar'
import PaperAnalysis from '../components/model/PaperAnalysis'
import CrossModelComparison from '../components/model/CrossModelComparison'
import DeepPaperContent from '../components/model/DeepPaperContent'
import { getPaperContent } from '../data/paper_content'

function ComplexityStars({ level = 1, max = 5 }: { level?: number; max?: number }) {
  return (
    <span className="flex gap-0.5 justify-center">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-xs ${
            i < level ? 'text-accent-blue' : 'text-text-tertiary/30'
          }`}
        >
          {i < level ? 'star' : 'star_border'}
        </span>
      ))}
    </span>
  )
}

export default function ModelDetailPage() {
  const { modelId } = useParams<{ modelId: string }>()
  const navigate = useNavigate()
  const model = MODELS.find((m) => m.id === modelId)
  const [activeSection, setActiveSection] = useState('abstract')

  useEffect(() => {
    setActiveSection('abstract')
  }, [modelId])

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['abstract', 'principle', 'animation', 'code', 'results']
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 200) {
          setActiveSection(id)
          break
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!model) {
    return (
      <div className="pt-24 text-center text-text-primary">
        <p>Model not found</p>
        <button onClick={() => navigate('/')} className="text-accent-blue mt-4">
          Back to Home
        </button>
      </div>
    )
  }

  const cat = CATEGORIES.find((c) => c.id === model.categoryId)!
  const pm = getModelMetrics(model.id, model)
  const hasReal = hasRealMetrics(model.id)
  const isUnavailable = pm.metricsSource === 'unavailable'
  const deepContent = getPaperContent(model.id)
  const siblings = MODELS.filter((m) => m.categoryId === model.categoryId)
  const idx = siblings.findIndex((m) => m.id === model.id)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null

  const tocItems = deepContent ? [
    { id: 'abstract', num: '01', label: 'Abstract' },
    { id: 'principle', num: '02', label: 'Algorithm Principle' },
    { id: 'deep-analysis', num: '03', label: '论文深度分析' },
    { id: 'animation', num: '04', label: 'Logic Visualizer' },
    { id: 'code', num: '05', label: 'Implementation' },
    { id: 'results', num: '06', label: 'Backtest Metrics' },
    { id: 'comparison', num: '07', label: 'Cross Comparison' },
  ] : [
    { id: 'abstract', num: '01', label: 'Abstract' },
    { id: 'principle', num: '02', label: 'Algorithm Principle' },
    { id: 'animation', num: '03', label: 'Logic Visualizer' },
    { id: 'code', num: '04', label: 'Implementation' },
    { id: 'results', num: '05', label: 'Backtest Metrics' },
    { id: 'comparison', num: '06', label: 'Cross Comparison' },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-32 max-w-[1600px] mx-auto px-8 flex gap-12">
        {/* Sticky Sidebar TOC */}
        <aside className="hidden xl:block w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            <h3 className="font-headline font-bold text-sm tracking-widest text-accent-blue uppercase">
              Contents
            </h3>
            <ul className="space-y-4 text-sm font-body">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`pl-4 block py-1 hover:text-accent-blue transition-all border-l-2 ${
                      activeSection === item.id
                        ? 'text-accent-blue border-accent-blue'
                        : 'text-text-secondary border-transparent'
                    }`}
                  >
                    {item.num} {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="pt-8 mt-8 border-t border-border-subtle">
              <p className="text-[10px] uppercase tracking-tighter text-text-tertiary font-bold">
                Current Node
              </p>
              <p className="text-xs text-text-primary mt-2 font-mono">{model.id}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 max-w-5xl">
          {/* Breadcrumb */}
          <header className="mb-12">
            <nav className="flex items-center gap-2 text-xs font-body text-text-tertiary mb-4 flex-wrap">
              <Link to="/" className="hover:text-accent-blue">
                Strategies
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <Link to={`/category/${cat.id}`} className="hover:text-accent-blue">
                {cat.nameEn}
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-accent-blue">{model.title}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-text-primary mb-6 leading-tight">
              {model.title}
            </h1>
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 rounded-xl bg-bg-card relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest mb-1">
                  Annualized Return
                </p>
                {pm.annReturn != null ? (
                  <p className="tabular text-3xl font-bold text-signal-positive">{pm.annReturn}%</p>
                ) : (
                  <p className="tabular text-2xl font-bold text-amber-500">未回测</p>
                )}
              </div>
              <div className="relative">
                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest mb-1">
                  Sharpe Ratio
                </p>
                {pm.sharpe != null ? (
                  <p className="tabular text-3xl font-bold text-accent-blue">{pm.sharpe.toFixed(2)}</p>
                ) : (
                  <p className="tabular text-2xl font-bold text-amber-500">未回测</p>
                )}
              </div>
              <div className="relative">
                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest mb-1">
                  Max Drawdown
                </p>
                {pm.maxDD != null ? (
                  <p className="tabular text-3xl font-bold text-signal-negative">{pm.maxDD}%</p>
                ) : (
                  <p className="tabular text-2xl font-bold text-amber-500">未回测</p>
                )}
              </div>
              <div className="relative">
                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest mb-1">
                  Backtest Window
                </p>
                <p className="tabular text-lg font-bold text-text-primary">{model.backtestPeriod}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${hasReal ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-500'}`}>
                  {hasReal ? '\u{1F4C4} 论文报告' : '\u26A0\uFE0F 未回测'}
                </span>
              </div>
            </div>
          </header>

          {/* S1: Abstract */}
          <section className="mb-20" id="abstract">
            <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
              <span className="text-accent-blue font-mono text-lg">01</span> Paper Abstract
            </h2>
            <div className="pl-8 border-l-4 border-accent-blue bg-bg-card/30 py-8 pr-8 md:pr-12 rounded-r-xl">
              <p className="text-text-secondary italic mb-6 leading-relaxed">{model.abstract}</p>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="text-text-tertiary">
                  By{' '}
                  <span className="text-text-primary font-medium">
                    {model.author}, {model.year}
                  </span>
                </span>
                {model.doi && (
                  <a
                    href={`https://doi.org/${model.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-blue hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span> DOI
                  </a>
                )}
              </div>
              {cat.surveyText && (
                <div className="mt-6 pt-6 border-t border-border-subtle">
                  <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest mb-2">Category Survey Context</p>
                  <p className="text-text-secondary text-sm leading-relaxed">{cat.surveyText}</p>
                </div>
              )}
            </div>
          </section>

          {/* S2: Algorithm Principle */}
          <section className="mb-20" id="principle">
            <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
              <span className="text-accent-blue font-mono text-lg">02</span> Algorithm Principle
            </h2>
            {model.algorithmSummary && (
              <p className="text-text-secondary mb-8 leading-relaxed">{model.algorithmSummary}</p>
            )}
            {/* Formula cards — show compact grid here, detailed explanations in Deep Analysis */}
            {model.formulas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {model.formulas.map((f, i) => (
                  <FormulaCard key={i} label={f.label} latex={f.latex} />
                ))}
              </div>
            )}
            {/* Steps — only show if no deep content (deep content has detailed steps) */}
            {!deepContent && model.steps && model.steps.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-headline font-semibold text-text-primary text-lg mb-4">
                  Algorithm Steps
                </h3>
                <ol className="space-y-3">
                  {model.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-4 p-4 rounded-lg bg-bg-card/50">
                      <span className="tabular text-accent-blue font-bold text-sm mt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-text-secondary text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {deepContent && (
              <p className="text-text-tertiary text-sm mt-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                详细公式解释、步骤详解和局限性分析见下方「论文深度分析」
              </p>
            )}
          </section>

          {/* Deep Paper Content (research background, formula explanations, step details, etc.) */}
          {deepContent && (
            <section className="mb-20" id="deep-analysis">
              <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
                <span className="text-accent-blue font-mono text-lg">03</span> 论文深度分析
              </h2>
              <DeepPaperContent content={deepContent} categoryColor={cat.color} />
            </section>
          )}

          {/* S3: Logic Visualizer */}
          <section className="mb-20" id="animation">
            <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
              <span className="text-accent-blue font-mono text-lg">{deepContent ? '04' : '03'}</span> Logic Visualizer
            </h2>
            <AlgorithmAnimation categoryId={model.categoryId} tags={model.tags} architecture={MODEL_ARCHITECTURES[model.id]} />
          </section>

          {/* Implementation */}
          <section className="mb-20" id="code">
            <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
              <span className="text-accent-blue font-mono text-lg">{deepContent ? '05' : '04'}</span> Implementation
            </h2>
            <CodeBrowser
              tabs={[
                { label: '特征工程', code: model.codeCells?.featureEngineering || '', filename: `${model.notebookPath} — Feature Engineering` },
                { label: '模型训练', code: model.codeCells?.modelTraining || model.codeSnippet, filename: `${model.notebookPath} — Model Training` },
                { label: '回测逻辑', code: model.codeCells?.backtestSignal || '', filename: `${model.notebookPath} — Backtest` },
              ]}
            />
          </section>

          {/* S5: Backtest Metrics */}
          <section className="mb-20" id="results">
            <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
              <span className="text-accent-blue font-mono text-lg">{deepContent ? '06' : '05'}</span> Backtest Metrics
            </h2>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="p-6 rounded-xl bg-bg-card border border-border-subtle text-center">
                <p className="text-[10px] uppercase text-text-tertiary tracking-widest mb-2">Ann. Return</p>
                {pm.annReturn != null ? (
                  <p className="tabular text-2xl font-bold text-signal-positive">{pm.annReturn}%</p>
                ) : (
                  <p className="tabular text-lg font-bold text-amber-500">未回测</p>
                )}
              </div>
              <div className="p-6 rounded-xl bg-bg-card border border-border-subtle text-center">
                <p className="text-[10px] uppercase text-text-tertiary tracking-widest mb-2">Sharpe Ratio</p>
                {pm.sharpe != null ? (
                  <p className="tabular text-2xl font-bold text-accent-blue">{pm.sharpe.toFixed(2)}</p>
                ) : (
                  <p className="tabular text-lg font-bold text-amber-500">未回测</p>
                )}
              </div>
              <div className="p-6 rounded-xl bg-bg-card border border-border-subtle text-center">
                <p className="text-[10px] uppercase text-text-tertiary tracking-widest mb-2">Max Drawdown</p>
                {pm.maxDD != null ? (
                  <p className="tabular text-2xl font-bold text-signal-negative">{pm.maxDD}%</p>
                ) : (
                  <p className="tabular text-lg font-bold text-amber-500">未回测</p>
                )}
              </div>
              <div className="p-6 rounded-xl bg-bg-card border border-border-subtle text-center">
                <p className="text-[10px] uppercase text-text-tertiary tracking-widest mb-2">Complexity</p>
                <div className="flex justify-center mt-2">
                  <ComplexityStars level={model.complexity} max={5} />
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <MetricsRadar
                metrics={[
                  { label: '年化收益', value: pm.annReturn ?? 0, max: 130 },
                  { label: '夏普比率', value: pm.sharpe ?? 0, max: 5 },
                  { label: '抗回撤', value: pm.maxDD != null ? 100 + pm.maxDD : 0, max: 100 },
                  { label: '稳定性', value: model.complexity <= 2 ? 80 : 50, max: 100 },
                  { label: '简洁度', value: (5 - model.complexity) * 25, max: 100 },
                ]}
                color={cat.color}
                hasRealData={hasReal}
              />
              <MonthlyReturnsHeatmap sparkline={model.sparkline} isSimulated={!hasReal} />
            </div>

            {/* Equity Curve + Drawdown */}
            {!hasReal && (
              <p className="text-amber-500 text-xs mb-2 font-medium">
                以下图表基于论文描述趋势生成，非真实回测数据
              </p>
            )}
            <div className="space-y-8 mb-12">
              <EquityCurveChart sparkline={model.sparkline} color={cat.color} title="累计收益曲线" isSimulated={!hasReal} />
              <DrawdownChart sparkline={model.sparkline} />
            </div>

            {/* Paper Analysis — only show when no deep content (deep content has better analysis) */}
            {!deepContent && (
              <PaperAnalysis
                discussion={model.discussion}
                discussionStructured={model.discussionStructured}
              />
            )}
          </section>

          {/* Cross-Model Comparison */}
          <section className="mb-20" id="comparison">
            <h2 className="text-2xl font-headline font-bold text-text-primary mb-8 flex items-center gap-4">
              <span className="text-accent-blue font-mono text-lg">{deepContent ? '07' : '06'}</span> 同类模型对比
            </h2>
            <CrossModelComparison
              currentModel={model}
              siblingModels={siblings}
              categoryColor={cat.color}
            />
          </section>

          {/* Bottom Nav */}
          <footer className="mt-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 py-12 border-t border-border-subtle">
            {prev ? (
              <Link to={`/model/${prev.id}`} className="group">
                <p className="text-[10px] uppercase font-bold text-text-tertiary mb-2">
                  Previous Model
                </p>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent-blue group-hover:-translate-x-1 transition-transform">
                    arrow_back
                  </span>
                  <span className="font-headline font-semibold text-lg text-text-primary group-hover:text-accent-blue transition-colors">
                    {prev.title}
                  </span>
                </div>
              </Link>
            ) : (
              <Link to={`/category/${cat.id}`} className="group">
                <p className="text-[10px] uppercase font-bold text-text-tertiary mb-2">
                  Back to Category
                </p>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-accent-blue group-hover:-translate-x-1 transition-transform">
                    arrow_back
                  </span>
                  <span className="font-headline font-semibold text-lg text-text-primary group-hover:text-accent-blue transition-colors">
                    {cat.nameEn}
                  </span>
                </div>
              </Link>
            )}
            {next ? (
              <Link to={`/model/${next.id}`} className="group text-right">
                <p className="text-[10px] uppercase font-bold text-text-tertiary mb-2">
                  Next Model
                </p>
                <div className="flex items-center gap-3 justify-end">
                  <span className="font-headline font-semibold text-lg text-text-primary group-hover:text-accent-blue transition-colors">
                    {next.title}
                  </span>
                  <span className="material-symbols-outlined text-accent-blue group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>
            ) : (
              <Link to={`/category/${cat.id}`} className="group text-right">
                <p className="text-[10px] uppercase font-bold text-text-tertiary mb-2">
                  Back to Category
                </p>
                <div className="flex items-center gap-3 justify-end">
                  <span className="font-headline font-semibold text-lg text-text-primary group-hover:text-accent-blue transition-colors">
                    {cat.nameEn}
                  </span>
                  <span className="material-symbols-outlined text-accent-blue group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>
            )}
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
