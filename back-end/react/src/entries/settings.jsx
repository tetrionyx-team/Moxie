import React from 'react'
import ReactDOM from 'react-dom/client'
import SettingsPage from '../components/Settings/SettingsPage'
import '../components/Settings/SettingsPage.css'

const rootElement = document.getElementById('react-settings-root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <SettingsPage />
    </React.StrictMode>
  )
}
