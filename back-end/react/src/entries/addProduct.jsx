import { createRoot } from 'react-dom/client'
import ProductForm from '../components/AddProduct/ProductForm'

const container = document.getElementById('react-changeform-root')
if (container) {
  createRoot(container).render(<ProductForm />)
}
