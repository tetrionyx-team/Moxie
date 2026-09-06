/**
 * djangoContext.js
 * Reads from window.DJANGO_CONTEXT set by Django templates.
 * This is the bridge between Django server-side data and React components.
 */
export function getDjangoContext() {
  return window.DJANGO_CONTEXT || {}
}

export function getCSRFToken() {
  const ctx = getDjangoContext()
  if (ctx.csrfToken) return ctx.csrfToken
  // Fallback: read from cookie
  const name = 'csrftoken'
  const cookies = document.cookie.split(';')
  for (let c of cookies) {
    const [k, v] = c.trim().split('=')
    if (k === name) return decodeURIComponent(v)
  }
  return ''
}
