import React from 'react'
import ReactDOM from 'react-dom/client'
import OrderPage from '../components/Orders/OrderPage'
import '../components/Orders/OrderPage.css'

const rootElement = document.getElementById('react-orders-root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <OrderPage />
    </React.StrictMode>
  )
}
