import { useState, useMemo } from 'react'
import CustomSelect from '../Common/CustomSelect'
import {
  AppIcon,
  StarIcon,
  ClockIcon,
  CheckmarkCircle01Icon,
  SearchIcon,
  ViewIcon,
  DeleteIcon,
  CancelIcon,
} from '../../icons'
import './ReviewListPage.css'

export default function ReviewListPage() {
  const ctx = window.DJANGO_CONTEXT || {}
  const rawList = ctx.resultList || []
  const productsList = ctx.productsList || []

  const [dynamicList, setDynamicList] = useState(rawList)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const [viewTarget, setViewTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Dynamic Metrics
  const totalReviews = dynamicList.length
  const pendingReviews = dynamicList.filter(i => (i.status || '').toLowerCase() === 'pending').length
  const approvedReviews = dynamicList.filter(i => (i.status || '').toLowerCase() === 'approved').length
  const avgRating = dynamicList.length > 0
    ? (dynamicList.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / dynamicList.length).toFixed(1)
    : '5.0'

  // Filtered List
  const filteredList = useMemo(() => {
    return dynamicList.filter(item => {
      const matchesSearch =
        !searchTerm ||
        (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (item.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (item.comment || '').toLowerCase().includes(searchTerm.toLowerCase().trim())

      let matchesRating = true
      if (ratingFilter !== 'all') {
        matchesRating = Math.floor(Number(item.rating)) === parseInt(ratingFilter)
      }

      let matchesStatus = true
      if (statusFilter !== 'all') {
        matchesStatus = item.status === statusFilter
      }

      let matchesProduct = true
      if (productFilter !== 'all') {
        matchesProduct = String(item.productId) === String(productFilter)
      }

      return matchesSearch && matchesRating && matchesStatus && matchesProduct
    })
  }, [dynamicList, searchTerm, ratingFilter, statusFilter, productFilter])

  // Pagination Math
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentItems = filteredList.slice(startIdx, startIdx + itemsPerPage)

  const renderStars = (rating) => {
    const num = Math.round(Number(rating) || 5)
    return '★'.repeat(num) + '☆'.repeat(Math.max(0, 5 - num))
  }

  const showToast = (title, msg, isError = false) => {
    const toast = document.getElementById('moxie-toast')
    const tTitle = document.getElementById('moxie-toast-title')
    const tMsg = document.getElementById('moxie-toast-msg')
    const tIcon = document.getElementById('moxie-toast-icon')
    if (toast && tTitle && tMsg) {
      toast.style.borderLeftColor = isError ? '#ef4444' : '#22c55e'
      if (tIcon) tIcon.textContent = isError ? '⚠️' : '✅'
      tTitle.textContent = title
      tMsg.textContent = msg
      toast.style.display = 'flex'
      setTimeout(() => { toast.style.display = 'none' }, 4000)
    }
  }

  const handleStatusChange = async (reviewId, newStatus) => {
    const csrfToken = ctx.csrfToken || ''

    setDynamicList(prev =>
      prev.map(r => (String(r.id) === String(reviewId) ? { ...r, status: newStatus } : r))
    )

    if (viewTarget && String(viewTarget.id) === String(reviewId)) {
      setViewTarget(prev => ({ ...prev, status: newStatus }))
    }

    try {
      const res = await fetch(`/api/reviews/${reviewId}/`, {
        method: 'PATCH',
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        showToast('Status Updated', `Review status changed to ${newStatus}.`)
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications()
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'))
        }
      } else {
        showToast('Error', 'Failed to update review status.', true)
      }
    } catch {
      showToast('Error', 'Network error. Please try again.', true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const target = deleteTarget
    const csrfToken = ctx.csrfToken || ''

    try {
      const res = await fetch(`/api/reviews/${target.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast('Error', data.error || 'Failed to delete review.', true)
        setIsDeleting(false)
        setDeleteTarget(null)
        return
      }

      setDynamicList(prev => prev.filter(r => String(r.id) !== String(target.id)))
      showToast('Deleted', 'Review deleted successfully.')
      if (typeof window.refreshAdminNotifications === 'function') {
        window.refreshAdminNotifications()
      } else {
        window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'))
      }
      setIsDeleting(false)
      setDeleteTarget(null)
      if (viewTarget && viewTarget.id === target.id) {
        setViewTarget(null)
      }
    } catch {
      showToast('Error', 'Network error. Please try again.', true)
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const rowStatusOptions = [
    {
      value: 'Approved',
      label: 'Approved',
      dotColor: '#16a34a',
      color: '#15803d',
      bg: '#ecfdf5',
      border: '1.5px solid #a7f3d0'
    },
    {
      value: 'Pending',
      label: 'Pending',
      dotColor: '#f59e0b',
      color: '#b45309',
      bg: '#fffbeb',
      border: '1.5px solid #fde68a'
    },
    {
      value: 'Rejected',
      label: 'Not Approved',
      dotColor: '#ef4444',
      color: '#b91c1c',
      bg: '#fef2f2',
      border: '1.5px solid #fca5a5'
    }
  ]

  return (
    <div className="review-list-shell">
      {/* Header Row */}
      <div className="review-header-row">
        <div className="review-title-group">
          <h1>Reviews Management</h1>
          <p>Manage product reviews and ratings</p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="review-stats-grid">
        {/* Total Reviews */}
        <div className="review-stat-card">
          <div className="stat-icon-box amber">
            <AppIcon icon={StarIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Reviews</span>
            <span className="stat-value">{totalReviews.toLocaleString('en-IN')}</span>
            <span className="stat-sub">All reviews</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="review-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={ClockIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending Reviews</span>
            <span className="stat-value">{pendingReviews.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Awaiting approval</span>
          </div>
        </div>

        {/* Approved Reviews */}
        <div className="review-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Approved Reviews</span>
            <span className="stat-value">{approvedReviews.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Published reviews</span>
          </div>
        </div>

        {/* Average Rating */}
        <div className="review-stat-card">
          <div className="stat-icon-box star">
            <AppIcon icon={StarIcon} size={22} color="#f59e0b" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Average Rating</span>
            <span className="stat-value">{avgRating}</span>
            <span className="stat-sub">Overall rating</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="review-table-card">
        {/* Table Filter Bar */}
        <div className="table-filter-bar">
          <div className="review-search-box">
            <span className="review-search-icon">
              <AppIcon icon={SearchIcon} size={16} />
            </span>
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="review-search-input"
            />
          </div>

          <CustomSelect
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Ratings' },
              { value: '5', label: '5 Stars (★★★★★)' },
              { value: '4', label: '4 Stars (★★★★☆)' },
              { value: '3', label: '3 Stars (★★★☆☆)' },
              { value: '2', label: '2 Stars (★★☆☆☆)' },
              { value: '1', label: '1 Star (★☆☆☆☆)' }
            ]}
            height="42px"
            width="100%"
          />

          <CustomSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'Approved', label: 'Approved', dotColor: '#16a34a' },
              { value: 'Pending', label: 'Pending', dotColor: '#f59e0b' },
              { value: 'Rejected', label: 'Not Approved', dotColor: '#ef4444' }
            ]}
            height="42px"
            width="100%"
          />

          <CustomSelect
            value={productFilter}
            onChange={(e) => { setProductFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Products' },
              ...productsList.map(p => ({ value: p.id, label: p.name }))
            ]}
            height="42px"
            width="100%"
          />
        </div>

        {/* Table */}
        <div className="review-table-wrapper">
          <table className="review-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>PRODUCT</th>
                <th>RATING</th>
                <th>COMMENT</th>
                <th style={{ textAlign: 'center' }}>STATUS</th>
                <th style={{ textAlign: 'center' }}>DATE</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar">
                          {(item.customerName || 'C')[0].toUpperCase ? (item.customerName || 'C')[0].toUpperCase() : 'C'}
                        </div>
                        <div className="customer-info">
                          <span className="customer-name">{item.customerName}</span>
                          <span className="customer-email">{item.customerEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="product-name-text">{item.productName}</span>
                    </td>
                    <td>
                      <span className="star-rating-row">{renderStars(item.rating)}</span>
                    </td>
                    <td>
                      <span className="comment-text">{item.comment}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <CustomSelect
                          value={item.status || 'Approved'}
                          onChange={(e, val) => handleStatusChange(item.id, val || e.target.value)}
                          options={rowStatusOptions}
                          height="32px"
                          width="154px"
                          minWidth="154px"
                          buttonStyle={{
                            height: '32px',
                            borderRadius: '8px',
                            padding: '0 8px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          menuStyle={{
                            minWidth: '154px'
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{item.dateStr}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="actions-cell">
                        {/* View Button (Eye Icon) */}
                        <button
                          type="button"
                          onClick={() => setViewTarget(item)}
                          className="action-btn"
                          title="View review details"
                          aria-label="View review details"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <AppIcon icon={ViewIcon} size={15} />
                        </button>

                        {/* Delete Button (Trash Icon) */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="action-btn delete"
                          title="Delete review"
                          aria-label="Delete review"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <AppIcon icon={DeleteIcon} size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="review-empty-state-cell">
                    <div className="review-empty-state">
                      <p>No reviews found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="table-footer-bar">
          <span className="footer-info">
            Showing {filteredList.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + itemsPerPage, filteredList.length)} of {filteredList.length} reviews
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

      {/* VIEW REVIEW MODAL */}
      {viewTarget && (
        <div onClick={() => setViewTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', width: '440px', maxWidth: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fffbe6', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon icon={StarIcon} size={20} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Review Details</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Submitted on {viewTarget.dateStr}</span>
                </div>
              </div>
              <button type="button" onClick={() => setViewTarget(null)} aria-label="Close modal" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                <AppIcon icon={CancelIcon} size={20} />
              </button>
            </div>

            {/* Customer Info Card */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6657ec', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                {(viewTarget.customerName || 'C')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewTarget.customerName}</div>
                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewTarget.customerEmail}</div>
              </div>
              <span className={`status-pill ${viewTarget.status ? viewTarget.status.toLowerCase() : 'approved'}`} style={{ textTransform: 'capitalize' }}>
                {viewTarget.status || 'Approved'}
              </span>
            </div>

            {/* Product Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>PRODUCT</label>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{viewTarget.productName}</div>
            </div>

            {/* Rating Stars */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>STAR RATING</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#eab308', fontSize: '18px', letterSpacing: '2px' }}>{renderStars(viewTarget.rating)}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{viewTarget.rating} / 5</span>
              </div>
            </div>

            {/* Review Comment */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '6px' }}>CUSTOMER COMMENT</label>
              <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#334155', lineHeight: 1.6, maxHeight: '140px', overflowY: 'auto' }}>
                "{viewTarget.comment || 'No comment provided.'}"
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              {viewTarget.status === 'Approved' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange(viewTarget.id, 'Rejected')}
                  style={{ height: '38px', padding: '0 16px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  ✕ Not Approve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStatusChange(viewTarget.id, 'Approved')}
                  style={{ height: '38px', padding: '0 16px', background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  ✓ Approve Review
                </button>
              )}
              <button type="button" onClick={() => setViewTarget(null)} style={{ height: '38px', padding: '0 20px', background: '#6657ec', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '32px 28px', width: '380px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AppIcon icon={DeleteIcon} size={26} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete Review?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Are you sure you want to delete this review by <strong style={{ color: '#0f172a' }}>{deleteTarget.customerName || 'this customer'}</strong> for <strong style={{ color: '#0f172a' }}>{deleteTarget.productName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} style={{ flex: 1, height: '40px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleDeleteConfirm} disabled={isDeleting} style={{ flex: 1, height: '40px', background: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#fff', cursor: 'pointer', opacity: isDeleting ? 0.7 : 1 }}>
                {isDeleting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

