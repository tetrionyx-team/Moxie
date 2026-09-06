import { useState, useMemo, useEffect } from 'react'
import CustomSelect from '../Common/CustomSelect'
import {
  AppIcon,
  PlusIcon,
  CategoryAdminIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  FolderIcon,
  SearchIcon,
  EditIcon,
  DeleteIcon,
  CancelIcon,
  ShoppingBagIcon,
  TagIcon,
  SparklesIcon,
  StarIcon,
} from '../../icons'
import './CategoryListPage.css'

const CATEGORY_AVATARS = {
  watches: { bg: '#e0f2fe', color: '#0284c7', icon: SparklesIcon },
  shoes: { bg: '#f0fdf4', color: '#16a34a', icon: ShoppingBagIcon },
  'air-buds': { bg: '#f1f5f9', color: '#475569', icon: CategoryAdminIcon },
  airbuds: { bg: '#f1f5f9', color: '#475569', icon: CategoryAdminIcon },
  sliders: { bg: '#fff7ed', color: '#ea580c', icon: ShoppingBagIcon },
  caps: { bg: '#f8fafc', color: '#0f172a', icon: StarIcon },
  accessories: { bg: '#fef3c7', color: '#d97706', icon: TagIcon },
  deals: { bg: '#fef2f2', color: '#ef4444', icon: TagIcon },
}

const getCategoryAvatar = (name, slug) => {
  const key = String(slug || name || '').toLowerCase()
  if (CATEGORY_AVATARS[key]) return CATEGORY_AVATARS[key]
  for (const k of Object.keys(CATEGORY_AVATARS)) {
    if (key.includes(k)) return CATEGORY_AVATARS[k]
  }
  return { bg: '#f1f5f9', color: '#4f46e5', icon: FolderIcon }
}

export default function CategoryListPage() {
  const ctx = window.DJANGO_CONTEXT || {}
  const rawList = ctx.resultList || []

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // ── Inline Add-Category form state ──────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [dynamicList, setDynamicList] = useState(rawList)

  // Dynamic Statistics derived directly from dynamicList
  const totalCategories = dynamicList.length
  const activeCategories = dynamicList.filter(i => i.isActive).length
  const inactiveCategories = dynamicList.filter(i => !i.isActive).length
  const totalSubcategories = dynamicList.reduce((acc, i) => acc + (i.subcategoriesCount || 0), 0)

  // Filtered & Paginated List
  const filteredList = useMemo(() => {
    return dynamicList.filter(item => {
      const q = (searchTerm || '').toLowerCase().trim()
      const matchesSearch = !q || (item.name || '').toLowerCase().includes(q) || (item.slug || '').toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.isActive) ||
        (statusFilter === 'inactive' && !item.isActive)
      return matchesSearch && matchesStatus
    })
  }, [dynamicList, searchTerm, statusFilter])

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentItems = useMemo(() => {
    return filteredList.slice(startIdx, startIdx + itemsPerPage)
  }, [filteredList, startIdx, itemsPerPage])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    setShowAddSubForm(false)
    setNewCategoryName('')
    setNewSubcategoryName('')
    setFormError('')
    setSubFormError('')
    setFormSuccess('')
    setSubFormSuccess('')
  }

  // ── Add-Subcategory modal state ──────────────────────────────────────────────
  const [showAddSubForm, setShowAddSubForm] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [subFormError, setSubFormError] = useState('')
  const [subFormSuccess, setSubFormSuccess] = useState('')
  const [subFormLoading, setSubFormLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Edit Category modal state ──────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSubcategories, setEditSubcategories] = useState([])
  const [deletedSubcategoryIds, setDeletedSubcategoryIds] = useState([])
  const [newSubNameInEdit, setNewSubNameInEdit] = useState('')
  const [editFormError, setEditFormError] = useState('')
  const [editFormSuccess, setEditFormSuccess] = useState('')
  const [editFormLoading, setEditFormLoading] = useState(false)

  const handleOpenEditModal = async (item) => {
    setEditTarget(item)
    setEditCategoryName(item.name || '')
    setEditIsActive(item.isActive !== undefined ? item.isActive : true)
    setEditSubcategories(item.subcategories ? item.subcategories.map(s => ({ ...s })) : [])
    setDeletedSubcategoryIds([])
    setNewSubNameInEdit('')
    setEditFormError('')
    setEditFormSuccess('')

    try {
      const response = await fetch(`/api/categories/${item.id}/`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.name) setEditCategoryName(data.name)
        if (data.is_active !== undefined) setEditIsActive(data.is_active)
        if (Array.isArray(data.subcategories)) {
          setEditSubcategories(data.subcategories.map(s => ({
            id: s.id,
            name: s.name,
            isActive: s.is_active !== undefined ? s.is_active : true,
          })))
        }
      }
    } catch {
      // fallback
    }
  }

  const handleAddSubcategoryInEdit = () => {
    const subName = newSubNameInEdit.trim()
    if (!subName) return
    setEditSubcategories(prev => [
      ...prev,
      { id: `temp-${Date.now()}`, name: subName, isActive: true, isNew: true }
    ])
    setNewSubNameInEdit('')
  }

  const handleRemoveSubcategoryInEdit = (subId, index) => {
    if (subId && typeof subId === 'number') {
      setDeletedSubcategoryIds(prev => [...prev, subId])
    }
    setEditSubcategories(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleSubcategoryNameChangeInEdit = (index, newName) => {
    setEditSubcategories(prev => prev.map((sub, idx) => {
      if (idx === index) return { ...sub, name: newName }
      return sub
    }))
  }

  const handleSubcategoryStatusChangeInEdit = (index, isActive) => {
    setEditSubcategories(prev => prev.map((sub, idx) => {
      if (idx === index) return { ...sub, isActive }
      return sub
    }))
  }

  const getCsrfToken = () => {
    if (ctx?.csrfToken) return ctx.csrfToken
    if (window.DJANGO_CONTEXT?.csrfToken) return window.DJANGO_CONTEXT.csrfToken
    const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]')
    if (tokenInput?.value) return tokenInput.value
    const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : ''
  }

  const handleSaveEditCategory = async () => {
    if (!editTarget) return
    const name = editCategoryName.trim()
    if (!name) {
      setEditFormError('Please enter category name.')
      setEditFormSuccess('')
      return
    }

    setEditFormLoading(true)
    setEditFormError('')
    setEditFormSuccess('')

    try {
      const csrfToken = getCsrfToken()
      const payload = {
        name,
        is_active: editIsActive,
        subcategories: editSubcategories.map(s => ({
          id: String(s.id).startsWith('temp-') ? undefined : s.id,
          name: s.name.trim(),
          is_active: s.isActive !== undefined ? s.isActive : true,
        })),
        deleted_subcategories: deletedSubcategoryIds,
      }

      const response = await fetch(`/api/categories/${editTarget.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
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
        return
      }

      const updatedCat = data.category || data
      const updatedSubs = Array.isArray(updatedCat.subcategories) ? updatedCat.subcategories : []
      setDynamicList(prev => prev.map(item => {
        if (String(item.id) === String(editTarget.id)) {
          return {
            ...item,
            name: updatedCat.name,
            slug: updatedCat.slug,
            isActive: updatedCat.is_active !== undefined ? updatedCat.is_active : (updatedCat.isActive !== undefined ? updatedCat.isActive : true),
            subcategoriesCount: updatedSubs.length,
            subcategories: updatedSubs.map(s => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              isActive: s.is_active !== undefined ? s.is_active : (s.isActive !== undefined ? s.isActive : true),
            })),
          }
        }
        return item
      }))

      setEditFormSuccess('Category updated successfully.')
      showToast('Category Updated', `"${updatedCat.name}" details updated successfully.`)

      setTimeout(() => {
        setEditTarget(null)
        setEditFormSuccess('')
      }, 1500)
    } catch (err) {
      console.error('Error updating category:', err)
      setEditFormError('Network error. Please check your connection and try again.')
    } finally {
      setEditFormLoading(false)
    }
  }

  const showToast = (title, msg, isError = false) => {
    const toast = document.getElementById('moxie-toast')
    const titleEl = document.getElementById('moxie-toast-title')
    const msgEl = document.getElementById('moxie-toast-msg')
    const iconEl = document.getElementById('moxie-toast-icon')
    if (!toast) return
    if (titleEl) titleEl.textContent = title
    if (msgEl) msgEl.textContent = msg
    if (iconEl) iconEl.textContent = isError ? '⚠️' : '🗑️'
    toast.style.borderLeftColor = isError ? '#ef4444' : '#f97316'
    toast.style.display = 'flex'
    toast.style.opacity = '1'
    clearTimeout(toast._timer)
    toast._timer = setTimeout(() => {
      toast.style.transition = 'opacity 0.4s'
      toast.style.opacity = '0'
      setTimeout(() => { toast.style.display = 'none'; toast.style.opacity = '1' }, 400)
    }, 3000)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === '1' || params.get('showAdd') === 'true') {
      setShowAddForm(true)
    }
    if (params.get('addSub') === '1' || params.get('showAddSub') === 'true') {
      setShowAddSubForm(true)
    }
  }, [])

  const handleAddClick = () => {
    setShowAddForm(prev => !prev)
    setNewCategoryName('')
    setFormError('')
    setFormSuccess('')
  }

  const handleSaveCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      setFormError('Please enter category name.')
      setFormSuccess('')
      return
    }

    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      const csrfToken = getCsrfToken()
      const response = await fetch('/api/categories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })

      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        const errorMsg = data.error || data.detail || (typeof data === 'object' && Object.values(data).flat().join(' ')) || 'Something went wrong. Please try again.'
        setFormError(errorMsg)
        return
      }

      // Success — prepend new category to the list safely handling both wrapped and direct JSON
      const catObj = data.category || data
      const catSubs = Array.isArray(catObj.subcategories) ? catObj.subcategories : []
      const newItem = {
        id: String(catObj.id),
        name: catObj.name,
        slug: catObj.slug || catObj.name.toLowerCase().replace(/\s+/g, '-'),
        isActive: catObj.is_active !== undefined ? catObj.is_active : (catObj.isActive !== undefined ? catObj.isActive : true),
        subcategoriesCount: catSubs.length,
        subcategories: catSubs,
        productsCount: 0,
      }
      setDynamicList(prev => [newItem, ...prev])

      setFormSuccess('Category added successfully.')
      setNewCategoryName('')

      // Auto-hide the form and success message after 1.8s
      setTimeout(() => {
        setShowAddForm(false)
        setFormSuccess('')
      }, 1800)
    } catch (err) {
      console.error('Error adding category:', err)
      setFormError('Network error. Please check your connection and try again.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddSubClick = () => {
    setShowAddSubForm(prev => !prev)
    setSelectedCategoryId('')
    setNewSubcategoryName('')
    setSubFormError('')
    setSubFormSuccess('')
  }

  const handleSaveSubcategory = async () => {
    if (!selectedCategoryId) {
      setSubFormError('Please select a category.')
      setSubFormSuccess('')
      return
    }

    const name = newSubcategoryName.trim()
    if (!name) {
      setSubFormError('Please enter subcategory name.')
      setSubFormSuccess('')
      return
    }

    setSubFormLoading(true)
    setSubFormError('')
    setSubFormSuccess('')

    try {
      const csrfToken = getCsrfToken()
      const response = await fetch('/api/subcategories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategoryId,
          name,
        }),
      })

      let data = {}
      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        const errorMsg = data.error || data.detail || (typeof data === 'object' && Object.values(data).flat().join(' ')) || 'Something went wrong. Please try again.'
        setSubFormError(errorMsg)
        return
      }

      // Success — increment subcategory count & add new subcategory item in dynamicList safely
      const subObj = data.subcategory || data
      const newSubObj = {
        id: subObj.id,
        name: subObj.name || name,
        slug: subObj.slug || (subObj.name || name).toLowerCase().replace(/\s+/g, '-'),
        isActive: subObj.is_active !== undefined ? subObj.is_active : (subObj.isActive !== undefined ? subObj.isActive : true),
      }

      setDynamicList(prev => prev.map(cat => {
        if (String(cat.id) === String(selectedCategoryId)) {
          const existingSubs = Array.isArray(cat.subcategories) ? cat.subcategories : []
          return {
            ...cat,
            subcategoriesCount: (cat.subcategoriesCount || 0) + 1,
            subcategories: [...existingSubs, newSubObj]
          }
        }
        return cat
      }))

      setSubFormSuccess('Subcategory added successfully.')
      setNewSubcategoryName('')

      // Auto-hide the subcategory form and success message after 1.8s
      setTimeout(() => {
        setShowAddSubForm(false)
        setSubFormSuccess('')
      }, 1800)
    } catch (err) {
      console.error('Error adding subcategory:', err)
      setSubFormError('Network error. Please check your connection and try again.')
    } finally {
      setSubFormLoading(false)
    }
  }

  return (
    <div className="category-list-shell">
      {/* Header Row */}
      <div className="category-header-row">
        <div className="category-title-group">
          <h1>Category Management</h1>
          <p>Manage product categories and subcategories</p>
        </div>
        <div className="category-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* "Add Category" button */}
          <button
            type="button"
            className="btn-add-category"
            onClick={handleAddClick}
            aria-expanded={showAddForm}
          >
            <AppIcon icon={PlusIcon} size={16} />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            className="btn-add-subcategory"
            onClick={handleAddSubClick}
            aria-expanded={showAddSubForm}
          >
            <AppIcon icon={PlusIcon} size={16} />
            <span>Add Subcategory</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="category-stats-grid">
        {/* Total Categories */}
        <div className="category-stat-card">
          <div className="stat-icon-box blue">
            <AppIcon icon={CategoryAdminIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Categories</span>
            <span className="stat-value">{totalCategories}</span>
            <span className="stat-sub">All categories</span>
          </div>
        </div>

        {/* Active Categories */}
        <div className="category-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Categories</span>
            <span className="stat-value">{activeCategories}</span>
            <span className="stat-sub">Currently active</span>
          </div>
        </div>

        {/* Inactive Categories */}
        <div className="category-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={CancelCircleIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inactive Categories</span>
            <span className="stat-value">{inactiveCategories}</span>
            <span className="stat-sub">Currently inactive</span>
          </div>
        </div>

        {/* Total Subcategories */}
        <div className="category-stat-card">
          <div className="stat-icon-box indigo">
            <AppIcon icon={FolderIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Subcategories</span>
            <span className="stat-value">{totalSubcategories}</span>
            <span className="stat-sub">All subcategories</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="category-table-card">
        {/* Table Filter Bar */}
        <div className="table-filter-bar">
          <div className="category-search-box">
            <span className="category-search-icon">
              <AppIcon icon={SearchIcon} size={16} />
            </span>
            <input
              type="text"
              placeholder="Search category name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="category-search-input"
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
        <table className="category-table">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>SUBCATEGORIES</th>
              <th>PRODUCTS</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map(item => {
                const avatar = getCategoryAvatar(item.name, item.slug)
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="category-cell">
                        <div className="category-icon-avatar" style={{ backgroundColor: avatar.bg, color: avatar.color }}>
                          <AppIcon icon={avatar.icon || FolderIcon} size={18} />
                        </div>
                        <span className="category-name">{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="subcat-text">{item.subcategoriesCount} Subcategories</span>
                    </td>
                    <td>
                      <span className="products-text">{item.productsCount} Products</span>
                    </td>
                    <td>
                      <span className={`status-pill ${item.isActive ? 'active' : 'inactive'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="action-btn"
                          title="Edit category"
                          aria-label="Edit category"
                        >
                          <AppIcon icon={EditIcon} size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                          className="action-btn delete"
                          title="Delete category"
                          aria-label="Delete category"
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer & Pagination */}
        <div className="table-footer-bar">
          <span className="footer-info">
            Showing {filteredList.length > 0 ? startIdx + 1 : 0} to {Math.min(startIdx + itemsPerPage, filteredList.length)} of {filteredList.length} categories
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

      {/* ── Add Category Modal ─────────────────────────────────────────────────── */}
      {showAddForm && (
        <div
          onClick={() => { if (!formLoading) setShowAddForm(false) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(30, 41, 59, 0.6)',
            zIndex: 9000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '460px',
              maxWidth: '94vw',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
          >
            {/* Body */}
            <div style={{ padding: '36px 32px 28px', position: 'relative' }}>
              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={formLoading}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'none', border: 'none',
                  color: '#94a3b8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px', borderRadius: '4px',
                }}
              >
                <AppIcon icon={CancelIcon} size={20} />
              </button>

              {/* Category icon circle */}
              <div style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <AppIcon icon={CategoryAdminIcon} size={36} color="#2563eb" />
              </div>

              {/* Title */}
              <h3 style={{
                margin: '0 0 28px 0',
                fontSize: '22px', fontWeight: 800,
                color: '#0f172a', textAlign: 'center',
              }}>Add Category</h3>

              {/* Label + Input */}
              <div>
                <label
                  htmlFor="modal-category-name-input"
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Category Name
                </label>
                <input
                  id="modal-category-name-input"
                  type="text"
                  autoFocus
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={e => {
                    setNewCategoryName(e.target.value)
                    setFormError('')
                    setFormSuccess('')
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory() }}
                  disabled={formLoading}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    border: `1.5px solid ${formError ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: formError ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { if (!formError) { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' } }}
                  onBlur={e => { if (!formError) { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' } }}
                />
                {formError && (
                  <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    {formError}
                  </p>
                )}
                {formSuccess && (
                  <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    {formSuccess}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 36px' }}>
              <button
                type="button"
                onClick={() => { if (!formLoading) setShowAddForm(false) }}
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
                onClick={handleSaveCategory}
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

      {/* ── Add Subcategory Modal ─────────────────────────────────────────────── */}
      {showAddSubForm && (
        <div
          onClick={() => { if (!subFormLoading) setShowAddSubForm(false) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(30, 41, 59, 0.6)',
            zIndex: 9000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '460px',
              maxWidth: '94vw',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
          >
            {/* Body */}
            <div style={{ padding: '36px 36px 28px', position: 'relative' }}>

              {/* X close button — top right */}
              <button
                type="button"
                onClick={() => { if (!subFormLoading) setShowAddSubForm(false) }}
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

              {/* Subcategory icon circle */}
              <div style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                background: '#e0e7ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <AppIcon icon={FolderIcon} size={36} color="#4f46e5" />
              </div>

              {/* Title */}
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: '22px', fontWeight: 800,
                color: '#0f172a', textAlign: 'center',
              }}>Add Subcategory</h3>

              {/* Field 1: Category Selection Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="modal-select-category-input"
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Select Category
                </label>
                <CustomSelect
                  id="modal-select-category-input"
                  value={selectedCategoryId}
                  onChange={e => {
                    setSelectedCategoryId(e.target.value)
                    setSubFormError('')
                    setSubFormSuccess('')
                  }}
                  disabled={subFormLoading}
                  placeholder="-- Select Category --"
                  options={[
                    { value: '', label: '-- Select Category --' },
                    ...dynamicList.map(cat => ({ value: cat.id, label: cat.name }))
                  ]}
                  width="100%"
                  height="46px"
                />
              </div>

              {/* Field 2: Subcategory Name Input */}
              <div>
                <label
                  htmlFor="modal-subcategory-name-input"
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                >
                  Subcategory Name
                </label>
                <input
                  id="modal-subcategory-name-input"
                  type="text"
                  placeholder="Enter subcategory name"
                  value={newSubcategoryName}
                  onChange={e => {
                    setNewSubcategoryName(e.target.value)
                    setSubFormError('')
                    setSubFormSuccess('')
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveSubcategory() }}
                  disabled={subFormLoading}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    border: `1.5px solid ${subFormError && selectedCategoryId && !newSubcategoryName.trim() ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                />
                {subFormError && (
                  <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    {subFormError}
                  </p>
                )}
                {subFormSuccess && (
                  <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                    {subFormSuccess}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#e2e8f0', margin: '0' }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 36px' }}>
              <button
                type="button"
                onClick={() => { if (!subFormLoading) setShowAddSubForm(false) }}
                disabled={subFormLoading}
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
                onClick={handleSaveSubcategory}
                disabled={subFormLoading}
                style={{
                  height: '44px', padding: '0 28px',
                  background: subFormLoading ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: subFormLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}
                onMouseEnter={e => { if (!subFormLoading) e.currentTarget.style.background = '#1d4ed8' }}
                onMouseLeave={e => { if (!subFormLoading) e.currentTarget.style.background = '#2563eb' }}
              >
                {subFormLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Category Modal ─────────────────────────────────────────────────── */}
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
              width: '540px',
              maxWidth: '94vw',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '28px 32px 20px', position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AppIcon icon={EditIcon} size={24} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Edit Category</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>Modify full category details and subcategories</p>
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
              {/* Field 1: Category Name */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="edit-category-name"
                  style={{ display: 'block', fontSize: '13.5px', fontWeight: 650, color: '#1e293b', marginBottom: '8px' }}
                >
                  Category Name
                </label>
                <input
                  id="edit-category-name"
                  type="text"
                  value={editCategoryName}
                  onChange={e => {
                    setEditCategoryName(e.target.value)
                    setEditFormError('')
                    setEditFormSuccess('')
                  }}
                  disabled={editFormLoading}
                  placeholder="Category Name"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    border: `1.5px solid ${editFormError ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { if (!editFormError) { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' } }}
                  onBlur={e => { if (!editFormError) { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' } }}
                />
              </div>

              {/* Field 2: Category Status */}
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 650, color: '#1e293b', display: 'block' }}>Category Status</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>When active, category and its products are visible to customers</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(prev => !prev)}
                  disabled={editFormLoading}
                  style={{
                    height: '32px', padding: '0 16px',
                    borderRadius: '20px', border: 'none',
                    fontWeight: 700, fontSize: '12.5px',
                    cursor: 'pointer',
                    background: editIsActive ? '#dcfce7' : '#fee2e2',
                    color: editIsActive ? '#15803d' : '#b91c1c',
                    transition: 'all 0.15s',
                  }}
                >
                  {editIsActive ? '● Active' : '○ Inactive'}
                </button>
              </div>

              {/* Section 3: Subcategories Management */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Subcategories ({editSubcategories.length})
                  </span>
                </div>

                {/* Subcategory List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                  {editSubcategories.length > 0 ? (
                    editSubcategories.map((sub, idx) => (
                      <div key={sub.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={e => handleSubcategoryNameChangeInEdit(idx, e.target.value)}
                          placeholder="Subcategory Name"
                          disabled={editFormLoading}
                          style={{
                            flex: 1,
                            height: '36px',
                            padding: '0 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            color: '#0f172a',
                            background: '#fff',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSubcategoryStatusChangeInEdit(idx, !sub.isActive)}
                          disabled={editFormLoading}
                          title="Toggle status"
                          style={{
                            height: '36px',
                            padding: '0 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: sub.isActive ? '#dcfce7' : '#fee2e2',
                            color: sub.isActive ? '#15803d' : '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          {sub.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryInEdit(sub.id, idx)}
                          disabled={editFormLoading}
                          title="Remove subcategory"
                          style={{
                            width: '34px', height: '34px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#ef4444',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <AppIcon icon={DeleteIcon} size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0', fontStyle: 'italic' }}>
                      No subcategories added yet.
                    </p>
                  )}
                </div>

                {/* Inline Add Subcategory input */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={newSubNameInEdit}
                    onChange={e => setNewSubNameInEdit(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubcategoryInEdit() } }}
                    placeholder="Enter new subcategory name..."
                    disabled={editFormLoading}
                    style={{
                      flex: 1,
                      height: '40px',
                      padding: '0 12px',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#fff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategoryInEdit}
                    disabled={editFormLoading || !newSubNameInEdit.trim()}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      background: '#f1f5f9',
                      color: '#2563eb',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: newSubNameInEdit.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >
                    + Add Subcategory
                  </button>
                </div>
              </div>

              {/* Error & Success Messages */}
              {editFormError && (
                <p style={{ margin: '16px 0 0', fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px' }}>
                  {editFormError}
                </p>
              )}
              {editFormSuccess && (
                <p style={{ margin: '16px 0 0', fontSize: '12.5px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px' }}>
                  {editFormSuccess}
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '18px 32px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => { if (!editFormLoading) setEditTarget(null) }}
                disabled={editFormLoading}
                style={{
                  height: '42px', padding: '0 22px',
                  background: '#fff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 600, fontSize: '14px',
                  color: '#374151', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditCategory}
                disabled={editFormLoading}
                style={{
                  height: '42px', padding: '0 26px',
                  background: editFormLoading ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: editFormLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                }}
              >
                {editFormLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '32px 28px', width: '360px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AppIcon icon={DeleteIcon} size={26} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete Category?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: '40px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={async () => {
                const target = deleteTarget
                setDeleteTarget(null)
                const csrfToken = getCsrfToken()
                try {
                  const res = await fetch(`/api/categories/${target.id}/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': csrfToken },
                    credentials: 'include',
                  })
                  if (res.ok) {
                    setDynamicList(prev => prev.filter(c => String(c.id) !== String(target.id)))
                    showToast('Category Deleted', `"${target.name}" has been removed.`)
                  } else {
                    await fetch(`/admin/categories/category/${target.id}/delete/`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrfToken },
                      body: `csrfmiddlewaretoken=${csrfToken}&post=yes`,
                      redirect: 'manual',
                    })
                    setDynamicList(prev => prev.filter(c => String(c.id) !== String(target.id)))
                    showToast('Category Deleted', `"${target.name}" has been removed.`)
                  }
                } catch {
                  showToast('Something went wrong', 'Could not delete the category. Please try again.', true)
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

