import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import CustomSelect from '../Common/CustomSelect';
import './FeaturedProductsPage.css';

// Component for rendering crisp Apple / iOS style Emojis with fallback
function IosEmoji({ emoji, size = 18, className = '', alt = '' }) {
  const [imgError, setImgError] = useState(false);
  if (!emoji) return null;
  if (imgError) {
    return (
      <span className={`native-emoji ${className}`} style={{ fontSize: `${size}px`, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }
  const src = `https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple`;
  return (
    <img
      src={src}
      alt={alt || emoji}
      className={`ios-emoji-img ${className}`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setImgError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
}

export default function FeaturedProductsPage() {
  const ctx = window.DJANGO_CONTEXT || {};
  const initialFeatured = ctx.featuredProductsList || [];
  const csrfToken = ctx.csrfToken || '';
  const categoriesList = ctx.categoriesList || ctx.categories || [
    { id: 1, name: 'Luxury Watches' },
    { id: 2, name: 'Chronograph' },
    { id: 3, name: 'Automatic' },
    { id: 4, name: 'Vintage' },
    { id: 5, name: 'Women Watches' },
    { id: 6, name: 'Combos & Sets' },
  ];

  const [featuredItems, setFeaturedItems] = useState(initialFeatured);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Stepper state
  const [activeStep, setActiveStep] = useState(1);

  // Form State - Product Information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shippingCharge, setShippingCharge] = useState('0.00');
  const [category, setCategory] = useState('');
  const descRef = useRef(null);
  const emojiWrapRef = useRef(null);
  const [showDescEmoji, setShowDescEmoji] = useState(false);

  useEffect(() => {
    function handleClickOutsideEmoji(e) {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target)) {
        setShowDescEmoji(false);
      }
    }
    if (showDescEmoji) {
      document.addEventListener('mousedown', handleClickOutsideEmoji);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideEmoji);
  }, [showDescEmoji]);

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
  const sizeChips = ['S', 'M', 'L', 'XL', 'XXL', '7', '8', '9', '10'];

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Live Preview Countdown State (Initial 00, updates dynamically when endDate is selected)
  const [countdown, setCountdown] = useState({ days: '00', hours: '00', mins: '00', secs: '00' });

  useEffect(() => {
    if (!endDate) {
      setCountdown({ days: '00', hours: '00', mins: '00', secs: '00' });
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        setCountdown({ days: '00', hours: '00', mins: '00', secs: '00' });
        return;
      }
      const diff = Math.max(0, end.getTime() - now.getTime());
      const days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
      const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      setCountdown({ days, hours, mins, secs });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Description Rich Text Formatter
  const handleFormatDesc = (prefix, suffix = '') => {
    if (!descRef.current) return;
    const el = descRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selText = description.substring(start, end);
    const replacement = selText ? `${prefix}${selText}${suffix}` : `${prefix}${suffix}`;
    const nextVal = description.substring(0, start) + replacement + description.substring(end);
    if (nextVal.length <= 500) {
      setDescription(nextVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
      }, 0);
    }
  };

  const handleInsertEmoji = (emoji) => {
    if (!descRef.current) return;
    const el = descRef.current;
    const start = el.selectionStart || description.length;
    const nextVal = description.substring(0, start) + emoji + description.substring(start);
    if (nextVal.length <= 500) {
      setDescription(nextVal);
      setShowDescEmoji(false);
    }
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
    color_name: index === 0 ? 'Black' : '',
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
    setActiveStep(1);
    setName('');
    setDescription('');
    setShippingCharge('0.00');
    setCategory('');
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
    setFormError('');
    setShowModal(true);
  };

  // Handle open Edit modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setActiveStep(1);
    const prod = item.product || {};
    setName(prod.name || '');
    setDescription(prod.description || '');
    setShippingCharge(prod.shipping_charge !== undefined ? String(prod.shipping_charge) : '0.00');
    setCategory(prod.category?.id || prod.category || '');

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
    } else {
      setVariants([createEmptyVariant(0)]);
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

      {/* Unified Toolbar: Filter Tabs on Left, Search Bar on Right */}
      <div className="featured-toolbar-row">
        <div className="filter-tabs">
          <button
            className={`filter-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <AppIcon icon={SparklesIcon} size={15} />
            <span>All ({stats.total})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'HOT_SALE' ? 'active' : ''}`}
            onClick={() => setActiveTab('HOT_SALE')}
          >
            <AppIcon icon={FireIcon} size={15} color={activeTab === 'HOT_SALE' ? '#ffffff' : '#dc2626'} />
            <span>Hot Sale ({stats.hotSale})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'TRENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('TRENDING')}
          >
            <AppIcon icon={FlashIcon} size={15} color={activeTab === 'TRENDING' ? '#ffffff' : '#2563eb'} />
            <span>Trending ({stats.trending})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'OFFER' ? 'active' : ''}`}
            onClick={() => setActiveTab('OFFER')}
          >
            <AppIcon icon={TagIcon} size={15} color={activeTab === 'OFFER' ? '#ffffff' : '#ca8a04'} />
            <span>Offer ({stats.offer})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            <AppIcon icon={CheckIcon} size={15} color={activeTab === 'ACTIVE' ? '#ffffff' : '#16a34a'} />
            <span>Active ({stats.active})</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'INACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('INACTIVE')}
          >
            <AppIcon icon={ClockIcon} size={15} color={activeTab === 'INACTIVE' ? '#ffffff' : '#64748b'} />
            <span>Inactive ({stats.total - stats.active})</span>
          </button>
        </div>

        <div className="search-input-wrap">
          <span className="search-icon-pos">
            <AppIcon icon={SearchIcon} size={16} color="#667085" />
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

      {/* Add / Edit Full Product Creation Redesigned Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal-dialog modal-dialog-redesign"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header modal-header-redesign">
              <div className="modal-header-left">
                <div className="modal-header-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                    <path d="M3 6h18"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title">
                    {editingItem ? 'Edit Featured Product' : 'Create & Add Featured Product'}
                  </h2>
                  <p className="modal-subtitle">
                    {editingItem
                      ? 'Update product details, color variants, pricing, and showcase settings.'
                      : 'Create a new purchasable product and feature it directly on the Home showcase.'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)} aria-label="Close modal">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="modal-body modal-body-redesign">
                {formError && (
                  <div className="form-error-banner">
                    ⚠️ {formError}
                  </div>
                )}

                {/* Top Grid: Left Stepper, Center Product Info, Right Live Preview */}
                <div className="modal-top-grid">
                  {/* Left Column: Progress Stepper */}
                  <div className="modal-stepper-sidebar">
                    <div className={`stepper-item ${activeStep === 1 ? 'active' : ''}`} onClick={() => setActiveStep(1)}>
                      <div className="stepper-circle">1</div>
                      <div className="stepper-meta">
                        <strong className="stepper-title">Product Information</strong>
                        <span className="stepper-desc">Basic product details</span>
                      </div>
                    </div>

                    <div className="stepper-divider-line" />

                    <div className={`stepper-item ${activeStep === 2 ? 'active' : ''}`} onClick={() => setActiveStep(2)}>
                      <div className="stepper-circle">2</div>
                      <div className="stepper-meta">
                        <strong className="stepper-title">Color Variants & Pricing</strong>
                        <span className="stepper-desc">Configure color, price, stock & images</span>
                      </div>
                    </div>

                    <div className="stepper-divider-line" />

                    <div className={`stepper-item ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(3)}>
                      <div className="stepper-circle">3</div>
                      <div className="stepper-meta">
                        <strong className="stepper-title">Home Showcase Settings</strong>
                        <span className="stepper-desc">Set badge, display order and schedule</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Column: Card 1 - Product Information */}
                  <div className="modal-card-box card-product-info">
                    <div className="card-box-header">
                      <div className="card-box-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="card-box-title">Product Information</h3>
                        <p className="card-box-sub">Basic product identity and catalogue details</p>
                      </div>
                    </div>

                    <div className="card-box-fields">
                      {/* Product Name */}
                      <div className="form-group full-width">
                        <label className="field-label">
                          Product Name <span className="req-star">*</span>
                        </label>
                        <div className="input-with-icon">
                          <span className="input-icon-prefix">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                              <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                          </span>
                          <input
                            type="text"
                            className="form-input-styled"
                            placeholder="e.g. Moxie Chrono Series Luxury Watch"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* 2 Columns: Shipping & Category */}
                      <div className="fields-row-2col">
                        <div className="form-group">
                          <label className="field-label">Shipping Charge (₹)</label>
                          <div className="input-with-icon">
                            <span className="input-icon-prefix">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13"/>
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                                <circle cx="5.5" cy="18.5" r="2.5"/>
                                <circle cx="18.5" cy="18.5" r="2.5"/>
                              </svg>
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input-styled"
                              placeholder="0.00"
                              value={shippingCharge}
                              onChange={(e) => setShippingCharge(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="field-label">Category (Optional)</label>
                          <CustomSelect
                            value={category}
                            onChange={(e, val) => setCategory(val !== undefined ? val : (e?.target?.value || ''))}
                            options={[
                              { value: '', label: 'Select category' },
                              ...categoriesList.map((cat) => ({
                                value: String(cat.id || cat.name),
                                label: cat.name,
                              })),
                            ]}
                            placeholder="Select category"
                            width="100%"
                            height="40px"
                            prefixIcon={() => (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                              </svg>
                            )}
                            buttonStyle={{
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              color: '#0f172a',
                              background: '#ffffff',
                            }}
                            menuStyle={{
                              borderRadius: '10px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
                              zIndex: 10000,
                            }}
                          />
                        </div>
                      </div>

                      {/* Description with mini rich toolbar */}
                      <div className="form-group full-width">
                        <label className="field-label">
                          Product Description <span className="req-star">*</span>
                        </label>
                        <div className="description-rich-container">
                          <div className="rich-toolbar">
                            <div className="rich-tools-left">
                              <button type="button" className="toolbar-btn" onClick={() => handleFormatDesc('**', '**')} title="Bold">
                                <strong>B</strong>
                              </button>
                              <button type="button" className="toolbar-btn" onClick={() => handleFormatDesc('_', '_')} title="Italic">
                                <em>I</em>
                              </button>
                              <button type="button" className="toolbar-btn" onClick={() => handleFormatDesc('<u>', '</u>')} title="Underline">
                                <u>U</u>
                              </button>
                              <span className="toolbar-sep" />
                              <button type="button" className="toolbar-btn" onClick={() => handleFormatDesc('\n• ')} title="Bullet list">
                                •≡
                              </button>
                              <button type="button" className="toolbar-btn" onClick={() => handleFormatDesc('\n1. ')} title="Numbered list">
                                1.≡
                              </button>
                              <button type="button" className="toolbar-btn" onClick={() => handleFormatDesc('[', '](url)')} title="Link">
                                🔗
                              </button>
                            </div>

                            <div className="rich-tools-right">
                              <div className="emoji-picker-inline-wrap" ref={emojiWrapRef}>
                                <button
                                  type="button"
                                  className="toolbar-emoji-btn"
                                  onClick={() => setShowDescEmoji(!showDescEmoji)}
                                >
                                  <IosEmoji emoji="😄" size={15} />
                                  <span>Emoji</span>
                                </button>
                                {showDescEmoji && (
                                  <div className="desc-emoji-popover">
                                    {['✨', '🔥', '💎', '⭐', '⌚', '🏷️', '🚀', '👑', '💯', '🎯', '⚡', '🛍️', '🎁', '🎉', '❤️', '🌟', '💥', '📦', '🚚', '🏆'].map((em) => (
                                      <button
                                        key={em}
                                        type="button"
                                        className="desc-emoji-tile"
                                        onClick={() => handleInsertEmoji(em)}
                                        title={em}
                                      >
                                        <IosEmoji emoji={em} size={22} />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <textarea
                            ref={descRef}
                            className="rich-textarea-styled"
                            rows={3}
                            placeholder="Describe the product craftsmanship, materials, features..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                            required
                          />

                          <div className="rich-counter-row">
                            <span>{description.length}/500</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Preview Showcase Card */}
                  <div className="modal-preview-sidebar">
                    <div className="preview-sidebar-header">
                      <div className="preview-header-left">
                        <span className="preview-eye-circle">👁</span>
                        <span className="preview-title-text">
                          Live Preview <small>(Home Showcase)</small>
                        </span>
                      </div>
                      <span className="preview-how-badge">How it will look</span>
                    </div>

                    {(() => {
                      const firstVariant = variants[0] || {};
                      const origPriceNum = parseFloat(firstVariant.price) || 0;
                      const discPriceNum = firstVariant.discount_price ? parseFloat(firstVariant.discount_price) : 0;
                      const hasDiscount = origPriceNum > 0 && discPriceNum > 0 && discPriceNum < origPriceNum;
                      const discPercent = hasDiscount ? Math.round(((origPriceNum - discPriceNum) / origPriceNum) * 100) : 0;
                      const displayPrice = discPriceNum > 0 ? discPriceNum : (origPriceNum > 0 ? origPriceNum : 3000);
                      const displayOrigPrice = origPriceNum > 0 ? origPriceNum : (discPriceNum > 0 ? discPriceNum : 4000);
                      const previewImage = displayImagePreview || (firstVariant.new_images && firstVariant.new_images[0] ? URL.createObjectURL(firstVariant.new_images[0]) : null) || (firstVariant.existing_images && firstVariant.existing_images[0] ? firstVariant.existing_images[0].url : null) || null;
                      const activeColorName = firstVariant.color_name || 'Silver Blue';

                      return (
                        <div className="preview-product-card-mockup premium-showcase-card">
                          {/* Image Gallery Header */}
                          <div className="preview-image-wrap">
                            {previewImage ? (
                              <img
                                src={previewImage}
                                alt="Product preview"
                                className="preview-img"
                              />
                            ) : (
                              <div className="preview-empty-state">
                                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                  <circle cx="8.5" cy="8.5" r="1.5"/>
                                  <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <span className="preview-placeholder-title">No image uploaded</span>
                                <small className="preview-placeholder-hint">Add photos in Step 2</small>
                              </div>
                            )}

                            {/* Top Left Discount / Feature Badge */}
                            <div className="preview-top-badge">
                              <IosEmoji emoji="🔥" size={13} />
                              <span>{discPercent > 0 ? `${discPercent}% OFF` : (badgeText || '25% OFF')}</span>
                            </div>

                            {/* Top Right Wishlist Button */}
                            <button type="button" className="preview-heart-glass" aria-label="Wishlist">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              </svg>
                            </button>

                            {/* Navigation Arrows */}
                            <button type="button" className="preview-carousel-arrow left" aria-label="Previous image">
                              ‹
                            </button>
                            <button type="button" className="preview-carousel-arrow right" aria-label="Next image">
                              ›
                            </button>

                            {/* Bottom Dots */}
                            <div className="preview-dots-row">
                              <span className="preview-dot active" />
                              <span className="preview-dot" />
                              <span className="preview-dot" />
                              <span className="preview-dot" />
                            </div>

                            {/* Bottom Right Expand Button */}
                            <button type="button" className="preview-expand-glass" aria-label="Expand image">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 3 21 3 21 9"/>
                                <polyline points="9 21 3 21 3 15"/>
                                <line x1="21" y1="3" x2="14" y2="10"/>
                                <line x1="3" y1="21" x2="10" y2="14"/>
                              </svg>
                            </button>
                          </div>

                          {/* Card Content */}
                          <div className="preview-info-wrap">
                            {/* 1. Title & Rating Row */}
                            <div className="preview-title-rating-row">
                              <div className="preview-title-group">
                                <h3 className="preview-brand-title">{name.trim() || 'Moxie'}</h3>
                                <p className="preview-subtitle-text">
                                  {description ? (description.slice(0, 32) + (description.length > 32 ? '...' : '')) : 'Premium Chrono Series Watch'}
                                </p>
                              </div>
                              <div className="preview-rating-pill">
                                <span className="rating-star">⭐</span>
                                <strong className="rating-score">4.8</strong>
                                <span className="rating-count">(120)</span>
                              </div>
                            </div>

                            {/* 2. Pricing & Shipping Row */}
                            <div className="preview-price-shipping-row">
                              <div className="preview-price-stack">
                                <span className="preview-main-price">
                                  ₹{Number(displayPrice).toLocaleString('en-IN')}
                                </span>
                                {(hasDiscount || displayOrigPrice > displayPrice) && (
                                  <span className="preview-strikethrough-price">
                                    ₹{Number(displayOrigPrice).toLocaleString('en-IN')}
                                  </span>
                                )}
                                {(discPercent > 0 || hasDiscount) && (
                                  <span className="preview-discount-pill">
                                    {discPercent > 0 ? `${discPercent}% OFF` : '25% OFF'}
                                  </span>
                                )}
                              </div>
                              <div className="preview-shipping-badge">
                                <IosEmoji emoji="🚚" size={13} />
                                <span>{parseFloat(shippingCharge) === 0 ? 'Free Shipping' : `Shipping: ₹${shippingCharge}`}</span>
                              </div>
                            </div>

                            {/* 3. Offer Ends In Timer Bar */}
                            <div className="preview-offer-ends-strip">
                              <div className="offer-ends-label">
                                <span className="clock-blue-icon">🕒</span>
                                <span>Offer ends in</span>
                              </div>
                              <div className="offer-timer-boxes">
                                <div className="offer-time-cell">
                                  <strong>{countdown.days}</strong>
                                  <small>DAYS</small>
                                </div>
                                <div className="offer-time-cell">
                                  <strong>{countdown.hours}</strong>
                                  <small>HOURS</small>
                                </div>
                                <div className="offer-time-cell">
                                  <strong>{countdown.mins}</strong>
                                  <small>MINUTES</small>
                                </div>
                                <div className="offer-time-cell">
                                  <strong>{countdown.secs}</strong>
                                  <small>SECONDS</small>
                                </div>
                              </div>
                            </div>

                            {/* 4. Color Variants & Quantity Row */}
                            <div className="preview-color-qty-row">
                              <div className="preview-color-section">
                                <div className="preview-color-title">
                                  Color: <span>{activeColorName}</span>
                                </div>
                                <div className="preview-color-thumbs-stack">
                                  {variants.length > 0 ? (
                                    variants.slice(0, 4).map((v, idx) => (
                                      <div
                                        key={v.temp_id || idx}
                                        className={`preview-color-thumb-slot ${idx === 0 ? 'active' : ''}`}
                                        style={v.color_code ? { backgroundColor: v.color_code } : {}}
                                        title={v.color_name}
                                      >
                                        {v.existing_images && v.existing_images[0] ? (
                                          <img src={v.existing_images[0].url} alt="" className="thumb-mini-img" />
                                        ) : v.new_images && v.new_images[0] ? (
                                          <img src={URL.createObjectURL(v.new_images[0])} alt="" className="thumb-mini-img" />
                                        ) : null}
                                      </div>
                                    ))
                                  ) : (
                                    <>
                                      <div className="preview-color-thumb-slot active" style={{ backgroundColor: '#2563eb' }} />
                                      <div className="preview-color-thumb-slot" style={{ backgroundColor: '#0f172a' }} />
                                      <div className="preview-color-thumb-slot" style={{ backgroundColor: '#d97706' }} />
                                      <div className="preview-color-thumb-slot" style={{ backgroundColor: '#059669' }} />
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="preview-qty-section">
                                <span className="preview-qty-title">Quantity</span>
                                <div className="preview-qty-stepper">
                                  <button type="button" className="qty-step-btn">−</button>
                                  <span className="qty-step-val">1</span>
                                  <button type="button" className="qty-step-btn">+</button>
                                </div>
                              </div>
                            </div>

                            {/* 5. Add to Cart Full Width Button */}
                            <button type="button" className="preview-cta-cart-btn">
                              <span className="cta-cart-main">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="9" cy="21" r="1"/>
                                  <circle cx="20" cy="21" r="1"/>
                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                                </svg>
                                <span>Add to Cart</span>
                              </span>
                              <span className="cta-arrow-circle">
                                ➔
                              </span>
                            </button>

                            {/* 6. Trust Badges Strip */}
                            <div className="preview-trust-strip">
                              <div className="trust-item">
                                <div className="trust-icon-box blue">
                                  <IosEmoji emoji="🚚" size={13} />
                                </div>
                                <div className="trust-meta">
                                  <strong>Free Shipping</strong>
                                  <small>Across India</small>
                                </div>
                              </div>
                              <div className="trust-item">
                                <div className="trust-icon-box blue-shield">
                                  <IosEmoji emoji="🛡️" size={13} />
                                </div>
                                <div className="trust-meta">
                                  <strong>1 Year Warranty</strong>
                                  <small>Official Brand</small>
                                </div>
                              </div>
                              <div className="trust-item">
                                <div className="trust-icon-box amber">
                                  <IosEmoji emoji="📦" size={13} />
                                </div>
                                <div className="trust-meta">
                                  <strong>Easy Returns</strong>
                                  <small>7 Days</small>
                                </div>
                              </div>
                              <div className="trust-item">
                                <div className="trust-icon-box pink">
                                  <IosEmoji emoji="🎧" size={13} />
                                </div>
                                <div className="trust-meta">
                                  <strong>24/7 Support</strong>
                                  <small>We're here to help</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Section 2: Color Variants & Pricing */}
                <div className="modal-card-box card-variants-pricing">
                  <div className="card-box-header between">
                    <div className="card-box-header-left">
                      <span className="card-step-num-circle">2</span>
                      <div className="card-box-icon purple-tint">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="card-box-title">Color Variants & Pricing</h3>
                        <p className="card-box-sub">Configure color, pricing, stock quantity, and product images</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-add-variant-outline"
                      onClick={handleAddVariant}
                    >
                      <span>+</span>
                      <span>Add Color Variant</span>
                    </button>
                  </div>

                  <div className="variants-editor-stack">
                    {variants.map((v, vIndex) => (
                      <div key={v.temp_id || v.id || vIndex} className="variant-editor-card">
                        <div className="variant-card-top-row">
                          <div className="variant-title-group">
                            <span className="variant-drag-handle">⠿</span>
                            <strong className="variant-name-label">
                              {v.color_name ? `Variant ${vIndex + 1}: ${v.color_name}` : `Variant ${vIndex + 1}`}
                            </strong>
                          </div>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              className="variant-trash-btn"
                              onClick={() => handleRemoveVariant(vIndex)}
                              title="Delete variant"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Variant Inputs Row */}
                        <div className="variant-fields-row">
                          <div className="form-group flex-1">
                            <label className="field-label">Color Name <span className="req-star">*</span></label>
                            <input
                              type="text"
                              className="form-input-styled"
                              placeholder="e.g. Black"
                              value={v.color_name}
                              onChange={(e) => handleUpdateVariant(vIndex, 'color_name', e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group flex-1">
                            <label className="field-label">Color HEX <span className="req-star">*</span></label>
                            <div className="color-picker-input-group">
                              <input
                                type="color"
                                className="color-swatch-picker"
                                value={v.color_code || '#000000'}
                                onChange={(e) => handleUpdateVariant(vIndex, 'color_code', e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-input-styled hex-code-input"
                                placeholder="#000000"
                                value={v.color_code}
                                onChange={(e) => handleUpdateVariant(vIndex, 'color_code', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="form-group flex-1">
                            <label className="field-label">Original Price (₹) <span className="req-star">*</span></label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-input-styled"
                              placeholder="e.g. 4999"
                              value={v.price}
                              onChange={(e) => handleUpdateVariant(vIndex, 'price', e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group flex-1">
                            <label className="field-label">Discount Price (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="form-input-styled"
                              placeholder="e.g. 2999"
                              value={v.discount_price || ''}
                              onChange={(e) => handleUpdateVariant(vIndex, 'discount_price', e.target.value)}
                            />
                            <span className="field-micro-hint">Leave empty if no discount</span>
                          </div>

                          <div className="form-group flex-1">
                            <label className="field-label">Stock Quantity <span className="req-star">*</span></label>
                            <input
                              type="number"
                              min="0"
                              className="form-input-styled"
                              placeholder="e.g. 10"
                              value={v.stock}
                              onChange={(e) => handleUpdateVariant(vIndex, 'stock', e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {/* Available Sizes */}
                        <div className="variant-sizes-row">
                          <label className="field-label">Available Sizes</label>
                          <div className="sizes-chips-wrap">
                            {sizeChips.map((sz) => {
                              const isSelected = (v.sizes || []).includes(sz);
                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  className={`size-chip ${isSelected ? 'selected' : ''}`}
                                  onClick={() => handleToggleSize(vIndex, sz)}
                                >
                                  {sz}
                                </button>
                              );
                            })}
                            <span className="sizes-note-hint">Optional (watches / accessories can leave empty)</span>
                          </div>
                        </div>

                        {/* Variant Images Upload & Thumbnails */}
                        <div className="variant-images-box">
                          <label className="field-label image-label-with-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span>Variant Images (At least 1 required) <span className="req-star">*</span></span>
                          </label>

                          <div className="variant-images-gallery-row">
                            {/* Upload Dropzone */}
                            <label className="image-dropzone-tile">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                              <div className="dropzone-text">
                                <strong>Upload Images</strong>
                                <span>PNG, JPG, WebP (Max 5MB)</span>
                              </div>
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

                            {/* Saved Existing Images */}
                            {(v.existing_images || v.images || []).map((img) => {
                              const isPrimary = String(v.primary_image_id) === String(img.id);
                              return (
                                <div key={img.id} className="gallery-thumbnail-card">
                                  <img src={img.url} alt="" className="gallery-thumb-img" />
                                  <button
                                    type="button"
                                    className="thumb-delete-corner-btn"
                                    onClick={() => handleRemoveExistingImage(vIndex, img.id)}
                                    title="Delete Image"
                                  >
                                    ✕
                                  </button>
                                  <button
                                    type="button"
                                    className={`thumb-primary-tag ${isPrimary ? 'active' : ''}`}
                                    onClick={() => handleSetPrimaryExisting(vIndex, img.id)}
                                  >
                                    {isPrimary ? '★ Primary' : 'Set Primary'}
                                  </button>
                                </div>
                              );
                            })}

                            {/* New Uploaded Images */}
                            {(v.new_images || []).map((fileObj, fIdx) => {
                              const previewUrl = URL.createObjectURL(fileObj);
                              const isPrimary = v.primary_image_index === fIdx && !v.primary_image_id;
                              return (
                                <div key={fIdx} className="gallery-thumbnail-card">
                                  <img src={previewUrl} alt={fileObj.name} className="gallery-thumb-img" />
                                  <button
                                    type="button"
                                    className="thumb-delete-corner-btn"
                                    onClick={() => handleRemoveNewImage(vIndex, fIdx)}
                                    title="Delete Image"
                                  >
                                    ✕
                                  </button>
                                  <button
                                    type="button"
                                    className={`thumb-primary-tag ${isPrimary ? 'active' : ''}`}
                                    onClick={() => handleSetPrimaryNew(vIndex, fIdx)}
                                  >
                                    {isPrimary ? '★ Primary' : 'Set Primary'}
                                  </button>
                                </div>
                              );
                            })}

                            {/* Plus slots for quick adding */}
                            <label className="gallery-empty-plus-slot" title="Add another photo">
                              <span>+</span>
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

                {/* Section 3: Home Showcase Settings */}
                <div className="modal-card-box card-showcase-settings">
                  <div className="card-box-header">
                    <div className="card-box-header-left">
                      <span className="card-step-num-circle">3</span>
                      <div className="card-box-icon purple-tint">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="card-box-title">Home Showcase Settings</h3>
                        <p className="card-box-sub">Configure showcase placement, badge, campaign dates and promo image</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-box-fields">
                    {/* Row 1: Feature Type, Badge Text, Display Order, Active Status */}
                    <div className="showcase-row-4col">
                      <div className="form-group">
                        <label className="field-label">Feature Type <span className="req-star">*</span></label>
                        <CustomSelect
                          value={featureType}
                          onChange={(e, val) => handleFeatureTypeChange(val !== undefined ? val : (e?.target?.value || 'HOT_SALE'))}
                          options={[
                            { value: 'HOT_SALE', label: '🔥 Hot Sale' },
                            { value: 'TRENDING', label: '⚡ Flash Deal / Trending' },
                            { value: 'OFFER', label: '🏷️ Offer / Special Deal' },
                          ]}
                          placeholder="Select feature type"
                          width="100%"
                          height="40px"
                          buttonStyle={{
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            color: '#0f172a',
                            background: '#ffffff',
                          }}
                          menuStyle={{
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
                            zIndex: 10000,
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="field-label">Badge Text</label>
                        <input
                          type="text"
                          className="form-input-styled"
                          placeholder="e.g. HOT SALE"
                          value={badgeText}
                          onChange={(e) => setBadgeText(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="field-label">Display Order</label>
                        <input
                          type="number"
                          min="1"
                          className="form-input-styled"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="field-label">Active Status</label>
                        <div className="toggle-switch-container">
                          <label className="custom-toggle-switch">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) => setIsActive(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                          <span className="toggle-status-text">
                            {isActive ? 'Active (Show on Home)' : 'Inactive (Hidden)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Dates and Showcase Hero Image */}
                    <div className="showcase-dates-hero-row">
                      <div className="form-group">
                        <label className="field-label">Start Date & Time (Optional)</label>
                        <div className="input-with-icon">
                          <span className="input-icon-prefix">📅</span>
                          <input
                            type="datetime-local"
                            className="form-input-styled"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="field-label">End Date & Time (Optional)</label>
                        <div className="input-with-icon">
                          <span className="input-icon-prefix">📅</span>
                          <input
                            type="datetime-local"
                            className="form-input-styled"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group flex-2">
                        <label className="field-label">Showcase Promotional Hero Image (Optional)</label>
                        <label className="hero-upload-dropzone">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <div className="hero-dropzone-text">
                            <span>{displayImageFile ? displayImageFile.name : (displayImagePreview ? 'Change showcase image' : 'Choose file / Upload image')}</span>
                            <small>PNG, JPG, WebP (Max 5MB)</small>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleDisplayImageChange}
                          />
                        </label>
                        {displayImagePreview && (
                          <div className="hero-preview-strip">
                            <img src={displayImagePreview} alt="Hero" className="hero-thumb-mini" />
                            <button
                              type="button"
                              className="hero-remove-btn"
                              onClick={handleClearDisplayImage}
                            >
                              Remove image
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer modal-footer-redesign">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit-gradient"
                  disabled={submitting}
                >
                  <span>+</span>
                  <span>
                    {submitting
                      ? 'Saving...'
                      : editingItem
                      ? 'Save Changes'
                      : 'Create & Add Featured Product'}
                  </span>
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
