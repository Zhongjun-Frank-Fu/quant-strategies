import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { MODELS } from '../data/models'
import { getModelMetrics } from '../data/paper_metrics'
import type { Model } from '../types'
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

type SortKey = 'title' | 'annReturn' | 'sharpe' | 'maxDD' | 'complexity'

export default function HomePage() {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('annReturn')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    const arr = [...MODELS]
    arr.sort((a: Model, b: Model) => {
      const pmA = getModelMetrics(a.id, a)
      const pmB = getModelMetrics(b.id, b)
      if (sortKey === 'title') {
        return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      }
      // Get metric values from paper metrics
      const getVal = (m: Model) => {
        const pm = getModelMetrics(m.id, m)
        if (sortKey === 'annReturn') return pm.annReturn
        if (sortKey === 'sharpe') return pm.sharpe
        if (sortKey === 'maxDD') return pm.maxDD
        return m[sortKey] as number
      }
      const va = getVal(a)
      const vb = getVal(b)
      // Models with real data come first
      const aHasData = va != null
      const bHasData = vb != null
      if (aHasData && !bHasData) return -1
      if (!aHasData && bHasData) return 1
      if (!aHasData && !bHasData) return 0
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
    return arr
  }, [sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const getCategoryById = (id: string) => CATEGORIES.find((c) => c.id === id)
  const getModelsByCategory = (catId: string) => MODELS.filter((m) => m.categoryId === catId)

  return (
    <div className="antialiased overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 hero-gradient px-8">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(78,222,163,0.08) 0%, transparent 60%)',
            }}
          />
        </div>
        <div className="relative z-10 text-center max-w-5xl space-y-8">
          <h1 className="font-headline text-5xl md:text-8xl font-extrabold tracking-[0.4em] text-text-primary mb-6">
            &#9670; Q U A N T L A B
          </h1>
          <p className="font-body text-lg md:text-xl text-text-secondary font-light leading-relaxed max-w-3xl mx-auto">
            中国私募基金量化交易策略全景图 / A Comprehensive Atlas of Quantitative Trading Strategies
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center pt-8">
            <button
              onClick={() => navigate('/category/multi-factor')}
              className="bg-accent-blue text-white px-10 py-4 rounded-full font-bold text-sm tracking-widest uppercase flex items-center gap-3 hover:opacity-90 transition-all active:scale-95 mx-auto md:mx-0"
            >
              探索策略库 <span className="material-symbols-outlined">trending_flat</span>
            </button>
            <button
              onClick={() => navigate('/compare')}
              className="bg-transparent border border-border-subtle text-text-primary px-10 py-4 rounded-full font-bold text-sm tracking-widest uppercase flex items-center gap-3 hover:bg-bg-elevated transition-all active:scale-95 mx-auto md:mx-0"
            >
              策略对比 <span className="material-symbols-outlined">compare_arrows</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Research Assets', value: '80', unit: '篇论文' },
            { label: 'Active Models', value: '46', unit: '个模型' },
            { label: 'Architecture', value: '7', unit: '大类别' },
            { label: 'Cycle', value: '2020-2024', unit: '' },
            { label: 'AUM Reach', value: '1.5', unit: '万亿' },
          ].map((stat, i) => (
            <div key={i} className="bg-bg-card p-8 border-l border-accent-blue/20">
              <div className="text-xs text-text-tertiary uppercase font-headline tracking-widest mb-2">
                {stat.label}
              </div>
              <div className="text-4xl tabular font-bold text-text-primary">
                {stat.value}{' '}
                <span className="text-sm font-normal text-text-secondary">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strategy Landscape */}
      <section className="py-12 px-8 max-w-[1600px] mx-auto">
        <h2 className="text-3xl font-headline font-bold text-text-primary mb-2">
          Strategy Landscape
        </h2>
        <p className="text-text-secondary mb-8">
          7 categories, 46 models &mdash; click any block to explore
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const models = getModelsByCategory(cat.id)
            return (
              <div key={cat.id} className="flex flex-col gap-2">
                <Link
                  to={`/category/${cat.id}`}
                  className="text-center py-3 rounded-lg text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: cat.color + '20',
                    color: cat.color,
                    borderBottom: `2px solid ${cat.color}`,
                  }}
                  title={cat.surveyText}
                >
                  {cat.nameEn}
                </Link>
                {cat.surveyText && (
                  <p className="text-text-tertiary text-[10px] leading-snug px-1 line-clamp-2">{cat.surveyText}</p>
                )}
                {models.map((m) => {
                  const mpm = getModelMetrics(m.id, m)
                  return (
                    <Link
                      key={m.id}
                      to={`/model/${m.id}`}
                      className="block p-3 rounded-lg bg-bg-card hover:bg-bg-elevated transition-all text-xs border border-transparent hover:border-border-hover cursor-pointer"
                    >
                      <div className="font-medium text-text-primary truncate mb-1">{m.title}</div>
                      <div className="text-text-tertiary text-[10px]">
                        {m.author}, {m.year}
                      </div>
                      {mpm.annReturn != null ? (
                        <div className="tabular text-signal-positive text-[11px] mt-1">
                          {mpm.annReturn}%
                        </div>
                      ) : (
                        <div className="text-amber-500 text-[10px] mt-1">未回测</div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-12 px-8 max-w-[1600px] mx-auto">
        <h2 className="text-3xl font-headline font-bold text-text-primary mb-2">Leaderboard</h2>
        <p className="text-text-secondary mb-2">All 46 models ranked &mdash; click headers to sort</p>
        <p className="text-amber-500 text-xs mb-8">仅展示已有论文报告指标的模型排名，未回测模型不参与排序</p>
        <div className="bg-bg-card rounded-2xl p-6 overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="py-4 text-[10px] tracking-widest text-text-tertiary w-12">#</th>
                <th
                  className="py-4 text-[10px] tracking-widest text-text-tertiary cursor-pointer hover:text-accent-blue"
                  onClick={() => handleSort('title')}
                >
                  MODEL NAME
                </th>
                <th className="py-4 text-[10px] tracking-widest text-text-tertiary">CATEGORY</th>
                <th
                  className="py-4 text-[10px] tracking-widest text-text-tertiary cursor-pointer hover:text-accent-blue"
                  onClick={() => handleSort('annReturn')}
                >
                  ANN. RETURN {sortKey === 'annReturn' ? (sortAsc ? '\u2191' : '\u2193') : ''}
                </th>
                <th
                  className="py-4 text-[10px] tracking-widest text-text-tertiary cursor-pointer hover:text-accent-blue"
                  onClick={() => handleSort('sharpe')}
                >
                  SHARPE {sortKey === 'sharpe' ? (sortAsc ? '\u2191' : '\u2193') : ''}
                </th>
                <th
                  className="py-4 text-[10px] tracking-widest text-text-tertiary cursor-pointer hover:text-accent-blue"
                  onClick={() => handleSort('maxDD')}
                >
                  MAX DD {sortKey === 'maxDD' ? (sortAsc ? '\u2191' : '\u2193') : ''}
                </th>
                <th
                  className="py-4 text-[10px] tracking-widest text-text-tertiary cursor-pointer hover:text-accent-blue"
                  onClick={() => handleSort('complexity')}
                >
                  COMPLEXITY
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sorted.map((m, idx) => {
                const cat = getCategoryById(m.categoryId)
                if (!cat) return null
                const mpm = getModelMetrics(m.id, m)
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-bg-hover/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/model/${m.id}`)}
                  >
                    <td className="py-4 tabular text-text-tertiary text-sm">{idx + 1}</td>
                    <td className="py-4 font-medium text-text-primary text-sm">{m.title}</td>
                    <td className="py-4">
                      <span
                        className="px-2 py-1 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: cat.color + '20', color: cat.color }}
                      >
                        {cat.nameEn}
                      </span>
                    </td>
                    <td className="py-4 tabular text-sm">
                      {mpm.annReturn != null ? (
                        <span className="text-signal-positive">{mpm.annReturn}%</span>
                      ) : (
                        <span className="text-amber-500 text-xs">未回测</span>
                      )}
                    </td>
                    <td className="py-4 tabular text-sm">
                      {mpm.sharpe != null ? (
                        mpm.sharpe.toFixed(2)
                      ) : (
                        <span className="text-amber-500 text-xs">未回测</span>
                      )}
                    </td>
                    <td className="py-4 tabular text-sm">
                      {mpm.maxDD != null ? (
                        <span className="text-signal-negative">{mpm.maxDD}%</span>
                      ) : (
                        <span className="text-amber-500 text-xs">未回测</span>
                      )}
                    </td>
                    <td className="py-4">
                      <ComplexityStars level={m.complexity} max={5} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Footer />
    </div>
  )
}
