import { createRoot } from 'react-dom/client'
import CategoryListPage from '../components/Categories/CategoryListPage'

const container = document.getElementById('react-categorylist-root')
if (container) {
  createRoot(container).render(<CategoryListPage />)
}
