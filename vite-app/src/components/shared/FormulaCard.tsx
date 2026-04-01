import { useMemo } from 'react'
import katex from 'katex'

interface FormulaCardProps {
  label: string
  latex: string
}

export default function FormulaCard({ label, latex }: FormulaCardProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode: true, throwOnError: false })
    } catch {
      return `<span style="color:#ef4444">${latex}</span>`
    }
  }, [latex])

  return (
    <div className="p-6 md:p-8 rounded-2xl bg-bg-card border border-border-subtle">
      <p className="text-xs font-mono text-accent-blue mb-4">{label}</p>
      <div className="flex justify-center py-4 md:py-6 bg-bg-primary rounded-lg overflow-x-auto">
        <div
          className="text-text-primary"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
