import { useMemo } from 'react'

interface MetricItem {
  label: string
  value: number
  max: number
}

interface MetricsRadarProps {
  metrics: MetricItem[]
  color?: string
  hasRealData?: boolean
}

export default function MetricsRadar({ metrics, color = '#3B82F6', hasRealData = true }: MetricsRadarProps) {
  if (!hasRealData) {
    return (
      <div className="w-full flex items-center justify-center min-h-[200px] rounded-xl bg-bg-card/50 border border-border-subtle">
        <div className="text-center px-8 py-12">
          <span className="material-symbols-outlined text-4xl text-amber-500/60 block mb-3">warning</span>
          <p className="text-amber-500 text-sm font-medium">
            此模型尚未完成回测，绩效雷达暂不可用
          </p>
        </div>
      </div>
    )
  }

  const cx = 150
  const cy = 150
  const radius = 110
  const viewSize = 300
  const levels = 3

  const axes = useMemo(() => {
    const n = metrics.length
    return metrics.map((m, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      return {
        ...m,
        angle,
        endX: cx + Math.cos(angle) * radius,
        endY: cy + Math.sin(angle) * radius,
        labelX: cx + Math.cos(angle) * (radius + 20),
        labelY: cy + Math.sin(angle) * (radius + 20),
      }
    })
  }, [metrics])

  // Grid polygons (pentagon at 33%, 66%, 100%)
  const gridPolygons = useMemo(() => {
    return Array.from({ length: levels }, (_, lvl) => {
      const r = (radius * (lvl + 1)) / levels
      const points = axes.map((a) => {
        const x = cx + Math.cos(a.angle) * r
        const y = cy + Math.sin(a.angle) * r
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      return points.join(' ')
    })
  }, [axes])

  // Data polygon
  const dataPolygon = useMemo(() => {
    return axes
      .map((a) => {
        const ratio = a.max > 0 ? Math.min(a.value / a.max, 1) : 0
        const r = radius * ratio
        const x = cx + Math.cos(a.angle) * r
        const y = cy + Math.sin(a.angle) * r
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [axes])

  return (
    <div className="w-full flex justify-center">
      <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full max-w-[300px]">
        {/* Grid levels */}
        {gridPolygons.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {axes.map((a, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={a.endX}
            y2={a.endY}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Data polygon fill */}
        <polygon points={dataPolygon} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2} />

        {/* Data points */}
        {axes.map((a, i) => {
          const ratio = a.max > 0 ? Math.min(a.value / a.max, 1) : 0
          const r = radius * ratio
          const x = cx + Math.cos(a.angle) * r
          const y = cy + Math.sin(a.angle) * r
          return <circle key={i} cx={x} cy={y} r={3} fill={color} stroke="#0A0E17" strokeWidth={1.5} />
        })}

        {/* Labels */}
        {axes.map((a, i) => {
          const angleDeg = (a.angle * 180) / Math.PI
          let anchor: string = 'middle'
          if (angleDeg > -80 && angleDeg < 80) anchor = 'start'
          else if (angleDeg > 100 || angleDeg < -100) anchor = 'end'
          return (
            <text
              key={i}
              x={a.labelX}
              y={a.labelY}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="#C2C6D6"
              fontSize={11}
              fontFamily="var(--font-body)"
            >
              {a.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
