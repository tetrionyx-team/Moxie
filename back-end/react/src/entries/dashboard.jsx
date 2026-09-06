import { createRoot } from 'react-dom/client'
import DashboardPage from '../components/Dashboard/DashboardPage'

const container = document.getElementById('react-dashboard-root')
if (container) {
  createRoot(container).render(<DashboardPage />)
}
