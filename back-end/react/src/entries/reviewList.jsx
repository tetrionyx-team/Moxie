import { createRoot } from 'react-dom/client'
import ReviewListPage from '../components/Reviews/ReviewListPage'

const container = document.getElementById('react-reviewlist-root')
if (container) {
  createRoot(container).render(<ReviewListPage />)
}
