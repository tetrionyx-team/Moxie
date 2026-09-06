import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../Common/CustomSelect';
import {
  AppIcon,
  OrderIcon,
  ClockIcon,
  ShippingIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  SearchIcon,
  ViewIcon,
  CancelIcon,
} from '../../icons';
import './OrderPage.css';

function getCsrfToken() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (cookie) return cookie.split('=')[1];
  const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (input) return input.value;
  if (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) return window.DJANGO_CONTEXT.csrfToken;
  return '';
}

export default function OrderPage() {
  const djangoContext = window.DJANGO_CONTEXT || {};

  const [orders, setOrders] = useState(djangoContext.ordersList || []);
  const [stats, setStats] = useState({
    total_orders: djangoContext.totalOrders || 0,
    pending_orders: djangoContext.pendingOrders || 0,
    shipped_orders: djangoContext.shippedOrders || 0,
    delivered_orders: djangoContext.deliveredOrders || 0,
    cancelled_orders: djangoContext.cancelledOrders || 0,
    total_revenue: djangoContext.totalRevenue || 0
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  
  const [updateOrderStatus, setUpdateOrderStatus] = useState('');
  const [updatePaymentStatus, setUpdatePaymentStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('payment_status', paymentFilter);
      if (dateFilter !== 'all') params.append('date', dateFilter);
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/admin-orders/?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || data.results || data.orders_list || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, statusFilter, paymentFilter, dateFilter, sortOption]);

  const handleOpenDetail = async (orderItem) => {
    setSelectedOrder(orderItem);
    setOrderDetailLoading(true);
    setUpdateMessage('');
    try {
      const res = await fetch(`/api/admin-orders/${orderItem.id}/`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrderDetail(data);
        setUpdateOrderStatus(data.orderStatus || 'Pending');
        setUpdatePaymentStatus(data.paymentStatus || 'Pending');
      }
    } catch (err) {
      console.error("Failed to fetch order detail:", err);
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    setUpdateMessage('');
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/admin-orders/${selectedOrder.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
          order_status: updateOrderStatus,
          payment_status: updatePaymentStatus
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUpdateMessage("Order status updated successfully.");
        if (selectedOrderDetail) {
          setSelectedOrderDetail(prev => ({
            ...prev,
            orderStatus: data.order_status || data.orderStatus,
            paymentStatus: data.payment_status || data.paymentStatus
          }));
        }
        fetchOrders();
        if (typeof window.refreshAdminNotifications === 'function') {
          window.refreshAdminNotifications();
        } else {
          window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
        }
      } else {
        setUpdateMessage(data.error || "Failed to update order status.");
      }
    } catch (err) {
      setUpdateMessage("Error updating status.");
    } finally {
      setUpdating(false);
    }
  };

  // Client side pagination
  const totalPages = Math.ceil(orders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, currentPage]);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  return (
    <div className="order-shell">
      {/* Header Bar */}
      <div className="order-header">
        <div className="order-title-box">
          <h1>Orders</h1>
          <p>Track, manage, and process customer orders and shipments.</p>
        </div>
      </div>

      {/* Top 5 Metric Cards matching Screenshot */}
      <div className="order-stats-grid">
        <div className="order-stat-card">
          <div className="stat-icon-box blue">
            <AppIcon icon={OrderIcon} size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{stats.total_orders.toLocaleString()}</span>
          </div>
        </div>

        <div className="order-stat-card">
          <div className="stat-icon-box amber">
            <AppIcon icon={ClockIcon} size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending Orders</span>
            <span className="stat-value">{stats.pending_orders.toLocaleString()}</span>
          </div>
        </div>

        <div className="order-stat-card">
          <div className="stat-icon-box indigo">
            <AppIcon icon={ShippingIcon} size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Shipped Orders</span>
            <span className="stat-value">{stats.shipped_orders.toLocaleString()}</span>
          </div>
        </div>

        <div className="order-stat-card">
          <div className="stat-icon-box green">
            <AppIcon icon={CheckmarkCircle01Icon} size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Delivered Orders</span>
            <span className="stat-value">{stats.delivered_orders.toLocaleString()}</span>
          </div>
        </div>

        <div className="order-stat-card">
          <div className="stat-icon-box red">
            <AppIcon icon={CancelCircleIcon} size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Cancelled Orders</span>
            <span className="stat-value">{stats.cancelled_orders.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="order-table-card">
        {/* Filter Toolbar matching Screenshot */}
        <div className="table-filter-bar">
          <div className="filter-left-group">
            <div className="order-search-box">
              <span className="order-search-icon">
                <AppIcon icon={SearchIcon} size={16} />
              </span>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="order-search-input"
              />
            </div>
          </div>

          <div className="filter-right-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <CustomSelect
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Confirmed', label: 'Confirmed' },
                { value: 'Processing', label: 'Processing' },
                { value: 'Shipped', label: 'Shipped' },
                { value: 'Out for Delivery', label: 'Out for Delivery' },
                { value: 'Delivered', label: 'Delivered' },
                { value: 'Cancelled', label: 'Cancelled' },
                { value: 'Returned', label: 'Returned' }
              ]}
              minWidth="130px"
            />

            <CustomSelect
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Payment' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Failed', label: 'Failed' },
                { value: 'Refunded', label: 'Refunded' }
              ]}
              minWidth="130px"
            />

            <CustomSelect
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: '7days', label: 'Last 7 Days' },
                { value: '30days', label: 'Last 30 Days' }
              ]}
              minWidth="130px"
            />

            <CustomSelect
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'highest', label: 'Highest Amount' },
                { value: 'lowest', label: 'Lowest Amount' }
              ]}
              minWidth="140px"
            />
          </div>
        </div>

        {/* Orders Table */}
        <table className="order-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>CUSTOMER</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>PAYMENT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid #cbd5e1', borderTopColor: '#6657ec', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                    <span style={{ fontWeight: '500' }}>Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedOrders.length > 0 ? (
              paginatedOrders.map((o) => {
                const statusClass = (o.orderStatus || 'pending').toLowerCase().replace(/\s+/g, '-');
                const paymentClass = (o.paymentStatus || 'pending').toLowerCase();
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: '750', color: '#0f172a' }}>{o.orderId}</td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-circle">
                          {o.customer.initial || 'C'}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{o.customer.name}</span>
                          <span className="user-email-sub">{o.customer.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#475569', fontSize: '13px' }}>{o.date}</td>
                    <td style={{ fontWeight: '750', color: '#0f172a' }}>
                      ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-pill ${paymentClass}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-btn view"
                        title="View Order Details"
                        aria-label="View Order Details"
                        onClick={() => handleOpenDetail(o)}
                      >
                        <AppIcon icon={ViewIcon} size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No orders found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer & Pagination Bar */}
        <div className="table-footer-bar">
          <div className="footer-info">
            Showing {orders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, orders.length)} of {orders.length.toLocaleString()} orders
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h2>ORDER {selectedOrder.orderId}</h2>
              <button className="close-modal-btn" onClick={() => setSelectedOrder(null)} aria-label="Close modal">
                <AppIcon icon={CancelIcon} size={20} />
              </button>
            </div>

            <div className="modal-body-scroll">
              {orderDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading order details...
                </div>
              ) : selectedOrderDetail ? (
                <>
                  {updateMessage && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: updateMessage.includes('successfully') ? '#dcfce7' : '#fee2e2', color: updateMessage.includes('successfully') ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                      {updateMessage}
                    </div>
                  )}

                  {/* Order Status Change Card */}
                  <div className="order-detail-card">
                    <div className="detail-card-title">UPDATE ORDER STATUS</div>
                    <div className="status-update-grid">
                      <div className="status-form-group">
                        <label className="status-form-label">Order Status</label>
                        <CustomSelect
                          value={updateOrderStatus}
                          onChange={(e) => setUpdateOrderStatus(e.target.value)}
                          options={[
                            { value: 'Pending', label: 'Pending' },
                            { value: 'Confirmed', label: 'Confirmed' },
                            { value: 'Processing', label: 'Processing' },
                            { value: 'Shipped', label: 'Shipped' },
                            { value: 'Out for Delivery', label: 'Out for Delivery' },
                            { value: 'Delivered', label: 'Delivered' },
                            { value: 'Cancelled', label: 'Cancelled' },
                            { value: 'Returned', label: 'Returned' }
                          ]}
                          height="38px"
                          width="100%"
                        />
                      </div>

                      <div className="status-form-group">
                        <label className="status-form-label">Payment Status</label>
                        <CustomSelect
                          value={updatePaymentStatus}
                          onChange={(e) => setUpdatePaymentStatus(e.target.value)}
                          options={[
                            { value: 'Pending', label: 'Pending' },
                            { value: 'Paid', label: 'Paid' },
                            { value: 'Failed', label: 'Failed' },
                            { value: 'Refunded', label: 'Refunded' }
                          ]}
                          height="38px"
                          width="100%"
                        />
                      </div>

                      <div className="status-form-group status-action-group">
                        <button className="btn-update-status" disabled={updating} onClick={handleSaveStatus}>
                          {updating ? 'Saving...' : 'Update Status'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Address Card */}
                  <div className="info-grid-2">
                    <div className="order-detail-card">
                      <div className="detail-card-title">CUSTOMER INFORMATION</div>
                      <div className="info-item" style={{ marginBottom: '8px' }}>
                        <label>Name</label>
                        <span>{selectedOrderDetail.customer.name}</span>
                      </div>
                      <div className="info-item" style={{ marginBottom: '8px' }}>
                        <label>Email</label>
                        <span>{selectedOrderDetail.customer.email}</span>
                      </div>
                      <div className="info-item">
                        <label>Mobile</label>
                        <span>{selectedOrderDetail.customer.phone}</span>
                      </div>
                    </div>

                    <div className="order-detail-card">
                      <div className="detail-card-title">DELIVERY ADDRESS</div>
                      <div className="info-item" style={{ marginBottom: '6px' }}>
                        <span>{selectedOrderDetail.shippingAddress.name}</span>
                      </div>
                      <div className="info-item" style={{ marginBottom: '6px' }}>
                        <span style={{ fontWeight: '500', color: '#475569' }}>
                          {selectedOrderDetail.shippingAddress.address}
                        </span>
                      </div>
                      <div className="info-item">
                        <span style={{ fontWeight: '500', color: '#475569' }}>
                          {selectedOrderDetail.shippingAddress.city} - {selectedOrderDetail.shippingAddress.pincode}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="order-detail-card">
                    <div className="detail-card-title">ORDER ITEMS</div>
                    <table className="modal-items-table">
                      <thead>
                        <tr>
                          <th>PRODUCT</th>
                          <th>COLOR / SIZE</th>
                          <th>QTY</th>
                          <th>PRICE</th>
                          <th style={{ textAlign: 'right' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrderDetail.items.map((it) => (
                          <tr key={it.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {it.image && (
                                  <img src={it.image} alt={it.productName} className="item-thumb" />
                                )}
                                <span style={{ fontWeight: '700', color: '#0f172a' }}>{it.productName}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>{it.colorName || 'Default'}</span>
                                {it.size && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '1px 6px',
                                      borderRadius: '5px',
                                      background: '#e0e7ff',
                                      color: '#4338ca'
                                    }}
                                  >
                                    Size: {it.size}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>{it.quantity}</td>
                            <td>₹{Number(it.price).toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'right', fontWeight: '700' }}>
                              ₹{Number(it.total).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pricing Breakdown */}
                    <div className="pricing-breakdown" style={{ marginTop: '16px' }}>
                      <div className="pricing-row">
                        <span>Subtotal</span>
                        <span>₹{Number(selectedOrderDetail.pricing.subtotal).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pricing-row">
                        <span>Shipping Fee</span>
                        <span>₹{Number(selectedOrderDetail.pricing.shipping).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pricing-row total">
                        <span>Total Amount</span>
                        <span>₹{Number(selectedOrderDetail.pricing.total).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info Card */}
                  <div className="order-detail-card">
                    <div className="detail-card-title">PAYMENT DETAILS</div>
                    <div className="info-grid-2">
                      <div className="info-item">
                        <label>Payment Method</label>
                        <span>{selectedOrderDetail.paymentInfo.method}</span>
                      </div>
                      <div className="info-item">
                        <label>Payment Status</label>
                        <span>{selectedOrderDetail.paymentInfo.status}</span>
                      </div>
                      <div className="info-item">
                        <label>Razorpay Order ID</label>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                          {selectedOrderDetail.paymentInfo.razorpayOrderId}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Razorpay Payment ID</label>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                          {selectedOrderDetail.paymentInfo.razorpayPaymentId}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
