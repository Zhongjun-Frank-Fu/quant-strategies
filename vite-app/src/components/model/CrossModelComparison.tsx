import type { Model } from '../../types'
import { CATEGORIES } from '../../data/categories'

interface CrossModelComparisonProps {
  currentModel: Model
  siblingModels: Model[]
  categoryColor: string
}

export default function CrossModelComparison({
  currentModel,
  siblingModels,
  categoryColor,
}: CrossModelComparisonProps) {
  // Combine current model with siblings and sort by annReturn descending
  const allModels = [currentModel, ...siblingModels.filter((m) => m.id !== currentModel.id)]
  const sorted = [...allModels].sort((a, b) => b.annReturn - a.annReturn)
  const rank = sorted.findIndex((m) => m.id === currentModel.id) + 1
  const category = CATEGORIES.find((c) => c.id === currentModel.categoryId)
  const categoryName = category?.name || currentModel.categoryId

  const complexityLabel = (c: number) => {
    if (c <= 1) return '低'
    if (c <= 2) return '中'
    return '高'
  }

  // Comparative narrative
  const complexityComparison =
    currentModel.complexity <= 1
      ? '该模型实现复杂度较低，适合快速部署和迭代'
      : currentModel.complexity <= 2
        ? '该模型实现复杂度适中，在效果和工程可维护性之间取得平衡'
        : '该模型实现复杂度较高，需要较多工程投入但可能带来更优表现'

  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-5 py-3 text-xs text-text-tertiary font-medium">模型名称</th>
              <th className="text-right px-5 py-3 text-xs text-text-tertiary font-medium">年化收益</th>
              <th className="text-right px-5 py-3 text-xs text-text-tertiary font-medium">Sharpe</th>
              <th className="text-center px-5 py-3 text-xs text-text-tertiary font-medium">复杂度</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((model) => {
              const isCurrent = model.id === currentModel.id
              return (
                <tr
                  key={model.id}
                  className={`border-b border-border-subtle last:border-b-0 transition-colors ${
                    isCurrent ? '' : 'hover:bg-bg-hover/30'
                  }`}
                  style={isCurrent ? { backgroundColor: `${categoryColor}15` } : undefined}
                >
                  <td className="px-5 py-3">
                    <span className={`${isCurrent ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}>
                      {model.title}
                    </span>
                    {isCurrent && (
                      <span
                        className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded"
                        style={{ backgroundColor: `${categoryColor}30`, color: categoryColor }}
                      >
                        当前
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular">
                    <span className={model.annReturn >= 0 ? 'text-signal-positive' : 'text-signal-negative'}>
                      {model.annReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular text-text-secondary">
                    {model.sharpe.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs text-text-tertiary">{complexityLabel(model.complexity)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Narrative */}
      <div className="px-5 py-4 border-t border-border-subtle">
        <p className="text-sm text-text-secondary leading-relaxed">
          在 {categoryName} 类别的 {sorted.length} 个模型中，{currentModel.title} 以{' '}
          <span className="text-text-primary font-mono font-semibold">{currentModel.annReturn.toFixed(2)}%</span>{' '}
          的年化收益排名第 {rank}。{complexityComparison}。
        </p>
      </div>
    </div>
  )
}
