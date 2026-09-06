import { useState, useMemo, useEffect, useCallback } from 'react'
import CustomSelect from '../Common/CustomSelect'
import {
  AppIcon,
  PlusIcon,
  UserCircleIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Shield01Icon,
  SearchIcon,
  ViewIcon,
  ViewOffSlashIcon,
  EditIcon,
  LockIcon,
  UnlockIcon,
  DeleteIcon,
} from '../../icons'
import './AdminUsersPage.css'

export default function AdminUsersPage() {
  const ctx = window.DJANGO_CONTEXT || {}
  const initialUsers = ctx.adminUsersList || []
  const currentUserId = ctx.currentUserId || 0

  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: '',
    password: '',
    confirm_password: '',
    is_active: true,
    permissions: ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Reviews', 'Messages']
  })

  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [passwordErrors, setPasswordErrors] = useState({ password: '', confirm_password: '' })
  const [pwSubmitted, setPwSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const allAvailablePermissions = [
    'Dashboard', 'Products', 'Categories', 'Orders',
    'Customers', 'Reviews', 'Messages', 'Banners',
    'Offers', 'Payments', 'Admin Users', 'Settings'
  ]

  // Password validation rules
  const validatePassword = (password, confirm) => {
    const errs = { password: '', confirm_password: '' }
    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.'
    } else if (!/\d/.test(password)) {
      errs.password = 'Password must contain at least one number.'
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errs.password = 'Password must contain at least one special character.'
    }
    if (!confirm) {
      errs.confirm_password = 'Confirm password is required.'
    } else if (password && confirm && password !== confirm) {
      errs.confirm_password = 'Passwords do not match.'
    }
    return errs
  }

  // Refresh admin list from API
  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-users/')
      if (res.ok) {
        const data = await res.json()
        if (data.admin_users) {
          setUsers(data.admin_users)
        }
      }
    } catch (err) {
      console.warn('API refresh error:', err)
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

  // Open Add Admin modal if ?add=1 or ?showAdd=true is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === '1' || params.get('showAdd') === 'true') {
      setIsAddModalOpen(true)
    }
  }, [])

  // Computed metrics
  const totalCount = users.length
  const activeCount = users.filter(u => u.isActive !== false && u.is_active !== false).length
  const inactiveCount = totalCount - activeCount
  const superCount = users.filter(u => u.role === 'Super Admin' || u.isSuperuser).length

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))

      let matchesRole = true
      if (roleFilter !== 'all') {
        matchesRole = u.role && u.role.toLowerCase() === roleFilter.toLowerCase()
      }

      let matchesStatus = true
      const isActive = u.isActive !== false && u.is_active !== false
      if (statusFilter === 'active') matchesStatus = isActive
      if (statusFilter === 'inactive') matchesStatus = !isActive

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  // Pagination Math
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentItems = filteredUsers.slice(startIdx, startIdx + itemsPerPage)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePermissionToggle = (perm) => {
    setFormData(prev => {
      const current = prev.permissions || []
      if (current.includes(perm)) {
        return { ...prev, permissions: current.filter(p => p !== perm) }
      } else {
        return { ...prev, permissions: [...current, perm] }
      }
    })
  }

  const triggerNotificationRefresh = () => {
    try {
      if (typeof window.refreshAdminNotifications === 'function') {
        window.refreshAdminNotifications()
      }
      window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'))
      window.dispatchEvent(new CustomEvent('notificationRefresh'))
    } catch {
      // Ignore background sync errors
    }
  }

  // Add User
  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setPwSubmitted(true)
    const errs = validatePassword(formData.password, formData.confirm_password)
    setPasswordErrors(errs)
    if (errs.password || errs.confirm_password) return

    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch('/api/admin-users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(`Admin user ${formData.name || formData.username} created successfully.`)
        setIsAddModalOpen(false)
        refreshUsers()
        triggerNotificationRefresh()
      } else {
        setErrorMsg(data.error || 'Failed to create admin user.')
      }
    } catch {
      setErrorMsg('Network error creating admin user.')
    }
  }

  // Open Edit Modal
  const openEditModal = (u) => {
    setEditingUser(u)
    setFormData({
      name: u.name || '',
      username: u.username || '',
      email: u.email || '',
      role: u.role || 'Staff Admin',
      password: '',
      confirm_password: '',
      is_active: u.isActive !== false && u.is_active !== false,
      permissions: u.permissions || ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Reviews', 'Messages']
    })
    setPasswordErrors({ password: '', confirm_password: '' })
    setPwSubmitted(false)
  }

  // Save Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (formData.password) {
      const errs = validatePassword(formData.password, formData.confirm_password)
      setPasswordErrors(errs)
      if (errs.password || errs.confirm_password) return
    }
    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch(`/api/admin-users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(`Admin user updated successfully.`)
        setEditingUser(null)
        refreshUsers()
        triggerNotificationRefresh()
      } else {
        setErrorMsg(data.error || 'Failed to update admin user.')
      }
    } catch {
      setErrorMsg('Network error updating admin user.')
    }
  }

  // Toggle Active
  const handleToggleActive = async (u) => {
    const newStatus = !(u.isActive !== false && u.is_active !== false)
    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch(`/api/admin-users/${u.id}/toggle-active/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      })
      if (res.ok) {
        setUsers(prev =>
          prev.map(item => item.id === u.id ? { ...item, isActive: newStatus, is_active: newStatus } : item)
        )
        setSuccessMsg(`Status updated for ${u.name || u.username}.`)
        triggerNotificationRefresh()
      } else {
        setErrorMsg('Failed to update status.')
      }
    } catch {
      setErrorMsg('Network error updating status.')
    }
  }

  // Delete User
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return
    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch(`/api/admin-users/${deletingUser.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deletingUser.id))
        setSuccessMsg('Admin user removed.')
        setDeletingUser(null)
        triggerNotificationRefresh()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to delete user.')
      }
    } catch {
      setErrorMsg('Network error deleting user.')
    }
  }

  return (
    <div className="admin-users-shell">
      {/* Toast Alert Banner */}
      {successMsg && (
        <div className="toast-success">✅ {successMsg}</div>
      )}
      {errorMsg && (
        <div className="toast-error">⚠️ {errorMsg}</div>
      )}

      {/* Header Bar */}
      <div className="admin-users-header">
        <div className="admin-users-title-box">
          <h1>Admin Users</h1>
          <p>Manage administrative accounts, role permissions, and access controls.</p>
        </div>
        <button
          type="button"
          className="btn-add-admin"
          onClick={() => {
            setFormData({
              name: '', username: '', email: '', role: '', password: '', confirm_password: '', is_active: true,
              permissions: ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Reviews', 'Messages']
            })
            setPasswordErrors({ password: '', confirm_password: '' })
            setPwSubmitted(false)
            setIsAddModalOpen(true)
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <AppIcon icon={PlusIcon} size={16} />
          <span>Add Admin User</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="admin-users-stats-grid">
        {/* Total Admins */}
        <div className="admin-stat-card">
          <div className="stat-icon-box blue">
            <AppIcon icon={UserCircleIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Admins</span>
            <span className="stat-value">{totalCount}</span>
            <span className="stat-sub">All admin users</span>
          </div>
        </div>

        {/* Active Admins */}
        <div className="admin-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Admins</span>
            <span className="stat-value">{activeCount}</span>
            <span className="stat-sub">Currently active</span>
          </div>
        </div>

        {/* Inactive Admins */}
        <div className="admin-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={CancelCircleIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inactive Admins</span>
            <span className="stat-value">{inactiveCount}</span>
            <span className="stat-sub">Not active</span>
          </div>
        </div>

        {/* Super Admins */}
        <div className="admin-stat-card">
          <div className="stat-icon-box purple">
            <AppIcon icon={Shield01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Super Admins</span>
            <span className="stat-value">{superCount}</span>
            <span className="stat-sub">Full access</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="admin-users-table-card">
        {/* Filter Bar */}
        <div className="table-filter-bar">
          <div className="admin-search-box">
            <span className="admin-search-icon">
              <AppIcon icon={SearchIcon} size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name, email or username..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="admin-search-input"
            />
          </div>

          <CustomSelect
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'Super Admin', label: 'Super Admin' },
              { value: 'Staff Admin', label: 'Staff Admin' },
              { value: 'Catalog Manager', label: 'Catalog Manager' },
              { value: 'Order Manager', label: 'Order Manager' },
              { value: 'Customer Support', label: 'Customer Support' }
            ]}
            height="38px"
            width="100%"
            minWidth="160px"
          />

          <CustomSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Accounts' },
              { value: 'inactive', label: 'Inactive Accounts' }
            ]}
            height="38px"
            width="100%"
            minWidth="160px"
          />
        </div>

        {/* Data Table Wrapper */}
        <div className="admin-users-table-responsive-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th style={{ width: '50px', minWidth: '50px' }}>#</th>
                <th style={{ width: '28%', minWidth: '180px' }}>ADMIN USER</th>
                <th style={{ width: '18%', minWidth: '130px' }}>ROLE</th>
                <th style={{ width: '14%', minWidth: '100px' }}>STATUS</th>
                <th style={{ width: '18%', minWidth: '120px' }}>JOINED</th>
                <th style={{ width: '22%', minWidth: '150px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((u, idx) => {
                  const isActive = u.isActive !== false && u.is_active !== false
                  const isCurrent = u.id === currentUserId

                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '700', color: '#94a3b8' }}>{startIdx + idx + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-circle">
                            {(u.name || u.username || 'A')[0].toUpperCase()}
                          </div>
                          <div className="user-info">
                            <span className="user-name">
                              {u.name || u.username}
                              {isCurrent && <span className="you-badge">You</span>}
                            </span>
                            <span className="user-email">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${String(u.role || '').toLowerCase().replace(/\s+/g, '-')}`}>
                          {u.role || 'Staff Admin'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                          ● {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap' }}>{u.createdAt || u.created_at}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {/* View Button */}
                          <button
                            type="button"
                            className="action-btn view"
                            onClick={() => setViewingUser(u)}
                            title="View Admin Details"
                            aria-label="View Admin Details"
                          >
                            <AppIcon icon={ViewIcon} size={15} />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            className="action-btn edit"
                            onClick={() => openEditModal(u)}
                            title="Edit Admin User"
                            aria-label="Edit Admin User"
                          >
                            <AppIcon icon={EditIcon} size={15} />
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            className={`action-btn toggle ${isActive ? '' : 'off'}`}
                            onClick={() => handleToggleActive(u)}
                            title={isActive ? 'Deactivate Admin' : 'Activate Admin'}
                            aria-label={isActive ? 'Deactivate Admin' : 'Activate Admin'}
                          >
                            <AppIcon icon={isActive ? LockIcon : UnlockIcon} size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => setDeletingUser(u)}
                            title="Delete Admin User"
                            aria-label="Delete Admin User"
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
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No admin users found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="table-footer-bar">
          <span className="footer-info">
            Showing {filteredUsers.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} admin users
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

      {/* CREATE ADMIN MODAL */}
      {isAddModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>+ Create Admin User</h2>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubmit} autoComplete="off">
              <div className="modal-body-container">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" placeholder="e.g. Arun Raj" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" name="username" placeholder="e.g. arunraj" value={formData.username} onChange={handleInputChange} autoComplete="off" required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="arun@moxie.com" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Role Assignment</label>
                    <input type="text" name="role" placeholder="e.g. Manager, Staff..." value={formData.role} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Password</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="••••••••"
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        required
                        style={{
                          width: '100%',
                          paddingRight: '38px',
                          boxSizing: 'border-box',
                          ...(passwordErrors.password ? { borderColor: '#ef4444' } : {})
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          zIndex: 2
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <AppIcon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
                      </button>
                    </div>
                    {passwordErrors.password && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                        ⚠ {passwordErrors.password}
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirm_password"
                        placeholder="••••••••"
                        value={formData.confirm_password || ''}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        required
                        style={{
                          width: '100%',
                          paddingRight: '38px',
                          boxSizing: 'border-box',
                          ...(passwordErrors.confirm_password ? { borderColor: '#ef4444' } : {})
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          zIndex: 2
                        }}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <AppIcon icon={showConfirmPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
                      </button>
                    </div>
                    {passwordErrors.confirm_password && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                        ⚠ {passwordErrors.confirm_password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Permissions Granted</label>
                  <div className="permissions-checklist-grid">
                    {allAvailablePermissions.map(perm => (
                      <label key={perm} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={() => handlePermissionToggle(perm)}
                        />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-bar">
                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit-primary">Create Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>✏️ Edit Admin User ({editingUser.username})</h2>
              <button className="modal-close-btn" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body-container">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" name="role" placeholder="e.g. Manager, Content Manager..." value={formData.role} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Account Status</label>
                    <CustomSelect
                      name="is_active"
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                      options={[
                        { value: 'true', label: 'Active' },
                        { value: 'false', label: 'Inactive' }
                      ]}
                      width="100%"
                      height="40px"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Old Password <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>(Leave blank to keep current)</span></label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="old_password"
                        placeholder="••••••••"
                        value={formData.old_password || ''}
                        onChange={handleInputChange}
                        autoComplete="current-password"
                        style={{
                          width: '100%',
                          paddingRight: '38px',
                          boxSizing: 'border-box',
                          ...(passwordErrors.old_password ? { borderColor: '#ef4444' } : {})
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          zIndex: 2
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <AppIcon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
                      </button>
                    </div>
                    {passwordErrors.old_password && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                        ⚠ {passwordErrors.old_password}
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="••••••••"
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          paddingRight: '38px',
                          boxSizing: 'border-box',
                          ...(passwordErrors.password ? { borderColor: '#ef4444' } : {})
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          zIndex: 2
                        }}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <AppIcon icon={showConfirmPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
                      </button>
                    </div>
                    {passwordErrors.password && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                        ⚠ {passwordErrors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Permissions Granted</label>
                  <div className="permissions-checklist-grid">
                    {allAvailablePermissions.map(perm => (
                      <label key={perm} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={() => handlePermissionToggle(perm)}
                        />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-bar">
                <button type="button" className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn-submit-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingUser && (
        <div className="admin-modal-backdrop" onClick={() => setViewingUser(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>👁️ Admin User Profile Details</h2>
              <button className="modal-close-btn" onClick={() => setViewingUser(null)}>×</button>
            </div>
            <div className="modal-body-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div className="user-avatar-circle super" style={{ width: '56px', height: '56px', fontSize: '22px' }}>
                  {(viewingUser.name || viewingUser.username || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', color: '#0f172a' }}>{viewingUser.name}</h3>
                  <span className="role-pill super" style={{ fontSize: '12px' }}>{viewingUser.role}</span>
                </div>
              </div>

              <div className="form-grid-2" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Username</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{viewingUser.username}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Email Address</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{viewingUser.email}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Last Login</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{viewingUser.lastLogin || viewingUser.last_login}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Date Created</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{viewingUser.createdAt || viewingUser.created_at}</strong>
                </div>
              </div>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-cancel" onClick={() => setViewingUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="admin-modal-backdrop" onClick={() => setDeletingUser(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header-bar">
              <h2 style={{ color: '#ef4444' }}>🗑️ Delete Admin User?</h2>
              <button className="modal-close-btn" onClick={() => setDeletingUser(null)}>×</button>
            </div>
            <div className="modal-body-container">
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
                Are you sure you want to permanently delete <strong>{deletingUser.name || deletingUser.username}</strong> ({deletingUser.email})?
              </p>
              <p style={{ marginTop: '8px', fontSize: '12.5px', color: '#ef4444', fontWeight: '600' }}>
                ⚠️ This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer-bar">
              <button type="button" className="btn-cancel" onClick={() => setDeletingUser(null)}>Cancel</button>
              <button type="button" className="btn-danger-confirm" onClick={handleDeleteConfirm}>Yes, Delete Admin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
