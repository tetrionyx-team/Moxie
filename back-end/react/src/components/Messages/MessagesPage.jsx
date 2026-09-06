import { useState, useEffect, useCallback } from 'react'
import {
  AppIcon,
  MessageIcon,
  MailIcon,
  CheckmarkCircle01Icon as CheckIcon,
  SearchIcon,
  DeleteIcon,
  RefreshIcon,
  CancelIcon,
  NotificationIcon,
  CartIcon,
  StarIcon,
  TagIcon,
  CustomersIcon,
  PackageIcon,
  AlertIcon,
} from '../../icons'
import './MessagesPage.css'

function getCsrfToken() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))
  if (cookie) return cookie.split('=')[1]
  const input = document.querySelector('input[name="csrfmiddlewaretoken"]')
  if (input) return input.value
  if (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) return window.DJANGO_CONTEXT.csrfToken
  return ''
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Notifications', icon: NotificationIcon },
  { id: 'orders', label: 'Orders', icon: CartIcon },
  { id: 'reviews', label: 'Reviews', icon: StarIcon },
  { id: 'offers', label: 'Offers', icon: TagIcon },
  { id: 'customers', label: 'Customers', icon: CustomersIcon },
  { id: 'products', label: 'Products', icon: PackageIcon },
  { id: 'system', label: 'System', icon: AlertIcon },
]

// Strip leading emoji from title if stored in backend
function cleanNotificationTitle(title) {
  if (!title) return ''
  return title.replace(/^[\p{Emoji}\u200d\uFE0F\s]+/u, '').trim() || title
}

export default function MessagesPage() {
  const context = window.DJANGO_CONTEXT || {}
  const initialList = context.messagesList || []

  const [messages, setMessages] = useState(initialList)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all') // 'all', 'unread', 'read'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const [totalCount, setTotalCount] = useState(initialList.length)
  const [unreadCount, setUnreadCount] = useState(initialList.filter(m => !m.is_read).length)
  const [readCount, setReadCount] = useState(initialList.filter(m => m.is_read).length)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const showToast = (title, msg, isError = false) => {
    if (typeof window.showGlobalToast === 'function') {
      window.showGlobalToast(title, msg, isError)
      return
    }
    const toast = document.getElementById('moxie-toast')
    const titleEl = document.getElementById('moxie-toast-title')
    const msgEl = document.getElementById('moxie-toast-msg')
    const icon = document.getElementById('moxie-toast-icon')
    if (!toast) return
    toast.style.borderLeftColor = isError ? '#ef4444' : '#22c55e'
    if (icon) {
      icon.innerHTML = isError
        ? '<span style="color: #ef4444; font-size: 18px;">⚠️</span>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    }
    if (titleEl) titleEl.textContent = title
    if (msgEl) msgEl.textContent = msg
    toast.style.display = 'flex'
    toast.style.opacity = '1'
    clearTimeout(toast._timer)
    toast._timer = setTimeout(() => {
      toast.style.transition = 'opacity 0.4s'
      toast.style.opacity = '0'
      setTimeout(() => {
        toast.style.display = 'none'
      }, 400)
    }, 3000)
  }

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMsg(null)
      const res = await fetch(`/api/notifications/?category=${categoryFilter}&q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error('Unable to load notifications')
      const data = await res.json()
      if (data.notifications) {
        setMessages(data.notifications)
        const tCount = data.totalCount ?? data.total_count ?? data.notifications.length
        const uCount = data.unreadCount ?? data.unread_count ?? data.notifications.filter(m => !m.is_read && !m.isRead).length
        const rCount = data.readCount ?? data.read_count ?? Math.max(0, tCount - uCount)
        setTotalCount(tCount)
        setUnreadCount(uCount)
        setReadCount(rCount)
        if (typeof window.updateGlobalNotificationBadges === 'function') {
          window.updateGlobalNotificationBadges(uCount)
        }
      }
      return data
    } catch (err) {
      console.warn('API fetch warning:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter, searchQuery])

  useEffect(() => {
    fetchNotifications().catch(() => {})
  }, [fetchNotifications])

  useEffect(() => {
    const handleNotificationUpdate = () => {
      fetchNotifications().catch(() => {})
    }
    window.addEventListener('adminNotificationUpdated', handleNotificationUpdate)
    window.addEventListener('adminNotificationRequestRefresh', handleNotificationUpdate)
    return () => {
      window.removeEventListener('adminNotificationUpdated', handleNotificationUpdate)
      window.removeEventListener('adminNotificationRequestRefresh', handleNotificationUpdate)
    }
  }, [fetchNotifications])

  // Explicit Manual Refresh with animation and user confirmation
  const handleManualRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await fetchNotifications()
      if (typeof window.refreshAdminNotifications === 'function') {
        window.refreshAdminNotifications()
      }
      showToast('Notifications Refreshed', 'Latest activities and store alerts loaded.')
    } catch (err) {
      showToast('Refresh Failed', 'Unable to fetch latest notifications. Please try again.', true)
    } finally {
      setTimeout(() => {
        setIsRefreshing(false)
      }, 450)
    }
  }

  // Mark a single notification as read
  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      const csrfToken = getCsrfToken()
      const numericId = String(id).replace('notif_', '')
      const res = await fetch(`/api/notifications/${numericId}/read/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessages(prev =>
          prev.map(m => (m.id === id ? { ...m, is_read: true, isRead: true } : m))
        )
        const newUnread = data.unreadCount !== undefined ? data.unreadCount : Math.max(0, unreadCount - 1)
        const newRead = data.readCount !== undefined ? data.readCount : readCount + 1
        setUnreadCount(newUnread)
        setReadCount(newRead)
        if (typeof window.updateGlobalNotificationBadges === 'function') {
          window.updateGlobalNotificationBadges(newUnread)
        }
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications()
        }
      }
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const csrfToken = getCsrfToken()
      const res = await fetch('/api/notifications/mark-all-read/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      })
      if (res.ok) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: true, isRead: true })))
        setUnreadCount(0)
        setReadCount(totalCount)
        if (typeof window.updateGlobalNotificationBadges === 'function') {
          window.updateGlobalNotificationBadges(0)
        }
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications()
        }
        showToast('All Read', 'All notifications marked as read.')
      }
    } catch (err) {
      console.error('Failed to mark all read:', err)
      showToast('Action Failed', 'Failed to mark all notifications as read.', true)
    }
  }

  // Delete notification via Custom Confirmation Modal
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return
    const id = deleteTarget.id
    setIsDeleting(true)
    try {
      const csrfToken = getCsrfToken()
      const numericId = String(id).replace('notif_', '')
      const res = await fetch(`/api/notifications/${numericId}/delete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        const target = messages.find(m => m.id === id)
        setMessages(prev => prev.filter(m => m.id !== id))
        const newTotal = data.totalCount !== undefined ? data.totalCount : Math.max(0, totalCount - 1)
        const newUnread = data.unreadCount !== undefined ? data.unreadCount : (target && !target.is_read ? Math.max(0, unreadCount - 1) : unreadCount)
        const newRead = data.readCount !== undefined ? data.readCount : (target && target.is_read ? Math.max(0, readCount - 1) : readCount)
        setTotalCount(newTotal)
        setUnreadCount(newUnread)
        setReadCount(newRead)
        if (typeof window.updateGlobalNotificationBadges === 'function') {
          window.updateGlobalNotificationBadges(newUnread)
        }
        if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage(null)
        }
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications()
        }
        showToast('Notification Deleted', 'Notification has been removed.')
      } else {
        throw new Error('Failed to delete')
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
      showToast('Delete Failed', 'Could not delete notification. Please try again.', true)
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Open modal detail
  const openModal = (msg) => {
    setSelectedMessage(msg)
    if (!msg.is_read) {
      markAsRead(msg.id)
    }
  }

  const closeModal = () => {
    setSelectedMessage(null)
  }

  // Filter messages client-side for immediate feedback
  const filteredMessages = messages.filter(msg => {
    // Read status filter
    if (readFilter === 'unread' && msg.is_read) return false
    if (readFilter === 'read' && !msg.is_read) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = (msg.title || '').toLowerCase().includes(q)
      const matchBody = (msg.body || '').toLowerCase().includes(q)
      const matchSender = (msg.sender || '').toLowerCase().includes(q)
      if (!matchTitle && !matchBody && !matchSender) return false
    }

    return true
  })

  // Semantic category icon and theme mapping
  const getCategoryIcon = (badge, notifType) => {
    const text = (badge || notifType || '').toLowerCase()
    if (text.includes('order')) return CartIcon
    if (text.includes('review')) return StarIcon
    if (text.includes('offer') || text.includes('promo') || text.includes('discount')) return TagIcon
    if (text.includes('customer') || text.includes('user')) return CustomersIcon
    if (text.includes('product') || text.includes('stock')) return PackageIcon
    if (text.includes('system') || text.includes('alert')) return AlertIcon
    return NotificationIcon
  }

  const getCategoryThemeClass = (badge, notifType) => {
    const text = (badge || notifType || '').toLowerCase()
    if (text.includes('order')) return 'theme-order'
    if (text.includes('review')) return 'theme-review'
    if (text.includes('offer') || text.includes('promo') || text.includes('discount')) return 'theme-offer'
    if (text.includes('customer') || text.includes('user')) return 'theme-customer'
    if (text.includes('product') || text.includes('stock')) return 'theme-product'
    if (text.includes('system') || text.includes('alert')) return 'theme-system'
    return 'theme-default'
  }

  return (
    <div className="messages-page-shell">
      {/* Page Header Bar */}
      <div className="messages-page-header">
        <div className="messages-header-title-box">
          <h1 className="messages-page-title">Admin Messages & Notifications</h1>
          <p className="messages-page-subtitle">Real-time store activities, customer updates, and system alerts</p>
        </div>
        <div className="messages-header-actions">
          <button type="button" className="btn-mark-all-read" onClick={markAllAsRead}>
            <AppIcon icon={CheckIcon} size={15} color="#ffffff" />
            <span>Mark All as Read</span>
          </button>
          <button
            type="button"
            className={`btn-refresh-notifs ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh notifications"
          >
            <span className={`refresh-icon-spin ${isRefreshing ? 'spinning' : ''}`}>
              <AppIcon icon={RefreshIcon} size={15} />
            </span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="messages-kpi-grid">
        <div
          className={`messages-kpi-card ${readFilter === 'all' ? 'active-card' : ''}`}
          onClick={() => setReadFilter('all')}
          title="Click to view all messages"
        >
          <div className="messages-kpi-icon blue">
            <AppIcon icon={MessageIcon} size={22} color="#ffffff" />
          </div>
          <div className="messages-kpi-content">
            <span className="messages-kpi-label">Total Messages</span>
            <strong className="messages-kpi-value">{totalCount}</strong>
          </div>
        </div>

        <div
          className={`messages-kpi-card ${readFilter === 'unread' ? 'active-card' : ''}`}
          onClick={() => setReadFilter('unread')}
          title="Click to view unread messages"
        >
          <div className="messages-kpi-icon orange">
            <AppIcon icon={MailIcon} size={22} color="#ffffff" />
          </div>
          <div className="messages-kpi-content">
            <span className="messages-kpi-label">Unread</span>
            <strong className="messages-kpi-value">{unreadCount}</strong>
          </div>
        </div>

        <div
          className={`messages-kpi-card ${readFilter === 'read' ? 'active-card' : ''}`}
          onClick={() => setReadFilter('read')}
          title="Click to view read messages"
        >
          <div className="messages-kpi-icon green">
            <AppIcon icon={CheckIcon} size={22} color="#ffffff" />
          </div>
          <div className="messages-kpi-content">
            <span className="messages-kpi-label">Read</span>
            <strong className="messages-kpi-value">{readCount}</strong>
          </div>
        </div>
      </div>

      {/* Category Tabs Row */}
      <div className="category-tabs-bar">
        {CATEGORY_TABS.map(tab => {
          const IconComp = tab.icon
          const isActive = categoryFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`cat-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCategoryFilter(tab.id)}
            >
              <AppIcon icon={IconComp} size={16} color={isActive ? '#ffffff' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Search & Read Filter Controls */}
      <div className="messages-toolbar">
        <div className="messages-search-box">
          <span className="messages-search-icon">
            <AppIcon icon={SearchIcon} size={16} />
          </span>
          <input
            type="text"
            className="messages-search-input"
            placeholder="Search messages by title, customer, body..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs-container">
          <button
            type="button"
            className={`filter-tab-btn ${readFilter === 'all' ? 'active' : ''}`}
            onClick={() => setReadFilter('all')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${readFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setReadFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${readFilter === 'read' ? 'active' : ''}`}
            onClick={() => setReadFilter('read')}
          >
            Read ({readCount})
          </button>
        </div>
      </div>

      {/* Messages List Container */}
      <div className="messages-list-wrapper">
        {filteredMessages.length > 0 ? (
          filteredMessages.map(msg => {
            const IconComp = getCategoryIcon(msg.category_badge, msg.notification_type)
            const themeClass = getCategoryThemeClass(msg.category_badge, msg.notification_type)
            const cleanTitle = cleanNotificationTitle(msg.title)

            return (
              <div
                key={msg.id}
                className={`message-item-card ${msg.is_read ? 'read' : 'unread'}`}
                onClick={() => openModal(msg)}
              >
                {/* Semantic Outline Icon */}
                <div className={`message-status-icon-box ${themeClass}`}>
                  <AppIcon icon={IconComp} size={18} />
                </div>

                {/* Main Card Content */}
                <div className="message-main-content">
                  <div className="message-header-row">
                    <div className="sender-info-box">
                      <span className="sender-name">{msg.sender}</span>
                      {msg.is_read ? (
                        <span className="unread-status-pill read-badge">READ</span>
                      ) : (
                        <span className="unread-status-pill unread-badge">● UNREAD</span>
                      )}
                    </div>
                    <span className="message-time">{msg.time}</span>
                  </div>

                  <div className="message-subject">{cleanTitle}</div>
                  <p className="message-preview-text">{msg.body}</p>

                  <div className="message-tags-row">
                    <span className="message-tag-pill">
                      <AppIcon icon={IconComp} size={13} color="currentColor" />
                      <span>{msg.category_badge || 'Notification'}</span>
                    </span>

                    <div className="card-actions-right" onClick={e => e.stopPropagation()}>
                      {!msg.is_read && (
                        <button
                          type="button"
                          className="mark-as-read-btn"
                          onClick={e => markAsRead(msg.id, e)}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        type="button"
                        className="delete-notif-btn"
                        onClick={e => {
                          e.stopPropagation()
                          setDeleteTarget(msg)
                        }}
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <AppIcon icon={DeleteIcon} size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="empty-messages-state">
            <AppIcon icon={MailIcon} size={44} color="#94a3b8" />
            <h3>No messages found</h3>
            <p>No notifications match your current filter criteria.</p>
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="msg-modal-backdrop" onClick={closeModal}>
          <div className="msg-modal-card" onClick={e => e.stopPropagation()}>
            <div className="msg-modal-top-bar">
              <div className="msg-modal-badges">
                <span className="msg-category-tag">
                  <AppIcon
                    icon={getCategoryIcon(selectedMessage.category_badge, selectedMessage.notification_type)}
                    size={14}
                    color="#ffffff"
                  />
                  <span>{selectedMessage.category_badge || 'Notification'}</span>
                </span>
                <span className="msg-status-badge">
                  <AppIcon icon={CheckIcon} size={14} color="#166534" />
                  <span>Read</span>
                </span>
              </div>
              <button
                type="button"
                className="msg-modal-close-icon"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <AppIcon icon={CancelIcon} size={18} />
              </button>
            </div>

            <h2 className="msg-modal-title">{cleanNotificationTitle(selectedMessage.title)}</h2>

            <div className="msg-modal-sender-row">
              <div
                className="msg-sender-avatar"
                style={{ background: selectedMessage.sender_color || '#3b82f6' }}
              >
                {selectedMessage.sender_initial || 'M'}
              </div>
              <div className="msg-sender-info">
                <strong className="msg-sender-name">{selectedMessage.sender}</strong>
                <span className="msg-full-date">{selectedMessage.full_date || selectedMessage.time}</span>
              </div>
            </div>

            <div className="msg-modal-body-container">
              <pre className="msg-modal-body-text">{selectedMessage.full_body || selectedMessage.body}</pre>
            </div>

            <div className="msg-modal-footer">
              {selectedMessage.target_url ? (
                <a href={selectedMessage.target_url} className="msg-modal-btn-action">
                  <span>View Details in Admin</span>
                  <span>&rarr;</span>
                </a>
              ) : (
                <span className="msg-read-timestamp">
                  <AppIcon icon={CheckIcon} size={15} color="#10b981" />
                  <span>Notification Read</span>
                </span>
              )}
              <button
                type="button"
                className="msg-modal-btn-delete"
                onClick={() => setDeleteTarget(selectedMessage)}
              >
                Delete
              </button>
              <button type="button" className="msg-modal-btn-close" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="delete-modal-overlay" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="delete-modal-box" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon-wrap">
              <AppIcon icon={DeleteIcon} size={24} color="#ef4444" />
            </div>
            <h3 className="delete-modal-title">Delete Notification?</h3>
            <p className="delete-modal-desc">
              Are you sure you want to delete <strong style={{ color: 'inherit' }}>"{cleanNotificationTitle(deleteTarget.title) || 'this notification'}"</strong>? This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
