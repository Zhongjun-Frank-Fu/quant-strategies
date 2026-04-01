import { useState } from 'react'

interface CodeBlockProps {
  code: string
  filename?: string
}

function highlightPython(code: string): string {
  // Escape HTML first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Comments (# ...)
  escaped = escaped.replace(
    /(#.*)$/gm,
    '<span style="color:#6B7280;font-style:italic">$1</span>'
  )

  // Strings (triple-quoted, double-quoted, single-quoted, f-strings)
  escaped = escaped.replace(
    /("""[\s\S]*?"""|'''[\s\S]*?'''|f?"[^"\\]*(?:\\.[^"\\]*)*"|f?'[^'\\]*(?:\\.[^'\\]*)*')/g,
    '<span style="color:#4EDEA3">$1</span>'
  )

  // Numbers
  escaped = escaped.replace(
    /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/g,
    '<span style="color:#F59E0B">$1</span>'
  )

  // Keywords
  const keywords = [
    'import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else',
    'for', 'while', 'in', 'not', 'and', 'or', 'is', 'None', 'True',
    'False', 'try', 'except', 'finally', 'with', 'as', 'yield',
    'lambda', 'pass', 'break', 'continue', 'raise', 'assert', 'del',
    'global', 'nonlocal', 'async', 'await',
  ]
  const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  escaped = escaped.replace(
    kwPattern,
    '<span style="color:#3B82F6;font-weight:500">$1</span>'
  )

  return escaped
}

export default function CodeBlock({ code, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const highlighted = highlightPython(code)

  return (
    <div className="rounded-2xl overflow-hidden bg-bg-primary border border-border-subtle">
      {/* macOS-style header */}
      <div className="flex items-center justify-between px-6 py-3 bg-bg-elevated border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-red/60" />
          <span className="w-3 h-3 rounded-full bg-accent-gold/60" />
          <span className="w-3 h-3 rounded-full bg-accent-green/60" />
          {filename && (
            <span className="text-xs text-text-tertiary ml-4 font-mono">{filename}</span>
          )}
        </div>
        <button
          onClick={copyCode}
          className="text-xs text-text-tertiary hover:text-accent-blue flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  )
}
