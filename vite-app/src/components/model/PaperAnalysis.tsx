interface PaperAnalysisProps {
  discussion: string
  discussionStructured?: {
    strengths: string[]
    limitations: string[]
    improvements: string[]
  }
}

export default function PaperAnalysis({ discussion, discussionStructured }: PaperAnalysisProps) {
  const hasStructured =
    discussionStructured &&
    (discussionStructured.strengths.length > 0 ||
      discussionStructured.limitations.length > 0 ||
      discussionStructured.improvements.length > 0)

  return (
    <div>
      {hasStructured ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Strengths */}
          <div className="bg-bg-card rounded-xl p-6 border-l-4 border-green-500">
            <h4 className="font-headline font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-green-400">&#x2705;</span> 策略优势
            </h4>
            <ul className="space-y-2">
              {discussionStructured!.strengths.map((item, i) => (
                <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                  <span className="text-green-500 mt-0.5 shrink-0">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Limitations */}
          <div className="bg-bg-card rounded-xl p-6 border-l-4 border-amber-500">
            <h4 className="font-headline font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-amber-400">&#x26A0;&#xFE0F;</span> 局限性
            </h4>
            <ul className="space-y-2">
              {discussionStructured!.limitations.map((item, i) => (
                <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-bg-card rounded-xl p-6 border-l-4 border-blue-500">
            <h4 className="font-headline font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-blue-400">&#x1F527;</span> 改进方向
            </h4>
            <ul className="space-y-2">
              {discussionStructured!.improvements.map((item, i) => (
                <li key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                  <span className="text-blue-500 mt-0.5 shrink-0">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-bg-card rounded-xl p-6 border border-border-subtle">
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {discussion}
          </div>
        </div>
      )}

      {/* Reproducibility Checklist */}
      <div className="mt-8 p-6 bg-bg-card rounded-xl border border-border-subtle">
        <h4 className="font-headline font-bold text-text-primary mb-4">可复现性检查</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { checked: true, label: '数据源公开可用 (akshare 免费 API)' },
            { checked: true, label: '代码完整可运行 (Jupyter Notebook)' },
            { checked: true, label: '随机种子已固定 (seed=42)' },
            { checked: false, label: '超参数搜索空间已记录' },
            { checked: true, label: '前视偏差已标注' },
            { checked: true, label: '交易成本已计入 (佣金+印花税)' },
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-text-secondary">
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  item.checked ? 'bg-accent-blue border-accent-blue' : 'border-text-tertiary'
                }`}
              >
                {item.checked && <span className="text-white text-[10px]">&#x2713;</span>}
              </span>
              {item.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
