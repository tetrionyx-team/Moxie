import React, { useEffect } from 'react'
import { AppIcon, MailIcon, LockIcon } from '../../icons'
import './LoginPage.css'

export default function LoginPage() {
  useEffect(() => {
    const usernameInput = document.getElementById('id_username')
    const usernameDest = document.getElementById('dest-login-username')
    if (usernameInput && usernameDest) {
      usernameDest.innerHTML = ''
      usernameDest.appendChild(usernameInput)
    }

    const passwordInput = document.getElementById('id_password')
    const passwordDest = document.getElementById('dest-login-password')
    if (passwordInput && passwordDest) {
      passwordDest.innerHTML = ''
      passwordDest.appendChild(passwordInput)
    }

    const errorsSrc = document.getElementById('source-login-errors')
    const errorsDest = document.getElementById('dest-login-errors')
    if (errorsSrc && errorsDest) {
      errorsDest.innerHTML = ''
      errorsDest.appendChild(errorsSrc)
    }
  }, [])

  const csrfToken = (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) || ''
  const nextUrl = (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.nextUrl) || '/admin/dashboard/'

  return (
    <div className="login-container">
      <h1 className="header-title">Welcome to <span>Moxie</span> Admin Dashboard</h1>

      <div className="login-card">
        <h2 className="card-heading">Welcome Back! 👋</h2>
        <p className="card-sub">Sign in to your admin account</p>

        {/* Errors Container */}
        <div id="dest-login-errors"></div>

        <form action="" method="post" id="login-form" onSubmit={() => { try { sessionStorage.setItem('adminVisitActive', 'true'); } catch(e) {} }}>
          <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />

          <div className="form-group">
            <span className="form-icon">
              <AppIcon icon={MailIcon} size={18} />
            </span>
            <div id="dest-login-username" style={{ width: '100%' }}></div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <span className="form-icon">
              <AppIcon icon={LockIcon} size={18} />
            </span>
            <div id="dest-login-password" style={{ width: '100%' }}></div>
          </div>

          <div className="row-options">
            <label className="checkbox-container">
              <input type="checkbox" name="remember_me" defaultChecked />
              Remember me
            </label>
            <a href="#" className="forgot-link">Forgot Password?</a>
          </div>

          <input type="hidden" name="next" value={nextUrl} />

          <button type="submit" className="submit-btn">
            Sign In &rarr;
          </button>
        </form>
      </div>

      <p className="footer-text">Need help? Contact <a href="mailto:support@moxiestore.com">support@moxiestore.com</a></p>
    </div>
  )
}
