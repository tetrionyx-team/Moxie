import { createRoot } from 'react-dom/client'
import CustomerPage from '../components/Customers/CustomerPage'

const container = document.getElementById('react-customers-root')
if (container) {
  createRoot(container).render(<CustomerPage />)
}
