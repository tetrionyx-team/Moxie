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
  const [resettingUser, setResettingUser] = useState(null)

  // Add Form State
  const [addFormData, setAddFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'Staff Admin',
    password: '',
    confirm_password: '',
    is_active: true,
    permissions: ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Reviews', 'Messages']
  })
  const [addPasswordErrors, setAddPasswordErrors] = useState({ password: '', confirm_password: '' })
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false)

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: '',
    is_active: true,
    permissions: [],
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [editPasswordErrors, setEditPasswordErrors] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showEditCurrentPw, setShowEditCurrentPw] = useState(false)
  const [showEditNewPw, setShowEditNewPw] = useState(false)
  const [showEditConfirmPw, setShowEditConfirmPw] = useState(false)

  // Super Admin Reset Password State
  const [resetFormData, setResetFormData] = useState({
    new_password: '',
    confirm_password: '',
    admin_password: ''
  })
  const [resetPasswordErrors, setResetPasswordErrors] = useState({ new_password: '', confirm_password: '', admin_password: '' })
  const [showResetNewPw, setShowResetNewPw] = useState(false)
  const [showResetConfirmPw, setShowResetConfirmPw] = useState(false)
  const [showResetAdminPw, setShowResetAdminPw] = useState(false)

  // Global Alert State
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const allAvailablePermissions = [
    'Dashboard', 'Products', 'Categories', 'Orders',
    'Customers', 'Reviews', 'Messages', 'Banners',
    'Offers', 'Payments', 'Admin Users', 'Settings'
  ]

  // Password validation rules
  const validatePasswordRules = (password, confirm) => {
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
        if (data.results) {
          setUsers(data.results)
        } else if (data.admin_users) {
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

  const handleAddInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setAddFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddPermissionToggle = (perm) => {
    setAddFormData(prev => {
      const current = prev.permissions || []
      if (current.includes(perm)) {
        return { ...prev, permissions: current.filter(p => p !== perm) }
      } else {
        return { ...prev, permissions: [...current, perm] }
      }
    })
  }

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleEditPermissionToggle = (perm) => {
    setEditFormData(prev => {
      const current = prev.permissions || []
      if (current.includes(perm)) {
        return { ...prev, permissions: current.filter(p => p !== perm) }
      } else {
        return { ...prev, permissions: [...current, perm] }
      }
    })
  }

  const handleResetInputChange = (e) => {
    const { name, value } = e.target
    setResetFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
    const errs = validatePasswordRules(addFormData.password, addFormData.confirm_password)
    setAddPasswordErrors(errs)
    if (errs.password || errs.confirm_password) return

    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch('/api/admin-users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(addFormData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(`Admin user ${addFormData.name || addFormData.username} created successfully.`)
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
    setEditFormData({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'Staff Admin',
      is_active: u.isActive !== false && u.is_active !== false,
      permissions: u.permissions || ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Reviews', 'Messages'],
      current_password: '',
      new_password: '',
      confirm_password: ''
    })
    setEditPasswordErrors({ current_password: '', new_password: '', confirm_password: '' })
    setShowEditCurrentPw(false)
    setShowEditNewPw(false)
    setShowEditConfirmPw(false)
  }

  // Save Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    const isSelf = editingUser && String(editingUser.id) === String(currentUserId)

    // Password validations if self-change was entered
    if (isSelf && editFormData.new_password) {
      const errs = { current_password: '', new_password: '', confirm_password: '' }
      if (!editFormData.current_password) {
        errs.current_password = 'Current password is required.'
      }
      if (editFormData.new_password.length < 6) {
        errs.new_password = 'Password must be at least 6 characters.'
      }
      if (!editFormData.confirm_password) {
        errs.confirm_password = 'Confirm password is required.'
      } else if (editFormData.new_password !== editFormData.confirm_password) {
        errs.confirm_password = 'New passwords do not match.'
      }

      setEditPasswordErrors(errs)
      if (errs.current_password || errs.new_password || errs.confirm_password) return
    }

    try {
      const csrfToken = ctx.csrfToken || ''
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        is_active: editFormData.is_active,
        permissions: editFormData.permissions,
      }

      if (isSelf && editFormData.new_password) {
        payload.current_password = editFormData.current_password
        payload.new_password = editFormData.new_password
        payload.confirm_password = editFormData.confirm_password
      }

      const res = await fetch(`/api/admin-users/${editingUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(data.message || (isSelf && editFormData.new_password ? 'Password changed successfully.' : 'Admin user updated successfully.'))
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

  // Open Reset Password Modal
  const openResetPasswordModal = (u) => {
    setResettingUser(u)
    setResetFormData({
      new_password: '',
      confirm_password: '',
      admin_password: ''
    })
    setResetPasswordErrors({ new_password: '', confirm_password: '', admin_password: '' })
    setShowResetNewPw(false)
    setShowResetConfirmPw(false)
    setShowResetAdminPw(false)
  }

  // Submit Super Admin Password Reset
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault()
    if (!resettingUser) return

    const errs = { new_password: '', confirm_password: '', admin_password: '' }
    if (!resetFormData.new_password) {
      errs.new_password = 'New password is required.'
    } else if (resetFormData.new_password.length < 6) {
      errs.new_password = 'Password must be at least 6 characters.'
    }

    if (!resetFormData.confirm_password) {
      errs.confirm_password = 'Confirm password is required.'
    } else if (resetFormData.new_password !== resetFormData.confirm_password) {
      errs.confirm_password = 'New passwords do not match.'
    }

    if (!resetFormData.admin_password) {
      errs.admin_password = 'Your Super Admin password is required.'
    }

    setResetPasswordErrors(errs)
    if (errs.new_password || errs.confirm_password || errs.admin_password) return

    try {
      const csrfToken = ctx.csrfToken || ''
      const res = await fetch(`/api/admin-users/${resettingUser.id}/reset-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          new_password: resetFormData.new_password,
          confirm_password: resetFormData.confirm_password,
          admin_password: resetFormData.admin_password,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessMsg(data.message || 'Password reset successfully.')
        setResettingUser(null)
        refreshUsers()
        triggerNotificationRefresh()
      } else {
        setErrorMsg(data.error || 'Failed to reset password.')
      }
    } catch {
      setErrorMsg('Network error resetting password.')
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
            setAddFormData({
              name: '', username: '', email: '', role: 'Staff Admin', password: '', confirm_password: '', is_active: true,
              permissions: ['Dashboard', 'Products', 'Categories', 'Orders', 'Customers', 'Reviews', 'Messages']
            })
            setAddPasswordErrors({ password: '', confirm_password: '' })
            setShowAddPassword(false)
            setShowAddConfirmPassword(false)
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
                  const isCurrent = String(u.id) === String(currentUserId)

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

                          {/* Reset Password Button for Other Users */}
                          {!isCurrent && (
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => openResetPasswordModal(u)}
                              title="Reset User Password"
                              aria-label="Reset User Password"
                              style={{ color: '#6366f1' }}
                            >
                              <AppIcon icon={LockIcon} size={15} />
                            </button>
                          )}

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
                    <input type="text" name="name" placeholder="e.g. Arun Raj" value={addFormData.name} onChange={handleAddInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" name="username" placeholder="e.g. arunraj" value={addFormData.username} onChange={handleAddInputChange} autoComplete="off" required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="arun@moxie.com" value={addFormData.email} onChange={handleAddInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Role Assignment</label>
                    <input type="text" name="role" placeholder="e.g. Staff Admin, Manager..." value={addFormData.role} onChange={handleAddInputChange} required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Password</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showAddPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="••••••••"
                        value={addFormData.password || ''}
                        onChange={handleAddInputChange}
                        autoComplete="new-password"
                        required
                        style={{
                          width: '100%',
                          paddingRight: '38px',
                          boxSizing: 'border-box',
                          ...(addPasswordErrors.password ? { borderColor: '#ef4444' } : {})
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddPassword(!showAddPassword)}
                        className="pw-toggle-btn"
                        aria-label={showAddPassword ? "Hide password" : "Show password"}
                      >
                        <AppIcon icon={showAddPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
                      </button>
                    </div>
                    {addPasswordErrors.password && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                        ⚠ {addPasswordErrors.password}
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showAddConfirmPassword ? 'text' : 'password'}
                        name="confirm_password"
                        placeholder="••••••••"
                        value={addFormData.confirm_password || ''}
                        onChange={handleAddInputChange}
                        autoComplete="new-password"
                        required
                        style={{
                          width: '100%',
                          paddingRight: '38px',
                          boxSizing: 'border-box',
                          ...(addPasswordErrors.confirm_password ? { borderColor: '#ef4444' } : {})
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddConfirmPassword(!showAddConfirmPassword)}
                        className="pw-toggle-btn"
                        aria-label={showAddConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <AppIcon icon={showAddConfirmPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
                      </button>
                    </div>
                    {addPasswordErrors.confirm_password && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                        ⚠ {addPasswordErrors.confirm_password}
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
                          checked={addFormData.permissions.includes(perm)}
                          onChange={() => handleAddPermissionToggle(perm)}
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
            <form onSubmit={handleEditSubmit} autoComplete="off">
              <div className="modal-body-container">
                {/* 1. Normal Admin Edit Fields */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Role</label>
                    <input
                      type="text"
                      name="role"
                      placeholder="e.g. Staff Admin, Catalog Manager..."
                      value={editFormData.role}
                      onChange={handleEditInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Account Status</label>
                    <CustomSelect
                      name="is_active"
                      value={editFormData.is_active ? 'true' : 'false'}
                      onChange={e => setEditFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                      options={[
                        { value: 'true', label: 'Active' },
                        { value: 'false', label: 'Inactive' }
                      ]}
                      width="100%"
                      height="40px"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Permissions Granted</label>
                  <div className="permissions-checklist-grid">
                    {allAvailablePermissions.map(perm => (
                      <label key={perm} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={editFormData.permissions.includes(perm)}
                          onChange={() => handleEditPermissionToggle(perm)}
                        />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. Separate Change Password Section */}
                <div className="change-password-section" style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '750', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.02em' }}>
                      <AppIcon icon={LockIcon} size={16} />
                      <span>CHANGE PASSWORD</span>
                    </h3>
                    {String(editingUser.id) === String(currentUserId) && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Leave blank to keep current password</span>
                    )}
                  </div>

                  {String(editingUser.id) === String(currentUserId) ? (
                    // Self password change flow
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="form-group">
                        <label>Current Password</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input
                            type={showEditCurrentPw ? 'text' : 'password'}
                            name="current_password"
                            placeholder="Enter your current password"
                            value={editFormData.current_password}
                            onChange={handleEditInputChange}
                            autoComplete="current-password"
                            style={{
                              width: '100%',
                              paddingRight: '38px',
                              boxSizing: 'border-box',
                              ...(editPasswordErrors.current_password ? { borderColor: '#ef4444' } : {})
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditCurrentPw(!showEditCurrentPw)}
                            className="pw-toggle-btn"
                            aria-label={showEditCurrentPw ? "Hide current password" : "Show current password"}
                          >
                            <AppIcon icon={showEditCurrentPw ? ViewOffSlashIcon : ViewIcon} size={18} />
                          </button>
                        </div>
                        {editPasswordErrors.current_password && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                            ⚠ {editPasswordErrors.current_password}
                          </p>
                        )}
                      </div>

                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>New Password</label>
                          <div style={{ position: 'relative', width: '100%' }}>
                            <input
                              type={showEditNewPw ? 'text' : 'password'}
                              name="new_password"
                              placeholder="Enter new password"
                              value={editFormData.new_password}
                              onChange={handleEditInputChange}
                              autoComplete="new-password"
                              style={{
                                width: '100%',
                                paddingRight: '38px',
                                boxSizing: 'border-box',
                                ...(editPasswordErrors.new_password ? { borderColor: '#ef4444' } : {})
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditNewPw(!showEditNewPw)}
                              className="pw-toggle-btn"
                              aria-label={showEditNewPw ? "Hide new password" : "Show new password"}
                            >
                              <AppIcon icon={showEditNewPw ? ViewOffSlashIcon : ViewIcon} size={18} />
                            </button>
                          </div>
                          {editPasswordErrors.new_password && (
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                              ⚠ {editPasswordErrors.new_password}
                            </p>
                          )}
                        </div>

                        <div className="form-group">
                          <label>Confirm New Password</label>
                          <div style={{ position: 'relative', width: '100%' }}>
                            <input
                              type={showEditConfirmPw ? 'text' : 'password'}
                              name="confirm_password"
                              placeholder="Confirm new password"
                              value={editFormData.confirm_password}
                              onChange={handleEditInputChange}
                              autoComplete="new-password"
                              style={{
                                width: '100%',
                                paddingRight: '38px',
                                boxSizing: 'border-box',
                                ...(editPasswordErrors.confirm_password ? { borderColor: '#ef4444' } : {})
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditConfirmPw(!showEditConfirmPw)}
                              className="pw-toggle-btn"
                              aria-label={showEditConfirmPw ? "Hide confirm password" : "Show confirm password"}
                            >
                              <AppIcon icon={showEditConfirmPw ? ViewOffSlashIcon : ViewIcon} size={18} />
                            </button>
                          </div>
                          {editPasswordErrors.confirm_password && (
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                              ⚠ {editPasswordErrors.confirm_password}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Super Admin editing another admin
                    <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                          Administrator Password
                        </p>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                          Target user's password cannot be viewed. Use the secure Super Admin reset tool to assign a new password.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const target = editingUser
                          setEditingUser(null)
                          openResetPasswordModal(target)
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#4338ca',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <AppIcon icon={LockIcon} size={15} />
                        <span>Reset Password</span>
                      </button>
                    </div>
                  )}
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

      {/* RESET PASSWORD MODAL FOR SUPER ADMIN */}
      {resettingUser && (
        <div className="admin-modal-backdrop" onClick={() => setResettingUser(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header-bar">
              <h2>🔑 Reset Password ({resettingUser.username})</h2>
              <button className="modal-close-btn" onClick={() => setResettingUser(null)}>×</button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} autoComplete="off">
              <div className="modal-body-container">
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12.5px', color: '#1e40af', lineHeight: '1.45' }}>
                  🔒 <strong>Super Admin Authorization:</strong> You are resetting the login password for <strong>{resettingUser.name || resettingUser.username}</strong> ({resettingUser.email}).
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>New Password</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showResetNewPw ? 'text' : 'password'}
                      name="new_password"
                      placeholder="Enter new password"
                      value={resetFormData.new_password}
                      onChange={handleResetInputChange}
                      autoComplete="new-password"
                      required
                      style={{
                        width: '100%',
                        paddingRight: '38px',
                        boxSizing: 'border-box',
                        ...(resetPasswordErrors.new_password ? { borderColor: '#ef4444' } : {})
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPw(!showResetNewPw)}
                      className="pw-toggle-btn"
                      aria-label={showResetNewPw ? "Hide new password" : "Show new password"}
                    >
                      <AppIcon icon={showResetNewPw ? ViewOffSlashIcon : ViewIcon} size={18} />
                    </button>
                  </div>
                  {resetPasswordErrors.new_password && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                      ⚠ {resetPasswordErrors.new_password}
                    </p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Confirm New Password</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showResetConfirmPw ? 'text' : 'password'}
                      name="confirm_password"
                      placeholder="Confirm new password"
                      value={resetFormData.confirm_password}
                      onChange={handleResetInputChange}
                      autoComplete="new-password"
                      required
                      style={{
                        width: '100%',
                        paddingRight: '38px',
                        boxSizing: 'border-box',
                        ...(resetPasswordErrors.confirm_password ? { borderColor: '#ef4444' } : {})
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPw(!showResetConfirmPw)}
                      className="pw-toggle-btn"
                      aria-label={showResetConfirmPw ? "Hide confirm password" : "Show confirm password"}
                    >
                      <AppIcon icon={showResetConfirmPw ? ViewOffSlashIcon : ViewIcon} size={18} />
                    </button>
                  </div>
                  {resetPasswordErrors.confirm_password && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                      ⚠ {resetPasswordErrors.confirm_password}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label>Your Super Admin Password <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>(Identity Verification)</span></label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showResetAdminPw ? 'text' : 'password'}
                      name="admin_password"
                      placeholder="Enter your current Super Admin password"
                      value={resetFormData.admin_password}
                      onChange={handleResetInputChange}
                      autoComplete="current-password"
                      required
                      style={{
                        width: '100%',
                        paddingRight: '38px',
                        boxSizing: 'border-box',
                        ...(resetPasswordErrors.admin_password ? { borderColor: '#ef4444' } : {})
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetAdminPw(!showResetAdminPw)}
                      className="pw-toggle-btn"
                      aria-label={showResetAdminPw ? "Hide admin password" : "Show admin password"}
                    >
                      <AppIcon icon={showResetAdminPw ? ViewOffSlashIcon : ViewIcon} size={18} />
                    </button>
                  </div>
                  {resetPasswordErrors.admin_password && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                      ⚠ {resetPasswordErrors.admin_password}
                    </p>
                  )}
                </div>
              </div>

              <div className="modal-footer-bar">
                <button type="button" className="btn-cancel" onClick={() => setResettingUser(null)}>Cancel</button>
                <button type="submit" className="btn-submit-primary" style={{ background: '#4338ca' }}>Reset Password</button>
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
