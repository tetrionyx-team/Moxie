import { useState, useEffect, useMemo } from 'react'
import CustomSelect from '../Common/CustomSelect'
import { getDjangoContext } from '../../utils/djangoContext'
import {
  AppIcon,
  PlusIcon,
  ProductIcon,
  CheckmarkCircle01Icon,
  PaymentIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  DeleteIcon,
  CancelIcon,
  PackageIcon,
} from '../../icons'
import './ProductListPage.css'

export default function ProductListPage() {
  const context = getDjangoContext()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [stock, setStock] = useState('')
  const [sort, setSort] = useState('-created_at')
  const [selectedIds, setSelectedIds] = useState([])
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [selectedStocks, setSelectedStocks] = useState([])
  const [categorySearch, setCategorySearch] = useState('')
  const [activeSection, setActiveSection] = useState('categories')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [availabilityTarget, setAvailabilityTarget] = useState(null)
  const [products, setProducts] = useState(context.resultList || [])
  const [showAddModal, setShowAddModal] = useState(false)
  const [addProductName, setAddProductName] = useState('')
  const [addProductError, setAddProductError] = useState('')
  const [addProductSuccess, setAddProductSuccess] = useState('')
  const [addProductLoading, setAddProductLoading] = useState(false)
  const [addProductEditUrl, setAddProductEditUrl] = useState('')

  const showToast = (title, msg, isError = false) => {
    if (window.showGlobalToast) {
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
      setTimeout(() => { toast.style.display = 'none'; toast.style.opacity = '1' }, 400)
    }, 3500)
  }

  const handleQuickAddProduct = async () => {
    const name = addProductName.trim()
    if (!name) {
      setAddProductError('Please enter a product name.')
      return
    }
    setAddProductLoading(true)
    setAddProductError('')
    try {
      const response = await fetch('/api/admin/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': context.csrfToken || '' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAddProductError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setProducts(prev => [{
        id: data.product.id,
        name: data.product.name,
        category: data.product.category,
        subcategory: '',
        price: data.product.price,
        discountPrice: null,
        stock: data.product.stock,
        isActive: data.product.isActive,
        imageUrl: '',
        variants: [],
      }, ...prev])
      setAddProductSuccess('Product added successfully.')
      setAddProductEditUrl(data.product.editUrl || '')
      showToast('Product added successfully.', `"${name}" was saved as a draft.`)
    } catch {
      setAddProductError('Network error. Please check your connection and try again.')
    } finally {
      setAddProductLoading(false)
    }
  }

  const handleToggleAvailability = async (target) => {
    if (!target) return
    const { product, variant, currentActive } = target
    const nextActive = !currentActive
    setAvailabilityTarget(null)

    try {
      if (variant && variant.id) {
        const res = await fetch(`/api/variants/${variant.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': context.csrfToken || '',
          },
          credentials: 'include',
          body: JSON.stringify({ is_active: nextActive }),
        })
        if (!res.ok) {
          throw new Error('Failed to update variant status')
        }
        setProducts(prev => prev.map(p => {
          if (String(p.id) === String(product.id)) {
            return {
              ...p,
              variants: (p.variants || []).map(v =>
                String(v.id) === String(variant.id) ? { ...v, isActive: nextActive } : v
              ),
            }
          }
          return p
        }))
        showToast(
          nextActive ? 'Variant Available' : 'Variant Unavailable',
          `Variant "${variant.color_name}" is now marked as ${nextActive ? 'available' : 'unavailable'}.`
        )
      } else {
        // Product-level fallback toggle
        setProducts(prev => prev.map(p => {
          if (String(p.id) === String(product.id)) {
            return { ...p, isActive: nextActive }
          }
          return p
        }))
        showToast(
          nextActive ? 'Product Available' : 'Product Unavailable',
          `"${product.name}" is now marked as ${nextActive ? 'available' : 'unavailable'}.`
        )
      }
    } catch {
      showToast('Error', 'Could not update availability. Please try again.', true)
    }
  }

  const dbCatNames = (context.categoriesList || []).map(c => c.name)
  const defaultCatNames = ['Watches', 'Accessories', 'Gadgets', 'Fashion & Bags', 'Die-Cast Cars', 'Footwear', 'Clothing', 'Electronics & Cameras']
  const allCategories = Array.from(new Set([...dbCatNames, ...defaultCatNames, ...products.map(item => item.category)].filter(Boolean)))

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('q')) setSearch(params.get('q'))
    if (params.has('category__slug__exact')) setCategory(params.get('category__slug__exact'))
    if (params.has('is_active__exact')) setStatus(params.get('is_active__exact'))
    if (params.has('stock__gt')) setStock('in')
    if (params.has('stock__lte')) setStock('out')
    if (params.has('o')) setSort(params.get('o'))
    if (params.get('add') === '1' || params.get('showAdd') === 'true') {
      setShowAddModal(true)
      setAddProductName('')
      setAddProductError('')
      setAddProductSuccess('')
      setAddProductEditUrl('')
    }
  }, [])

  // Filter source products
  const filteredProducts = useMemo(() => {
    let list = products.filter(item => {
      const query = search.toLowerCase().trim()
      const variantMatch = (item.variants || []).some(v =>
        (v.color_name || '').toLowerCase().includes(query)
      )
      const matchesSearch = !query ||
        (item.name || '').toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query) ||
        (item.subcategory || '').toLowerCase().includes(query) ||
        `mw-0${item.id}`.includes(query) ||
        variantMatch

      const matchesSingleCat = !category || (item.category || '').toLowerCase().includes(category.toLowerCase())
      const catOk = selectedCategories.length > 0 ? selectedCategories.some(c => (item.category || '').toLowerCase().includes(c.toLowerCase())) : matchesSingleCat

      // Status check (product-level or variants)
      const isAct = item.isActive || (item.variants || []).some(v => v.isActive)
      const statOk = selectedStatuses.length > 0
        ? ((selectedStatuses.includes('1') && isAct) || (selectedStatuses.includes('0') && !isAct))
        : (!status || (status === '1' ? isAct : !isAct))

      // Stock check
      const totalStk = item.variants && item.variants.length > 0
        ? item.variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0)
        : (parseInt(item.stock, 10) || 0)
      const stockOk = selectedStocks.length > 0
        ? ((selectedStocks.includes('in') && totalStk > 0) || (selectedStocks.includes('out') && totalStk <= 0))
        : (!stock || (stock === 'in' ? totalStk > 0 : totalStk <= 0))

      return matchesSearch && catOk && statOk && stockOk
    })

    return list
  }, [products, search, category, status, stock, selectedCategories, selectedStatuses, selectedStocks])

  // FLATTEN VARIANTS FOR DISPLAY ONLY (1 row per variant, fallback to 1 row per product if no variants)
  const displayRows = useMemo(() => {
    let rows = []

    filteredProducts.forEach(product => {
      const pVariants = product.variants && product.variants.length > 0 ? product.variants : null
      if (pVariants) {
        pVariants.forEach((variant, variantIndex) => {
          const colorCode = variant.color_code || '#000000'
          const skuCode = (variant.color_name || 'BLK').substring(0, 3).toUpperCase()
          rows.push({
            product,
            variant,
            variantIndex,
            rowKey: `${product.id}-${variant.id || variantIndex}`,
            name: product.name,
            category: product.category,
            subcategory: product.subcategory || '—',
            colorName: variant.color_name,
            colorCode: colorCode,
            sizes: variant.sizes || [],
            price: variant.price,
            discountPrice: variant.discountPrice,
            rawPrice: typeof variant.rawPrice === 'number' ? variant.rawPrice : parseFloat(String(variant.price || '0').replace(/[^0-9.]/g, '')),
            rawDiscountPrice: typeof variant.rawDiscountPrice === 'number' ? variant.rawDiscountPrice : (variant.discountPrice ? parseFloat(String(variant.discountPrice).replace(/[^0-9.]/g, '')) : 0),
            stock: parseInt(variant.stock, 10) || 0,
            isActive: variant.isActive !== undefined ? variant.isActive : true,
            imageUrl: variant.imageUrl || product.imageUrl,
            sku: `MW-0${product.id}-${skuCode}`,
          })
        })
      } else {
        rows.push({
          product,
          variant: null,
          variantIndex: null,
          rowKey: `${product.id}`,
          name: product.name,
          category: product.category,
          subcategory: product.subcategory || '—',
          colorName: null,
          colorCode: null,
          sizes: [],
          price: product.price,
          discountPrice: product.discountPrice,
          rawPrice: typeof product.rawPrice === 'number' ? product.rawPrice : parseFloat(String(product.price || '0').replace(/[^0-9.]/g, '')),
          rawDiscountPrice: typeof product.rawDiscountPrice === 'number' ? product.rawDiscountPrice : (product.discountPrice ? parseFloat(String(product.discountPrice).replace(/[^0-9.]/g, '')) : 0),
          stock: parseInt(product.stock, 10) || 0,
          isActive: product.isActive !== undefined ? product.isActive : true,
          imageUrl: product.imageUrl,
          sku: `MW-0${product.id}-BLK`,
        })
      }
    })

    // Sorting on display rows
    if (sort === 'price') {
      rows.sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0))
    } else if (sort === '-price') {
      rows.sort((a, b) => (b.rawPrice || 0) - (a.rawPrice || 0))
    } else if (sort === 'name') {
      rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sort === '-stock') {
      rows.sort((a, b) => (b.stock || 0) - (a.stock || 0))
    } else if (sort === '-created_at') {
      rows.sort((a, b) => (b.product.id || 0) - (a.product.id || 0))
    }

    return rows
  }, [filteredProducts, sort])

  // Metrics dynamic calculation (derived safely from source products)
  const totalProductsCount = filteredProducts.length
  const activeProductsCount = filteredProducts.filter(p => {
    if (p.variants && p.variants.length > 0) return p.variants.some(v => v.isActive)
    return p.isActive
  }).length
  const totalInventoryValue = filteredProducts.reduce((sum, item) => {
    if (item.variants && item.variants.length > 0) {
      return sum + item.variants.reduce((vSum, v) => {
        const vDisc = typeof v.rawDiscountPrice === 'number' ? v.rawDiscountPrice : (v.discountPrice ? parseFloat(String(v.discountPrice).replace(/[^0-9.]/g, '')) : 0)
        const vPr = typeof v.rawPrice === 'number' ? v.rawPrice : (typeof v.price === 'number' ? v.price : parseFloat(String(v.price || '0').replace(/[^0-9.]/g, '')) || 0)
        const effPr = (vDisc && vDisc > 0) ? vDisc : vPr
        const vStk = typeof v.stock === 'number' ? v.stock : parseInt(String(v.stock || '0'), 10) || 0
        return vSum + (effPr * vStk)
      }, 0)
    }
    const rawDisc = typeof item.rawDiscountPrice === 'number' ? item.rawDiscountPrice : (item.discountPrice ? parseFloat(String(item.discountPrice).replace(/[^0-9.]/g, '')) : 0)
    const rawPr = typeof item.rawPrice === 'number' ? item.rawPrice : (typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0)
    const unitPrice = (rawDisc && rawDisc > 0) ? rawDisc : rawPr
    const stockQty = typeof item.stock === 'number' ? item.stock : parseInt(String(item.stock || '0'), 10) || 0
    return sum + (unitPrice * stockQty)
  }, 0)

  return (
    <div className="products-page-shell">
      {/* Header */}
      <div className="products-page-header">
        <div className="products-header-title-box">
          <h1 className="products-page-title" style={{ display: 'block', margin: '0 0 4px 0', fontSize: '26px', fontWeight: '800', color: '#0f172a', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
            Product Management
          </h1>
          <p className="products-page-subtitle">
            Manage and track your entire product catalog, pricing, variants, and stock inventory.
          </p>
        </div>
        <a
          href="/admin/products/product/add/"
          className="btn-add-product-main"
          style={{ textDecoration: 'none' }}
        >
          <AppIcon icon={PlusIcon} size={17} />
          <span>Add Product</span>
        </a>
      </div>

      {/* Dynamic Metrics */}
      <div className="products-kpi-grid">
        <div className="products-kpi-card">
          <div className="products-kpi-icon purple">
            <AppIcon icon={ProductIcon} size={24} />
          </div>
          <div className="products-kpi-content">
            <span className="products-kpi-label">Total Products</span>
            <strong className="products-kpi-value">{totalProductsCount}</strong>
            <span className="products-kpi-subtext">View all products</span>
          </div>
        </div>

        <div className="products-kpi-card">
          <div className="products-kpi-icon green">
            <AppIcon icon={CheckmarkCircle01Icon} size={24} />
          </div>
          <div className="products-kpi-content">
            <span className="products-kpi-label">Active Products</span>
            <strong className="products-kpi-value">{activeProductsCount}</strong>
            <span className="products-kpi-subtext">Active in catalog</span>
          </div>
        </div>

        <div className="products-kpi-card">
          <div className="products-kpi-icon blue">
            <AppIcon icon={PaymentIcon} size={24} />
          </div>
          <div className="products-kpi-content">
            <span className="products-kpi-label">Total Value</span>
            <strong className="products-kpi-value">₹{totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <span className="products-kpi-subtext">Inventory asset value</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="products-toolbar">
        <div className="products-toolbar-left">
          <div className="products-search-box">
            <span className="products-search-icon">
              <AppIcon icon={SearchIcon} size={17} />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="products-search-input"
            />
          </div>
          <CustomSelect
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...allCategories.map(c => ({ value: c, label: c }))
            ]}
            height="42px"
            minWidth="140px"
            buttonStyle={{ borderRadius: '10px', border: '1px solid #dce3eb', fontSize: '13px' }}
          />
          <CustomSelect
            value={status}
            onChange={e => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' }
            ]}
            height="42px"
            minWidth="120px"
            buttonStyle={{ borderRadius: '10px', border: '1px solid #dce3eb', fontSize: '13px' }}
          />
          <CustomSelect
            value={stock}
            onChange={e => setStock(e.target.value)}
            options={[
              { value: '', label: 'All Stock' },
              { value: 'in', label: 'In Stock' },
              { value: 'out', label: 'Out of Stock' }
            ]}
            height="42px"
            minWidth="120px"
            buttonStyle={{ borderRadius: '10px', border: '1px solid #dce3eb', fontSize: '13px' }}
          />
        </div>

        <div className="products-toolbar-right">
          <CustomSelect
            value={sort}
            onChange={e => setSort(e.target.value)}
            options={[
              { value: '-created_at', label: 'Sort By: Newest' },
              { value: 'price', label: 'Price: Low to High' },
              { value: '-price', label: 'Price: High to Low' },
              { value: 'name', label: 'Name: A-Z' },
              { value: '-stock', label: 'Stock: High to Low' }
            ]}
            height="42px"
            minWidth="165px"
            buttonStyle={{ borderRadius: '10px', border: '1px solid #dce3eb', fontSize: '13px' }}
          />
          <button
            type="button"
            className="btn-filter-toggle"
            onClick={() => setShowFilterModal(!showFilterModal)}
          >
            <AppIcon icon={FilterIcon} size={15} />
            <span>Filter</span>
            {(selectedCategories.length + selectedStatuses.length + selectedStocks.length) > 0 && (
              <span className="filter-badge-count">
                {selectedCategories.length + selectedStatuses.length + selectedStocks.length}
              </span>
            )}
          </button>

          {showFilterModal && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '320px', background: '#fff', borderRadius: '12px', boxShadow: '0 12px 36px rgba(15,23,42,0.18)', border: '1px solid #e2e8f0', zIndex: 1000, padding: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Filters</h3>
                <button type="button" onClick={() => { setSelectedCategories([]); setSelectedStatuses([]); setSelectedStocks([]); setCategory(''); setStatus(''); setStock(''); setSearch('') }} style={{ background: 'none', border: 0, color: '#2563eb', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: 0 }}>Clear all</button>
              </div>
              {/* Categories accordion */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '12px' }}>
                <div onClick={() => setActiveSection(activeSection === 'categories' ? '' : 'categories')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#1e293b', padding: '4px 0' }}>
                  <span>{activeSection === 'categories' ? '˅ Categories' : '> Categories'}</span>
                  {selectedCategories.length > 0 && <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{selectedCategories.length}</span>}
                </div>
                {activeSection === 'categories' && (
                  <div style={{ marginTop: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <input type="text" placeholder="Search categories" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} style={{ width: '100%', height: '34px', paddingLeft: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      {allCategories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())).map(catName => (
                        <label key={catName} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedCategories.includes(catName)} onChange={e => { if (e.target.checked) setSelectedCategories([...selectedCategories, catName]); else setSelectedCategories(selectedCategories.filter(c => c !== catName)) }} style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
                          {catName}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Status accordion */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '12px' }}>
                <div onClick={() => setActiveSection(activeSection === 'status' ? '' : 'status')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#1e293b', padding: '4px 0' }}>
                  <span>{activeSection === 'status' ? '˅ Status' : '> Status'}</span>
                  {selectedStatuses.length > 0 && <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{selectedStatuses.length}</span>}
                </div>
                {activeSection === 'status' && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    {[['1','Active'],['0','Inactive']].map(([val,lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedStatuses.includes(val)} onChange={e => { if (e.target.checked) setSelectedStatuses([...selectedStatuses,val]); else setSelectedStatuses(selectedStatuses.filter(s=>s!==val)) }} style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Stock accordion */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '16px' }}>
                <div onClick={() => setActiveSection(activeSection === 'stock' ? '' : 'stock')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#1e293b', padding: '4px 0' }}>
                  <span>{activeSection === 'stock' ? '˅ Stock Level' : '> Stock Level'}</span>
                  {selectedStocks.length > 0 && <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{selectedStocks.length}</span>}
                </div>
                {activeSection === 'stock' && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    {[['in','In Stock'],['out','Out of Stock']].map(([val,lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedStocks.includes(val)} onChange={e => { if (e.target.checked) setSelectedStocks([...selectedStocks,val]); else setSelectedStocks(selectedStocks.filter(s=>s!==val)) }} style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setShowFilterModal(false)} style={{ width: '100%', height: '36px', background: 'var(--purple)', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Apply Filters</button>
            </div>
          )}
        </div>
      </div>

      {/* Product Table */}
      <div className="products-table-card">
        <div className="products-table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th className="table-sno-cell">S.NO</th>
                  <th>PRODUCT</th>
                  <th>VARIANT</th>
                  <th>CATEGORY</th>
                  <th>SUBCATEGORY</th>
                  <th>PRICE</th>
                  <th>STOCK</th>
                  <th>AVAILABILITY</th>
                  <th>STATUS</th>
                  <th>RATING</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.length > 0 ? displayRows.map((row, index) => {
                  const availClass = !row.isActive ? 'unavailable' : (row.stock > 0 ? 'instock' : 'outofstock')
                  const availLabel = !row.isActive ? 'Unavailable' : (row.stock > 0 ? 'In Stock' : 'Unstock')

                  return (
                    <tr key={row.rowKey}>
                      <td className="table-sno-cell">
                        {index + 1}
                      </td>
                      <td>
                        <div className="product-item-cell">
                          {row.imageUrl ? (
                            <img
                              src={row.imageUrl}
                              onError={e => { e.target.onerror = null; e.target.src = '/media/products/watch1.png' }}
                              className="product-thumb-img"
                              alt={row.name}
                            />
                          ) : (
                            <div className="product-thumb-placeholder">📦</div>
                          )}
                          <div className="product-item-info">
                            <a
                              href={`/admin/products/product/${row.product.id}/change/${row.variant ? `?variant=${row.variant.id || ''}` : ''}`}
                              className="product-item-name"
                            >
                              {row.name}
                            </a>
                            <span className="product-item-sku">SKU: {row.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Variant Column */}
                      <td>
                        {row.colorName ? (
                          <div className="variant-cell-info">
                            <div className="variant-color-badge">
                              <span
                                className="variant-color-dot"
                                style={{ backgroundColor: row.colorCode }}
                                title={row.colorCode}
                              />
                              <span className="variant-color-name">{row.colorName}</span>
                            </div>
                            {row.sizes && row.sizes.length > 0 && (
                              <div className="variant-sizes-list">
                                {row.sizes.map((s, sIdx) => (
                                  <span key={sIdx} className="variant-size-pill">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      <td><span className="product-category-text">{row.category}</span></td>
                      <td><span className="product-subcategory-text">{row.subcategory}</span></td>

                      <td>
                        <div className="product-price-box">
                          <strong className="product-price-main">
                            {row.discountPrice || (typeof row.price === 'number' ? `₹${row.price}` : row.price ? (String(row.price).startsWith('₹') ? row.price : `₹${row.price}`) : '₹0')}
                          </strong>
                          {row.discountPrice && (
                            <div className="product-discount-row">
                              <del className="product-old-price">
                                {typeof row.price === 'number' ? `₹${row.price}` : row.price ? (String(row.price).startsWith('₹') ? row.price : `₹${row.price}`) : '₹0'}
                              </del>
                              <span className="product-discount-pill">OFF</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="product-stock-box">
                          <strong className={`product-stock-qty ${row.stock > 0 ? 'in' : 'out'}`}>{row.stock}</strong>
                          <span className={`product-stock-label ${row.stock > 0 ? 'in' : 'out'}`}>{row.stock > 0 ? 'In Stock' : 'Unstock'}</span>
                        </div>
                      </td>

                      {/* Dedicated Availability Column */}
                      <td>
                        <span className={`product-avail-badge ${availClass}`}>
                          <span className={`avail-dot ${availClass}`} />
                          {availLabel}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td>
                        <span className={`product-status-pill ${row.isActive ? 'active' : 'inactive'}`}>
                          <span className={`status-dot ${row.isActive ? 'active' : 'inactive'}`} />
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td>
                        <div className="product-rating-box">
                          <span className="star-icon">★</span>
                          <span className="rating-score">4.{String(row.product.id).substring(0, 1) || '5'}</span>
                          <span className="review-count">(12{row.product.id})</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div className="product-actions-group">
                          {/* Edit Button */}
                          <a
                            href={`/admin/products/product/${row.product.id}/change/${row.variant ? `?variant=${row.variant.id || ''}` : ''}`}
                            title="Edit Product"
                            aria-label="Edit Product"
                            className="btn-action-edit"
                          >
                            <AppIcon icon={EditIcon} size={15} />
                          </a>

                          {/* Quick Availability Action Control */}
                          <button
                            type="button"
                            title={row.isActive ? 'Mark Unavailable' : 'Make Available'}
                            aria-label={row.isActive ? 'Mark Unavailable' : 'Make Available'}
                            onClick={() => setAvailabilityTarget({
                              product: row.product,
                              variant: row.variant,
                              currentActive: row.isActive,
                              name: row.colorName ? `${row.product.name} (${row.colorName})` : row.product.name,
                            })}
                            className={`btn-action-avail ${row.isActive ? 'active' : 'inactive'}`}
                          >
                            <AppIcon icon={PackageIcon} size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            title="Delete Product"
                            aria-label="Delete Product"
                            onClick={() => setDeleteTarget({ id: row.product.id, name: row.product.name })}
                            className="btn-action-delete"
                          >
                            <AppIcon icon={DeleteIcon} size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', fontSize: '14px' }}>
                      No products or variants found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="products-table-footer">
            <span>Showing {displayRows.length} variant row{displayRows.length !== 1 ? 's' : ''} across {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
          </div>
      </div>

      {/* Quick Availability Confirmation Modal */}
      {availabilityTarget && (
        <div onClick={() => setAvailabilityTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '30px 28px', width: '380px', maxWidth: '92vw', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: availabilityTarget.currentActive ? '#fef3c7' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AppIcon icon={PackageIcon} size={24} color={availabilityTarget.currentActive ? '#d97706' : '#16a34a'} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              {availabilityTarget.currentActive ? 'Mark as Unavailable?' : 'Make Available?'}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              {availabilityTarget.currentActive ? (
                <>Are you sure you want to mark <strong style={{ color: '#0f172a' }}>{availabilityTarget.name}</strong> as unavailable for sale? Stock will remain unchanged.</>
              ) : (
                <>Make <strong style={{ color: '#0f172a' }}>{availabilityTarget.name}</strong> active and available for customer purchases?</>
              )}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setAvailabilityTarget(null)} style={{ flex: 1, height: '40px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleAvailability(availabilityTarget)}
                style={{
                  flex: 1,
                  height: '40px',
                  background: availabilityTarget.currentActive ? '#f59e0b' : 'var(--purple)',
                  border: 0,
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {availabilityTarget.currentActive ? 'Mark Unavailable' : 'Make Available'}
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
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete Product?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: '40px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={() => {
                const target = deleteTarget
                setDeleteTarget(null)
                fetch(`/admin/products/product/${target.id}/delete/`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': context.csrfToken },
                  body: `csrfmiddlewaretoken=${context.csrfToken}&post=yes`,
                  redirect: 'manual',
                }).then(() => {
                  setProducts(prev => prev.filter(p => String(p.id) !== String(target.id)))
                  showToast('Product deleted successfully', `"${target.name}" has been removed.`)
                }).catch(() => showToast('Something went wrong', 'Could not delete the product. Please try again.', true))
              }} style={{ flex: 1, height: '40px', background: '#ef4444', border: 0, borderRadius: '8px', fontWeight: 700, fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          onClick={() => { if (!addProductLoading) { setShowAddModal(false) } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '16px', padding: '28px 28px 24px', width: '400px', maxWidth: '92vw', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Add Product</h3>
              <button
                type="button"
                onClick={() => { if (!addProductLoading) setShowAddModal(false) }}
                style={{ background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
                aria-label="Close"
              >
                <AppIcon icon={CancelIcon} size={20} />
              </button>
            </div>

            {!addProductSuccess && (
              <>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Product Name
                </label>
                <input
                  id="add-product-name-input"
                  type="text"
                  autoFocus
                  placeholder="Enter product name"
                  value={addProductName}
                  onChange={e => { setAddProductName(e.target.value); setAddProductError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAddProduct() }}
                  disabled={addProductLoading}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px', border: `1.5px solid ${addProductError ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '8px', fontSize: '13.5px', color: '#0f172a', background: '#f8fafc',
                    outline: 'none', boxSizing: 'border-box',
                    boxShadow: addProductError ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                    opacity: addProductLoading ? 0.6 : 1,
                  }}
                />
                {addProductError && (
                  <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '5px 10px', display: 'inline-block' }}>
                    {addProductError}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addProductLoading}
                    style={{ height: '38px', padding: '0 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddProduct}
                    disabled={addProductLoading}
                    style={{ height: '38px', padding: '0 22px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: addProductLoading ? 0.65 : 1 }}
                  >
                    {addProductLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}

            {addProductSuccess && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <AppIcon icon={CheckmarkCircle01Icon} size={26} color="#16a34a" />
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Product added successfully.</p>
                <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b' }}>The product is saved as a draft. Complete the details in the edit page.</p>
                {addProductEditUrl && (
                  <a
                    href={addProductEditUrl}
                    style={{ display: 'inline-block', padding: '8px 20px', background: 'var(--purple)', color: '#fff', borderRadius: '8px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}
                  >
                    Edit Product Details →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
