interface SparklineProps {
  data: number[]
  color?: string
  width?: string | number
  height?: number
}

export default function Sparkline({ data, color = '#3B82F6', width = '100%', height = 60 }: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 240
  const h = height
  const padding = 4

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (w - padding * 2) + padding
      const y = h - padding - ((v - min) / range) * (h - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  const lastVal = data[data.length - 1]
  const firstVal = data[0]
  const isUp = lastVal >= firstVal
  const lineColor = isUp ? '#4edea3' : '#ffb4ab'
  const gradId = `grad-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={width} height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`${padding},${h} ${points} ${w - padding},${h}`}
        fill={`url(#${gradId})`}
      />
    </svg>
  )
}
