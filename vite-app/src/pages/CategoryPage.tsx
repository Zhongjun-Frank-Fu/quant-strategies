import { useParams, useNavigate, Link } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { MODELS } from '../data/models'
import { getModelMetrics } from '../data/paper_metrics'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Sparkline from '../components/shared/Sparkline'

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const cat = CATEGORIES.find((c) => c.id === categoryId)
  const models = MODELS.filter((m) => m.categoryId === categoryId)

  if (!cat) {
    return (
      <div className="pt-24 text-center text-text-primary">
        <p>Category not found</p>
        <Link to="/" className="text-accent-blue mt-4 inline-block">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <main className="pt-24 pb-20 px-8 max-w-7xl mx-auto">
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1
                className="text-4xl md:text-5xl font-headline font-bold tracking-tight mb-4"
                style={{ color: cat.color }}
              >
                <span className="material-symbols-outlined text-3xl mr-2 align-middle">
                  {cat.icon}
                </span>
                {cat.name}
              </h1>
              <p className="text-xl text-text-secondary mb-2 font-headline">{cat.nameEn}</p>
              <p className="text-text-secondary leading-relaxed text-base font-body">
                {cat.description}
              </p>
              {cat.surveyText && (
                <p className="text-text-secondary/80 leading-relaxed text-sm font-body mt-4 italic">
                  {cat.surveyText}
                </p>
              )}
              {cat.keyFindings && cat.keyFindings.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {cat.keyFindings.map((finding, i) => (
                    <li key={i} className="text-text-secondary text-sm flex items-start gap-2">
                      <span className="text-accent-blue mt-0.5 shrink-0">&#x2022;</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-12 border-l border-border-subtle pl-8">
              <div className="flex flex-col">
                <span
                  className="font-headline text-3xl font-bold tabular"
                  style={{ color: cat.color }}
                >
                  {String(models.length).padStart(2, '0')}
                </span>
                <span className="text-text-tertiary text-xs uppercase tracking-widest">Models</span>
              </div>
              <div className="flex flex-col">
                <span
                  className="font-headline text-3xl font-bold tabular"
                  style={{ color: cat.color }}
                >
                  {String(models.length).padStart(2, '0')}
                </span>
                <span className="text-text-tertiary text-xs uppercase tracking-widest">Papers</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {models.map((m) => {
            const mpm = getModelMetrics(m.id, m)
            return (
            <div
              key={m.id}
              className="bg-bg-card rounded-lg p-8 group hover:bg-bg-elevated transition-all duration-300 relative border border-transparent hover:border-border-hover"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-headline font-bold text-text-primary">{m.title}</h3>
                  <span className="text-text-tertiary text-xs font-mono">
                    {m.author}, {m.year}
                  </span>
                </div>
              </div>
              <div className="mb-6 h-[60px]">
                <Sparkline data={m.sparkline} color={cat.color} />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase">Ann.</div>
                  {mpm.annReturn != null ? (
                    <div className="tabular text-sm font-bold text-signal-positive">{mpm.annReturn}%</div>
                  ) : (
                    <div className="text-amber-500 text-xs font-bold">未回测</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase">Sharpe</div>
                  {mpm.sharpe != null ? (
                    <div className="tabular text-sm font-bold text-text-primary">{mpm.sharpe.toFixed(2)}</div>
                  ) : (
                    <div className="text-amber-500 text-xs font-bold">未回测</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase">DD</div>
                  {mpm.maxDD != null ? (
                    <div className="tabular text-sm font-bold text-signal-negative">{mpm.maxDD}%</div>
                  ) : (
                    <div className="text-amber-500 text-xs font-bold">未回测</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {m.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-bg-elevated text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate(`/model/${m.id}`)}
                className="w-full py-4 rounded-full border border-border-subtle group-hover:bg-accent-blue group-hover:text-white transition-all duration-300 font-headline font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                View Details{' '}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}
