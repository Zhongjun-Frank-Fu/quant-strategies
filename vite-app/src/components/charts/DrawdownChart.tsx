import { useState, useMemo, useCallback, useRef } from 'react'

interface DrawdownChartProps {
  sparkline: number[]
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

function computeDrawdown(values: number[]): number[] {
  const dd: number[] = []
  let peak = values[0] || 0
  for (const v of values) {
    if (v > peak) peak = v
    dd.push(peak > 0 ? ((v - peak) / peak) * 100 : 0)
  }
  return dd
}

function generateDateLabels(count: number): string[] {
  const labels: string[] = []
  const startYear = 2021
  for (let i = 0; i < count; i++) {
    const monthOffset = Math.round((i / (count - 1)) * 47)
    const year = startYear + Math.floor(monthOffset / 12)
    const month = (monthOffset % 12) + 1
    labels.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return labels
}

export default function DrawdownChart({ sparkline }: DrawdownChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null)

  const interpolated = useMemo(() => interpolate(sparkline, 200), [sparkline])
  const dd = useMemo(() => computeDrawdown(interpolated), [interpolated])
  const dateLabels = useMemo(() => generateDateLabels(200), [])

  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const viewW = 800
  const viewH = 200

  const chartW = viewW - padding.left - padding.right
  const chartH = viewH - padding.top - padding.bottom

  const minDD = useMemo(() => Math.min(...dd, 0), [dd])
  const maxDDIdx = useMemo(() => {
    let idx = 0
    for (let i = 1; i < dd.length; i++) {
      if (dd[i] < dd[idx]) idx = i
    }
    return idx
  }, [dd])

  const toX = useCallback((i: number) => padding.left + (i / (dd.length - 1)) * chartW, [dd.length, chartW, padding.left])
  const toY = useCallback(
    (v: number) => {
      const range = Math.abs(minDD) || 1
      return padding.top + (Math.abs(v) / range) * chartH
    },
    [minDD, chartH, padding.top]
  )

  const areaD = useMemo(() => {
    if (dd.length === 0) return ''
    let d = dd.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
    d += ` L${toX(dd.length - 1).toFixed(1)},${padding.top} L${toX(0).toFixed(1)},${padding.top} Z`
    return d
  }, [dd, toX, toY, padding.top])

  const lineD = useMemo(() => {
    if (dd.length === 0) return ''
    return dd.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  }, [dd, toX, toY])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg || dd.length === 0) return
      const rect = svg.getBoundingClientRect()
      const scaleX = viewW / rect.width
      const mouseX = (e.clientX - rect.left) * scaleX
      const idx = Math.round(((mouseX - padding.left) / chartW) * (dd.length - 1))
      if (idx < 0 || idx >= dd.length) {
        setHover(null)
        return
      }
      setHover({ x: toX(idx), y: toY(dd[idx]), idx })
    },
    [dd, toX, toY, chartW, padding.left, viewW]
  )

  const yTicks = useMemo(() => {
    const count = 4
    const ticks: number[] = []
    for (let i = 0; i <= count; i++) {
      ticks.push((i / count) * minDD)
    }
    return ticks
  }, [minDD])

  const xTicks = useMemo(() => {
    const count = 6
    const ticks: { idx: number; label: string }[] = []
    for (let i = 0; i <= count; i++) {
      const idx = Math.round((i / count) * (dd.length - 1))
      ticks.push({ idx, label: dateLabels[idx] || '' })
    }
    return ticks
  }, [dd.length, dateLabels])

  return (
    <div className="w-full" style={{ aspectRatio: '4 / 1' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="dd-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#F97316" stopOpacity={0.25} />
          </linearGradient>
        </defs>

        {/* Zero line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={viewW - padding.right}
          y2={padding.top}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />

        {/* Grid */}
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

        {/* Area fill */}
        <path d={areaD} fill="url(#dd-area-grad)" />

        {/* Drawdown line */}
        <path d={lineD} fill="none" stroke="#EF4444" strokeWidth={1.5} strokeLinejoin="round" />

        {/* Max drawdown label */}
        {dd.length > 0 && (
          <>
            <circle cx={toX(maxDDIdx)} cy={toY(dd[maxDDIdx])} r={3} fill="#EF4444" />
            <text
              x={toX(maxDDIdx)}
              y={toY(dd[maxDDIdx]) + 14}
              textAnchor="middle"
              fill="#FFB4AB"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fontWeight={600}
            >
              {dd[maxDDIdx].toFixed(1)}%
            </text>
          </>
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
            {tick.toFixed(1)}%
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

        {/* Hover */}
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
            <circle cx={hover.x} cy={hover.y} r={3.5} fill="#EF4444" stroke="#0A0E17" strokeWidth={2} />
            <rect
              x={Math.min(hover.x + 10, viewW - 130)}
              y={Math.max(hover.y - 34, padding.top)}
              width={110}
              height={30}
              rx={6}
              fill="#1C1F29"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
            <text
              x={Math.min(hover.x + 18, viewW - 122)}
              y={Math.max(hover.y - 18, padding.top + 12)}
              fill="#FFB4AB"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fontWeight={600}
            >
              {dd[hover.idx].toFixed(2)}%
            </text>
            <text
              x={Math.min(hover.x + 18, viewW - 122)}
              y={Math.max(hover.y - 6, padding.top + 24)}
              fill="#8C909F"
              fontSize={9}
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
