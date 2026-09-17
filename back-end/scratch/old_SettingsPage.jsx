import React, { useState, useEffect, useRef } from 'react';
import CustomSelect from '../Common/CustomSelect';
import { AppIcon, SettingsIcon, StoreIcon, OrderIcon, ShippingIcon, ReceiptIcon, PaymentIcon, NotificationIcon, SecurityIcon, EditIcon } from '../../icons';
import './SettingsPage.css';


export default function SettingsPage() {
  const djangoContext = window.DJANGO_CONTEXT || {};

  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Files for upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogoFlag, setRemoveLogoFlag] = useState(false);
  const logoInputRef = useRef(null);

  // Store Settings Form State
  const initialSettings = {
    // 1. General
    store_name: 'Moxie',
    store_logo: null,
    store_email: 'support@moxie.com',
    store_phone: '+91 9876543210',
    store_address: '123 Moxie Studio, Tech Park, Chennai, Tamil Nadu',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600001',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    store_description: 'Moxie E-Commerce - Premium Lifestyle & Fashion Products',
    website_url: 'https://moxie.com',

    // 2. Store Operation
    store_status: 'Open',
    maintenance_mode: false,
    allow_registration: true,
    allow_guest_browsing: true,
    allow_guest_checkout: true,
    require_login_before_checkout: true,
    allow_reviews: true,
    allow_wishlist: true,
    enable_product_search: true,
    enable_stock_management: true,
    low_stock_alert: true,
    min_stock_threshold: 5,

    // 3. Order
    order_prefix: 'MOX',
    min_order_amount: 0,
    max_order_amount: 100000,
    auto_confirm_orders: true,
    allow_order_cancellation: true,
    cancellation_time_limit: '24 Hours',
    allow_order_modification: false,
    order_auto_cancel_time: '48 Hours',
    enable_order_tracking: true,
    enable_order_notifications: true,
    allow_returns: true,

    // 4. Shipping
    enable_shipping: true,
    free_shipping: true,
    free_shipping_min_amount: 999,
    default_shipping_charge: 100,
    express_shipping_charge: 200,
    processing_time: '1-3 Days',
    delivery_estimate: '3-7 Days',
    express_delivery_days: '1-2 Days',
    shipping_provider: 'Delhivery / Bluedart',
    cod_available: true,
    delivery_area: 'All India (Pan India)',

    // 5. Tax
    enable_tax: false,
    tax_type: 'GST',
    tax_rate: 18,
    tax_included: true,
    gst_number: '33AAAAA0000A1Z5',
    tax_name: 'GST (Goods & Services Tax)',

    // 6. Payment
    payment: {
      provider: 'Razorpay',
      mode: 'Test',
      razorpay_key_id: 'rzp_test_************',
      online_payment_enabled: true,
      razorpay_enabled: true,
      cod_enabled: true,
      payment_currency: 'INR',
      payment_timeout: '15 Minutes'
    },

    // 7. Notifications & Email
    email_notifications_enabled: true,
    notify_order_created: true,
    notify_order_confirmed: true,
    notify_payment_success: true,
    notify_order_shipped: true,
    notify_order_delivered: true,
    notify_order_cancelled: true,
    notify_new_customer: true,
    notify_low_stock: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: 'support@moxie.com',
    smtp_from_email: 'noreply@moxie.com',

    // 8. Security
    security: {
      session_timeout: '30 Minutes',
      require_admin_auth: true,
      allow_admin_login: true,
      login_protection: true,
      failed_login_attempts: '5 Max Attempts'
    },

    // 9. System
    system: {
      maintenance_mode: false,
      debug_mode: false,
      api_status: 'Connected',
      database_status: 'Connected',
      payment_status: 'Connected',
      email_status: 'Connected',
      backend_server_status: 'Online (Operational)',
      frontend_status: 'Connected (Port 3000 / Vite)',
      django_version: '5.x',
      app_version: 'v2.4.0 (Build 2026)'
    }
  };

  const [settingsData, setSettingsData] = useState(initialSettings);
  const [originalSettings, setOriginalSettings] = useState(initialSettings);

  const [testEmailSending, setTestEmailSending] = useState(false);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  // Fetch settings from API
  const fetchSettings = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshingHealth(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/admin-settings/', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data || {};
        const merged = {
          ...settingsData,
          ...settings,
          payment: { ...settingsData.payment, ...(settings.payment || {}) },
          security: { ...settingsData.security, ...(settings.security || {}) },
          system: { ...settingsData.system, ...(settings.system || {}) }
        };
        setSettingsData(merged);
        setOriginalSettings(merged);
        if (settings.store_logo) {
          setLogoPreview(settings.store_logo);
        } else {
          setLogoPreview(null);
        }
        if (isManualRefresh) {
          setMessage({ type: 'success', text: 'System diagnostics refreshed successfully.' });
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      if (isManualRefresh) {
        setMessage({ type: 'error', text: 'Failed to refresh system status.' });
      }
    } finally {
      setLoading(false);
      setRefreshingHealth(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-dismiss notification banner
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, message.type === 'success' ? 3500 : 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  const handleInputChange = (field, value) => {
    setSettingsData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (field, value) => {
    setSettingsData(prev => ({
      ...prev,
      payment: { ...prev.payment, [field]: value }
    }));
  };

  const handleToggleChange = (field) => {
    if (!isEditing) return;
    setSettingsData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePaymentToggle = (field) => {
    if (!isEditing) return;
    setSettingsData(prev => ({
      ...prev,
      payment: { ...prev.payment, [field]: !prev.payment[field] }
    }));
  };

  // Checkout Access mapping helpers (single control for guest checkout vs login required)
  const getCheckoutAccessValue = () => {
    if (settingsData.require_login_before_checkout) return 'login';
    return 'guest';
  };

  const handleCheckoutAccessChange = (val) => {
    if (!isEditing) return;
    if (val === 'guest') {
      setSettingsData(prev => ({
        ...prev,
        allow_guest_checkout: true,
        require_login_before_checkout: false,
      }));
    } else {
      setSettingsData(prev => ({
        ...prev,
        allow_guest_checkout: false,
        require_login_before_checkout: true,
      }));
    }
  };

  // Logo file selection with validation
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Logo image exceeds 5MB limit.' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setRemoveLogoFlag(false);
      setMessage({ type: '', text: '' });
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogoFlag(true);
    if (logoInputRef.current) logoInputRef.current.value = '';
    setMessage({ type: '', text: '' });
  };

  const getCurrencySymbol = () => {
    switch (settingsData.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'INR':
      default: return '₹';
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (activeTab === 'general') {
      if (!settingsData.store_name || !settingsData.store_name.trim()) {
        setMessage({ type: 'error', text: 'Store name is required.' });
        return;
      }
      if (settingsData.store_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsData.store_email.trim())) {
        setMessage({ type: 'error', text: 'Please provide a valid store email address.' });
        return;
      }
    } else if (activeTab === 'store') {
      const thresh = Number(settingsData.min_stock_threshold);
      if (isNaN(thresh) || thresh < 0) {
        setMessage({ type: 'error', text: 'Minimum stock threshold must be a non-negative number.' });
        return;
      }
    } else if (activeTab === 'orders') {
      if (!settingsData.order_prefix || !settingsData.order_prefix.trim()) {
        setMessage({ type: 'error', text: 'Order prefix is required.' });
        return;
      }
      const minOrder = Number(settingsData.min_order_amount);
      if (isNaN(minOrder) || minOrder < 0) {
        setMessage({ type: 'error', text: 'Minimum order amount must be a non-negative number.' });
        return;
      }
      const maxOrder = Number(settingsData.max_order_amount);
      if (isNaN(maxOrder) || maxOrder < 0) {
        setMessage({ type: 'error', text: 'Maximum order amount must be a non-negative number.' });
        return;
      }
      if (maxOrder > 0 && maxOrder < minOrder) {
        setMessage({ type: 'error', text: 'Maximum order amount cannot be less than minimum order amount.' });
        return;
      }
    } else if (activeTab === 'tax') {
      const taxRate = Number(settingsData.tax_rate);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        setMessage({ type: 'error', text: 'Tax rate must be a valid percentage between 0 and 100.' });
        return;
      }
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let bodyData;
      let headers = {
        'X-CSRFToken': djangoContext.csrfToken || ''
      };

      if (logoFile) {
        bodyData = new FormData();
        bodyData.append('store_logo', logoFile);
        bodyData.append('_section', activeTab);
        Object.keys(settingsData).forEach(key => {
          if (key === 'payment') {
            Object.keys(settingsData.payment || {}).forEach(pk => {
              bodyData.append(pk, settingsData.payment[pk]);
            });
          } else if (key !== 'security' && key !== 'system' && key !== 'store_logo') {
            bodyData.append(key, settingsData[key]);
          }
        });
      } else if (removeLogoFlag) {
        bodyData = new FormData();
        bodyData.append('remove_store_logo', 'true');
        bodyData.append('_section', activeTab);
        Object.keys(settingsData).forEach(key => {
          if (key === 'payment') {
            Object.keys(settingsData.payment || {}).forEach(pk => {
              bodyData.append(pk, settingsData.payment[pk]);
            });
          } else if (key !== 'security' && key !== 'system' && key !== 'store_logo') {
            bodyData.append(key, settingsData[key]);
          }
        });
      } else {
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify({
          ...settingsData,
          ...(settingsData.payment || {}),
          _section: activeTab
        });
      }

      const res = await fetch('/api/admin-settings/', {
        method: 'POST',
        headers: headers,
        body: bodyData
      });

      const data = await res.json();
      if (res.ok) {
        const savedSettings = data.settings || data || {};
        const updated = {
          ...settingsData,
          ...savedSettings
        };
        let defaultMsg = 'Settings updated successfully.';
        if (activeTab === 'store') defaultMsg = 'Store operations updated successfully.';
        else if (activeTab === 'general') defaultMsg = 'General settings updated successfully.';
        else if (activeTab === 'orders') defaultMsg = 'Order settings updated successfully.';
        else if (activeTab === 'shipping') defaultMsg = 'Shipping settings updated successfully.';
        else if (activeTab === 'tax') defaultMsg = 'Tax settings updated successfully.';

        setMessage({ type: 'success', text: data.message || defaultMsg });
        setSettingsData(updated);
        setOriginalSettings(updated);

        // Update logo preview in real-time
        setLogoPreview(savedSettings.store_logo || null);
        setRemoveLogoFlag(false);

        setIsEditing(false);
        setLogoFile(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Network error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    setTestEmailSending(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/admin-settings/test-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': djangoContext.csrfToken || ''
        },
        body: JSON.stringify({ email: settingsData.store_email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Test email dispatched successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Unable to send test email.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error sending test email.' });
    } finally {
      setTestEmailSending(false);
    }
  };

  // Cancel edit
  const handleCancel = () => {
    setSettingsData(originalSettings);
    setIsEditing(false);
    setLogoFile(null);
    setRemoveLogoFlag(false);
    setLogoPreview(originalSettings.store_logo || null);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="settings-shell">
      {/* Header */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your Moxie e-commerce website settings and admin preferences.</p>
      </div>

      {/* Grid Layout */}
      <div className="settings-grid-layout">
        {/* Sidebar Nav */}
        <div className="settings-nav-card">
          <button className={`nav-tab-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => handleTabSwitch('general')}>
            <AppIcon icon={SettingsIcon} size={18} />
            General
          </button>

          <button className={`nav-tab-item ${activeTab === 'store' ? 'active' : ''}`} onClick={() => handleTabSwitch('store')}>
            <AppIcon icon={StoreIcon} size={18} />
            Store Operations
          </button>

          <button className={`nav-tab-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabSwitch('orders')}>
            <AppIcon icon={OrderIcon} size={18} />
            Order Settings
          </button>

          <button className={`nav-tab-item ${activeTab === 'shipping' ? 'active' : ''}`} onClick={() => handleTabSwitch('shipping')}>
            <AppIcon icon={ShippingIcon} size={18} />
            Shipping Settings
          </button>

          <button className={`nav-tab-item ${activeTab === 'tax' ? 'active' : ''}`} onClick={() => handleTabSwitch('tax')}>
            <AppIcon icon={ReceiptIcon} size={18} />
            Tax Settings
          </button>

          <button className={`nav-tab-item ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => handleTabSwitch('payment')}>
            <AppIcon icon={PaymentIcon} size={18} />
            Payment Settings
          </button>

          <button className={`nav-tab-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabSwitch('notifications')}>
            <AppIcon icon={NotificationIcon} size={18} />
            Notifications & Email
          </button>

          <button className={`nav-tab-item ${activeTab === 'system' ? 'active' : ''}`} onClick={() => handleTabSwitch('system')}>
            <AppIcon icon={SecurityIcon} size={18} />
            Security & System
          </button>
        </div>


        {/* Content Panel */}
        <div className="settings-panel-card">
          {message.text && (
            <div className={`settings-banner ${message.type}`}>
              <span>{message.text}</span>
            </div>
          )}

          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>GENERAL SETTINGS</h2>
                  <p>Configure basic store details, contact information, currency, and timezone.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              {/* Logo Preview & Upload */}
              <div className="form-field-group full-width" style={{ marginBottom: '18px' }}>
                <label>Store Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '6px' }}>
                  {logoPreview ? (
                    <div style={{ width: '80px', height: '80px', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                      <img src={logoPreview} alt="Store Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px', textAlign: 'center', padding: '6px', background: '#f8fafc' }}>
                      No Logo
                    </div>
                  )}
                  {isEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                        >
                          📁 Choose New Logo
                        </button>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', color: '#ef4444', cursor: 'pointer' }}
                          >
                            🗑 Remove Logo
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>Recommended: PNG or JPG (transparent background, max 2MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="form-field-group">
                  <label>Store Name</label>
                  <input type="text" disabled={!isEditing} value={settingsData.store_name} onChange={(e) => handleInputChange('store_name', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Store Email</label>
                  <input type="email" disabled={!isEditing} value={settingsData.store_email} onChange={(e) => handleInputChange('store_email', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Store Phone</label>
                  <input type="text" disabled={!isEditing} value={settingsData.store_phone} onChange={(e) => handleInputChange('store_phone', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Website URL</label>
                  <input type="url" disabled={!isEditing} value={settingsData.website_url} onChange={(e) => handleInputChange('website_url', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>City</label>
                  <input type="text" disabled={!isEditing} value={settingsData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>State</label>
                  <input type="text" disabled={!isEditing} value={settingsData.state} onChange={(e) => handleInputChange('state', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Country</label>
                  <input type="text" disabled={!isEditing} value={settingsData.country} onChange={(e) => handleInputChange('country', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Pincode / Postal Code</label>
                  <input type="text" disabled={!isEditing} value={settingsData.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Currency</label>
                  <CustomSelect
                    disabled={!isEditing}
                    value={settingsData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    options={[
                      { value: 'INR', label: 'INR (₹)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' }
                    ]}
                    width="100%"
                    height="42px"
                  />
                </div>

                <div className="form-field-group">
                  <label>Timezone</label>
                  <CustomSelect
                    disabled={!isEditing}
                    value={settingsData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    options={[
                      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
                      { value: 'UTC', label: 'UTC (GMT +0:00)' },
                      { value: 'America/New_York', label: 'America/New_York (EST)' },
                      { value: 'Europe/London', label: 'Europe/London (BST)' },
                      { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00)' }
                    ]}
                    width="100%"
                    height="42px"
                  />
                </div>

                <div className="form-field-group full-width">
                  <label>Store Address</label>
                  <textarea disabled={!isEditing} value={settingsData.store_address} onChange={(e) => handleInputChange('store_address', e.target.value)} />
                </div>

                <div className="form-field-group full-width">
                  <label>Store Description</label>
                  <textarea disabled={!isEditing} value={settingsData.store_description} onChange={(e) => handleInputChange('store_description', e.target.value)} />
                </div>
              </div>

              {isEditing && (
                <div className="form-actions-bar">
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STORE OPERATIONS */}
          {activeTab === 'store' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>STORE OPERATIONS</h2>
                  <p>Manage storefront availability, customer access, and inventory behaviour.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              {/* Group 1: Store Availability */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Store Availability</h3>
                  <p>Control live storefront status and maintenance screen access</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Maintenance Mode</span>
                    <small>Temporarily show modern maintenance notice to public visitors and block customer checkout</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.maintenance_mode}
                      onChange={() => handleToggleChange('maintenance_mode')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
              </div>

              {/* Group 2: Customer Access */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Customer Access</h3>
                  <p>Manage user registration, visitor catalog browsing, and checkout restrictions</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Customer Registration</span>
                    <small>Enable new customer sign ups and account creation on the front-end</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.allow_registration}
                      onChange={() => handleToggleChange('allow_registration')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Guest Browsing</span>
                    <small>Allow guests to browse products, search categories, and view catalog without logging in</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.allow_guest_browsing}
                      onChange={() => handleToggleChange('allow_guest_browsing')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Checkout Access</span>
                    <small>Specify whether customers must log in before placing an order or can checkout as guests</small>
                  </div>
                  <div style={{ width: '220px', flexShrink: 0 }}>
                    <CustomSelect
                      disabled={!isEditing}
                      value={getCheckoutAccessValue()}
                      onChange={(e) => handleCheckoutAccessChange(e.target.value)}
                      options={[
                        { value: 'guest', label: 'Guest Checkout Allowed' },
                        { value: 'login', label: 'Login Required' }
                      ]}
                      width="100%"
                      height="38px"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Customer Features */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Customer Features</h3>
                  <p>Toggle social proofs, reviews, and wishlist tools for shoppers</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Product Reviews</span>
                    <small>Enable customer review submissions and ratings on product pages</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.allow_reviews}
                      onChange={() => handleToggleChange('allow_reviews')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Wishlist</span>
                    <small>Enable customer wishlist and save-for-later functionality</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.allow_wishlist}
                      onChange={() => handleToggleChange('allow_wishlist')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
              </div>

              {/* Group 4: Inventory Management */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Inventory Management</h3>
                  <p>Automate stock deduction and low-inventory warning thresholds</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Stock Management</span>
                    <small>Automatically decrement variant inventory upon completed and paid orders</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.enable_stock_management}
                      onChange={() => handleToggleChange('enable_stock_management')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Low Stock Alerts</span>
                    <small>Trigger notifications and analytics alerts when product stock reaches or drops below threshold</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.low_stock_alert}
                      onChange={() => handleToggleChange('low_stock_alert')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                <div className="settings-row-item" style={{ opacity: settingsData.low_stock_alert ? 1 : 0.6 }}>
                  <div className="toggle-label-box">
                    <span>Low Stock Threshold</span>
                    <small>Product units at or below this count qualify as low-stock in dashboard and notifications</small>
                  </div>
                  <div style={{ width: '120px', flexShrink: 0 }}>
                    <input
                      type="number"
                      min="0"
                      disabled={!isEditing || !settingsData.low_stock_alert}
                      value={settingsData.min_stock_threshold}
                      onChange={(e) => handleInputChange('min_stock_threshold', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="form-actions-bar">
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}



          {/* TAB 5: ORDER SETTINGS */}
          {activeTab === 'orders' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>ORDER SETTINGS</h2>
                  <p>Configure order numbering, value constraints, automated processing, cancellations, and tracking.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              {/* Group 1: Order Numbering */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Order Numbering</h3>
                  <p>Define order identification prefix and format for all newly generated customer orders</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Order Prefix</span>
                    <small>Custom uppercase prefix applied to new orders (e.g. MOX, ORD, INVOICE)</small>
                  </div>
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <input
                      type="text"
                      maxLength={10}
                      disabled={!isEditing}
                      value={settingsData.order_prefix || ''}
                      onChange={(e) => handleInputChange('order_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                      placeholder="e.g. MOX"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                <div className="settings-row-item" style={{ background: '#f8fafc' }}>
                  <div className="toggle-label-box">
                    <span>Live Sample Order ID</span>
                    <small>Sample format preview of how the next order number will appear</small>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '6px', background: '#e0e7ff', color: '#3730a3', fontWeight: '700', fontSize: '13px', letterSpacing: '0.5px' }}>
                    {(settingsData.order_prefix || 'ORD')}-0042
                  </div>
                </div>
              </div>

              {/* Group 2: Order Value Rules */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Order Value Rules</h3>
                  <p>Set subtotal bounds to enforce minimum and maximum purchase amounts at checkout</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Minimum Order Value ({getCurrencySymbol()})</span>
                    <small>Minimum cart subtotal required to proceed to payment (0 = No limit)</small>
                  </div>
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!isEditing}
                      value={settingsData.min_order_amount}
                      onChange={(e) => handleInputChange('min_order_amount', Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Maximum Order Value ({getCurrencySymbol()})</span>
                    <small>Upper limit allowed for a single checkout transaction (0 = Unlimited)</small>
                  </div>
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!isEditing}
                      value={settingsData.max_order_amount}
                      onChange={(e) => handleInputChange('max_order_amount', Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Order Processing */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Order Processing</h3>
                  <p>Configure automated order status transitions upon payment confirmation</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Auto Confirm Orders</span>
                    <small>Automatically transition paid orders directly to Confirmed status</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.auto_confirm_orders}
                      onChange={() => handleToggleChange('auto_confirm_orders')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
              </div>

              {/* Group 4: Customer Order Control */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Customer Order Control</h3>
                  <p>Manage customer self-service cancellation permissions and eligible time window</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Allow Order Cancellation</span>
                    <small>Enable customers to cancel unfulfilled orders directly from their account</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.allow_order_cancellation}
                      onChange={() => handleToggleChange('allow_order_cancellation')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
                <div className="settings-row-item" style={{ opacity: settingsData.allow_order_cancellation ? 1 : 0.6 }}>
                  <div className="toggle-label-box">
                    <span>Cancellation Time Limit</span>
                    <small>Allowed time window in minutes after order creation (e.g. 30 = 30 minutes, 0 = until processing)</small>
                  </div>
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <input
                      type="text"
                      disabled={!isEditing || !settingsData.allow_order_cancellation}
                      value={settingsData.cancellation_time_limit}
                      onChange={(e) => handleInputChange('cancellation_time_limit', e.target.value)}
                      placeholder="e.g. 30"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Fulfillment & Tracking */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Fulfillment & Tracking</h3>
                  <p>Control customer-facing tracking timeline and fulfillment status visibility</p>
                </div>
                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Enable Order Tracking</span>
                    <small>Display real-time visual progress timeline on customer order details page</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.enable_order_tracking}
                      onChange={() => handleToggleChange('enable_order_tracking')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
              </div>

              {isEditing && (
                <div className="form-actions-bar">
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SHIPPING SETTINGS */}
          {activeTab === 'shipping' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>SHIPPING SETTINGS</h2>
                  <p>Set delivery charges, free shipping thresholds, and estimated timelines.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              <div className="settings-form-grid">
                <div className="form-field-group">
                  <label>Default Shipping Charge (₹)</label>
                  <input type="number" disabled={!isEditing} value={settingsData.default_shipping_charge} onChange={(e) => handleInputChange('default_shipping_charge', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Express Shipping Charge (₹)</label>
                  <input type="number" disabled={!isEditing} value={settingsData.express_shipping_charge} onChange={(e) => handleInputChange('express_shipping_charge', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Free Shipping Minimum Amount (₹)</label>
                  <input type="number" disabled={!isEditing} value={settingsData.free_shipping_min_amount} onChange={(e) => handleInputChange('free_shipping_min_amount', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Shipping Provider</label>
                  <input type="text" disabled={!isEditing} value={settingsData.shipping_provider} onChange={(e) => handleInputChange('shipping_provider', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Processing Time</label>
                  <input type="text" disabled={!isEditing} value={settingsData.processing_time} onChange={(e) => handleInputChange('processing_time', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Standard Delivery Estimate</label>
                  <input type="text" disabled={!isEditing} value={settingsData.delivery_estimate} onChange={(e) => handleInputChange('delivery_estimate', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Express Delivery Estimate</label>
                  <input type="text" disabled={!isEditing} value={settingsData.express_delivery_days} onChange={(e) => handleInputChange('express_delivery_days', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>Delivery Area / Region</label>
                  <input type="text" disabled={!isEditing} value={settingsData.delivery_area} onChange={(e) => handleInputChange('delivery_area', e.target.value)} />
                </div>
              </div>

              <div className="toggle-switch-row" style={{ marginTop: '16px' }}>
                <div className="toggle-label-box">
                  <span>Enable Shipping Module</span>
                  <small>Enable delivery calculations for store checkout</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.enable_shipping} onChange={() => handleToggleChange('enable_shipping')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Enable Free Shipping Promo</span>
                  <small>Offer free standard delivery when cart subtotal meets or exceeds threshold</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.free_shipping} onChange={() => handleToggleChange('free_shipping')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Cash on Delivery (COD) Available</span>
                  <small>Allow customers to choose Cash on Delivery option during checkout</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.cod_available} onChange={() => handleToggleChange('cod_available')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              {isEditing && (
                <div className="form-actions-bar">
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TAX SETTINGS */}
          {activeTab === 'tax' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>TAX SETTINGS</h2>
                  <p>Configure tax calculation and invoice information.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              {/* Group 1: Tax Calculation */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Tax Calculation</h3>
                  <p>Control whether tax is computed and applied to customer totals</p>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Enable Tax Calculation</span>
                    <small>Calculate tax and display breakdown in checkout and order invoices</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={settingsData.enable_tax}
                      onChange={() => handleToggleChange('enable_tax')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                <div className="settings-row-item" style={{ opacity: settingsData.enable_tax ? 1 : 0.6 }}>
                  <div className="toggle-label-box">
                    <span>Tax Type</span>
                    <small>Select the applicable tax regulation system</small>
                  </div>
                  <div style={{ width: '240px', flexShrink: 0 }}>
                    <CustomSelect
                      disabled={!isEditing || !settingsData.enable_tax}
                      value={settingsData.tax_type || 'GST'}
                      onChange={(e) => handleInputChange('tax_type', e.target.value)}
                      options={[
                        { value: 'GST', label: 'GST (Goods and Services Tax)' },
                        { value: 'VAT', label: 'VAT (Value Added Tax)' },
                        { value: 'Sales Tax', label: 'Sales Tax' }
                      ]}
                      width="100%"
                      height="38px"
                    />
                  </div>
                </div>

                <div className="settings-row-item" style={{ opacity: settingsData.enable_tax ? 1 : 0.6 }}>
                  <div className="toggle-label-box">
                    <span>Tax Rate (%)</span>
                    <small>Percentage rate applied to taxable product subtotals (e.g. 12 or 18)</small>
                  </div>
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={!isEditing || !settingsData.enable_tax}
                      value={settingsData.tax_rate}
                      onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                      placeholder="e.g. 12"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div className="settings-row-item" style={{ opacity: settingsData.enable_tax ? 1 : 0.6 }}>
                  <div className="toggle-label-box">
                    <span>Tax Included in Product Prices</span>
                    <small>Prices on storefront already include tax (no extra tax added to product total)</small>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      disabled={!isEditing || !settingsData.enable_tax}
                      checked={settingsData.tax_included}
                      onChange={() => handleToggleChange('tax_included')}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
              </div>

              {/* Group 2: Business Tax Information */}
              <div className="operations-group-card">
                <div className="operations-group-header">
                  <h3>Business Tax Information</h3>
                  <p>Commercial registration and identification details for customer invoices</p>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>GST / Tax Registration Number</span>
                    <small>Tax identification number printed on invoices and payment receipts (optional)</small>
                  </div>
                  <div style={{ width: '240px', flexShrink: 0 }}>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={settingsData.gst_number || ''}
                      onChange={(e) => handleInputChange('gst_number', e.target.value)}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="form-actions-bar">
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PAYMENT SETTINGS */}
          {activeTab === 'payment' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>PAYMENT GATEWAY CONFIGURATION</h2>
                  <p>Razorpay integration and online payment settings.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              <div className="settings-form-grid">
                <div className="form-field-group">
                  <label>Payment Provider</label>
                  <input type="text" value={settingsData.payment.provider} disabled />
                </div>

                <div className="form-field-group">
                  <label>Payment Mode</label>
                  <CustomSelect
                    disabled={!isEditing}
                    value={settingsData.payment.mode}
                    onChange={(e) => handlePaymentChange('mode', e.target.value)}
                    options={[
                      { value: 'Test', label: 'Test Mode (Sandbox)' },
                      { value: 'Live', label: 'Live Mode (Production)' }
                    ]}
                    width="100%"
                    height="42px"
                  />
                </div>

                <div className="form-field-group">
                  <label>Payment Currency</label>
                  <CustomSelect
                    disabled={!isEditing}
                    value={settingsData.payment.payment_currency}
                    onChange={(e) => handlePaymentChange('payment_currency', e.target.value)}
                    options={[
                      { value: 'INR', label: 'INR (₹)' },
                      { value: 'USD', label: 'USD ($)' }
                    ]}
                    width="100%"
                    height="42px"
                  />
                </div>

                <div className="form-field-group">
                  <label>Payment Session Timeout</label>
                  <input type="text" disabled={!isEditing} value={settingsData.payment.payment_timeout} onChange={(e) => handlePaymentChange('payment_timeout', e.target.value)} />
                </div>

                <div className="form-field-group full-width">
                  <label>Razorpay Key ID</label>
                  <input type="text" value={settingsData.payment.razorpay_key_id} disabled />
                  <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px' }}>
                    🔐 Payment secrets are securely stored in server environment variables (.env).
                  </small>
                </div>
              </div>

              <div className="toggle-switch-row" style={{ marginTop: '16px' }}>
                <div className="toggle-label-box">
                  <span>Online Payment (Razorpay) Enabled</span>
                  <small>Accept Cards, UPI, Netbanking, and Wallets via Razorpay</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.payment.online_payment_enabled} onChange={() => handlePaymentToggle('online_payment_enabled')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Cash on Delivery (COD) Enabled</span>
                  <small>Accept cash payments upon delivery at customer doorstep</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.payment.cod_enabled} onChange={() => handlePaymentToggle('cod_enabled')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              {isEditing && (
                <div className="form-actions-bar">
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS & EMAIL */}
          {activeTab === 'notifications' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>NOTIFICATIONS & EMAIL</h2>
                  <p>Configure automated system notifications and test email delivery.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Email Notifications Master Switch</span>
                  <small>Enable or disable all outgoing automated transactional emails</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.email_notifications_enabled} onChange={() => handleToggleChange('email_notifications_enabled')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on New Order Created</span>
                  <small>Send instant notification to admin when an order is submitted</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_order_created} onChange={() => handleToggleChange('notify_order_created')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on Order Confirmed</span>
                  <small>Send confirmation receipt email to customer</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_order_confirmed} onChange={() => handleToggleChange('notify_order_confirmed')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on Payment Success</span>
                  <small>Send notifications upon Razorpay payment confirmation</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_payment_success} onChange={() => handleToggleChange('notify_payment_success')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on Order Shipped</span>
                  <small>Notify customer with courier tracking details when order is dispatched</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_order_shipped} onChange={() => handleToggleChange('notify_order_shipped')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on Order Delivered</span>
                  <small>Send delivery confirmation and review request email to customer</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_order_delivered} onChange={() => handleToggleChange('notify_order_delivered')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on Order Cancelled</span>
                  <small>Send cancellation summary and refund notices</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_order_cancelled} onChange={() => handleToggleChange('notify_order_cancelled')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on New Customer Sign-Up</span>
                  <small>Notify store administrator when a new customer registers</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_new_customer} onChange={() => handleToggleChange('notify_new_customer')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Low Stock Alert Notification</span>
                  <small>Send admin warning email when inventory drops below threshold</small>
                </div>
                <label className="switch-toggle">
                  <input type="checkbox" disabled={!isEditing} checked={settingsData.notify_low_stock} onChange={() => handleToggleChange('notify_low_stock')} />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="settings-form-grid" style={{ marginTop: '20px' }}>
                <div className="form-field-group">
                  <label>SMTP Host</label>
                  <input type="text" disabled={!isEditing} value={settingsData.smtp_host} onChange={(e) => handleInputChange('smtp_host', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>SMTP Port</label>
                  <input type="number" disabled={!isEditing} value={settingsData.smtp_port} onChange={(e) => handleInputChange('smtp_port', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>SMTP Username / From Email</label>
                  <input type="email" disabled={!isEditing} value={settingsData.smtp_from_email} onChange={(e) => handleInputChange('smtp_from_email', e.target.value)} />
                </div>

                <div className="form-field-group">
                  <label>SMTP Password</label>
                  <input type="password" value="************************" disabled />
                </div>
              </div>

              {isEditing ? (
                <div className="form-actions-bar" style={{ marginTop: '20px' }}>
                  <button className="btn-secondary-action" disabled={testEmailSending} onClick={handleSendTestEmail}>
                    {testEmailSending ? 'Sending Test Email...' : '✉️ Send Test Email'}
                  </button>
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              ) : (
                <div className="form-actions-bar" style={{ marginTop: '20px' }}>
                  <button className="btn-secondary-action" disabled={testEmailSending} onClick={handleSendTestEmail}>
                    {testEmailSending ? 'Sending Test Email...' : '✉️ Send Test Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: SECURITY & SYSTEM */}
          {activeTab === 'system' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>SECURITY & SYSTEM STATUS</h2>
                  <p>Real-time system health monitoring and security parameters.</p>
                </div>
                <button
                  className="btn-secondary-action"
                  disabled={refreshingHealth}
                  onClick={() => fetchSettings(true)}
                  style={{ height: '36px', fontSize: '12.5px', gap: '6px' }}
                >
                  {refreshingHealth ? 'Checking Health...' : '🔄 Refresh Status'}
                </button>
              </div>

              <div className="system-status-grid">
                <div className="status-indicator-card">
                  <span>Django REST APIs</span>
                  <span className="badge-status-ok">{settingsData.system?.api_status || 'Connected'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>SQLite Database</span>
                  <span className="badge-status-ok">{settingsData.system?.database_status || 'Connected'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>Razorpay Payment Gateway</span>
                  <span className="badge-status-ok">{settingsData.system?.payment_status || 'Connected'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>Email Engine</span>
                  <span className="badge-status-ok">{settingsData.system?.email_status || 'Connected'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>Backend Server Status</span>
                  <span className="badge-status-ok">{settingsData.system?.backend_server_status || 'Online'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>Frontend Integration</span>
                  <span className="badge-status-ok">{settingsData.system?.frontend_status || 'Connected'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>Django Debug Mode</span>
                  <span className="badge-status-ok" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                    {settingsData.system?.debug_mode ? 'Development (ON)' : 'Production Safe (OFF)'}
                  </span>
                </div>

                <div className="status-indicator-card">
                  <span>Admin Session Security</span>
                  <span className="badge-status-ok">{settingsData.security?.session_timeout || '30 Mins Timeout'}</span>
                </div>

                <div className="status-indicator-card">
                  <span>Login Protection & Rate Limiting</span>
                  <span className="badge-status-ok">Enabled (Active)</span>
                </div>

                <div className="status-indicator-card">
                  <span>Application Version</span>
                  <span className="badge-status-ok" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                    {settingsData.system?.app_version || 'v2.4.0 (Build 2026)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
