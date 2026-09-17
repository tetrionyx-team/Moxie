import React, { useState, useMemo, useEffect } from 'react';
import {
  AppIcon,
  SparklesIcon,
  FireIcon,
  FlashIcon,
  TagIcon,
  CheckIcon,
  ClockIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  UploadIcon,
  ImageIcon,
} from '../../icons';
import './FeaturedProductsPage.css';

export default function FeaturedProductsPage() {
  const ctx = window.DJANGO_CONTEXT || {};
  const initialFeatured = ctx.featuredProductsList || [];
  const csrfToken = ctx.csrfToken || '';

  const [featuredItems, setFeaturedItems] = useState(initialFeatured);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State - Product Information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCharge, setShippingCharge] = useState('0.00');

  // Form State - Variants
  const [variants, setVariants] = useState([]);

  // Form State - Featured Settings
  const [featureType, setFeatureType] = useState('HOT_SALE');
  const [badgeText, setBadgeText] = useState('HOT SALE');
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [displayImageFile, setDisplayImageFile] = useState(null);
  const [displayImagePreview, setDisplayImagePreview] = useState('');

  // Sizing mode for optional size chips
  const [showSizing, setShowSizing] = useState(false);
  const sizeChips = ['S', 'M', 'L', 'XL', 'XXL', '7', '8', '9', '10'];

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch initial or refreshed data
  const refreshData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin-featured-products/', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setFeaturedItems(data.featured_products || []);
      }
    } catch (err) {
      console.error('Failed to load featured products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Campaign Status Helper
  const getCampaignStatus = (item) => {
    if (!item.is_active) return { label: 'DISABLED', className: 'disabled' };
    const now = new Date();
    if (item.start_date && new Date(item.start_date) > now) {
      return { label: 'SCHEDULED', className: 'scheduled' };
    }
    if (item.end_date && new Date(item.end_date) <= now) {
      return { label: 'EXPIRED', className: 'expired' };
    }
    return { label: 'LIVE', className: 'live' };
  };

  // Stats
  const stats = useMemo(() => {
    const total = featuredItems.length;
    const hotSale = featuredItems.filter((i) => i.feature_type === 'HOT_SALE').length;
    const trending = featuredItems.filter((i) => i.feature_type === 'TRENDING').length;
    const offer = featuredItems.filter((i) => i.feature_type === 'OFFER').length;
    const active = featuredItems.filter((i) => i.is_active).length;
    return { total, hotSale, trending, offer, active };
  }, [featuredItems]);

  // Filtered List
  const filteredList = useMemo(() => {
    return featuredItems.filter((item) => {
      if (activeTab === 'HOT_SALE' && item.feature_type !== 'HOT_SALE') return false;
      if (activeTab === 'TRENDING' && item.feature_type !== 'TRENDING') return false;
      if (activeTab === 'OFFER' && item.feature_type !== 'OFFER') return false;
      if (activeTab === 'ACTIVE' && !item.is_active) return false;
      if (activeTab === 'INACTIVE' && item.is_active) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const pName = item.product?.name?.toLowerCase() || '';
        const bText = item.badge_text?.toLowerCase() || '';
        const fType = item.feature_type?.toLowerCase() || '';
        if (!pName.includes(q) && !bText.includes(q) && !fType.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [featuredItems, activeTab, searchTerm]);

  // Helper: create empty variant template
  const createEmptyVariant = (index = 0) => ({
    temp_id: 'v-' + Date.now() + '-' + index,
    id: null,
    color_name: index === 0 ? 'Standard' : '',
    color_code: '#000000',
    price: '',
    discount_price: '',
    stock: '10',
    sizes: [],
    is_active: true,
    existing_images: [],
    new_images: [],
    deleted_image_ids: [],
    primary_image_id: null,
    primary_image_index: 0,
  });

  // Handle open Add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setShippingCharge('0.00');
    setVariants([createEmptyVariant(0)]);
    setFeatureType('HOT_SALE');
    setBadgeText('HOT SALE');
    const maxOrder = featuredItems.reduce((max, cur) => Math.max(max, cur.sort_order || 0), 0);
    setSortOrder(maxOrder + 1);
    setIsActive(true);
    setStartDate('');
    setEndDate('');
    setDisplayImageFile(null);
    setDisplayImagePreview('');
    setShowSizing(false);
    setFormError('');
    setShowModal(true);
  };

  // Handle open Edit modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    const prod = item.product || {};
    setName(prod.name || '');
    setDescription(prod.description || '');
    setShippingCharge(prod.shipping_charge !== undefined ? String(prod.shipping_charge) : '0.00');

    // Load existing variants
    const rawVariants = prod.variants || [];
    if (rawVariants.length > 0) {
      setVariants(
        rawVariants.map((v, idx) => ({
          ...v,
          temp_id: v.temp_id || 'v-' + (v.id || Date.now()) + '-' + idx,
          sizes: Array.isArray(v.sizes) ? v.sizes : [],
          existing_images: v.existing_images || v.images || [],
          new_images: [],
          deleted_image_ids: [],
          primary_image_id:
            v.primary_image_id ||
            (v.images && v.images.find((img) => img.is_primary)?.id) ||
            (v.existing_images && v.existing_images.find((img) => img.is_primary)?.id) ||
            null,
          primary_image_index: v.primary_image_index !== undefined ? v.primary_image_index : 0,
        }))
      );
      // If any variant has sizes, show sizing
      if (rawVariants.some((v) => Array.isArray(v.sizes) && v.sizes.length > 0)) {
        setShowSizing(true);
      } else {
        setShowSizing(false);
      }
    } else {
      setVariants([createEmptyVariant(0)]);
      setShowSizing(false);
    }

    setFeatureType(item.feature_type || 'HOT_SALE');
    setBadgeText(item.badge_text || '');
    setSortOrder(item.sort_order !== undefined ? item.sort_order : 1);
    setIsActive(item.is_active !== undefined ? item.is_active : true);
    setStartDate(item.start_date ? item.start_date.slice(0, 16) : '');
    setEndDate(item.end_date ? item.end_date.slice(0, 16) : '');
    setDisplayImageFile(null);
    setDisplayImagePreview(item.display_image || '');
    setFormError('');
    setShowModal(true);
  };

  // Change Feature Type
  const handleFeatureTypeChange = (type) => {
    setFeatureType(type);
    if (!badgeText || badgeText === 'HOT SALE' || badgeText === 'TRENDING NOW' || badgeText === 'SPECIAL OFFER') {
      if (type === 'HOT_SALE') setBadgeText('HOT SALE');
      else if (type === 'TRENDING') setBadgeText('TRENDING NOW');
      else if (type === 'OFFER') setBadgeText('SPECIAL OFFER');
    }
  };

  // Showcase Image File Change
  const handleDisplayImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDisplayImageFile(file);
      setDisplayImagePreview(URL.createObjectURL(file));
    }
  };

  const handleClearDisplayImage = () => {
    setDisplayImageFile(null);
    setDisplayImagePreview('');
  };

  // Variant management handlers
  const handleAddVariant = () => {
    setVariants((prev) => [...prev, createEmptyVariant(prev.length)]);
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      setFormError('At least one color variant is required.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateVariant = (index, field, val) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleToggleSize = (vIndex, sizeVal) => {
    setVariants((prev) => {
      const copy = [...prev];
      const curSizes = copy[vIndex].sizes || [];
      if (curSizes.includes(sizeVal)) {
        copy[vIndex] = { ...copy[vIndex], sizes: curSizes.filter((s) => s !== sizeVal) };
      } else {
        copy[vIndex] = { ...copy[vIndex], sizes: [...curSizes, sizeVal] };
      }
      return copy;
    });
  };

  const handleNewVariantFiles = (vIndex, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setVariants((prev) => {
      const copy = [...prev];
      copy[vIndex] = {
        ...copy[vIndex],
        new_images: [...(copy[vIndex].new_images || []), ...files],
      };
      return copy;
    });
  };

  const handleRemoveNewImage = (vIndex, imgIndex) => {
    setVariants((prev) => {
      const copy = [...prev];
      const updated = copy[vIndex].new_images.filter((_, i) => i !== imgIndex);
      let pIdx = copy[vIndex].primary_image_index;
      if (pIdx >= updated.length) pIdx = 0;
      copy[vIndex] = { ...copy[vIndex], new_images: updated, primary_image_index: pIdx };
      return copy;
    });
  };

  const handleRemoveExistingImage = (vIndex, imgId) => {
    setVariants((prev) => {
      const copy = [...prev];
      const currentList = copy[vIndex].existing_images || copy[vIndex].images || [];
      const updatedList = currentList.filter((img) => String(img.id) !== String(imgId));
      const delIds = [...(copy[vIndex].deleted_image_ids || []), imgId];
      let pId = copy[vIndex].primary_image_id;
      if (String(pId) === String(imgId)) pId = null;

      copy[vIndex] = {
        ...copy[vIndex],
        existing_images: updatedList,
        images: updatedList,
        deleted_image_ids: delIds,
        primary_image_id: pId,
      };
      return copy;
    });
  };

  const handleSetPrimaryExisting = (vIndex, imgId) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[vIndex] = {
        ...copy[vIndex],
        primary_image_id: imgId,
        primary_image_index: -1,
      };
      return copy;
    });
  };

  const handleSetPrimaryNew = (vIndex, imgIdx) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[vIndex] = {
        ...copy[vIndex],
        primary_image_index: imgIdx,
        primary_image_id: null,
      };
      return copy;
    });
  };

  // Submit Save (Create or Update Product + FeaturedProduct atomically)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Validate Product Info
    if (!name.trim()) {
      setFormError('Please enter a product name.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please enter a product description.');
      return;
    }

    // 2. Validate Variants
    if (!variants || variants.length === 0) {
      setFormError('Please add at least one color variant.');
      return;
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const vLabel = v.color_name ? `"${v.color_name}"` : `Variant #${i + 1}`;

      if (!v.color_name || !v.color_name.trim()) {
        setFormError(`Please enter a color name for ${vLabel}.`);
        return;
      }

      if (v.price === '' || v.price === null || isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0) {
        setFormError(`Please enter a valid original price for ${vLabel}.`);
        return;
      }

      if (v.discount_price !== '' && v.discount_price !== null && v.discount_price !== undefined) {
        const disc = parseFloat(v.discount_price);
        const orig = parseFloat(v.price);
        if (isNaN(disc) || disc < 0) {
          setFormError(`Please enter a valid discount price for ${vLabel}.`);
          return;
        }
        if (disc > 0 && disc >= orig) {
          setFormError(`Discount price for ${vLabel} must be less than the original price (₹${orig}).`);
          return;
        }
      }

      if (v.stock === '' || v.stock === null || isNaN(parseInt(v.stock, 10)) || parseInt(v.stock, 10) < 0) {
        setFormError(`Please enter a valid stock quantity for ${vLabel}.`);
        return;
      }

      const totalImgs =
        (v.existing_images ? v.existing_images.length : 0) +
        (v.new_images ? v.new_images.length : 0);
      if (totalImgs === 0) {
        setFormError(`Please upload at least one image for variant: ${vLabel}.`);
        return;
      }
    }

    // 3. Validate Dates
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setFormError('Campaign end date must be later than start date.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();

      // Product basic data
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('shipping_charge', shippingCharge || '0.00');

      // Featured settings
      formData.append('feature_type', featureType);
      formData.append('badge_text', badgeText.trim());
      formData.append('sort_order', sortOrder || 0);
      formData.append('is_active', isActive);

      if (startDate) formData.append('start_date', startDate);
      else formData.append('start_date', '');

      if (endDate) formData.append('end_date', endDate);
      else formData.append('end_date', '');

      if (displayImageFile) {
        formData.append('display_image', displayImageFile);
      } else if (displayImagePreview === '' && editingItem?.display_image) {
        formData.append('display_image', '');
      }

      // Variant payload & binary files
      const serializedVariants = variants.map((v) => ({
        id: v.id || null,
        temp_id: v.temp_id,
        color_name: v.color_name,
        color_code: v.color_code,
        price: v.price,
        discount_price: v.discount_price || null,
        stock: v.stock,
        sizes: v.sizes || [],
        is_active: v.is_active !== undefined ? v.is_active : true,
        deleted_image_ids: v.deleted_image_ids || [],
        primary_image_id: v.primary_image_id || null,
        primary_image_index: v.primary_image_index !== undefined ? v.primary_image_index : 0,
      }));

      formData.append('variant_payload_json', JSON.stringify(serializedVariants));

      // Append binary files for each variant
      variants.forEach((v, vIdx) => {
        if (v.new_images && v.new_images.length > 0) {
          v.new_images.forEach((fileObj, fIdx) => {
            formData.append(`variant_img_${vIdx}_${fIdx}`, fileObj);
          });
        }
      });

      const url = editingItem
        ? `/api/admin-featured-products/${editingItem.id}/`
        : '/api/admin-featured-products/';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });

      const resData = await res.json();

      if (res.ok) {
        showToast(
          editingItem
            ? 'Featured product updated successfully!'
            : 'Product created and added to Home showcase!'
        );
        setShowModal(false);
        refreshData();
      } else {
        const errorMsg =
          resData.name?.[0] ||
          resData.variants?.[0] ||
          resData.detail ||
          resData.error ||
          'Failed to save product. Please check input values.';
        setFormError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      setFormError('An unexpected network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (item) => {
    try {
      const res = await fetch(`/api/admin-featured-products/${item.id}/toggle-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFeaturedItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: data.is_active } : i))
        );
        showToast(data.message || 'Status updated successfully!');
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while updating status', 'error');
    }
  };

  // Delete / Remove from Featured
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin-featured-products/${deleteTarget.id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        },
      });
      if (res.ok) {
        setFeaturedItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        showToast('Removed from Featured Products. Product was NOT deleted from catalogue.');
        setDeleteTarget(null);
      } else {
        showToast('Failed to remove featured product', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while removing featured product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="featured-products-container">
      {/* Toast */}
      {toast && (
        <div className={`featured-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '⚠️'} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="featured-header">
        <div className="featured-header-info">
          <h1>
            <span className="featured-header-icon-wrap">
              <AppIcon icon={SparklesIcon} size={20} color="#C99B45" />
            </span>
            Featured Products (Home Showcase)
          </h1>
          <p>
            Create and manage products for the special Home page Hot Sale, Trending, and Offer showcase.
          </p>
        </div>
        <button className="btn-primary-add" onClick={handleOpenAdd}>
          <AppIcon icon={PlusIcon} size={16} color="#C99B45" />
          <span>Add Featured Product</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="featured-stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <AppIcon icon={SparklesIcon} size={20} color="#0f172a" />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Featured</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon hot">
            <AppIcon icon={FireIcon} size={20} color="#dc2626" />
          </div>
          <div className="stat-details">
            <span className="stat-label">Hot Sale</span>
            <span className="stat-value">{stats.hotSale}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon trending">
            <AppIcon icon={FlashIcon} size={20} color="#2563eb" />
          </div>
          <div className="stat-details">
            <span className="stat-label">Trending</span>
            <span className="stat-value">{stats.trending}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon offer">
            <AppIcon icon={TagIcon} size={20} color="#ca8a04" />
          </div>
          <div className="stat-details">
            <span className="stat-label">Special Offer</span>
            <span className="stat-value">{stats.offer}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <AppIcon icon={CheckIcon} size={20} color="#16a34a" />
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Items</span>
            <span className="stat-value">{stats.active}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs in clean row */}
      <div className="featured-filter-row">
        <div className="filter-tabs">
          <button
            className={`filter-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <AppIcon icon={SparklesIcon} size={16} />
            <span>All ({stats.total})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'HOT_SALE' ? 'active' : ''}`}
            onClick={() => setActiveTab('HOT_SALE')}
          >
            <AppIcon icon={FireIcon} size={16} color={activeTab === 'HOT_SALE' ? '#ffffff' : '#dc2626'} />
            <span>Hot Sale ({stats.hotSale})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'TRENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('TRENDING')}
          >
            <AppIcon icon={FlashIcon} size={16} color={activeTab === 'TRENDING' ? '#ffffff' : '#2563eb'} />
            <span>Trending ({stats.trending})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'OFFER' ? 'active' : ''}`}
            onClick={() => setActiveTab('OFFER')}
          >
            <AppIcon icon={TagIcon} size={16} color={activeTab === 'OFFER' ? '#ffffff' : '#ca8a04'} />
            <span>Offer ({stats.offer})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            <AppIcon icon={CheckIcon} size={16} color={activeTab === 'ACTIVE' ? '#ffffff' : '#16a34a'} />
            <span>Active ({stats.active})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'INACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('INACTIVE')}
          >
            <AppIcon icon={ClockIcon} size={16} color={activeTab === 'INACTIVE' ? '#ffffff' : '#64748b'} />
            <span>Inactive ({stats.total - stats.active})</span>
          </button>
        </div>
      </div>

      {/* Search Input directly below filters aligned to left edge */}
      <div className="featured-search-row">
        <div className="search-input-wrap">
          <span className="search-icon-pos">
            <AppIcon icon={SearchIcon} size={18} color="#667085" />
          </span>
          <input
            type="text"
            className="featured-search-input"
            placeholder="Search featured products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content: Empty State or Grid Table */}
      {filteredList.length === 0 ? (
        <div className="empty-state-wrap">
          <div className="empty-state-icon-circle">
            <AppIcon icon={SparklesIcon} size={30} color="#C99B45" />
          </div>
          <h3>No featured products yet</h3>
          <p>
            {searchTerm
              ? 'No products match your search query.'
              : 'Add products to Hot Sale, Trending or Offer to feature them on the Home page.'}
          </p>
          <button className="btn-primary-add" onClick={handleOpenAdd}>
            <AppIcon icon={PlusIcon} size={16} color="#C99B45" />
            <span>Add Featured Product</span>
          </button>
        </div>
      ) : (
        <div className="featured-table-scroll">
          <div className="featured-table-inner">
            {/* Table Header Row */}
            <div className="featured-table-header featured-table-grid">
              <div className="grid-cell col-order">ORDER</div>
              <div className="grid-cell col-product">SHOWCASE / PRODUCT</div>
              <div className="grid-cell col-type">FEATURE TYPE</div>
              <div className="grid-cell col-badge">BADGE TEXT</div>
              <div className="grid-cell col-price">PRODUCT PRICE</div>
              <div className="grid-cell col-status">STATUS</div>
              <div className="grid-cell col-actions">ACTIONS</div>
            </div>

            {/* Table Body Rows */}
            <div className="featured-table-body">
              {filteredList.map((item) => {
                const p = item.product || {};
                const imgUrl = item.showcase_image || p.image || '/static/images/placeholder.png';
                const fTypeClass = (item.feature_type || '').toLowerCase();

                return (
                  <div key={item.id} className="featured-table-row featured-table-grid">
                    {/* 1. ORDER */}
                    <div className="grid-cell col-order">
                      <span className="order-badge">#{item.sort_order}</span>
                    </div>

                    {/* 2. SHOWCASE / PRODUCT */}
                    <div className="grid-cell col-product">
                      <div className="product-cell">
                        <img
                          src={imgUrl}
                          alt={p.name || 'Featured Product'}
                          className="featured-thumb"
                          onError={(e) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                        <div className="product-cell-info">
                          <span className="product-cell-name" title={p.name}>
                            {p.name || 'Unknown Product'}
                          </span>
                          <span className="product-cell-meta">
                            {item.display_image ? 'Custom Showcase Image' : 'Main Variant Image'}
                            {p.stock !== undefined && p.stock <= 0 && (
                              <span style={{ color: '#ef4444' }}>• Out of stock</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. FEATURE TYPE */}
                    <div className="grid-cell col-type">
                      <span className={`type-badge ${fTypeClass}`}>
                        {item.feature_type === 'HOT_SALE' && (
                          <AppIcon icon={FireIcon} size={15} color="#b91c1c" />
                        )}
                        {item.feature_type === 'TRENDING' && (
                          <AppIcon icon={FlashIcon} size={15} color="#3730a3" />
                        )}
                        {item.feature_type === 'OFFER' && (
                          <AppIcon icon={TagIcon} size={15} color="#92400e" />
                        )}
                        <span>
                          {item.feature_type === 'HOT_SALE' && 'Hot Sale'}
                          {item.feature_type === 'TRENDING' && 'Trending'}
                          {item.feature_type === 'OFFER' && 'Offer'}
                        </span>
                      </span>
                    </div>

                    {/* 4. BADGE TEXT */}
                    <div className="grid-cell col-badge">
                      {item.badge_text ? (
                        <span className="badge-text-tag">{item.badge_text}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                      )}
                    </div>

                    {/* 5. PRODUCT PRICE */}
                    <div className="grid-cell col-price">
                      <div className="price-stack">
                        <span className="product-price-tag">
                          ₹{parseFloat(p.discount_price || p.price || 0).toLocaleString('en-IN')}
                        </span>
                        {p.discount_price && parseFloat(p.discount_price) < parseFloat(p.price) && (
                          <span className="original-price-strikethrough">
                            ₹{parseFloat(p.price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 6. STATUS */}
                    <div className="grid-cell col-status">
                      <div className="status-cell-stack">
                        <button
                          className="status-toggle-btn"
                          onClick={() => handleToggleStatus(item)}
                          title="Click to toggle active status"
                        >
                          <span className={`status-pill ${item.is_active ? 'active' : 'inactive'}`}>
                            {item.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </button>
                        {(() => {
                          const statusObj = getCampaignStatus(item);
                          return (
                            <span
                              className={`campaign-pill ${statusObj.className}`}
                              title={`Campaign status: ${statusObj.label}`}
                            >
                              {statusObj.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 7. ACTIONS */}
                    <div className="grid-cell col-actions">
                      <div className="action-btns-group">
                        <button
                          className="action-btn edit"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit product and showcase"
                        >
                          <AppIcon icon={EditIcon} size={16} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => setDeleteTarget(item)}
                          title="Remove from showcase"
                        >
                          <AppIcon icon={DeleteIcon} size={16} color="#dc2626" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Full Product Creation Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal-dialog modal-dialog-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2>
                  {editingItem ? 'Edit Featured Product' : 'Create & Add Featured Product'}
                </h2>
                <p className="modal-header-desc">
                  {editingItem
                    ? 'Update product details, color variants, pricing, and showcase settings.'
                    : 'Create a new purchasable product and feature it directly on the Home showcase.'}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error-banner">
                    ⚠️ {formError}
                  </div>
                )}

                {/* 1. PRODUCT INFORMATION SECTION */}
                <div className="modal-section-card">
                  <div className="modal-section-header">
                    <span className="section-step-badge">1</span>
                    <div>
                      <h3 className="section-title">Product Information</h3>
                      <p className="section-subtitle">Basic product identity and catalogue details</p>
                    </div>
                  </div>

                  <div className="section-fields-grid">
                    {/* Product Name */}
                    <div className="form-group full-width">
                      <label>
                        Product Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Moxie Chrono Series Luxury Watch"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Shipping Charge */}
                    <div className="form-group full-width">
                      <label>Shipping Charge (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="0.00"
                        value={shippingCharge}
                        onChange={(e) => setShippingCharge(e.target.value)}
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group full-width">
                      <label>
                        Product Description <span className="required">*</span>
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="Describe the product craftsmanship, materials, features..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. COLOR VARIANTS SECTION */}
                <div className="modal-section-card">
                  <div className="modal-section-header between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="section-step-badge">2</span>
                      <div>
                        <h3 className="section-title">Color Variants & Pricing</h3>
                        <p className="section-subtitle">
                          Configure color, pricing, stock quantity, and product images
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="add-variant-btn-small"
                      onClick={handleAddVariant}
                    >
                      <AppIcon icon={PlusIcon} size={14} color="#C99B45" />
                      <span>Add Color Variant</span>
                    </button>
                  </div>

                  <div className="variants-editor-stack">
                    {variants.map((v, vIndex) => (
                      <div key={v.temp_id || v.id || vIndex} className="variant-editor-card">
                        {/* Variant Header */}
                        <div className="variant-editor-top">
                          <div className="variant-editor-title">
                            <span
                              className="variant-color-dot"
                              style={{ backgroundColor: v.color_code || '#000000' }}
                            />
                            <span className="variant-color-heading">
                              {v.color_name ? v.color_name : `Variant #${vIndex + 1}`}
                            </span>
                            <span className="variant-idx-pill">#{vIndex + 1}</span>
                          </div>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              className="variant-remove-action"
                              onClick={() => handleRemoveVariant(vIndex)}
                              title="Remove this color variant"
                            >
                              <AppIcon icon={DeleteIcon} size={14} color="#ef4444" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* Variant Inputs Grid */}
                        <div className="variant-inputs-grid">
                          {/* Color Name */}
                          <div className="form-group">
                            <label>
                              Color Name <span className="required">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Midnight Black, Gold, Silver"
                              value={v.color_name}
                              onChange={(e) => handleUpdateVariant(vIndex, 'color_name', e.target.value)}
                              required
                            />
                          </div>

                          {/* Color Hex */}
                          <div className="form-group">
                            <label>
                              Color HEX <span className="required">*</span>
                            </label>
                            <div className="color-hex-row">
                              <input
                                type="color"
                                className="color-thumb-picker"
                                value={v.color_code || '#000000'}
                                onChange={(e) => handleUpdateVariant(vIndex, 'color_code', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder="#000000"
                                value={v.color_code}
                                onChange={(e) => handleUpdateVariant(vIndex, 'color_code', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Original Price */}
                          <div className="form-group">
                            <label>
                              Original Price (₹) <span className="required">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-input"
                              placeholder="e.g. 4999"
                              value={v.price}
                              onChange={(e) => handleUpdateVariant(vIndex, 'price', e.target.value)}
                              required
                            />
                          </div>

                          {/* Discount Price */}
                          <div className="form-group">
                            <label>Discount Price (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-input"
                              placeholder="e.g. 2999"
                              value={v.discount_price || ''}
                              onChange={(e) => handleUpdateVariant(vIndex, 'discount_price', e.target.value)}
                            />
                            <span className="field-hint">Leave empty if no discount</span>
                          </div>

                          {/* Stock Quantity */}
                          <div className="form-group">
                            <label>
                              Stock Quantity <span className="required">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="form-input"
                              placeholder="10"
                              value={v.stock}
                              onChange={(e) => handleUpdateVariant(vIndex, 'stock', e.target.value)}
                              required
                            />
                          </div>

                          {/* Optional Sizing Toggle */}
                          <div className="form-group">
                            <label>Available Sizes</label>
                            <div className="size-chips-container">
                              {sizeChips.map((sz) => {
                                const isSel = (v.sizes || []).includes(sz);
                                return (
                                  <button
                                    key={sz}
                                    type="button"
                                    className={`size-chip-btn ${isSel ? 'selected' : ''}`}
                                    onClick={() => handleToggleSize(vIndex, sz)}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="field-hint">Optional (watches / accessories can leave empty)</span>
                          </div>
                        </div>

                        {/* Variant Images Uploader & Gallery */}
                        <div className="variant-images-section">
                          <label className="variant-images-label">
                            <AppIcon icon={ImageIcon} size={15} color="#C99B45" />
                            <span>Variant Images (At least 1 required) <span className="required">*</span></span>
                          </label>

                          <div className="variant-images-list">
                            {/* Existing Saved Images */}
                            {(v.existing_images || v.images || []).map((img) => {
                              const isPrimary = String(v.primary_image_id) === String(img.id);
                              return (
                                <div key={img.id} className="image-card-thumb">
                                  <img src={img.url} alt="" className="thumb-img" />
                                  <div className="thumb-overlay">
                                    <button
                                      type="button"
                                      className={`primary-badge-btn ${isPrimary ? 'active' : ''}`}
                                      onClick={() => handleSetPrimaryExisting(vIndex, img.id)}
                                      title={isPrimary ? 'Primary Image' : 'Set as Primary Image'}
                                    >
                                      {isPrimary ? '★ Primary' : 'Set Primary'}
                                    </button>
                                    <button
                                      type="button"
                                      className="delete-img-btn"
                                      onClick={() => handleRemoveExistingImage(vIndex, img.id)}
                                      title="Delete Image"
                                    >
                                      <AppIcon icon={DeleteIcon} size={12} color="#ffffff" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* New Uploaded Images */}
                            {(v.new_images || []).map((fileObj, fIdx) => {
                              const previewUrl = URL.createObjectURL(fileObj);
                              const isPrimary = v.primary_image_index === fIdx && !v.primary_image_id;
                              return (
                                <div key={fIdx} className="image-card-thumb">
                                  <img src={previewUrl} alt={fileObj.name} className="thumb-img" />
                                  <div className="thumb-overlay">
                                    <button
                                      type="button"
                                      className={`primary-badge-btn ${isPrimary ? 'active' : ''}`}
                                      onClick={() => handleSetPrimaryNew(vIndex, fIdx)}
                                      title={isPrimary ? 'Primary Image' : 'Set as Primary Image'}
                                    >
                                      {isPrimary ? '★ Primary' : 'Set Primary'}
                                    </button>
                                    <button
                                      type="button"
                                      className="delete-img-btn"
                                      onClick={() => handleRemoveNewImage(vIndex, fIdx)}
                                      title="Delete Image"
                                    >
                                      <AppIcon icon={DeleteIcon} size={12} color="#ffffff" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add More Files Dropzone */}
                            <label className="image-upload-tile">
                              <AppIcon icon={UploadIcon} size={20} color="#C99B45" />
                              <span>Upload Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  handleNewVariantFiles(vIndex, e);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. FEATURED SHOWCASE SETTINGS SECTION */}
                <div className="modal-section-card">
                  <div className="modal-section-header">
                    <span className="section-step-badge">3</span>
                    <div>
                      <h3 className="section-title">Home Showcase Settings</h3>
                      <p className="section-subtitle">
                        Configure showcase placement, badge, campaign dates and promo image
                      </p>
                    </div>
                  </div>

                  <div className="section-fields-grid">
                    {/* Feature Type */}
                    <div className="form-group">
                      <label>
                        Feature Type <span className="required">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={featureType}
                        onChange={(e) => handleFeatureTypeChange(e.target.value)}
                      >
                        <option value="HOT_SALE">🔥 Hot Sale</option>
                        <option value="TRENDING">⚡ Trending</option>
                        <option value="OFFER">🏷️ Offer / Special Deal</option>
                      </select>
                    </div>

                    {/* Badge Text */}
                    <div className="form-group">
                      <label>Badge Text</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. HOT SALE, TRENDING NOW, SPECIAL OFFER"
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                      />
                    </div>

                    {/* Display Order */}
                    <div className="form-group">
                      <label>Display Order</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>

                    {/* Active Status */}
                    <div className="form-group">
                      <label>Active Status</label>
                      <select
                        className="form-select"
                        value={isActive ? 'true' : 'false'}
                        onChange={(e) => setIsActive(e.target.value === 'true')}
                      >
                        <option value="true">✅ Active (Show on Home)</option>
                        <option value="false">⏸️ Inactive (Hidden)</option>
                      </select>
                    </div>

                    {/* Start Date */}
                    <div className="form-group">
                      <label>Start Date & Time (Optional)</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    {/* End Date */}
                    <div className="form-group">
                      <label>End Date & Time (Optional)</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>

                    {/* Showcase Banner / Promo Image (Full Row) */}
                    <div className="form-group full-width">
                      <label>Showcase Promotional Hero Image (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input"
                        onChange={handleDisplayImageChange}
                      />
                      <span className="field-hint">
                        Optional custom hero/promotional graphic for the Home section. If left empty, the product primary image is used automatically.
                      </span>

                      {displayImagePreview && (
                        <div className="image-preview-wrap">
                          <img
                            src={displayImagePreview}
                            alt="Showcase hero preview"
                            className="image-preview-img"
                          />
                          <button
                            type="button"
                            className="clear-image-btn"
                            onClick={handleClearDisplayImage}
                          >
                            Remove Custom Hero Image
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-save"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Featured Product'
                    : 'Create & Add Featured Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remove from Featured Products</h2>
              <button className="modal-close-btn" onClick={() => setDeleteTarget(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                Are you sure you want to remove <strong>{deleteTarget.product?.name}</strong> from the Home featured showcase?
              </p>
              <div
                style={{
                  background: '#f0fdf4',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  border: '1px solid #bbf7d0',
                }}
              >
                ℹ️ <strong>Safe Action:</strong> This only removes the product from the Home featured showcase. The actual product remains in Products, Search, Cart, Checkout, and Orders.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={submitting}
                onClick={handleConfirmDelete}
              >
                {submitting ? 'Removing...' : 'Remove Featured Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
