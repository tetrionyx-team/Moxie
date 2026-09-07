import { useState, useMemo, useEffect } from 'react'
import CustomSelect from '../Common/CustomSelect'
import {
  AppIcon,
  PlusIcon,
  BannerIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  UploadIcon,
} from '../../icons'
import './BannerListPage.css'

const isVideoUrl = (url) => {
  if (!url) return false
  const lower = String(url).toLowerCase()
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.ogv') ||
    lower.includes('/video/') ||
    lower.includes('.mp4?')
  );
}

export default function BannerListPage() {
  const ctx = window.DJANGO_CONTEXT || {}
  const rawList = ctx.resultList || []

  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // ── Dynamic state & Add Banner modal state ───────────────────────────────
  const [dynamicList, setDynamicList] = useState(rawList)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)
  const [fileSizeFormatted, setFileSizeFormatted] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Dynamic Statistics
  const totalBanners = dynamicList.length
  const activeBanners = dynamicList.filter(i => i.isActive).length
  const inactiveBanners = dynamicList.filter(i => !i.isActive).length

  const showToast = (title, msg, isError = false) => {
    const toast = document.getElementById('moxie-toast')
    const titleEl = document.getElementById('moxie-toast-title')
    const msgEl = document.getElementById('moxie-toast-msg')
    const iconEl = document.getElementById('moxie-toast-icon')
    if (!toast) return
    if (titleEl) titleEl.textContent = title
    if (msgEl) msgEl.textContent = msg
    if (iconEl) iconEl.textContent = isError ? '⚠️' : '✅'
    toast.style.borderLeftColor = isError ? '#ef4444' : '#22c55e'
    toast.style.display = 'flex'
    toast.style.opacity = '1'
    clearTimeout(toast._timer)
    toast._timer = setTimeout(() => {
      toast.style.transition = 'opacity 0.4s'
      toast.style.opacity = '0'
      setTimeout(() => { toast.style.display = 'none'; toast.style.opacity = '1' }, 400)
    }, 3000)
  }

  const getCsrfToken = () => {
    if (ctx?.csrfToken) return ctx.csrfToken
    if (window.DJANGO_CONTEXT?.csrfToken) return window.DJANGO_CONTEXT.csrfToken
    const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]')
    if (tokenInput?.value) return tokenInput.value
    const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : ''
  }

  const handleOpenAddModal = () => {
    setShowAddModal(true)
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setFileSizeFormatted('')
    setFormError('')
    setFormSuccess('')
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === '1' || params.get('add') === 'true') {
      handleOpenAddModal()
    }
  }, [])

  const handleFileSelect = (file) => {
    if (!file) return
    setSelectedFile(file)
    setFormError('')

    const bytes = file.size
    if (bytes < 1024 * 1024) {
      setFileSizeFormatted(`${(bytes / 1024).toFixed(0)} KB`)
    } else {
      setFileSizeFormatted(`${(bytes / (1024 * 1024)).toFixed(1)} MB`)
    }

    const previewUrl = URL.createObjectURL(file)
    setFilePreviewUrl(previewUrl)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setFileSizeFormatted('')
  }

  const handleSaveBanner = async () => {
    if (!selectedFile) {
      setFormError('Please select a banner image or video.')
      setFormSuccess('')
      return
    }

    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      const csrfToken = getCsrfToken()
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('is_active', 'true')

      const response = await fetch('/api/banners/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error || data.detail || 'Something went wrong. Please try again.')
        setFormLoading(false)
        return
      }

      const bannerObj = data.banner || data || {}
      const isVideo = bannerObj.media_type === 'video' || (selectedFile && selectedFile.type.startsWith('video/')) || isVideoUrl(bannerObj.image)
      const newBanner = {
        id: bannerObj.id || String(Date.now()),
        title: bannerObj.title || 'Banner Media',
        imageUrl: bannerObj.image || bannerObj.imageUrl || filePreviewUrl,
        mediaType: isVideo ? 'video' : 'image',
        displayOrder: bannerObj.display_order ?? (dynamicList.length + 1),
        isActive: bannerObj.is_active !== undefined ? bannerObj.is_active : true,
      }

      setDynamicList(prev => [newBanner, ...prev])
      setFormSuccess('Banner media uploaded successfully.')
      showToast('Banner Added', 'New banner media has been uploaded successfully.')

      setTimeout(() => {
        setShowAddModal(false)
        setSelectedFile(null)
        setFilePreviewUrl(null)
        setFileSizeFormatted('')
        setFormSuccess('')
      }, 1200)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setFormLoading(false)
    }
  }

  // ── Edit Banner state ──────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null)
  const [editFile, setEditFile] = useState(null)
  const [editFilePreviewUrl, setEditFilePreviewUrl] = useState(null)
  const [editFileSizeFormatted, setEditFileSizeFormatted] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editFormError, setEditFormError] = useState('')
  const [editFormSuccess, setEditFormSuccess] = useState('')
  const [editFormLoading, setEditFormLoading] = useState(false)

  // ── Delete Banner state ────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  const handleOpenEditModal = (item) => {
    setEditTarget(item)
    setEditFile(null)
    setEditFilePreviewUrl(item.imageUrl || null)
    setEditFileSizeFormatted('')
    setEditIsActive(item.isActive !== undefined ? item.isActive : true)
    setEditFormError('')
    setEditFormSuccess('')
  }

  const handleEditFileSelect = (file) => {
    if (!file) return
    setEditFile(file)
    setEditFormError('')

    const bytes = file.size
    if (bytes < 1024 * 1024) {
      setEditFileSizeFormatted(`${(bytes / 1024).toFixed(0)} KB`)
    } else {
      setEditFileSizeFormatted(`${(bytes / (1024 * 1024)).toFixed(1)} MB`)
    }

    const previewUrl = URL.createObjectURL(file)
    setEditFilePreviewUrl(previewUrl)
  }

  const handleSaveEditBanner = async () => {
    if (!editTarget) return

    setEditFormLoading(true)
    setEditFormError('')
    setEditFormSuccess('')

    try {
      const csrfToken = getCsrfToken()
      const formData = new FormData()
      formData.append('is_active', editIsActive ? 'true' : 'false')
      if (editFile) {
        formData.append('image', editFile)
      }

      const response = await fetch(`/api/banners/${editTarget.id}/`, {
        method: 'PATCH',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: formData,
      })

      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        const errorMsg = data.error || data.detail || 'Something went wrong. Please try again.'
        setEditFormError(errorMsg)
        setEditFormLoading(false)
        return
      }

      const updatedBanner = data.banner || data
      setDynamicList(prev => prev.map(b => {
        if (String(b.id) === String(editTarget.id)) {
          return {
            ...b,
            imageUrl: updatedBanner.image || updatedBanner.imageUrl || b.imageUrl,
            isActive: updatedBanner.is_active !== undefined ? updatedBanner.is_active : editIsActive,
          }
        }
        return b
      }))

      setEditFormSuccess('Banner updated successfully.')
      showToast('Banner Updated', 'Banner media updated successfully.')

      setTimeout(() => {
        setEditTarget(null)
        setEditFormSuccess('')
      }, 1200)
    } catch {
      setEditFormError('Network error. Please try again.')
    } finally {
      setEditFormLoading(false)
    }
  }

  // Filtered List
  const filteredList = useMemo(() => {
    return dynamicList.filter(item => {
      let matchesStatus = true
      if (statusFilter === 'active') matchesStatus = item.isActive
      if (statusFilter === 'inactive') matchesStatus = !item.isActive
      return matchesStatus
    })
  }, [dynamicList, statusFilter])

  // Pagination Math
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentItems = filteredList.slice(startIdx, startIdx + itemsPerPage)

  return (
    <div className="banner-list-shell">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="banner-header-row">
        <div className="banner-title-group">
          <h1>Media Banners</h1>
          <p>Manage homepage premium image and video media banners.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn-add-banner"
          title="Upload new banner media"
        >
          <AppIcon icon={PlusIcon} size={16} />
          <span>Add Banner Media</span>
        </button>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────────────────── */}
      <div className="banner-stats-grid">
        {/* Total Banners */}
        <div className="banner-stat-card">
          <div className="stat-icon-box blue">
            <AppIcon icon={BannerIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Banners</span>
            <span className="stat-value">{totalBanners}</span>
            <span className="stat-sub">All media banners</span>
          </div>
        </div>

        {/* Active Banners */}
        <div className="banner-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Banners</span>
            <span className="stat-value">{activeBanners}</span>
            <span className="stat-sub">Currently published</span>
          </div>
        </div>

        {/* Inactive Banners */}
        <div className="banner-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={CancelCircleIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inactive Banners</span>
            <span className="stat-value">{inactiveBanners}</span>
            <span className="stat-sub">Hidden from store</span>
          </div>
        </div>
      </div>

      {/* ── Table Card ────────────────────────────────────────────────────────── */}
      <div className="banner-table-card">
        {/* Filter Bar */}
        <div className="table-filter-bar">
          <div className="banner-list-title" style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            Banner List ({filteredList.length})
          </div>

          <CustomSelect
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' }
            ]}
            height="38px"
            minWidth="145px"
          />
        </div>

        {/* Table */}
        <table className="banner-table">
          <thead>
            <tr>
              <th>BANNER MEDIA</th>
              <th>MEDIA TYPE</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map(item => {
                const isVideo = isVideoUrl(item.imageUrl) || item.mediaType === 'video'
                return (
                  <tr key={item.id}>
                    <td>
                      {item.imageUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '120px', height: '64px',
                            borderRadius: '10px', overflow: 'hidden',
                            background: '#f1f5f9', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isVideo ? (
                              <video
                                src={item.imageUrl}
                                className="banner-thumb"
                                muted
                                loop
                                autoPlay
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <img
                                src={item.imageUrl}
                                alt="Banner"
                                className="banner-thumb"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            Banner #{item.id}
                          </span>
                        </div>
                      ) : (
                        <div className="banner-thumb-placeholder">
                          <AppIcon icon={BannerIcon} size={20} />
                        </div>
                      )}
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '4px 10px', borderRadius: '6px',
                        fontSize: '12px', fontWeight: 700,
                        background: isVideo ? '#f5f3ff' : '#eff6ff',
                        color: isVideo ? '#7c3aed' : '#2563eb',
                      }}>
                        {isVideo ? 'VIDEO' : 'IMAGE'}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${item.isActive ? 'active' : 'inactive'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {/* View Button */}
                        {item.imageUrl ? (
                          <a
                            href={item.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn"
                            title="Preview media"
                            aria-label="Preview media"
                          >
                            <AppIcon icon={ViewIcon} size={15} />
                          </a>
                        ) : null}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="action-btn"
                          title="Edit banner"
                          aria-label="Edit banner"
                        >
                          <AppIcon icon={EditIcon} size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="action-btn delete"
                          title="Delete banner"
                          aria-label="Delete banner"
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
                <td colSpan="4" style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>No banners found.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer & Pagination */}
        <div className="table-footer-bar">
          <span className="footer-info">
            Showing {filteredList.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + itemsPerPage, filteredList.length)} of {filteredList.length} banners
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

      {/* ── Add Banner Modal (Single Media Input Only) ─────────────────────────── */}
      {showAddModal && (
        <div
          onClick={() => { if (!formLoading) setShowAddModal(false) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(30, 41, 59, 0.6)',
            zIndex: 9000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 0',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '480px',
              maxWidth: '94vw',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
          >
            {/* Body */}
            <div style={{ padding: '36px 36px 28px', position: 'relative' }}>

              {/* X Close Button */}
              <button
                type="button"
                onClick={() => { if (!formLoading) setShowAddModal(false) }}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '18px', right: '20px',
                  background: 'none', border: 0,
                  fontSize: '22px', color: '#94a3b8',
                  cursor: 'pointer', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#374151' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8' }}
              >×</button>

              {/* Centered Image Badge */}
              <div style={{
                width: '68px', height: '68px',
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AppIcon icon={BannerIcon} size={34} color="#2563eb" />
              </div>

              {/* Title */}
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '22px', fontWeight: 800,
                color: '#0f172a', textAlign: 'center',
              }}>Upload Banner Media</h3>
              <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#64748b', textAlign: 'center' }}>
                Upload an image or video for the homepage banner.
              </p>

              {/* Field: Banner Media */}
              <div>
                <label
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Banner Media
                </label>

                {!selectedFile ? (
                  <div
                    onClick={() => {
                      const fileInput = document.getElementById('banner-file-input')
                      if (fileInput) fileInput.click()
                    }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileSelect(e.dataTransfer.files[0])
                      }
                    }}
                    style={{
                      border: `1.5px dashed ${formError && !selectedFile ? '#ef4444' : '#cbd5e1'}`,
                      background: formError && !selectedFile ? '#fef2f2' : '#f8fafc',
                      borderRadius: '12px',
                      padding: '28px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      id="banner-file-input"
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0])
                        }
                      }}
                    />
                    <div style={{
                      width: '44px', height: '44px',
                      borderRadius: '50%',
                      background: '#eff6ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 10px',
                    }}>
                      <AppIcon icon={UploadIcon} size={22} color="#2563eb" />
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#334155' }}>
                      <span style={{ color: '#2563eb', fontWeight: 600 }}>Choose Media</span> or drag and drop
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Supports Image (JPG, PNG, WebP) or Video (MP4, WebM)
                    </p>
                  </div>
                ) : (
                  /* Selected File Preview Box */
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#f8fafc', border: '1px solid #cbd5e1',
                    borderRadius: '12px', padding: '12px 14px',
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: '72px', height: '48px',
                      borderRadius: '8px', overflow: 'hidden',
                      background: '#e2e8f0', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedFile.type.startsWith('video/') ? (
                        <video src={filePreviewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={filePreviewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>

                    {/* File Name & Size */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {selectedFile.name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                        {selectedFile.type.startsWith('video/') ? '🎬 Video • ' : '🖼️ Image • '} {fileSizeFormatted}
                      </p>
                    </div>

                    {/* Remove File Button */}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={formLoading}
                      aria-label="Remove file"
                      style={{
                        background: 'none', border: 0,
                        fontSize: '20px', color: '#94a3b8',
                        cursor: 'pointer', lineHeight: 1,
                        padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Error & Success Alerts */}
              {formError && (
                <p style={{ margin: '14px 0 0', fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px' }}>
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p style={{ margin: '14px 0 0', fontSize: '12.5px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px' }}>
                  {formSuccess}
                </p>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 36px', background: '#fff' }}>
              <button
                type="button"
                onClick={() => { if (!formLoading) setShowAddModal(false) }}
                disabled={formLoading}
                style={{
                  height: '44px', padding: '0 24px',
                  background: '#fff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600, fontSize: '14px',
                  color: '#374151', cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBanner}
                disabled={formLoading}
                style={{
                  height: '44px', padding: '0 28px',
                  background: formLoading ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}
                onMouseEnter={e => { if (!formLoading) e.currentTarget.style.background = '#1d4ed8' }}
                onMouseLeave={e => { if (!formLoading) e.currentTarget.style.background = '#2563eb' }}
              >
                {formLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Banner Modal (Media & Status Only) ────────────────────────────── */}
      {editTarget && (
        <div
          onClick={() => { if (!editFormLoading) setEditTarget(null) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(30, 41, 59, 0.6)',
            zIndex: 9000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 0',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '480px',
              maxWidth: '94vw',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
          >
            {/* Body */}
            <div style={{ padding: '36px 36px 28px', position: 'relative' }}>

              {/* X Close Button */}
              <button
                type="button"
                onClick={() => { if (!editFormLoading) setEditTarget(null) }}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '18px', right: '20px',
                  background: 'none', border: 0,
                  fontSize: '22px', color: '#94a3b8',
                  cursor: 'pointer', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#374151' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8' }}
              >×</button>

              {/* Centered Image Badge */}
              <div style={{
                width: '68px', height: '68px',
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AppIcon icon={EditIcon} size={34} color="#2563eb" />
              </div>

              {/* Title */}
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: '22px', fontWeight: 800,
                color: '#0f172a', textAlign: 'center',
              }}>Edit Banner Media</h3>

              {/* Field 1: Banner Media */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Banner Media
                </label>

                {editFilePreviewUrl ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#f8fafc', border: '1px solid #cbd5e1',
                    borderRadius: '12px', padding: '12px 14px',
                  }}>
                    <div style={{
                      width: '72px', height: '48px',
                      borderRadius: '8px', overflow: 'hidden',
                      background: '#e2e8f0', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isVideoUrl(editFilePreviewUrl) ? (
                        <video src={editFilePreviewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={editFilePreviewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {editFile ? editFile.name : 'Current Banner Media'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                        {editFileSizeFormatted || 'Uploaded Media'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const fileInput = document.getElementById('edit-banner-file-input')
                        if (fileInput) fileInput.click()
                      }}
                      style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        color: '#2563eb', fontSize: '12px', fontWeight: 600,
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                      }}
                    >
                      Change
                    </button>
                    <input
                      id="edit-banner-file-input"
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleEditFileSelect(e.target.files[0])
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      const fileInput = document.getElementById('edit-banner-file-input')
                      if (fileInput) fileInput.click()
                    }}
                    style={{
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      id="edit-banner-file-input"
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleEditFileSelect(e.target.files[0])
                        }
                      }}
                    />
                    <p style={{ margin: '0 0 4px', fontSize: '13.5px', color: '#334155' }}>
                      <span style={{ color: '#2563eb', fontWeight: 600 }}>Click to upload</span> media
                    </p>
                  </div>
                )}
              </div>

              {/* Field 2: Status */}
              <div>
                <label
                  htmlFor="edit-modal-banner-status"
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Status
                </label>
                <CustomSelect
                  id="edit-modal-banner-status"
                  value={editIsActive ? 'active' : 'inactive'}
                  onChange={e => setEditIsActive(e.target.value === 'active')}
                  disabled={editFormLoading}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                  width="100%"
                  height="46px"
                />
              </div>

              {/* Error & Success Alerts */}
              {editFormError && (
                <p style={{ margin: '14px 0 0', fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px' }}>
                  {editFormError}
                </p>
              )}
              {editFormSuccess && (
                <p style={{ margin: '14px 0 0', fontSize: '12.5px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px' }}>
                  {editFormSuccess}
                </p>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 36px', background: '#fff' }}>
              <button
                type="button"
                onClick={() => { if (!editFormLoading) setEditTarget(null) }}
                disabled={editFormLoading}
                style={{
                  height: '44px', padding: '0 24px',
                  background: '#fff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600, fontSize: '14px',
                  color: '#374151', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditBanner}
                disabled={editFormLoading}
                style={{
                  height: '44px', padding: '0 28px',
                  background: editFormLoading ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: editFormLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}
              >
                {editFormLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────────── */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '32px 28px', width: '360px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AppIcon icon={DeleteIcon} size={26} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete Banner?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>Banner #{deleteTarget.id}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: '40px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={async () => {
                const target = deleteTarget
                setDeleteTarget(null)
                const csrfToken = getCsrfToken()
                try {
                  const res = await fetch(`/api/banners/${target.id}/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': csrfToken },
                    credentials: 'include',
                  })
                  if (res.ok) {
                    setDynamicList(prev => prev.filter(b => String(b.id) !== String(target.id)))
                    showToast('Banner Deleted', `Banner #${target.id} has been removed.`)
                  } else {
                    await fetch(`/admin/banners/banner/${target.id}/delete/`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrfToken },
                      body: `csrfmiddlewaretoken=${csrfToken}&post=yes`,
                      redirect: 'manual',
                    })
                    setDynamicList(prev => prev.filter(b => String(b.id) !== String(target.id)))
                    showToast('Banner Deleted', `Banner #${target.id} has been removed.`)
                  }
                } catch {
                  showToast('Something went wrong', 'Could not delete the banner. Please try again.', true)
                }
              }} style={{ flex: 1, height: '40px', background: '#ef4444', border: 0, borderRadius: '8px', fontWeight: 700, fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
