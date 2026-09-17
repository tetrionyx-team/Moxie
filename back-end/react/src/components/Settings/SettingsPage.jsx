import React, { useState, useEffect, useRef } from 'react';
import CustomSelect from '../Common/CustomSelect';
import { AppIcon, SettingsIcon, StoreIcon, OrderIcon, PaymentIcon, NotificationIcon, EditIcon } from '../../icons';
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
    // 1. General Settings
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

    // 2. Store Operations
    store_status: 'Open',
    maintenance_mode: false,
    enable_stock_management: true,
    low_stock_alert: true,
    min_stock_threshold: 5,

    // 3. Order Settings
    allow_order_cancellation: true,
    cancellation_time_limit: '24 Hours',

    // 4. Payment Gateways
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

    // 5. Notifications
    notify_low_stock: true,
    notify_order_created: true,
    notify_new_customer: true,
    low_stock_notification: true,
    order_received_notification: true,
    new_customer_signup_notification: true
  };

  const [settingsData, setSettingsData] = useState(initialSettings);
  const [originalSettings, setOriginalSettings] = useState(initialSettings);

  // Fetch settings from API
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-settings/', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const settings = data.settings || data || {};
        const lowStock = settings.low_stock_notification ?? settings.notify_low_stock ?? settings.low_stock_alert ?? true;
        const orderReceived = settings.order_received_notification ?? settings.notify_order_created ?? true;
        const newCustomer = settings.new_customer_signup_notification ?? settings.notify_new_customer ?? true;

        const merged = {
          ...initialSettings,
          ...settings,
          notify_low_stock: lowStock,
          low_stock_notification: lowStock,
          notify_order_created: orderReceived,
          order_received_notification: orderReceived,
          notify_new_customer: newCustomer,
          new_customer_signup_notification: newCustomer,
          payment: {
            ...initialSettings.payment,
            ...(settings.payment || {}),
            mode: settings.payment_mode || settings.payment?.mode || 'Test',
            payment_currency: settings.payment_currency || settings.payment?.payment_currency || 'INR',
            payment_timeout: settings.payment_timeout || settings.payment?.payment_timeout || '15 Minutes',
            online_payment_enabled: settings.online_payment_enabled ?? settings.payment?.online_payment_enabled ?? true,
            razorpay_enabled: settings.razorpay_enabled ?? settings.payment?.razorpay_enabled ?? true,
            cod_enabled: settings.cod_enabled ?? settings.cod_available ?? settings.payment?.cod_enabled ?? true
          }
        };

        setSettingsData(merged);
        setOriginalSettings(merged);
        if (settings.store_logo) {
          setLogoPreview(settings.store_logo);
        } else {
          setLogoPreview(null);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setMessage({ type: 'error', text: 'Failed to load settings from server.' });
    } finally {
      setLoading(false);
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
      [field === 'mode' ? 'payment_mode' : field]: value,
      payment: { ...prev.payment, [field]: value }
    }));
  };

  const handleToggleChange = (field) => {
    if (!isEditing) return;
    setSettingsData(prev => {
      const nextVal = !prev[field];
      const updates = { [field]: nextVal };
      if (field === 'low_stock_notification' || field === 'notify_low_stock') {
        updates.low_stock_notification = nextVal;
        updates.notify_low_stock = nextVal;
        updates.low_stock_alert = nextVal;
      } else if (field === 'order_received_notification' || field === 'notify_order_created') {
        updates.order_received_notification = nextVal;
        updates.notify_order_created = nextVal;
      } else if (field === 'new_customer_signup_notification' || field === 'notify_new_customer') {
        updates.new_customer_signup_notification = nextVal;
        updates.notify_new_customer = nextVal;
      }
      return { ...prev, ...updates };
    });
  };

  const handlePaymentToggle = (field) => {
    if (!isEditing) return;
    setSettingsData(prev => {
      const nextVal = !prev.payment[field];
      return {
        ...prev,
        [field]: nextVal,
        payment: { ...prev.payment, [field]: nextVal }
      };
    });
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

  const handleCancel = () => {
    setSettingsData(originalSettings);
    setLogoFile(null);
    setRemoveLogoFlag(false);
    setLogoPreview(originalSettings.store_logo || null);
    setIsEditing(false);
    setMessage({ type: '', text: '' });
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
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let bodyData;
      let headers = {
        'X-CSRFToken': djangoContext.csrfToken || (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) || '').split('=')[1] || ''
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
          } else if (key !== 'store_logo') {
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
          } else if (key !== 'store_logo') {
            bodyData.append(key, settingsData[key]);
          }
        });
      } else {
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify({
          ...settingsData,
          payment_mode: settingsData.payment?.mode || settingsData.payment_mode || 'Test',
          payment_currency: settingsData.payment?.payment_currency || settingsData.payment_currency || 'INR',
          payment_timeout: settingsData.payment?.payment_timeout || settingsData.payment_timeout || '15 Minutes',
          online_payment_enabled: settingsData.payment?.online_payment_enabled ?? true,
          razorpay_enabled: settingsData.payment?.razorpay_enabled ?? true,
          cod_enabled: settingsData.payment?.cod_enabled ?? true,
          cod_available: settingsData.payment?.cod_enabled ?? true,
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
        const lowStock = savedSettings.low_stock_notification ?? savedSettings.notify_low_stock ?? savedSettings.low_stock_alert ?? settingsData.notify_low_stock;
        const orderReceived = savedSettings.order_received_notification ?? savedSettings.notify_order_created ?? settingsData.notify_order_created;
        const newCustomer = savedSettings.new_customer_signup_notification ?? savedSettings.notify_new_customer ?? settingsData.notify_new_customer;

        const updated = {
          ...settingsData,
          ...savedSettings,
          notify_low_stock: lowStock,
          low_stock_notification: lowStock,
          notify_order_created: orderReceived,
          order_received_notification: orderReceived,
          notify_new_customer: newCustomer,
          new_customer_signup_notification: newCustomer,
          payment: {
            ...settingsData.payment,
            ...(savedSettings.payment || {}),
            mode: savedSettings.payment_mode || savedSettings.payment?.mode || settingsData.payment.mode,
            payment_currency: savedSettings.payment_currency || savedSettings.payment?.payment_currency || settingsData.payment.payment_currency,
            payment_timeout: savedSettings.payment_timeout || savedSettings.payment?.payment_timeout || settingsData.payment.payment_timeout,
            online_payment_enabled: savedSettings.online_payment_enabled ?? savedSettings.payment?.online_payment_enabled ?? settingsData.payment.online_payment_enabled,
            razorpay_enabled: savedSettings.razorpay_enabled ?? savedSettings.payment?.razorpay_enabled ?? settingsData.payment.razorpay_enabled,
            cod_enabled: savedSettings.cod_enabled ?? savedSettings.cod_available ?? savedSettings.payment?.cod_enabled ?? settingsData.payment.cod_enabled
          }
        };

        let defaultMsg = 'Settings updated successfully.';
        if (activeTab === 'store') defaultMsg = 'Store operations updated successfully.';
        else if (activeTab === 'general') defaultMsg = 'General settings updated successfully.';
        else if (activeTab === 'orders') defaultMsg = 'Order settings updated successfully.';
        else if (activeTab === 'payment') defaultMsg = 'Payment settings updated successfully.';
        else if (activeTab === 'notifications') defaultMsg = 'Notification settings updated successfully.';

        setMessage({ type: 'success', text: data.message || defaultMsg });
        setSettingsData(updated);
        setOriginalSettings(updated);

        if (savedSettings.store_logo) {
          setLogoPreview(savedSettings.store_logo);
        }
        setLogoFile(null);
        setRemoveLogoFlag(false);
        setIsEditing(false);

        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications();
        }
        window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Network error occurred while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-shell">
        <div className="settings-loading-card">
          <div className="spinner"></div>
          <p>Loading Store Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-shell">
      {/* Page Title */}
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage store preferences, operation rules, payment gateways, and system notifications.</p>
      </div>

      {/* Main Grid: Sidebar Tabs + Content Panel */}
      <div className="settings-grid-layout">
        {/* Left Sidebar Navigation */}
        <div className="settings-nav-card">
          <button
            className={`nav-tab-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('general')}
          >
            <AppIcon icon={SettingsIcon} size={18} />
            General Settings
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('store')}
          >
            <AppIcon icon={StoreIcon} size={18} />
            Store Operations
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('orders')}
          >
            <AppIcon icon={OrderIcon} size={18} />
            Order Settings
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('payment')}
          >
            <AppIcon icon={PaymentIcon} size={18} />
            Payment Gateways
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('notifications')}
          >
            <AppIcon icon={NotificationIcon} size={18} />
            Notifications
          </button>
        </div>

        {/* Right Main Content Panel */}
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
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.store_name || ''}
                    onChange={(e) => handleInputChange('store_name', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>Store Email</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={settingsData.store_email || ''}
                    onChange={(e) => handleInputChange('store_email', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>Store Phone</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.store_phone || ''}
                    onChange={(e) => handleInputChange('store_phone', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>Website URL</label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={settingsData.website_url || ''}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>City</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>State</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>Country</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>Pincode / Postal Code</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.pincode || ''}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                  />
                </div>

                <div className="form-field-group">
                  <label>Currency</label>
                  <CustomSelect
                    disabled={!isEditing}
                    value={settingsData.currency || 'INR'}
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
                    value={settingsData.timezone || 'Asia/Kolkata'}
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
                  <textarea
                    rows={2}
                    disabled={!isEditing}
                    value={settingsData.store_address || ''}
                    onChange={(e) => handleInputChange('store_address', e.target.value)}
                  />
                </div>

                <div className="form-field-group full-width">
                  <label>Store Description</label>
                  <textarea
                    rows={3}
                    disabled={!isEditing}
                    value={settingsData.store_description || ''}
                    onChange={(e) => handleInputChange('store_description', e.target.value)}
                  />
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
                  <p>Manage store status, maintenance mode, and inventory management.</p>
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
                  <p>Control overall store visibility and visitor access mode</p>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Store Status</span>
                    <small>Set store to Open for business or temporarily in Maintenance mode</small>
                  </div>
                  <div style={{ width: '180px', flexShrink: 0 }}>
                    <CustomSelect
                      disabled={!isEditing}
                      value={settingsData.store_status || 'Open'}
                      onChange={(e) => handleInputChange('store_status', e.target.value)}
                      options={[
                        { value: 'Open', label: '🟢 Open' },
                        { value: 'Maintenance', label: '🟡 Maintenance' }
                      ]}
                      width="100%"
                      height="38px"
                    />
                  </div>
                </div>

                <div className="settings-row-item">
                  <div className="toggle-label-box">
                    <span>Maintenance Mode</span>
                    <small>Show maintenance banner and disable checkout for customers</small>
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

              {/* Group 2: Inventory Management */}
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

          {/* TAB 3: ORDER SETTINGS */}
          {activeTab === 'orders' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>ORDER SETTINGS</h2>
                  <p>Configure customer order cancellation and self-service policies.</p>
                </div>
                {!isEditing && (
                  <button className="btn-edit-settings" onClick={() => setIsEditing(true)}>
                    <AppIcon icon={EditIcon} size={15} />
                    Edit
                  </button>
                )}
              </div>

              {/* Customer Order Control */}
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
                    <small>Allowed time window (e.g. 24 Hours, 48 Hours, or 30 Minutes)</small>
                  </div>
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <input
                      type="text"
                      disabled={!isEditing || !settingsData.allow_order_cancellation}
                      value={settingsData.cancellation_time_limit || '24 Hours'}
                      onChange={(e) => handleInputChange('cancellation_time_limit', e.target.value)}
                      placeholder="e.g. 24 Hours"
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

          {/* TAB 4: PAYMENT SETTINGS */}
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
                  <input type="text" value={settingsData.payment?.provider || 'Razorpay'} disabled />
                </div>

                <div className="form-field-group">
                  <label>Payment Mode</label>
                  <CustomSelect
                    disabled={!isEditing}
                    value={settingsData.payment?.mode || 'Test'}
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
                    value={settingsData.payment?.payment_currency || 'INR'}
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
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={settingsData.payment?.payment_timeout || '15 Minutes'}
                    onChange={(e) => handlePaymentChange('payment_timeout', e.target.value)}
                  />
                </div>

                <div className="form-field-group full-width">
                  <label>Razorpay Key ID</label>
                  <input type="text" value={settingsData.payment?.razorpay_key_id || 'rzp_test_************'} disabled />
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
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={settingsData.payment?.online_payment_enabled ?? true}
                    onChange={() => handlePaymentToggle('online_payment_enabled')}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Cash on Delivery (COD) Enabled</span>
                  <small>Accept cash payments upon delivery at customer doorstep</small>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={settingsData.payment?.cod_enabled ?? true}
                    onChange={() => handlePaymentToggle('cod_enabled')}
                  />
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

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div>
              <div className="panel-header-box flex-between">
                <div>
                  <h2>NOTIFICATION SETTINGS</h2>
                  <p>Control which automated alerts and store event notifications are triggered.</p>
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
                  <span>Low Stock Alert Notification</span>
                  <small>Send admin warning notification when inventory drops below threshold</small>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={settingsData.notify_low_stock}
                    onChange={() => handleToggleChange('notify_low_stock')}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Order Received Notification</span>
                  <small>Send instant notification to store administrator when a new order is received</small>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={settingsData.notify_order_created}
                    onChange={() => handleToggleChange('notify_order_created')}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-switch-row">
                <div className="toggle-label-box">
                  <span>Notify on New Customer Sign-Up</span>
                  <small>Send notification when a new customer registers on the store</small>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={settingsData.notify_new_customer}
                    onChange={() => handleToggleChange('notify_new_customer')}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              {isEditing && (
                <div className="form-actions-bar" style={{ marginTop: '20px' }}>
                  <button className="btn-save-settings" disabled={saving} onClick={handleSaveSettings}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-cancel-settings" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
