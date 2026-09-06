import { useState, useMemo, useEffect } from 'react'
import CustomSelect from '../Common/CustomSelect'
import {
  AppIcon,
  PlusIcon,
  BannerIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  ExternalLinkIcon,
  SearchIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  UploadIcon,
} from '../../icons'
import './BannerListPage.css'

const POSITIONS = [

  'Home - Main Slider',
  'Home - Slider 2',
  'Home - Slider 3',
  'Home - Banner Section',
  'Home - Bottom Banner',
]

const isVideoUrl = (url) => {
  if (!url) return false
  const lower = String(url).toLowerCase()
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.includes('/video/') || lower.includes('.mp4?')
}


export default function BannerListPage() {
  const ctx = window.DJANGO_CONTEXT || {}
  const rawList = ctx.resultList || []

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // ── Dynamic state & Add Banner modal state ───────────────────────────────
  const [dynamicList, setDynamicList] = useState(rawList)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)
  const [fileSizeFormatted, setFileSizeFormatted] = useState('')
  const [buttonName, setButtonName] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Dynamic Statistics
  const totalBanners = dynamicList.length
  const activeBanners = dynamicList.filter(i => i.isActive).length
  const inactiveBanners = dynamicList.filter(i => !i.isActive).length
  const totalClicksCount = dynamicList.reduce((acc, item) => acc + (parseInt(item.clickCount ?? item.click_count ?? 0, 10) || 0), 0)
  const totalClicks = totalClicksCount.toLocaleString('en-IN')

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

  const handleOpenAddModal = () => {
    setShowAddModal(true)
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setFileSizeFormatted('')
    setButtonName('')
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

    const bName = buttonName.trim()
    if (!bName) {
      setFormError('Please enter button name.')
      setFormSuccess('')
      return
    }

    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      const csrfToken = ctx.csrfToken || ''
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('button_text', bName)
      formData.append('button_name', bName)
      formData.append('title', bName)

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
        setFormError(data.error || 'Something went wrong. Please try again.')
        setFormLoading(false)
        return
      }

      const bannerObj = data.banner || data || {}
      const newBanner = {
        id: bannerObj.id || String(Date.now()),
        title: bannerObj.title || bName,
        subtitle: bannerObj.subtitle || 'Website slider banner',
        imageUrl: bannerObj.image || bannerObj.imageUrl || filePreviewUrl,
        buttonText: bannerObj.button_text || bannerObj.buttonText || bName,
        buttonLink: bannerObj.button_link || bannerObj.buttonLink || '/products/watches',
        displayOrder: bannerObj.display_order ?? bannerObj.displayOrder ?? (dynamicList.length + 1),
        clickCount: 0,
        isActive: bannerObj.is_active !== undefined ? bannerObj.is_active : (bannerObj.isActive !== undefined ? bannerObj.isActive : true),
      }

      setDynamicList(prev => [newBanner, ...prev])
      setFormSuccess('Banner added successfully.')
      showToast('Banner Added', 'New banner has been added successfully.')

      setTimeout(() => {
        setShowAddModal(false)
        setSelectedFile(null)
        setFilePreviewUrl(null)
        setFileSizeFormatted('')
        setButtonName('')
        setFormSuccess('')
      }, 1500)
    } finally {
      setFormLoading(false)
    }
  }

  // ── Edit Banner state ──────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null)
  const [editFile, setEditFile] = useState(null)
  const [editFilePreviewUrl, setEditFilePreviewUrl] = useState(null)
  const [editFileSizeFormatted, setEditFileSizeFormatted] = useState('')
  const [editButtonName, setEditButtonName] = useState('')
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
    setEditButtonName(item.buttonText || item.title || '')
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

  const getCsrfToken = () => {
    if (ctx?.csrfToken) return ctx.csrfToken
    if (window.DJANGO_CONTEXT?.csrfToken) return window.DJANGO_CONTEXT.csrfToken
    const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]')
    if (tokenInput?.value) return tokenInput.value
    const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : ''
  }

  const handleSaveEditBanner = async () => {
    if (!editTarget) return
    const bName = editButtonName.trim()
    if (!bName) {
      setEditFormError('Please enter button name.')
      setEditFormSuccess('')
      return
    }

    setEditFormLoading(true)
    setEditFormError('')
    setEditFormSuccess('')

    try {
      const csrfToken = getCsrfToken()
      const formData = new FormData()
      formData.append('button_text', bName)
      formData.append('button_name', bName)
      formData.append('title', bName)
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
        const errorMsg = data.error || data.detail || (typeof data === 'object' && Object.values(data).flat().join(' ')) || 'Something went wrong. Please try again.'
        setEditFormError(errorMsg)
        setEditFormLoading(false)
        return
      }

      const updatedBanner = data.banner || data
      setDynamicList(prev => prev.map(b => {
        if (String(b.id) === String(editTarget.id)) {
          return {
            ...b,
            title: updatedBanner.title || bName,
            imageUrl: updatedBanner.image || updatedBanner.imageUrl || b.imageUrl,
            buttonText: updatedBanner.button_text || updatedBanner.buttonText || bName,
            isActive: updatedBanner.is_active !== undefined ? updatedBanner.is_active : (updatedBanner.isActive !== undefined ? updatedBanner.isActive : editIsActive),
          }
        }
        return b
      }))

      setEditFormSuccess('Banner updated successfully.')
      showToast('Banner Updated', 'Banner details updated successfully.')

      setTimeout(() => {
        setEditTarget(null)
        setEditFormSuccess('')
      }, 1500)
    } catch {
      setEditFormError('Network error. Please check your connection and try again.')
    } finally {
      setEditFormLoading(false)
    }
  }

  // Process banner items with display positions and real click counts
  const enrichedList = useMemo(() => {
    return dynamicList.map((item, idx) => {
      const position = POSITIONS[idx % POSITIONS.length]
      const clicks = parseInt(item.clickCount ?? item.click_count ?? 0, 10) || 0
      return {
        ...item,
        position: item.buttonText ? `Home - ${item.buttonText}` : position,
        clicks: Math.max(0, clicks),
      }
    })
  }, [dynamicList])

  // Filtered List
  const filteredList = useMemo(() => {
    return enrichedList.filter(item => {
      const matchesSearch = !searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase().trim()) || item.subtitle.toLowerCase().includes(searchTerm.toLowerCase().trim())
      let matchesStatus = true
      if (statusFilter === 'active') matchesStatus = item.isActive
      if (statusFilter === 'inactive') matchesStatus = !item.isActive

      return matchesSearch && matchesStatus
    })
  }, [enrichedList, searchTerm, statusFilter])

  // Pagination Math
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentItems = filteredList.slice(startIdx, startIdx + itemsPerPage)

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="banner-list-shell">
      {/* Header Row */}
      <div className="banner-header-row">
        <div className="banner-title-group">
          <h1>Banner Management</h1>
          <p>Manage website banners and sliders</p>
        </div>
        <button
          type="button"
          className="btn-add-banner"
          onClick={handleOpenAddModal}
        >
          <AppIcon icon={PlusIcon} size={16} />
          <span>Add Banner</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="banner-stats-grid">
        {/* Total Banners */}
        <div className="banner-stat-card">
          <div className="stat-icon-box blue">
            <AppIcon icon={BannerIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Banners</span>
            <span className="stat-value">{totalBanners}</span>
            <span className="stat-sub">All banners</span>
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
            <span className="stat-sub">Currently active</span>
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
            <span className="stat-sub">Currently inactive</span>
          </div>
        </div>

        {/* Total Clicks */}
        <div className="banner-stat-card">
          <div className="stat-icon-box indigo">
            <AppIcon icon={ExternalLinkIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Clicks</span>
            <span className="stat-value">{totalClicks}</span>
            <span className="stat-sub">This month</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="banner-table-card">
        {/* Table Filter Bar */}
        <div className="table-filter-bar">
          <div className="banner-search-box">
            <span className="banner-search-icon">
              <AppIcon icon={SearchIcon} size={16} />
            </span>
            <input
              type="text"
              placeholder="Search banner title..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="banner-search-input"
            />
          </div>

          <CustomSelect
            value={statusFilter}
            onChange={handleFilterChange}
            options={[
              { value: 'all', label: 'All Statuses' },
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
              <th>BANNER</th>
              <th>TITLE</th>
              <th>POSITION</th>
              <th>STATUS</th>
              <th>CLICK COUNT</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map(item => (
                <tr key={item.id}>
                  <td>
                    {item.imageUrl ? (
                      isVideoUrl(item.imageUrl) ? (
                        <video
                          src={item.imageUrl}
                          className="banner-thumb"
                          muted
                          loop
                          autoPlay
                          playsInline
                          style={{ objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : (
                        <img
                          src={item.imageUrl}
                          alt={item.title || 'Banner'}
                          className="banner-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      )
                    ) : (
                      <div className="banner-thumb-placeholder">
                        <AppIcon icon={BannerIcon} size={20} />
                      </div>
                    )}
                  </td>

                  <td>
                    <div className="title-cell">
                      <span className="main-title">{item.title || 'Untitled Banner'}</span>
                      <span className="sub-text">{item.subtitle || 'Website slider banner'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="position-text">{item.position}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${item.isActive ? 'active' : 'inactive'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className="clicks-text">{item.clicks.toLocaleString('en-IN')}</span>
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
                          title="Preview banner image"
                        >
                          <AppIcon icon={ViewIcon} size={15} />
                        </a>
                      ) : (
                        <span className="action-btn" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                          <AppIcon icon={ViewIcon} size={15} />
                        </span>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="action-btn"
                        title="Edit banner"
                      >
                        <AppIcon icon={EditIcon} size={15} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="action-btn delete"
                        title="Delete banner"
                      >
                        <AppIcon icon={DeleteIcon} size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No banners found.
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

      {/* ── Add Banner Modal ─────────────────────────────────────────────────── */}
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
                margin: '0 0 24px 0',
                fontSize: '22px', fontWeight: 800,
                color: '#0f172a', textAlign: 'center',
              }}>Add Banner</h3>

              {/* Field 1: Banner Image / Video */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Banner Image / Video
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
                      padding: '24px 16px',
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
                    <p style={{ margin: '0 0 4px', fontSize: '13.5px', color: '#334155' }}>
                      <span style={{ color: '#2563eb', fontWeight: 600 }}>Click to upload</span> or drag and drop
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Supports image or video files
                    </p>
                  </div>
                ) : (
                  /* Selected File Preview Box */
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#f8fafc', border: '1px solid #cbd5e1',
                    borderRadius: '12px', padding: '10px 14px',
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: '54px', height: '40px',
                      borderRadius: '6px', overflow: 'hidden',
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
                        {fileSizeFormatted}
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
                        fontSize: '18px', color: '#94a3b8',
                        cursor: 'pointer', lineHeight: 1,
                        padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Field 2: Button Name Input */}
              <div>
                <label
                  htmlFor="modal-banner-button-name"
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Button Name
                </label>
                <input
                  id="modal-banner-button-name"
                  type="text"
                  placeholder="Enter button name"
                  value={buttonName}
                  onChange={e => {
                    setButtonName(e.target.value)
                    setFormError('')
                    setFormSuccess('')
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveBanner() }}
                  disabled={formLoading}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    border: `1.5px solid ${formError && !buttonName.trim() ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { if (!formError) { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' } }}
                  onBlur={e => { if (!formError) { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' } }}
                />
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

      {/* ── Edit Banner Modal ─────────────────────────────────────────────────── */}
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
              }}>Edit Banner</h3>

              {/* Field 1: Banner Image / Video */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Banner Image / Video
                </label>

                {editFilePreviewUrl ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#f8fafc', border: '1px solid #cbd5e1',
                    borderRadius: '12px', padding: '10px 14px',
                  }}>
                    <div style={{
                      width: '60px', height: '42px',
                      borderRadius: '6px', overflow: 'hidden',
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
                        {editFileSizeFormatted || 'Uploaded'}
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

              {/* Field 2: Button Name Input */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="edit-modal-banner-button-name"
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Button Name
                </label>
                <input
                  id="edit-modal-banner-button-name"
                  type="text"
                  placeholder="Enter button name"
                  value={editButtonName}
                  onChange={e => {
                    setEditButtonName(e.target.value)
                    setEditFormError('')
                    setEditFormSuccess('')
                  }}
                  disabled={editFormLoading}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    border: `1.5px solid ${editFormError ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Field 3: Status */}
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
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{deleteTarget.title || deleteTarget.buttonText || 'this banner'}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: '40px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={async () => {
                const target = deleteTarget
                setDeleteTarget(null)
                const csrfToken = ctx.csrfToken || ''
                try {
                  const res = await fetch(`/api/banners/${target.id}/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': csrfToken },
                    credentials: 'include',
                  })
                  if (res.ok) {
                    setDynamicList(prev => prev.filter(b => String(b.id) !== String(target.id)))
                    showToast('Banner Deleted', `"${target.title || target.buttonText || 'Banner'}" has been removed.`)
                  } else {
                    await fetch(`/admin/banners/banner/${target.id}/delete/`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrfToken },
                      body: `csrfmiddlewaretoken=${csrfToken}&post=yes`,
                      redirect: 'manual',
                    })
                    setDynamicList(prev => prev.filter(b => String(b.id) !== String(target.id)))
                    showToast('Banner Deleted', `"${target.title || target.buttonText || 'Banner'}" has been removed.`)
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
