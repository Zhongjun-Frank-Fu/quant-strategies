import { useState } from 'react'
import CodeBlock from './CodeBlock'

interface CodeTab {
  label: string
  code: string
  filename?: string
}

interface CodeBrowserProps {
  tabs: CodeTab[]
}

export default function CodeBrowser({ tabs }: CodeBrowserProps) {
  const [activeIdx, setActiveIdx] = useState(0)

  const defaultTabs: CodeTab[] = tabs.length > 0 ? tabs : [
    { label: '特征工程', code: '' },
    { label: '模型训练', code: '' },
    { label: '回测逻辑', code: '' },
  ]

  const activeTab = defaultTabs[activeIdx]

  return (
    <div className="rounded-2xl overflow-hidden bg-bg-card border border-border-subtle">
      {/* Tab bar */}
      <div className="flex border-b border-border-subtle bg-bg-elevated">
        {defaultTabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className={`
              relative px-6 py-3 text-sm font-medium transition-colors duration-200
              ${i === activeIdx
                ? 'text-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            {tab.label}
            {/* Active underline */}
            {i === activeIdx && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-blue" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="transition-opacity duration-200">
        {activeTab && activeTab.code ? (
          <CodeBlock code={activeTab.code} filename={activeTab.filename} />
        ) : (
          <div className="p-12 text-center text-text-tertiary text-sm">
            <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">code_off</span>
            此部分代码暂未提取
          </div>
        )}
      </div>
    </div>
  )
}
