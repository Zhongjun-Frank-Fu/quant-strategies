import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/shared/ScrollToTop'
import CommandPalette from './components/shared/CommandPalette'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import ModelDetailPage from './pages/ModelDetailPage'
import ComparePage from './pages/ComparePage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <CommandPalette />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/model/:modelId" element={<ModelDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </>
  )
}
