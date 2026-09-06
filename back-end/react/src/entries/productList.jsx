import { createRoot } from 'react-dom/client'
import ProductListPage from '../components/Products/ProductListPage'

const container = document.getElementById('react-changelist-root')
if (container) {
  createRoot(container).render(<ProductListPage />)
}
