import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { MODELS } from '../../data/models'
import { CATEGORIES } from '../../data/categories'

// Hook for external control
let globalOpen: (() => void) | null = null
let globalClose: (() => void) | null = null

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    globalOpen = () => setIsOpen(true)
    globalClose = () => setIsOpen(false)
    return () => {
      globalOpen = null
      globalClose = null
    }
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}

function getCategoryInfo(catId: string) {
  return CATEGORIES.find((c) => c.id === catId)
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const open = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    setSelectedIdx(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setSelectedIdx(0)
  }, [])

  // Sync with hook
  useEffect(() => {
    globalOpen = open
    globalClose = close
    return () => {
      globalOpen = null
      globalClose = null
    }
  }, [open, close])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          close()
        } else {
          open()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, open, close])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return MODELS.slice(0, 10)
    const q = query.toLowerCase()
    return MODELS.filter((m) => {
      const searchable = `${m.title} ${m.author} ${m.algorithm} ${m.tags.join(' ')}`.toLowerCase()
      return searchable.includes(q)
    }).slice(0, 10)
  }, [query])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0)
  }, [results])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIdx]) {
        e.preventDefault()
        navigate(`/model/${results[selectedIdx].id}`)
        close()
      }
    },
    [results, selectedIdx, navigate, close]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIdx] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIdx])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-bg-elevated rounded-xl shadow-2xl border border-border-subtle overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <span className="material-symbols-outlined text-text-tertiary text-xl">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索模型、作者、算法..."
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-tertiary bg-bg-card rounded border border-border-subtle font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-5 py-8 text-center text-text-tertiary text-sm">
              未找到匹配的模型
            </div>
          ) : (
            results.map((model, i) => {
              const cat = getCategoryInfo(model.categoryId)
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    navigate(`/model/${model.id}`)
                    close()
                  }}
                  className={`
                    w-full flex items-center gap-4 px-5 py-3 text-left transition-colors
                    ${i === selectedIdx ? 'bg-bg-hover' : 'hover:bg-bg-hover/50'}
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">
                      {model.title}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">
                      {model.author} &middot; {model.year}
                    </div>
                  </div>
                  {cat && (
                    <span
                      className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                      }}
                    >
                      {cat.name}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border-subtle text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-bg-card rounded border border-border-subtle font-mono">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-bg-card rounded border border-border-subtle font-mono">Enter</kbd>
            打开
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-bg-card rounded border border-border-subtle font-mono">Esc</kbd>
            关闭
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
