/**
 * ProductForm.jsx
 * Unified single form for Moxie Admin Product Creation & Editing.
 * Directly submits to Django backend without DOM portals or infinite submit loops.
 */
import { useState, useEffect } from 'react'
import ColorVariantSection from './ColorVariantSection'
import VariantCard from './VariantCard'
import CustomSelect from '../Common/CustomSelect'
import { getDjangoContext } from '../../utils/djangoContext'
import './ProductForm.css'

export default function ProductForm() {
  const context = getDjangoContext()
  const initial = context.initialData || {}

  const [formData, setFormData] = useState({
    name: initial.name || '',
    category: initial.category || '',
    subcategory: initial.subcategory || '',
    description: initial.description || '',
    shipping_charge: initial.shipping_charge !== undefined ? initial.shipping_charge : '0.00'
  })

  const [productMedia, setProductMedia] = useState({
    video: initial.video || null,
    video_name: initial.video_name || '',
    new_video: null,
    remove_video: false,
    existing_images: initial.existing_images || initial.images || [],
    new_images: [],
    deleted_image_ids: [],
    primary_image_id: (initial.images && initial.images.find(img => img.is_primary)?.id) || null,
    primary_image_index: 0
  })

  const [variants, setVariants] = useState(() => {
    return (context.existingVariants || []).map(v => ({
      ...v,
      temp_id: v.temp_id || ('v-' + (v.id || Date.now())),
      sizes: Array.isArray(v.sizes) ? v.sizes : [],
      existing_images: v.existing_images || v.images || [],
      new_images: [],
      deleted_image_ids: v.deleted_image_ids || [],
      primary_image_id: v.primary_image_id || (v.images && v.images.find(img => img.is_primary)?.id) || (v.existing_images && v.existing_images.find(img => img.is_primary)?.id) || null,
      primary_image_index: v.primary_image_index !== undefined ? v.primary_image_index : 0,
      video: v.video || null,
      video_name: v.video_name || '',
      new_video: null,
      remove_video: false
    }))
  })
  const [isSaving, setIsSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const [categories, setCategories] = useState(() => context.categories || [])
  const [subcategories, setSubcategories] = useState(() => {
    const list = context.subcategories || []
    return list.map(s => ({
      ...s,
      categoryId: s.categoryId || s.category_id
    }))
  })

  useEffect(() => {
    // If categories are empty from Django context, dynamically fetch from API
    if (!categories || categories.length === 0) {
      fetch('/api/categories/', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          const results = Array.isArray(data) ? data : (data.results || [])
          if (results.length > 0) {
            setCategories(results.map(c => ({ id: c.id, name: c.name, slug: c.slug })))
            const allSubs = []
            results.forEach(c => {
              if (Array.isArray(c.subcategories)) {
                c.subcategories.forEach(sub => {
                  allSubs.push({
                    id: sub.id,
                    name: sub.name,
                    slug: sub.slug,
                    categoryId: c.id,
                    category_id: c.id
                  })
                })
              }
            })
            if (allSubs.length > 0) {
              setSubcategories(allSubs)
            }
          }
        })
        .catch(err => console.error('Error fetching categories:', err))
    }
  }, [])

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMsg])

  // Filter subcategories based on selected category
  const filteredSubcategories = subcategories.filter(
    sub => String(sub.categoryId || sub.category_id) === String(formData.category)
  )

  // Category and subcategory identification for sizing
  const selectedCatObj = categories.find(c => String(c.id) === String(formData.category))
  const selectedSubObj = subcategories.find(s => String(s.id) === String(formData.subcategory))
  const catText = `${selectedCatObj?.name || ''} ${selectedCatObj?.slug || ''} ${selectedSubObj?.name || ''} ${selectedSubObj?.slug || ''}`.toLowerCase()

  const isShoeCategory = /shoe|footwear|sneaker|slipper|slider/i.test(catText)
  const isClothingCategory = /shirt|clothing|t-shirt|top|pant|dress/i.test(catText)
  const sizeType = isShoeCategory ? 'shoe' : (isClothingCategory ? 'clothing' : null)

  useEffect(() => {
    // If category changes and subcategories are loaded, reset subcategory only if it no longer belongs
    if (formData.category && formData.subcategory && subcategories.length > 0) {
      const match = subcategories.find(
        s => String(s.id) === String(formData.subcategory) && String(s.categoryId || s.category_id) === String(formData.category)
      )
      if (!match && filteredSubcategories.length > 0) {
        setFormData(prev => ({ ...prev, subcategory: '' }))
      }
    }
  }, [formData.category, subcategories, filteredSubcategories.length])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleProductVideoChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.mp4', '.webm'].includes(ext)) {
      showValidationError('Unsupported video format. Please upload an MP4 or WEBM file.')
      e.target.value = ''
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      showValidationError('Video size exceeds the allowed limit (50MB).')
      e.target.value = ''
      return
    }

    setProductMedia(prev => ({
      ...prev,
      new_video: file,
      remove_video: false
    }))
    e.target.value = ''
  }

  const handleRemoveProductVideo = () => {
    setProductMedia(prev => ({
      ...prev,
      video: null,
      video_name: '',
      new_video: null,
      remove_video: true
    }))
  }

  const showValidationError = (msg) => {
    setIsSaving(false)
    setToastMsg({ type: 'error', text: msg })
    const toast = document.getElementById('moxie-toast')
    const titleEl = document.getElementById('moxie-toast-title')
    const msgEl = document.getElementById('moxie-toast-msg')
    const icon = document.getElementById('moxie-toast-icon')
    if (toast) {
      toast.style.borderLeftColor = '#ef4444'
      if (icon) icon.textContent = '⚠️'
      if (titleEl) titleEl.textContent = 'Product could not be saved'
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
  }

  const handleSaveProduct = () => {
    const form = document.getElementById('product-form')
    if (!form) return

    // 1. Validate Product Name
    if (!formData.name || !formData.name.trim()) {
      showValidationError('Please enter a Product Name.')
      return
    }

    // 2. Validate Category
    if (!formData.category) {
      showValidationError('Please select a Category.')
      return
    }

    // 3. Validate Subcategory (only if this category has subcategories)
    if (filteredSubcategories.length > 0 && !formData.subcategory) {
      showValidationError('Please select a Subcategory.')
      return
    }

    // 4. Validate Description
    if (!formData.description || !formData.description.trim()) {
      showValidationError('Please enter a Product Description.')
      return
    }

    // 5. Validate Color Variants (at least 1 required)
    if (!variants || variants.length === 0) {
      showValidationError('Please add at least one Color Variant.')
      return
    }

    // 6. Validate each variant
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      const vName = v.color_name ? `"${v.color_name}"` : `Variant #${i + 1}`

      if (!v.color_name || !v.color_name.trim()) {
        showValidationError(`Please enter a color name for Variant #${i + 1}.`)
        return
      }

      if (v.price === '' || v.price === null || isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0) {
        showValidationError(`Please enter a valid original price for color variant ${vName}.`)
        return
      }

      if (v.discount_price !== '' && v.discount_price !== null && v.discount_price !== undefined) {
        const disc = parseFloat(v.discount_price)
        const orig = parseFloat(v.price)
        if (isNaN(disc) || disc < 0) {
          showValidationError(`Please enter a valid discount price for color variant ${vName}.`)
          return
        }
        if (disc > 0 && disc >= orig) {
          showValidationError('Discount price must be less than the original price.')
          return
        }
      }

      if (v.stock === '' || v.stock === null || isNaN(parseInt(v.stock, 10)) || parseInt(v.stock, 10) < 0) {
        showValidationError(`Please enter a valid stock quantity for color variant ${vName}.`)
        return
      }

      if (sizeType && (!v.sizes || v.sizes.length === 0)) {
        showValidationError(`Please select at least one available size for color variant ${vName}.`)
        return
      }

      const totalImages = (v.existing_images ? v.existing_images.length : 0) + (v.new_images ? v.new_images.length : 0)
      if (totalImages === 0) {
        showValidationError(`Please upload at least one image for color variant: ${v.color_name || 'Variant #' + (i + 1)}`)
        return
      }
    }

    setIsSaving(true)

    // Append main product video inputs
    form.querySelectorAll('input[name="product_video"]').forEach(el => el.remove())
    form.querySelectorAll('input[name="remove_product_video"]').forEach(el => el.remove())

    if (productMedia.new_video) {
      const fi = document.createElement('input')
      fi.type = 'file'
      fi.name = 'product_video'
      fi.style.display = 'none'
      const dt = new DataTransfer()
      dt.items.add(productMedia.new_video)
      fi.files = dt.files
      form.appendChild(fi)
    } else if (productMedia.remove_video) {
      const fi = document.createElement('input')
      fi.type = 'hidden'
      fi.name = 'remove_product_video'
      fi.value = '1'
      form.appendChild(fi)
    }

    // Append variant image & video file inputs to form
    form.querySelectorAll('input[name^="variant_img_"]').forEach(el => el.remove())
    form.querySelectorAll('input[name^="variant_video_"]').forEach(el => el.remove())

    variants.forEach((v, vIdx) => {
      if (v.new_images && v.new_images.length > 0) {
        v.new_images.forEach((file, fIdx) => {
          const fi = document.createElement('input')
          fi.type = 'file'
          fi.name = `variant_img_${vIdx}_${fIdx}`
          fi.style.display = 'none'
          const dt = new DataTransfer()
          dt.items.add(file)
          fi.files = dt.files
          form.appendChild(fi)
        })
      }

      if (v.new_video) {
        const fi = document.createElement('input')
        fi.type = 'file'
        fi.name = `variant_video_${vIdx}`
        fi.style.display = 'none'
        const dt = new DataTransfer()
        dt.items.add(v.new_video)
        fi.files = dt.files
        form.appendChild(fi)
      }
    })

    // Synchronize hidden inputs
    let payloadInput = form.querySelector('input[name="variant_payload_json"]')
    if (!payloadInput) {
      payloadInput = document.createElement('input')
      payloadInput.type = 'hidden'
      payloadInput.name = 'variant_payload_json'
      form.appendChild(payloadInput)
    }
    payloadInput.value = JSON.stringify(variants.map(v => ({
      ...v,
      remove_video: Boolean(v.remove_video)
    })))

    let priceInput = form.querySelector('input[name="price"]')
    if (priceInput) priceInput.value = computedPrice

    let discInput = form.querySelector('input[name="discount_price"]')
    if (discInput) discInput.value = computedDiscountPrice

    let stockInput = form.querySelector('input[name="stock"]')
    if (stockInput) stockInput.value = computedTotalStock

    // Submit single unified form directly to Django backend
    HTMLFormElement.prototype.submit.call(form)
  }

  // Calculate top price/stock for main product row
  const firstVariant = variants && variants.length > 0 ? variants[0] : null
  const computedPrice = firstVariant && firstVariant.price ? firstVariant.price : '0'
  const computedDiscountPrice = firstVariant && firstVariant.discount_price ? firstVariant.discount_price : ''
  const computedTotalStock = variants ? variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0) : 0

  return (
    <div className="product-editor-page">
      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          background: '#ffffff',
          borderLeft: toastMsg.type === 'error' ? '4px solid #ef4444' : '4px solid #10b981',
          boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          borderRadius: '10px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '450px'
        }}>
          <span style={{ fontSize: '20px' }}>{toastMsg.type === 'error' ? '⚠️' : '✅'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
              {toastMsg.type === 'error' ? 'Validation Error' : 'Success'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              {toastMsg.text}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="product-editor-shell">
        {/* Page Header */}
        <div className="product-form-header">
          <h1 className="product-form-title">
            {context.isAdd ? 'Add New Product' : `Edit Product: ${context.originalName}`}
          </h1>
          <p className="product-form-subtitle">
            Create product information, pricing, variants and inventory.
          </p>
        </div>

        <form
          encType="multipart/form-data"
          action=""
          method="post"
          id="product-form"
          onSubmit={(e) => { e.preventDefault(); handleSaveProduct() }}
          noValidate
        >
          {/* Hidden inputs */}
          <input type="hidden" name="csrfmiddlewaretoken" value={context.csrfToken} />
          <input type="hidden" name="price" value={computedPrice} />
          <input type="hidden" name="discount_price" value={computedDiscountPrice} />
          <input type="hidden" name="stock" value={computedTotalStock} />
          <input type="hidden" name="is_active" value="on" />
          <input type="hidden" name="_save" value="Save Product" />
          <input type="hidden" name="variant_payload_json" value={JSON.stringify(variants)} />

          {context.hasErrors && (
            <p id="product-error-banner" className="errornote">
              Product could not be saved. Please correct the errors below.
            </p>
          )}

          {/* Main 2-Column Editor Layout */}
          <div className="product-editor-layout">

            {/* LEFT COLUMN: Main Form */}
            <div className="product-editor-main">

              {/* 1. Product Information Card */}
              <div className="product-card product-info-panel">
                <div className="product-card-header">
                  <h2>Product Information</h2>
                  <p>Basic product identity and catalogue placement.</p>
                </div>

                <div className="card-fields-stack">
                  {/* Product Name (Full Row) */}
                  <div className="field">
                    <label>
                      Product Name <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  {/* Category + Subcategory (Same Row) */}
                  <div className="two-column-fields">
                    <div className="field">
                      <label>
                        Category <span className="req-star">*</span>
                      </label>
                      <CustomSelect
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        placeholder="-- Select Category --"
                        options={[
                          { value: '', label: '-- Select Category --' },
                          ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                        ]}
                        width="100%"
                        height="44px"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Subcategory {filteredSubcategories.length > 0 && <span className="req-star">*</span>}
                      </label>
                      <CustomSelect
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleInputChange}
                        placeholder="-- Select Subcategory --"
                        options={[
                          { value: '', label: '-- Select Subcategory --' },
                          ...filteredSubcategories.map(sub => ({ value: sub.id, label: sub.name }))
                        ]}
                        width="100%"
                        height="44px"
                      />
                    </div>
                  </div>

                  {/* Shipping Charge (Full Row) */}
                  <div className="field">
                    <label>
                      Product Shipping Charge (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="shipping_charge"
                      value={formData.shipping_charge}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Description (Full Row) */}
                  <div className="field">
                    <label>
                      Description <span className="req-star">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Write comprehensive product description..."
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Product Media Card */}
              <div className="product-card product-media-panel">
                <div className="product-card-header">
                  <h2>Product Media</h2>
                  <p>Upload showcase video and media for this product catalogue.</p>
                </div>

                <div className="card-fields-stack">
                  {/* Product Video (Optional) */}
                  <div className="field">
                    <div className="variant-images-heading" style={{ marginBottom: '4px' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6256E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>Product Video (Optional)</span>
                    </div>

                    <div className="variant-video-box">
                      {productMedia.new_video ? (
                        <div className="video-preview-card">
                          <video
                            src={URL.createObjectURL(productMedia.new_video)}
                            controls
                            playsInline
                            preload="metadata"
                            className="video-preview-player"
                          />
                          <div className="video-preview-meta">
                            <div className="video-preview-info">
                              <span className="video-preview-name">{productMedia.new_video.name}</span>
                              <span className="video-preview-size">
                                {(productMedia.new_video.size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveProductVideo}
                              className="video-remove-btn"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              <span>Remove Video</span>
                            </button>
                          </div>
                        </div>
                      ) : (productMedia.video && !productMedia.remove_video) ? (
                        <div className="video-preview-card">
                          <video
                            src={productMedia.video}
                            controls
                            playsInline
                            preload="metadata"
                            className="video-preview-player"
                          />
                          <div className="video-preview-meta">
                            <div className="video-preview-info">
                              <span className="video-preview-name">{productMedia.video_name || 'Main Product Video'}</span>
                              <span className="video-preview-tag">Saved</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveProductVideo}
                              className="video-remove-btn"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              <span>Remove Video</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="video-upload-dropzone">
                          <div className="video-upload-content">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="23 7 16 12 23 17 23 7"></polygon>
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                            <div className="video-upload-text">
                              <span className="video-upload-title">Upload Main Product Video</span>
                              <span className="video-upload-hint">MP4 or WEBM (Max 50MB)</span>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/*"
                            onChange={handleProductVideoChange}
                            className="video-file-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Color Variants Card */}
              <ColorVariantSection
                variants={variants}
                setVariants={setVariants}
                sizeType={sizeType}
              />

              {/* 3. Bottom Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/admin/products/product/' }}
                  className="product-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  onClick={(e) => { e.preventDefault(); handleSaveProduct(); }}
                  className="product-save-btn"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Variant Summary */}
            <div className="product-editor-sidebar">
              <div className="variant-summary-card">
                <div className="variant-summary-header">
                  <h3>Variant Summary</h3>
                  <span className="variant-count-badge">
                    {variants.length} {variants.length === 1 ? 'Variant' : 'Variants'}
                  </span>
                </div>

                <div className="variant-summary-body">
                  {variants.length > 0 ? (
                    <div className="variant-summary-list">
                      {variants.map((v, i) => (
                        <VariantCard
                          key={v.temp_id || v.id || i}
                          variant={v}
                          index={i}
                          showSizes={Boolean(sizeType)}
                          onDelete={(idx) => setVariants(variants.filter((_, itemIdx) => itemIdx !== idx))}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="variant-summary-empty">
                      <p className="variant-summary-empty-title">No variants yet.</p>
                      <p className="variant-summary-empty-desc">
                        Your color options will appear here when colors are added.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
