/**
 * Toast — shared imperative toast notification.
 * Used by ProductList and AddProduct.
 * showToast(title, msg, isError) is exposed on window for legacy compatibility.
 */
import { useEffect, useRef, useState } from 'react'

let toastRef = null

export function showToast(title, msg, isError = false) {
  if (toastRef) toastRef(title, msg, isError)
}

export default function Toast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    toastRef = (title, msg, isError) => {
      setToast({ title, msg, isError })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setToast(null), 2000)
    }
    return () => { toastRef = null }
  }, [])

  if (!toast) return null

  const borderColor = toast.isError ? '#ef4444'
    : toast.title.toLowerCase().includes('delet') ? '#f97316'
    : '#22c55e'

  const icon = toast.isError ? '⚠️'
    : toast.title.toLowerCase().includes('delet') ? '🗑️'
    : '✅'

  return (
    <div
      id="moxie-toast"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        borderLeft: `4px solid ${borderColor}`,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        zIndex: 99999,
        minWidth: '280px',
        maxWidth: '380px',
        animation: 'slideInRight 0.3s ease',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', marginBottom: '2px' }}>
          {toast.title}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
          {toast.msg}
        </div>
      </div>
    </div>
  )
}
