import { useState, useMemo, useEffect, useCallback } from 'react'
import CustomSelect from '../Common/CustomSelect'
import {
  AppIcon,
  CustomersIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  ReceiptIcon,
  SearchIcon,
  ViewIcon,
  LockIcon,
  UnlockIcon,
  DeleteIcon,
} from '../../icons'
import './CustomerPage.css'

export default function CustomerPage() {
  const ctx = window.DJANGO_CONTEXT || {}
  const initialCustomers = ctx.customersList || []

  const [customers, setCustomers] = useState(initialCustomers)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal States
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [deletingCustomer, setDeletingCustomer] = useState(null)

  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Fetch updated list from REST API
  const refreshCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers/')
      if (res.ok) {
        const data = await res.json()
        if (data.customers) {
          setCustomers(data.customers)
        }
      }
    } catch (err) {
      console.warn('Could not fetch updated customers', err)
    }
  }, [])

  // Auto-dismiss alert notifications
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null)
        setSuccessMsg(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMsg, successMsg])

  // Computed metrics
  const totalCount = customers.length
  const activeCount = customers.filter(c => c.isActive !== false && c.is_active !== false).length
  const inactiveCount = totalCount - activeCount
  const totalSpentAll = customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0)

  // Filtering
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q))

      let matchesStatus = true
      const isActive = c.isActive !== false && c.is_active !== false
      if (statusFilter === 'active') matchesStatus = isActive
      if (statusFilter === 'inactive') matchesStatus = !isActive

      return matchesSearch && matchesStatus
    })
  }, [customers, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIdx, startIdx + itemsPerPage)

  // Toggle active status
  const handleToggleActive = async (cust) => {
    const newStatus = !(cust.isActive !== false && cust.is_active !== false)
    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch(`/api/customers/${cust.id}/status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ is_active: newStatus }),
      })
      if (res.ok) {
        setCustomers(prev =>
          prev.map(c => (c.id === cust.id ? { ...c, isActive: newStatus, is_active: newStatus } : c))
        )
        setSuccessMsg(`Customer ${cust.name || cust.email} is now ${newStatus ? 'Active' : 'Inactive'}.`)
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications()
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'))
        }
      } else {
        setErrorMsg('Failed to update customer status.')
      }
    } catch {
      setErrorMsg('Network error updating status.')
    }
  }

  // Delete customer
  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return
    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch(`/api/customers/${deletingCustomer.id}/delete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      })
      if (res.ok) {
        setCustomers(prev => prev.filter(c => c.id !== deletingCustomer.id))
        setSuccessMsg(`Customer account deleted successfully.`)
        setDeletingCustomer(null)
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications()
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'))
        }
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to delete customer.')
      }
    } catch {
      setErrorMsg('Network error deleting customer.')
    }
  }

  return (
    <div className="customer-page-shell">
      {/* Toast / Message Alerts */}
      {errorMsg && (
        <div className="customer-alert-banner error">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}
      {successMsg && (
        <div className="customer-alert-banner success">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="customer-header">
        <div className="customer-title-box">
          <h1>Customers</h1>
          <p>Manage registered customers and view order history.</p>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="customer-stats-grid">
        {/* Total Customers */}
        <div className="customer-stat-card">
          <div className="stat-icon-box blue">
            <AppIcon icon={CustomersIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Customers</span>
            <span className="stat-value">{totalCount}</span>
            <span className="stat-sub">Registered accounts</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="customer-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Customers</span>
            <span className="stat-value">{activeCount}</span>
            <span className="stat-sub">Currently active</span>
          </div>
        </div>

        {/* Inactive Customers */}
        <div className="customer-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={CancelCircleIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inactive Customers</span>
            <span className="stat-value">{inactiveCount}</span>
            <span className="stat-sub">Not active</span>
          </div>
        </div>

        {/* Total Spent */}
        <div className="customer-stat-card">
          <div className="stat-icon-box amber">
            <AppIcon icon={ReceiptIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Customer Sales</span>
            <span className="stat-value">₹{totalSpentAll.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Lifetime customer revenue</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="customer-table-card">
        {/* Filter Bar */}
        <div className="table-filter-bar">
          <div className="customer-search-box">
            <span className="customer-search-icon">
              <AppIcon icon={SearchIcon} size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, phone or customer ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="customer-search-input"
            />
          </div>

          <CustomSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Accounts' },
              { value: 'inactive', label: 'Inactive Accounts' }
            ]}
            height="38px"
            minWidth="140px"
          />
        </div>

        {/* Customer Table */}
        <div className="customer-table-responsive-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th style={{ width: '20%', minWidth: '170px' }}>CUSTOMER</th>
                <th style={{ width: '20%', minWidth: '180px' }}>CONTACT</th>
                <th style={{ width: '9%', minWidth: '85px' }}>ORDERS</th>
                <th style={{ width: '10%', minWidth: '100px' }}>TOTAL SPENT</th>
                <th style={{ width: '9%', minWidth: '90px' }}>STATUS</th>
                <th style={{ width: '14%', minWidth: '125px' }}>JOINED</th>
                <th style={{ width: '14%', minWidth: '125px' }}>LAST LOGIN</th>
                <th style={{ width: '8%', minWidth: '100px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((c) => {
                  const isActive = c.isActive !== false && c.is_active !== false
                  const joinedRaw = c.createdAt || c.created_at || c.date_joined || '—'
                  const loginRaw = c.lastLogin || c.last_login || 'Never'

                  const formatDateTime = (val) => {
                    if (!val || val === '—' || val === 'None' || val === 'null' || val === '') {
                      return { date: '—', time: null }
                    }
                    if (String(val).trim().toLowerCase() === 'never') {
                      return { date: 'Never', time: null }
                    }
                    if (String(val).includes(',')) {
                      const parts = String(val).split(',')
                      return { date: parts[0].trim(), time: parts.slice(1).join(',').trim() }
                    }
                    return { date: String(val), time: null }
                  }

                  const joinedObj = formatDateTime(joinedRaw)
                  const loginObj = formatDateTime(loginRaw)

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="customer-identity-cell">
                          <div className="user-avatar-circle">
                            {(c.name || c.username || c.email || 'C')[0].toUpperCase()}
                          </div>
                          <div className="customer-name-wrapper">
                            <span className="customer-name-text" title={c.name || c.username}>
                              {c.name || c.username || 'Anonymous'}
                            </span>
                            <span className="customer-id-text">{c.customerId || `CUST-${String(c.id).padStart(4, '0')}`}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="customer-contact-cell">
                          <span className="customer-email-text" title={c.email}>{c.email || '—'}</span>
                          <span className="customer-phone-text">{c.mobile || c.phone || 'No phone'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="orders-count-badge">{c.ordersCount ?? c.orders_count ?? 0} orders</span>
                      </td>
                      <td>
                        <span className="total-spent-text">₹{(Number(c.totalSpent ?? c.total_spent) || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="customer-date-cell">
                          <span className="customer-date-primary">{joinedObj.date}</span>
                          {joinedObj.time && <span className="customer-date-secondary">{joinedObj.time}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="customer-date-cell">
                          <span className="customer-date-primary">{loginObj.date}</span>
                          {loginObj.time && <span className="customer-date-secondary">{loginObj.time}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="action-btn view"
                            onClick={() => setViewingCustomer(c)}
                            title="View Details"
                            aria-label="View Details"
                          >
                            <AppIcon icon={ViewIcon} size={15} />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            className={`action-btn toggle ${isActive ? '' : 'off'}`}
                            onClick={() => handleToggleActive(c)}
                            title={isActive ? 'Deactivate' : 'Activate'}
                            aria-label={isActive ? 'Deactivate customer' : 'Activate customer'}
                          >
                            <AppIcon icon={isActive ? LockIcon : UnlockIcon} size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => setDeletingCustomer(c)}
                            title="Delete Customer Account"
                            aria-label="Delete Customer Account"
                          >
                            <AppIcon icon={DeleteIcon} size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="8" className="customer-empty-cell">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="table-footer-bar">
          <span className="footer-info">
            Showing {filteredCustomers.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
          </span>

          {totalPages > 1 && (
            <div className="pagination-group">
              <button
                className="page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                className="page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>
          )}
        </div>

      </div>

      {/* VIEW CUSTOMER DETAILS MODAL */}
      {viewingCustomer && (
        <div className="customer-modal-backdrop" onClick={() => setViewingCustomer(null)}>
          <div className="customer-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>👁️ Customer Profile & Purchase History</h2>
              <button className="modal-close-btn" onClick={() => setViewingCustomer(null)}>×</button>
            </div>
            <div className="modal-body-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div className="user-avatar-circle" style={{ width: '56px', height: '56px', fontSize: '22px' }}>
                  {(viewingCustomer.name || viewingCustomer.username || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', color: '#0f172a' }}>{viewingCustomer.name}</h3>
                  <span className="status-pill active" style={{ fontSize: '12px' }}>{viewingCustomer.customerId}</span>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="form-grid-2" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Email Address</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{viewingCustomer.email}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Mobile Number</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{viewingCustomer.mobile || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Registered Date</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{viewingCustomer.createdAt || viewingCustomer.created_at}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Last Login</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{viewingCustomer.lastLogin || viewingCustomer.last_login}</strong>
                </div>
              </div>

              {/* Customer Activity Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', textCenter: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700', display: 'block' }}>Total Orders</span>
                  <strong style={{ fontSize: '18px', color: '#1e3a8a' }}>{viewingCustomer.ordersCount || 0}</strong>
                </div>
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', textCenter: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', display: 'block' }}>Completed</span>
                  <strong style={{ fontSize: '18px', color: '#14532d' }}>{viewingCustomer.completedOrdersCount || 0}</strong>
                </div>
                <div style={{ background: '#fffbe6', padding: '12px', borderRadius: '10px', textCenter: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '700', display: 'block' }}>Total Spent</span>
                  <strong style={{ fontSize: '18px', color: '#78350f' }}>₹{(viewingCustomer.totalSpent || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-cancel" onClick={() => setViewingCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}



      {/* DELETE CONFIRMATION MODAL */}
      {deletingCustomer && (
        <div className="customer-modal-backdrop" onClick={() => setDeletingCustomer(null)}>
          <div className="customer-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header-bar">
              <h2 style={{ color: '#ef4444' }}>🗑️ Delete Customer Account?</h2>
              <button className="modal-close-btn" onClick={() => setDeletingCustomer(null)}>×</button>
            </div>
            <div className="modal-body-container">
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
                Are you sure you want to delete customer account <strong>{deletingCustomer.name || deletingCustomer.username}</strong> ({deletingCustomer.email})?
              </p>
              <p style={{ marginTop: '8px', fontSize: '12.5px', color: '#ef4444', fontWeight: '600' }}>
                ⚠️ This removes the account credential, while retaining historical purchase records intact.
              </p>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-cancel" onClick={() => setDeletingCustomer(null)}>Cancel</button>
              <button type="button" className="btn-danger-confirm" onClick={handleDeleteConfirm}>Yes, Delete Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
