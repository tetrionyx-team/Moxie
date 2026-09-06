import { createRoot } from 'react-dom/client'
import MessagesPage from '../components/Messages/MessagesPage'

const container = document.getElementById('react-messages-root')
if (container) {
  createRoot(container).render(<MessagesPage />)
}
