import { createRoot } from 'react-dom/client'
import AdminUsersPage from '../components/AdminUsers/AdminUsersPage'

const container = document.getElementById('react-adminusers-root')
if (container) {
  createRoot(container).render(<AdminUsersPage />)
}
