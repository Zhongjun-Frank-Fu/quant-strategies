import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CATEGORIES } from '../../data/categories'

export default function Navbar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-bg-secondary border-b border-border-subtle">
      <div className="flex items-center gap-8">
        <Link
          to="/"
          className="text-xl font-bold tracking-tighter text-text-primary font-headline flex items-center gap-2"
        >
          <span className="text-accent-blue">&#9670;</span> QuantLab
        </Link>
        <div className="hidden lg:flex gap-6 items-center">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              className={`font-headline tracking-[0.05em] uppercase text-[10px] font-bold pb-1 hover:text-accent-blue transition-colors duration-200 ${
                location.pathname === `/category/${cat.id}`
                  ? 'border-b-2'
                  : 'text-text-tertiary'
              }`}
              style={
                location.pathname === `/category/${cat.id}`
                  ? { color: cat.color, borderBottomColor: cat.color }
                  : undefined
              }
            >
              {cat.nameEn}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/compare"
          className="material-symbols-outlined text-text-tertiary cursor-pointer hover:text-accent-blue transition-colors"
          title="策略对比"
        >
          compare_arrows
        </Link>
        <Link
          to="/about"
          className="material-symbols-outlined text-text-tertiary cursor-pointer hover:text-accent-blue transition-colors"
          title="关于"
        >
          info
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden material-symbols-outlined text-text-tertiary"
        >
          menu
        </button>
      </div>
      {mobileOpen && (
        <div className="absolute top-16 left-0 w-full bg-bg-primary border-b border-border-subtle p-4 lg:hidden z-50">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              onClick={() => setMobileOpen(false)}
              className="block py-3 text-sm text-text-secondary hover:text-accent-blue border-b border-border-subtle"
            >
              {cat.name} / {cat.nameEn}
            </Link>
          ))}
          <Link
            to="/compare"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-sm text-text-secondary hover:text-accent-blue border-b border-border-subtle"
          >
            策略对比 / Strategy Comparison
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-sm text-text-secondary hover:text-accent-blue"
          >
            关于 / About
          </Link>
        </div>
      )}
    </nav>
  )
}
