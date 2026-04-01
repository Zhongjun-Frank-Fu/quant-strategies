import { useState, useMemo } from 'react'

interface MonthlyReturnsHeatmapProps {
  sparkline: number[]
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

function computeMonthlyReturns(values: number[]): number[][] {
  // 200 points over 48 months -> ~4.17 points per month
  const pointsPerMonth = values.length / 48
  const grid: number[][] = []
  for (let year = 0; year < 4; year++) {
    const row: number[] = []
    for (let month = 0; month < 12; month++) {
      const mIdx = year * 12 + month
      const start = Math.floor(mIdx * pointsPerMonth)
      const end = Math.min(Math.floor((mIdx + 1) * pointsPerMonth), values.length - 1)
      if (start < values.length && end < values.length && values[start] !== 0) {
        const ret = ((values[end] - values[start]) / values[start]) * 100
        row.push(ret)
      } else {
        row.push(0)
      }
    }
    grid.push(row)
  }
  return grid
}

function getColor(value: number, maxAbs: number): string {
  if (maxAbs === 0) return 'rgba(255,255,255,0.05)'
  const intensity = Math.min(Math.abs(value) / maxAbs, 1)
  if (value > 0) {
    // Green: from white-ish to deep green
    const r = Math.round(255 - intensity * 225)
    const g = Math.round(255 - intensity * 80)
    const b = Math.round(255 - intensity * 210)
    return `rgb(${r},${g},${b})`
  } else if (value < 0) {
    // Red: from white-ish to deep red
    const r = Math.round(255 - intensity * 20)
    const g = Math.round(255 - intensity * 200)
    const b = Math.round(255 - intensity * 210)
    return `rgb(${r},${g},${b})`
  }
  return 'rgba(255,255,255,0.05)'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = ['2021', '2022', '2023', '2024']

export default function MonthlyReturnsHeatmap({ sparkline, isSimulated = false }: MonthlyReturnsHeatmapProps) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)

  const data = useMemo(() => interpolate(sparkline, 200), [sparkline])
  const grid = useMemo(() => computeMonthlyReturns(data), [data])
  const maxAbs = useMemo(() => {
    let m = 0
    for (const row of grid) {
      for (const v of row) {
        if (Math.abs(v) > m) m = Math.abs(v)
      }
    }
    return m
  }, [grid])

  return (
    <div className="w-full overflow-x-auto">
      {isSimulated && (
        <div className="mb-2 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-500 text-xs font-medium">
            基于趋势模拟，非真实月度收益
          </p>
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-xs text-text-tertiary font-mono text-left w-12" />
            {MONTHS.map((m) => (
              <th key={m} className="p-1 text-xs text-text-tertiary font-mono text-center">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {YEARS.map((year, ri) => (
            <tr key={year}>
              <td className="p-2 text-xs text-text-tertiary font-mono font-semibold">{year}</td>
              {grid[ri]?.map((val, ci) => {
                const isHovered = hoverCell?.row === ri && hoverCell?.col === ci
                return (
                  <td
                    key={ci}
                    className="relative p-0"
                    onMouseEnter={() => setHoverCell({ row: ri, col: ci })}
                    onMouseLeave={() => setHoverCell(null)}
                  >
                    <div
                      className="m-0.5 rounded-md flex items-center justify-center text-[10px] font-mono font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: getColor(val, maxAbs),
                        color: Math.abs(val) / maxAbs > 0.4 ? '#0A0E17' : '#C2C6D6',
                        height: 36,
                        outline: isHovered ? '2px solid rgba(59,130,246,0.6)' : 'none',
                        outlineOffset: -1,
                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                        position: 'relative',
                      }}
                    >
                      {val.toFixed(1)}%
                    </div>
                    {isHovered && (
                      <div
                        className="absolute z-20 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap"
                        style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 }}
                      >
                        <div className="text-xs text-text-primary font-mono font-semibold">
                          {val >= 0 ? '+' : ''}{val.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-text-tertiary">
                          {year}-{MONTHS[ci]}
                        </div>
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
