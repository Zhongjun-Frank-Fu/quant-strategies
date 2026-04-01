import { useState, useMemo, useCallback, useRef } from 'react'

interface EquityCurveChartProps {
  sparkline: number[]
  title?: string
  color?: string
  isSimulated?: boolean
}

function interpolate(data: number[], targetLen: number): number[] {
  if (data.length === 0) return []
  if (data.length === 1) return Array(targetLen).fill(data[0])
  const result: number[] = []
  for (let i = 0; i < targetLen; i++) {
    const t = (i / (targetLen - 1)) * (data.length - 1)
    const lo = Math.floor(t)
    const hi = Math.min(lo + 1, data.length - 1)
    const frac = t - lo
    result.push(data[lo] * (1 - frac) + data[hi] * frac)
  }
  return result
}

function generateDateLabels(count: number): string[] {
  const labels: string[] = []
  const startYear = 2021
  const startMonth = 0 // January
  for (let i = 0; i < count; i++) {
    const monthOffset = Math.round((i / (count - 1)) * 47) // 48 months: 2021-01 to 2024-12
    const year = startYear + Math.floor((startMonth + monthOffset) / 12)
    const month = ((startMonth + monthOffset) % 12) + 1
    labels.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return labels
}

export default function EquityCurveChart({
  sparkline,
  title = '净值曲线',
  color = '#3B82F6',
  isSimulated = false,
}: EquityCurveChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null)

  const data = useMemo(() => interpolate(sparkline, 200), [sparkline])
  const dateLabels = useMemo(() => generateDateLabels(200), [])

  const padding = { top: 30, right: 20, bottom: 40, left: 60 }
  const viewW = 800
  const viewH = 400

  const chartW = viewW - padding.left - padding.right
  const chartH = viewH - padding.top - padding.bottom

  const { minVal, maxVal, maxDDStart, maxDDEnd } = useMemo(() => {
    if (data.length === 0) return { minVal: 0, maxVal: 100, maxDDStart: 0, maxDDEnd: 0 }
    const mn = Math.min(...data)
    const mx = Math.max(...data)
    const margin = (mx - mn) * 0.1 || 5
    // Find max drawdown period
    let peak = data[0]
    let peakIdx = 0
    let worstDD = 0
    let ddStart = 0
    let ddEnd = 0
    for (let i = 1; i < data.length; i++) {
      if (data[i] > peak) {
        peak = data[i]
        peakIdx = i
      }
      const dd = (peak - data[i]) / peak
      if (dd > worstDD) {
        worstDD = dd
        ddStart = peakIdx
        ddEnd = i
      }
    }
    return { minVal: mn - margin, maxVal: mx + margin, maxDDStart: ddStart, maxDDEnd: ddEnd }
  }, [data])

  const toX = useCallback((i: number) => padding.left + (i / (data.length - 1)) * chartW, [data.length, chartW, padding.left])
  const toY = useCallback((v: number) => padding.top + (1 - (v - minVal) / (maxVal - minVal)) * chartH, [minVal, maxVal, chartH, padding.top])

  const pathD = useMemo(() => {
    if (data.length === 0) return ''
    return data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  }, [data, toX, toY])

  const areaD = useMemo(() => {
    if (data.length === 0) return ''
    const bottom = toY(minVal)
    return pathD + ` L${toX(data.length - 1).toFixed(1)},${bottom} L${toX(0).toFixed(1)},${bottom} Z`
  }, [pathD, data.length, toX, toY, minVal])

  const benchmarkY = toY(100)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg || data.length === 0) return
      const rect = svg.getBoundingClientRect()
      const scaleX = viewW / rect.width
      const mouseX = (e.clientX - rect.left) * scaleX
      const idx = Math.round(((mouseX - padding.left) / chartW) * (data.length - 1))
      if (idx < 0 || idx >= data.length) {
        setHover(null)
        return
      }
      setHover({ x: toX(idx), y: toY(data[idx]), idx })
    },
    [data, toX, toY, chartW, padding.left, viewW]
  )

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const count = 5
    const ticks: number[] = []
    for (let i = 0; i <= count; i++) {
      ticks.push(minVal + (i / count) * (maxVal - minVal))
    }
    return ticks
  }, [minVal, maxVal])

  // X-axis ticks (show ~6 labels)
  const xTicks = useMemo(() => {
    const count = 6
    const ticks: { idx: number; label: string }[] = []
    for (let i = 0; i <= count; i++) {
      const idx = Math.round((i / count) * (data.length - 1))
      ticks.push({ idx, label: dateLabels[idx] || '' })
    }
    return ticks
  }, [data.length, dateLabels])

  const gradientId = `eq-grad-${color.replace('#', '')}`
  const ddGradientId = 'dd-shade'

  return (
    <div className="w-full" style={{ aspectRatio: '2 / 1' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={ddGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={padding.left} y={18} fill="#C2C6D6" fontSize={14} fontFamily="var(--font-headline)" fontWeight={600}>
          {title}
        </text>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={toY(tick)}
            x2={viewW - padding.right}
            y2={toY(tick)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Max drawdown shaded area */}
        {maxDDStart !== maxDDEnd && (
          <rect
            x={toX(maxDDStart)}
            y={padding.top}
            width={toX(maxDDEnd) - toX(maxDDStart)}
            height={chartH}
            fill={`url(#${ddGradientId})`}
          />
        )}

        {/* Benchmark line at 100 */}
        <line
          x1={padding.left}
          y1={benchmarkY}
          x2={viewW - padding.right}
          y2={benchmarkY}
          stroke="#6B7280"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />
        <text x={viewW - padding.right + 4} y={benchmarkY + 4} fill="#6B7280" fontSize={10} fontFamily="var(--font-mono)">
          100
        </text>

        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Equity curve line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeDasharray={isSimulated ? '6 4' : 'none'} />

        {/* Simulated data label */}
        {isSimulated && (
          <text x={viewW - padding.right} y={padding.top + 16} fill="#F59E0B" fontSize={11} textAnchor="end" fontFamily="var(--font-body)">
            模拟趋势 (非真实数据)
          </text>
        )}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            fill="#8C909F"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {tick.toFixed(0)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={i}
            x={toX(tick.idx)}
            y={viewH - 8}
            textAnchor="middle"
            fill="#8C909F"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {tick.label}
          </text>
        ))}

        {/* Hover elements */}
        {hover && (
          <>
            <line
              x1={hover.x}
              y1={padding.top}
              x2={hover.x}
              y2={padding.top + chartH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={hover.x} cy={hover.y} r={4} fill={color} stroke="#0A0E17" strokeWidth={2} />
            <rect
              x={Math.min(hover.x + 10, viewW - 140)}
              y={Math.max(hover.y - 40, padding.top)}
              width={120}
              height={36}
              rx={6}
              fill="#1C1F29"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
            <text
              x={Math.min(hover.x + 18, viewW - 132)}
              y={Math.max(hover.y - 22, padding.top + 18)}
              fill="#DFE2EF"
              fontSize={11}
              fontFamily="var(--font-mono)"
            >
              {data[hover.idx].toFixed(2)}
            </text>
            <text
              x={Math.min(hover.x + 18, viewW - 132)}
              y={Math.max(hover.y - 8, padding.top + 32)}
              fill="#8C909F"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {dateLabels[hover.idx]}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
