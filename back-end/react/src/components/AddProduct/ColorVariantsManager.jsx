import { AppIcon, ImageIcon, DeleteIcon, UploadIcon } from '../../icons'

export default function ColorVariantsManager({ variants = [], setVariants, sizeType = null }) {
  const shoeSizes = ['7', '8', '9', '10']
  const clothingSizes = ['S', 'M', 'L', 'XL']
  const sizeOptions = sizeType === 'shoe' ? shoeSizes : (sizeType === 'clothing' ? clothingSizes : [])

  const addVariant = () => {
    setVariants([...variants, {
      temp_id: 'v-' + Date.now(),
      id: null,
      color_name: '',
      color_code: '#000000',
      price: '',
      discount_price: '',
      stock: '0',
      sizes: [],
      is_active: true,
      existing_images: [],
      new_images: [],
      deleted_image_ids: [],
      primary_image_id: null,
      primary_image_index: 0,
      video: null,
      video_name: '',
      new_video: null,
      remove_video: false,
    }])
  }

  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index))

  const updateVariant = (index, field, val) => {
    const copy = [...variants]
    copy[index][field] = val
    setVariants(copy)
  }

  const toggleSize = (vIndex, sizeVal) => {
    const copy = [...variants]
    const currentSizes = copy[vIndex].sizes || []
    if (currentSizes.includes(sizeVal)) {
      copy[vIndex].sizes = currentSizes.filter(s => s !== sizeVal)
    } else {
      copy[vIndex].sizes = [...currentSizes, sizeVal]
    }
    setVariants(copy)
  }

  const handleNewFiles = (vIndex, e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const copy = [...variants]
    copy[vIndex].new_images = [...copy[vIndex].new_images, ...files]
    setVariants(copy)
  }

  const removeNewImage = (vIndex, imgIndex) => {
    const copy = [...variants]
    copy[vIndex].new_images = copy[vIndex].new_images.filter((_, i) => i !== imgIndex)
    if (copy[vIndex].primary_image_index >= copy[vIndex].new_images.length) {
      copy[vIndex].primary_image_index = 0
    }
    setVariants(copy)
  }

  const removeExistingImage = (vIndex, imgId) => {
    const copy = [...variants]
    const currentList = copy[vIndex].existing_images || copy[vIndex].images || []
    const updatedList = currentList.filter(img => String(img.id) !== String(imgId))
    copy[vIndex].existing_images = updatedList
    copy[vIndex].images = updatedList
    if (!copy[vIndex].deleted_image_ids) copy[vIndex].deleted_image_ids = []
    copy[vIndex].deleted_image_ids.push(imgId)
    if (String(copy[vIndex].primary_image_id) === String(imgId)) copy[vIndex].primary_image_id = null
    setVariants(copy)
  }

  const setPrimaryExisting = (vIndex, imgId) => {
    const copy = [...variants]
    copy[vIndex].primary_image_id = imgId
    copy[vIndex].primary_image_index = -1
    setVariants(copy)
  }

  const setPrimaryNew = (vIndex, imgIdx) => {
    const copy = [...variants]
    copy[vIndex].primary_image_index = imgIdx
    copy[vIndex].primary_image_id = null
    setVariants(copy)
  }

  const handleVariantVideo = (vIndex, e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.mp4', '.webm'].includes(ext)) {
      alert('Unsupported video format. Please upload an MP4 or WEBM file.')
      e.target.value = ''
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Video size exceeds the allowed limit (50MB).')
      e.target.value = ''
      return
    }

    const copy = [...variants]
    copy[vIndex].new_video = file
    copy[vIndex].remove_video = false
    setVariants(copy)
    e.target.value = ''
  }

  const removeVariantVideo = (vIndex) => {
    const copy = [...variants]
    copy[vIndex].video = null
    copy[vIndex].video_name = ''
    copy[vIndex].new_video = null
    copy[vIndex].remove_video = true
    setVariants(copy)
  }

  return (
    <div className="color-variants-wrapper">
      {/* Header */}
      <div className="color-variants-header">
        <div>
          <h2 className="color-variants-title">Color Variants</h2>
          <p className="color-variants-subtitle">
            Configure price, inventory, sizes and images for each color.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="add-variant-btn"
        >
          <span className="add-variant-btn-plus">+</span>
          <span>Add Color Variant</span>
        </button>
      </div>

      {/* Empty State */}
      {variants.length === 0 ? (
        <div className="empty-variant-state">
          <p className="empty-variant-title">No color variants yet</p>
          <p className="empty-variant-subtitle">
            Add a color to configure price, stock, sizes and images.
          </p>
          <button
            type="button"
            onClick={addVariant}
            className="empty-variant-add-btn"
          >
            + Add First Variant
          </button>
        </div>
      ) : (
        <div className="variants-list">
          {variants.map((v, vIndex) => {
            const currentSizes = v.sizes || []

            return (
              <div
                key={v.temp_id || v.id || vIndex}
                className="variant-card-item"
              >
                {/* Variant Card Header */}
                <div className="variant-item-header">
                  <div className="variant-item-badge">
                    <span
                      className="variant-item-dot"
                      style={{ backgroundColor: v.color_code || '#000000' }}
                    />
                    <div className="variant-item-name">
                      {v.color_name || 'Color Name'}
                    </div>
                    <span className="variant-item-num">
                      Variant #{vIndex + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(vIndex)}
                    className="variant-remove-btn"
                  >
                    <AppIcon icon={DeleteIcon} size={13} color="#E5484D" />
                    <span>Remove Variant</span>
                  </button>
                </div>

                {/* 2-Column Fields Grid */}
                <div className="variant-fields">
                  {/* Row 1, Col 1: Color Name */}
                  <div className="field">
                    <label>
                      Color Name <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Black"
                      value={v.color_name}
                      onChange={(e) => updateVariant(vIndex, 'color_name', e.target.value)}
                      required
                    />
                  </div>

                  {/* Row 1, Col 2: Color HEX */}
                  <div className="field">
                    <label>
                      Color HEX <span className="req-star">*</span>
                    </label>
                    <div className="color-hex-input-group">
                      <input
                        type="color"
                        value={v.color_code || '#000000'}
                        onChange={(e) => updateVariant(vIndex, 'color_code', e.target.value)}
                        className="color-picker-thumb"
                      />
                      <input
                        type="text"
                        placeholder="#000000"
                        value={v.color_code}
                        onChange={(e) => updateVariant(vIndex, 'color_code', e.target.value)}
                        className="color-hex-text-input"
                      />
                    </div>
                  </div>

                  {/* Row 2, Col 1: Original Price */}
                  <div className="field">
                    <label>
                      Original Price (₹) <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1000"
                      value={v.price}
                      onChange={(e) => updateVariant(vIndex, 'price', e.target.value)}
                      required
                      min="0"
                      step="any"
                    />
                  </div>

                  {/* Row 2, Col 2: Discount Price */}
                  <div className="field">
                    <label>
                      Discount Price (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 600"
                      value={v.discount_price || ''}
                      onChange={(e) => updateVariant(vIndex, 'discount_price', e.target.value)}
                      min="0"
                      step="any"
                    />
                  </div>

                  {/* Row 3, Col 1: Stock Quantity */}
                  <div className="field">
                    <label>
                      Stock Quantity <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={v.stock}
                      onChange={(e) => updateVariant(vIndex, 'stock', e.target.value)}
                      required
                      min="0"
                    />
                  </div>

                  {/* Row 3, Col 2 (Conditional): Multi-select Available Sizes */}
                  {sizeOptions.length > 0 && (
                    <div className="field">
                      <div className="size-options-header">
                        <label>
                          Available Sizes <span className="req-star">*</span>
                        </label>
                        {currentSizes.length > 0 && (
                          <span className="size-count-badge">
                            {currentSizes.length} selected
                          </span>
                        )}
                      </div>
                      <div className="size-options">
                        {sizeOptions.map((sz) => {
                          const isSelected = currentSizes.includes(sz)
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleSize(vIndex, sz)}
                              className={`size-chip ${isSelected ? 'selected' : ''}`}
                            >
                              {isSelected && <span className="size-chip-check">✓</span>}
                              <span className="size-chip-label">{sz}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Variant Images (Full Row) */}
                  <div className="field variant-images-field">
                    <div className="variant-images-heading">
                      <AppIcon icon={ImageIcon} size={15} color="#6256E8" />
                      <span>Variant Images</span>
                      <span className="req-star">*</span>
                    </div>

                    <div className="variant-images-list">
                      {/* Existing Saved Images */}
                      {(v.existing_images || v.images || []).map((img) => (
                        <div key={img.id} className="image-preview-row">
                          <img src={img.url} alt="" className="image-preview-thumb" />
                          <div className="image-preview-info">
                            <span className="image-preview-label">Saved Image</span>
                            <div className="image-preview-controls">
                              <label className="primary-img-checkbox">
                                <input
                                  type="checkbox"
                                  checked={String(v.primary_image_id) === String(img.id)}
                                  onChange={() => setPrimaryExisting(vIndex, img.id)}
                                />
                                Primary Image
                              </label>
                              <button
                                type="button"
                                onClick={() => removeExistingImage(vIndex, img.id)}
                                className="image-delete-btn"
                              >
                                <AppIcon icon={DeleteIcon} size={13} color="#EF4444" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* New Uploaded Images */}
                      {v.new_images && v.new_images.map((fileObj, fIdx) => {
                        const previewUrl = URL.createObjectURL(fileObj)
                        const isPrim = (v.primary_image_index === fIdx && !v.primary_image_id)
                        return (
                          <div key={fIdx} className="image-preview-row">
                            <img src={previewUrl} alt="" className="image-preview-thumb" />
                            <div className="image-preview-info">
                              <span className="image-preview-label">{fileObj.name}</span>
                              <div className="image-preview-controls">
                                <label className="primary-img-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={isPrim}
                                    onChange={() => setPrimaryNew(vIndex, fIdx)}
                                  />
                                  Primary Image
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeNewImage(vIndex, fIdx)}
                                  className="image-delete-btn"
                                >
                                  <AppIcon icon={DeleteIcon} size={13} color="#EF4444" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Image Upload Input */}
                      {(((v.existing_images || v.images) ? (v.existing_images || v.images).length : 0) + (v.new_images ? v.new_images.length : 0)) < 20 && (
                        <div className="image-upload-dropzone">
                          <div className="image-upload-icon-box">
                            <AppIcon icon={UploadIcon} size={16} color="#64748B" />
                          </div>
                          <div className="image-upload-input-wrap">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleNewFiles(vIndex, e)
                                  e.target.value = ''
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variant Video (Optional) (Full Row) */}
                  <div className="field variant-video-field">
                    <div className="variant-images-heading">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6256E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <span>Variant Video (Optional)</span>
                    </div>

                    <div className="variant-video-box">
                      {v.new_video ? (
                        <div className="video-preview-card">
                          <video
                            src={URL.createObjectURL(v.new_video)}
                            controls
                            playsInline
                            preload="metadata"
                            className="video-preview-player"
                          />
                          <div className="video-preview-meta">
                            <div className="video-preview-info">
                              <span className="video-preview-name">{v.new_video.name}</span>
                              <span className="video-preview-size">
                                {(v.new_video.size / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVariantVideo(vIndex)}
                              className="video-remove-btn"
                            >
                              <AppIcon icon={DeleteIcon} size={13} color="#EF4444" />
                              <span>Remove Video</span>
                            </button>
                          </div>
                        </div>
                      ) : (v.video && !v.remove_video) ? (
                        <div className="video-preview-card">
                          <video
                            src={v.video}
                            controls
                            playsInline
                            preload="metadata"
                            className="video-preview-player"
                          />
                          <div className="video-preview-meta">
                            <div className="video-preview-info">
                              <span className="video-preview-name">{v.video_name || 'Saved Video'}</span>
                              <span className="video-preview-tag">Saved</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVariantVideo(vIndex)}
                              className="video-remove-btn"
                            >
                              <AppIcon icon={DeleteIcon} size={13} color="#EF4444" />
                              <span>Remove Video</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="video-upload-dropzone">
                          <div className="video-upload-content">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="23 7 16 12 23 17 23 7"></polygon>
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                            <div className="video-upload-text">
                              <span className="video-upload-title">Upload Color Variant Video</span>
                              <span className="video-upload-hint">MP4 or WEBM (Max 50MB)</span>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/*"
                            onChange={(e) => handleVariantVideo(vIndex, e)}
                            className="video-file-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
