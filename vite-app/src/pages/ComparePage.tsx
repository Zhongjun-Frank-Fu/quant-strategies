import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { MODELS } from '../data/models'
import { getModelMetrics } from '../data/paper_metrics'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

function ComplexityStars({ level = 1, max = 5 }: { level?: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
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

export default function ComparePage() {
  const [selected, setSelected] = useState<string[]>([])
  const navigate = useNavigate()

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  const getCategoryById = (id: string) => CATEGORIES.find((c) => c.id === id)

  const selectedModels = selected.map((id) => MODELS.find((m) => m.id === id)).filter(Boolean) as typeof MODELS

  // SVG scatter plot dimensions
  const scatterW = 400
  const scatterH = 300
  const scatterModels = selectedModels.filter((m) => {
    const pm = getModelMetrics(m.id, m)
    return pm.annReturn != null && pm.sharpe != null
  })
  const maxReturn = Math.max(80, ...scatterModels.map((m) => getModelMetrics(m.id, m).annReturn ?? 0))
  const maxSharpe = Math.max(3, ...scatterModels.map((m) => getModelMetrics(m.id, m).sharpe ?? 0))

  return (
    <div>
      <Navbar />
      <main className="pt-24 pb-12 px-8 min-h-screen max-w-[1600px] mx-auto space-y-12">
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-headline font-bold tracking-tight text-text-primary">
                Strategy Comparative Analysis
              </h1>
              <p className="text-text-secondary max-w-2xl">
                Select up to 5 models to compare side-by-side. Click chips to toggle selection.
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <div className="p-6 bg-bg-elevated rounded-2xl">
            <p className="text-xs text-text-tertiary uppercase tracking-widest mb-4">
              Select Models ({selected.length}/5)
            </p>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
              {MODELS.map((m) => {
                const isSelected = selected.includes(m.id)
                const cat = getCategoryById(m.categoryId)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
                        : 'bg-bg-hover text-text-secondary border-border-subtle hover:border-border-hover'
                    }`}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-xs">check</span>
                    )}
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: cat?.color }}
                    />
                    {m.title}
                    {isSelected && (
                      <span className="material-symbols-outlined text-xs ml-1 hover:text-signal-negative">
                        close
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {selectedModels.length > 0 && (
          <div className="grid grid-cols-12 gap-8">
            {/* Scatter plot */}
            <div className="col-span-12 lg:col-span-4 bg-bg-card rounded-2xl p-8 flex flex-col">
              <h3 className="font-headline text-xl font-bold mb-6 text-text-primary">
                Risk vs Return Space
              </h3>
              <div className="flex-grow flex items-center justify-center relative bg-bg-primary/50 rounded-xl p-4">
                <svg viewBox={`0 0 ${scatterW} ${scatterH}`} className="w-full h-full">
                  {/* Axes */}
                  <line
                    x1="50"
                    y1="10"
                    x2="50"
                    y2={scatterH - 30}
                    stroke="#424754"
                    strokeWidth="1"
                  />
                  <line
                    x1="50"
                    y1={scatterH - 30}
                    x2={scatterW - 10}
                    y2={scatterH - 30}
                    stroke="#424754"
                    strokeWidth="1"
                  />
                  <text
                    x={scatterW / 2}
                    y={scatterH - 5}
                    fill="#8c909f"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    Ann. Return (%)
                  </text>
                  <text
                    x="15"
                    y={scatterH / 2}
                    fill="#8c909f"
                    fontSize="10"
                    textAnchor="middle"
                    transform={`rotate(-90, 15, ${scatterH / 2})`}
                  >
                    Sharpe
                  </text>
                  {/* Points */}
                  {scatterModels.map((m) => {
                    const cat = getCategoryById(m.categoryId)
                    const spm = getModelMetrics(m.id, m)
                    const cx = 50 + ((spm.annReturn ?? 0) / maxReturn) * (scatterW - 70)
                    const cy = scatterH - 30 - ((spm.sharpe ?? 0) / maxSharpe) * (scatterH - 50)
                    return (
                      <g key={m.id}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="8"
                          fill={cat?.color}
                          opacity="0.8"
                          className="cursor-pointer"
                          onClick={() => navigate(`/model/${m.id}`)}
                        />
                        <text
                          x={cx}
                          y={cy - 12}
                          fill="#dfe2ef"
                          fontSize="8"
                          textAnchor="middle"
                        >
                          {m.title.substring(0, 15)}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* Comparison table */}
            <div className="col-span-12 lg:col-span-8 bg-bg-card rounded-2xl p-8 overflow-x-auto">
              <h3 className="font-headline text-xl font-bold mb-8 text-text-primary">
                Side-by-Side Comparison
              </h3>
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="py-4 text-[10px] tracking-widest text-text-tertiary">METRIC</th>
                    {selectedModels.map((m) => (
                      <th key={m.id} className="py-4 text-[10px] tracking-widest text-text-tertiary">
                        {m.title.substring(0, 20)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Category</td>
                    {selectedModels.map((m) => {
                      const cat = getCategoryById(m.categoryId)
                      return (
                        <td key={m.id} className="py-4">
                          <span
                            className="px-2 py-1 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: (cat?.color || '#3B82F6') + '20',
                              color: cat?.color,
                            }}
                          >
                            {cat?.nameEn}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Ann. Return</td>
                    {selectedModels.map((m) => {
                      const cpm = getModelMetrics(m.id, m)
                      return (
                        <td key={m.id} className="py-4 tabular text-sm">
                          {cpm.annReturn != null ? (
                            <span className="text-signal-positive">{cpm.annReturn}%</span>
                          ) : (
                            <span className="text-amber-500 text-xs">未回测</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Sharpe</td>
                    {selectedModels.map((m) => {
                      const cpm = getModelMetrics(m.id, m)
                      return (
                        <td key={m.id} className="py-4 tabular text-sm">
                          {cpm.sharpe != null ? (
                            <span className="text-text-primary">{cpm.sharpe.toFixed(2)}</span>
                          ) : (
                            <span className="text-amber-500 text-xs">未回测</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Max DD</td>
                    {selectedModels.map((m) => {
                      const cpm = getModelMetrics(m.id, m)
                      return (
                        <td key={m.id} className="py-4 tabular text-sm">
                          {cpm.maxDD != null ? (
                            <span className="text-signal-negative">{cpm.maxDD}%</span>
                          ) : (
                            <span className="text-amber-500 text-xs">未回测</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Backtest</td>
                    {selectedModels.map((m) => (
                      <td key={m.id} className="py-4 tabular text-sm text-text-primary">
                        {m.backtestPeriod}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Complexity</td>
                    {selectedModels.map((m) => (
                      <td key={m.id} className="py-4">
                        <ComplexityStars level={m.complexity} max={5} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 text-sm text-text-tertiary">Author</td>
                    {selectedModels.map((m) => (
                      <td key={m.id} className="py-4 text-sm text-text-primary">
                        {m.author}, {m.year}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedModels.length === 0 && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-text-tertiary/30 mb-4 block">
              compare_arrows
            </span>
            <p className="text-text-secondary text-lg">Select models above to start comparing</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
