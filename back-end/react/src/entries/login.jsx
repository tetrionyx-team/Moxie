import { createRoot } from 'react-dom/client'
import LoginPage from '../components/Auth/LoginPage'

const container = document.getElementById('react-login-root')
if (container) {
  createRoot(container).render(<LoginPage />)
}
