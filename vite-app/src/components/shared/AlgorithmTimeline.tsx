import { useState, useMemo } from 'react'
import type { Model } from '../../types'
import { CATEGORIES } from '../../data/categories'

interface AlgorithmTimelineProps {
  models: Model[]
  onModelClick: (modelId: string) => void
}

function getCategoryColor(categoryId: string): string {
  return CATEGORIES.find((c) => c.id === categoryId)?.color || '#6B7280'
}

export default function AlgorithmTimeline({ models, onModelClick }: AlgorithmTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const years = [2020, 2021, 2022, 2023, 2024]
  const yearMin = years[0]
  const yearMax = years[years.length - 1]

  // Group models by year and assign vertical positions
  const positioned = useMemo(() => {
    const byYear: Record<number, Model[]> = {}
    for (const m of models) {
      const y = Math.max(yearMin, Math.min(yearMax, m.year))
      if (!byYear[y]) byYear[y] = []
      byYear[y].push(m)
    }

    const items: { model: Model; xPercent: number; above: boolean }[] = []
    for (const [yearStr, yearModels] of Object.entries(byYear)) {
      const year = Number(yearStr)
      const xPercent = ((year - yearMin) / (yearMax - yearMin)) * 100
      yearModels.forEach((m, i) => {
        items.push({
          model: m,
          xPercent: xPercent + (i - (yearModels.length - 1) / 2) * 2.5,
          above: i % 2 === 0,
        })
      })
    }
    return items
  }, [models, yearMin, yearMax])

  return (
    <div className="w-full overflow-x-auto hide-scrollbar">
      <div className="min-w-[600px] relative px-8 py-16">
        {/* Main horizontal line */}
        <div className="absolute left-8 right-8 top-1/2 h-[2px] bg-border-subtle -translate-y-1/2" />

        {/* Year markers */}
        {years.map((year) => {
          const xPercent = ((year - yearMin) / (yearMax - yearMin)) * 100
          return (
            <div
              key={year}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `calc(32px + ${xPercent}% * (100% - 64px) / 100%)` }}
            >
              {/* Large dot */}
              <div className="w-4 h-4 rounded-full bg-bg-elevated border-2 border-text-tertiary" />
              {/* Year label below */}
              <div className="absolute top-7 left-1/2 -translate-x-1/2 text-xs font-mono text-text-tertiary whitespace-nowrap">
                {year}
              </div>
            </div>
          )
        })}

        {/* Model dots */}
        {positioned.map(({ model, xPercent, above }) => {
          const color = getCategoryColor(model.categoryId)
          const isHovered = hoveredId === model.id
          const verticalOffset = above ? -28 : 28

          return (
            <div
              key={model.id}
              className="absolute top-1/2 -translate-x-1/2 cursor-pointer"
              style={{
                left: `calc(32px + ${Math.max(0, Math.min(100, xPercent))}% * (100% - 64px) / 100%)`,
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px))`,
              }}
              onMouseEnter={() => setHoveredId(model.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onModelClick(model.id)}
            >
              {/* Small dot */}
              <div
                className="w-3 h-3 rounded-full transition-transform duration-150"
                style={{
                  backgroundColor: color,
                  transform: isHovered ? 'scale(1.6)' : 'scale(1)',
                  boxShadow: isHovered ? `0 0 8px ${color}60` : 'none',
                }}
              />

              {/* Tooltip */}
              {isHovered && (
                <div
                  className={`
                    absolute left-1/2 -translate-x-1/2 z-20
                    bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 shadow-xl
                    whitespace-nowrap pointer-events-none
                    ${above ? 'bottom-full mb-2' : 'top-full mt-2'}
                  `}
                >
                  <div className="text-xs text-text-primary font-medium">{model.title}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    {model.author} &middot; {model.year}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
