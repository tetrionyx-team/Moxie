import React from 'react'
import ReactDOM from 'react-dom/client'
import ProfilePage from '../components/Profile/ProfilePage'
import '../components/Profile/ProfilePage.css'

const rootElement = document.getElementById('react-profile-root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ProfilePage />
    </React.StrictMode>
  )
}
