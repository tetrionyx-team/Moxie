import React, { useState, useMemo } from 'react';
import CustomSelect from '../Common/CustomSelect';
import {
  AppIcon,
  PlusIcon,
  OfferAdminIcon,
  CheckmarkCircle01Icon,
  ClockIcon,
  CancelCircleIcon,
  SearchIcon,
  SparklesIcon,
  EditIcon,
  DeleteIcon,
  CancelIcon,
  AlertIcon,
} from '../../icons';
import './OfferListPage.css';

export default function OfferListPage() {
  const ctx = window.DJANGO_CONTEXT || {};
  const initialOffers = ctx.offersList || [];

  const [offers, setOffers] = useState(initialOffers);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Helper for converting any date or ISO string to datetime-local input string (YYYY-MM-DDTHH:MM)
  const toDatetimeLocalValue = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const getLocalDatetimeString = (dateObj) => {
    const d = dateObj || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getDefaultFormData = () => {
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 0, 0);

    return {
      offer_text: '',
      start_datetime: getLocalDatetimeString(start),
      end_datetime: getLocalDatetimeString(end),
      is_active: true,
    };
  };

  // Form state
  const [formData, setFormData] = useState(getDefaultFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helpers for computing offer fields if missing
  const getOfferText = (item) => {
    return item.offer_text || item.name || item.title || item.description || '';
  };

  const getComputedOfferStatus = (item) => {
    const isActive = item.isActive !== undefined ? item.isActive : item.is_active;
    if (!isActive) return 'Inactive';
    const now = new Date();
    if (item.end_datetime) {
      const endD = new Date(item.end_datetime);
      if (!isNaN(endD.getTime()) && endD <= now) return 'Expired';
    }
    if (item.start_datetime) {
      const startD = new Date(item.start_datetime);
      if (!isNaN(startD.getTime()) && startD > now) return 'Scheduled';
    }
    if (item.end_date && !item.end_datetime) {
      const todayStr = getLocalDatetimeString(now).slice(0, 10);
      if (item.end_date < todayStr) return 'Expired';
    }
    if (item.start_date && !item.start_datetime) {
      const todayStr = getLocalDatetimeString(now).slice(0, 10);
      if (item.start_date > todayStr) return 'Scheduled';
    }
    if (item.status && item.status !== '') return item.status;
    return 'Active';
  };

  const getComputedSchedule = (item) => {
    if (item.start_datetime && item.end_datetime) {
      try {
        const s = new Date(item.start_datetime);
        const e = new Date(item.end_datetime);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const formatTime = (d) => {
            let h = d.getHours();
            const m = pad(d.getMinutes());
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? pad(h) : '12';
            return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m} ${ampm}`;
          };
          return `From: ${formatTime(s)}\nTo: ${formatTime(e)}`;
        }
      } catch {
        // fallback
      }
    }
    if (item.schedule && item.schedule !== '') return item.schedule;
    return '—';
  };

  // Fetch updated list from API
  const refreshOffers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/offers/', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.offers || []);
        setOffers(list);
      }
    } catch (err) {
      console.error('Failed to refresh offers:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshOffers();
    // Re-evaluate statuses and refresh list periodically every 15 seconds
    const interval = setInterval(() => {
      setOffers(prev => [...prev]);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = offers.length;
    const active = offers.filter(o => getComputedOfferStatus(o) === 'Active').length;
    const scheduled = offers.filter(o => getComputedOfferStatus(o) === 'Scheduled').length;
    const expiredOrInactive = offers.filter(o => {
      const st = getComputedOfferStatus(o);
      return st === 'Expired' || st === 'Inactive';
    }).length;
    return { total, active, scheduled, expiredOrInactive };
  }, [offers]);

  // Filtered offers — search against offer_text
  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      const text = getOfferText(o).toLowerCase();
      const matchesSearch = text.includes(searchTerm.toLowerCase());
      const st = getComputedOfferStatus(o);
      const matchesStatus =
        statusFilter === 'all' ||
        st.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [offers, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage) || 1;
  const paginatedOffers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOffers.slice(start, start + itemsPerPage);
  }, [filteredOffers, currentPage]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData(getDefaultFormData());
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = async (item) => {
    setFormError('');
    setFormData({
      offer_text: getOfferText(item),
      start_datetime: toDatetimeLocalValue(item.start_datetime) || getLocalDatetimeString(new Date()),
      end_datetime: toDatetimeLocalValue(item.end_datetime) || getLocalDatetimeString(new Date(Date.now() + 86400000)),
      is_active: item.isActive !== undefined ? item.isActive : (item.is_active !== undefined ? item.is_active : true),
    });
    setEditTarget(item);

    try {
      const res = await fetch(`/api/offers/${item.id}/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          offer_text: data.offer_text || data.name || data.title || getOfferText(item),
          start_datetime: toDatetimeLocalValue(data.start_datetime) || toDatetimeLocalValue(item.start_datetime) || getLocalDatetimeString(new Date()),
          end_datetime: toDatetimeLocalValue(data.end_datetime) || toDatetimeLocalValue(item.end_datetime) || getLocalDatetimeString(new Date(Date.now() + 86400000)),
          is_active: data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true),
        });
      }
    } catch (err) {
      console.error('Failed to fetch offer detail:', err);
    }
  };

  // Validate form
  const validateForm = () => {
    if (!formData.offer_text.trim()) {
      return 'Offer text cannot be empty.';
    }
    if (!formData.start_datetime) {
      return 'Start Date & Time is required.';
    }
    if (!formData.end_datetime) {
      return 'End Date & Time is required.';
    }
    const start = new Date(formData.start_datetime);
    const end = new Date(formData.end_datetime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Please enter a valid Start and End Date & Time.';
    }
    if (end <= start) {
      return 'End Date & Time must be later than Start Date & Time.';
    }
    return null;
  };

  // Submit Create
  const handleSaveCreate = async () => {
    const errorMsg = validateForm();
    if (errorMsg) { setFormError(errorMsg); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/offers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': ctx.csrfToken || '',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        refreshOffers();
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications();
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
        }
      } else {
        setFormError(data.error || 'Failed to create offer.');
      }
    } catch (err) {
      setFormError('Error connecting to server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleSaveEdit = async () => {
    const errorMsg = validateForm();
    if (errorMsg) { setFormError(errorMsg); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/offers/${editTarget.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': ctx.csrfToken || '',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setEditTarget(null);
        refreshOffers();
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications();
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
        }
      } else {
        setFormError(data.error || 'Failed to update offer.');
      }
    } catch (err) {
      setFormError('Error connecting to server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Offer
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${deleteTarget.id}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': ctx.csrfToken || '' },
      });
      if (res.ok) {
        setDeleteTarget(null);
        refreshOffers();
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications();
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete offer.');
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  const truncateText = (str, n = 80) => {
    if (!str) return '';
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  return (
    <div className="offer-list-shell">
      {/* Toast */}
      {toastMessage && (
        <div className={`offer-toast ${toastMessage.type}`}>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="offer-header-row">
        <div className="offer-title-group">
          <h1>Offers</h1>
          <p>Create, schedule, and manage promotional offers displayed on the customer website.</p>
        </div>
        <button className="btn-add-offer" onClick={handleOpenAddModal}>
          <AppIcon icon={PlusIcon} size={16} />
          <span>Add Offer</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="offer-stats-grid">
        <div className="offer-stat-card">
          <div className="stat-icon-box indigo">
            <AppIcon icon={OfferAdminIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">TOTAL OFFERS</span>
            <span className="stat-value">{stats.total.toLocaleString('en-IN')}</span>
            <span className="stat-sub">All created offers</span>
          </div>
        </div>

        <div className="offer-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ACTIVE OFFERS</span>
            <span className="stat-value">{stats.active.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Currently live</span>
          </div>
        </div>

        <div className="offer-stat-card">
          <div className="stat-icon-box amber">
            <AppIcon icon={ClockIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">SCHEDULED</span>
            <span className="stat-value">{stats.scheduled.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Upcoming offers</span>
          </div>
        </div>

        <div className="offer-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={CancelCircleIcon} size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">EXPIRED / INACTIVE</span>
            <span className="stat-value">{stats.expiredOrInactive.toLocaleString('en-IN')}</span>
            <span className="stat-sub">Past & disabled</span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="offer-table-card">
        {/* Filter Bar */}
        <div className="offer-filter-bar">
          <div className="offer-search-box">
            <span className="offer-search-icon">
              <AppIcon icon={SearchIcon} size={15} />
            </span>
            <input
              type="text"
              className="offer-search-input"
              placeholder="Search offer text..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <CustomSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Expired', label: 'Expired' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
            height="38px"
            minWidth="140px"
            buttonStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
          />
        </div>

        {/* Data Table */}
        <div className="offer-table-wrapper">
          <table className="offer-table">
            <thead>
              <tr>
                <th style={{ width: '48%', minWidth: '240px' }}>OFFER</th>
                <th style={{ width: '28%', minWidth: '200px' }}>SCHEDULE</th>
                <th style={{ width: '14%', minWidth: '110px' }}>STATUS</th>
                <th style={{ width: '10%', minWidth: '90px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOffers.length > 0 ? (
                paginatedOffers.map(item => {
                  const offerText = getOfferText(item);
                  const computedSchedule = getComputedSchedule(item);
                  const computedStatus = getComputedOfferStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="offer-name-box">
                          <div className="offer-avatar-icon">
                            <AppIcon icon={SparklesIcon} size={18} color="#6657ec" />
                          </div>
                          <div className="offer-meta-info">
                            <strong style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                              {truncateText(offerText, 100)}
                            </strong>
                          </div>
                        </div>
                      </td>
                      <td className="offer-schedule-cell">
                        {computedSchedule && computedSchedule !== '—' ? (
                          <div className="schedule-lines">
                            {computedSchedule.split('\n').map((line, idx) => (
                              <span key={idx} className={`schedule-line ${idx > 0 ? 'schedule-line-sub' : ''}`}>
                                {line}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`badge-status ${(computedStatus || '').toLowerCase()}`}>
                          {computedStatus === 'Active' && '● Active'}
                          {computedStatus === 'Scheduled' && 'Scheduled'}
                          {computedStatus === 'Expired' && 'Expired'}
                          {computedStatus === 'Inactive' && '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-icon-action" title="Edit Offer" aria-label="Edit Offer" onClick={() => handleOpenEditModal(item)}>
                            <AppIcon icon={EditIcon} size={15} />
                          </button>
                          <button className="btn-icon-action delete" title="Delete Offer" aria-label="Delete Offer" onClick={() => setDeleteTarget(item)}>
                            <AppIcon icon={DeleteIcon} size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state-box">
                      <AppIcon icon={OfferAdminIcon} size={36} color="#94a3b8" />
                      <h3>No offers found</h3>
                      <p>No offer entries matching your current search or filter criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="offer-footer-bar">
          <div className="footer-info">
            Showing {filteredOffers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredOffers.length)} of {filteredOffers.length} offers
          </div>

          {totalPages > 1 && (
            <div className="pagination-group">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-btn ${p === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CREATE OFFER MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Create & Schedule Offer</h2>
              <button className="btn-modal-close" onClick={() => setShowAddModal(false)} aria-label="Close modal">
                <AppIcon icon={CancelIcon} size={20} />
              </button>
            </div>

            <div className="modal-body">
              {formError && (
                <div className="error-banner d-flex align-items-center gap-2">
                  <AppIcon icon={AlertIcon} size={16} color="#ef4444" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="modal-form-grid">
                <div className="form-group full">
                  <label>Offer <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    rows="6"
                    placeholder={'Write your offer here...\n\nExample:\nFLAT 20% OFF ON SMART WATCHES!\nLimited Time Offer\nShop Now & Save More!\nFree Delivery on Orders ₹999+'}
                    value={formData.offer_text}
                    onChange={(e) => setFormData({ ...formData, offer_text: e.target.value })}
                    style={{ fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', lineHeight: '1.6' }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Supports line breaks and formatted text.
                  </small>
                </div>

                <div className="form-group">
                  <label>Start Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.start_datetime}
                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.end_datetime}
                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={submitting} onClick={handleSaveCreate}>
                {submitting ? 'Saving...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OFFER MODAL */}
      {editTarget && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Edit Offer & Schedule</h2>
              <button className="btn-modal-close" onClick={() => setEditTarget(null)} aria-label="Close modal">
                <AppIcon icon={CancelIcon} size={20} />
              </button>
            </div>

            <div className="modal-body">
              {formError && (
                <div className="error-banner d-flex align-items-center gap-2">
                  <AppIcon icon={AlertIcon} size={16} color="#ef4444" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="modal-form-grid">
                <div className="form-group full">
                  <label>Offer <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    rows="6"
                    value={formData.offer_text}
                    onChange={(e) => setFormData({ ...formData, offer_text: e.target.value })}
                    style={{ fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', lineHeight: '1.6' }}
                  />
                </div>

                <div className="form-group">
                  <label>Start Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.start_datetime}
                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="datetime-local"
                    value={formData.end_datetime}
                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn-primary" disabled={submitting} onClick={handleSaveEdit}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="btn-modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close modal">
                <AppIcon icon={CancelIcon} size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <AppIcon icon={DeleteIcon} size={42} color="#ef4444" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>Delete Offer?</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                Are you sure you want to delete this offer?
                <br />
                <em style={{ color: '#94a3b8', fontSize: '12px' }}>
                  "{truncateText(deleteTarget.offer_text, 60)}"
                </em>
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" disabled={submitting} onClick={handleConfirmDelete}>
                {submitting ? 'Deleting...' : 'Delete Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
