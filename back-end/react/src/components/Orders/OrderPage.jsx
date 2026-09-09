import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
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

const ALL_ORDERS_KEY = "moxie_orders";

const getStoredMasterOrders = () => {
  try {
    const raw = localStorage.getItem(ALL_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [];
};

const saveStoredMasterOrders = (orders) => {
  try {
    localStorage.setItem(ALL_ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("moxie_orders_updated", { detail: { orders } }));
  } catch {}
};

export default function OrderPage() {
  const djangoContext = window.DJANGO_CONTEXT || {};

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    shipped_orders: 0,
    delivered_orders: 0,
    cancelled_orders: 0,
    total_revenue: 0,
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
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

  const dateInputRef = useRef(null);

  const fetchOrders = async () => {
    setLoading(true);
    let apiList = [];
    let apiStats = null;

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('payment_status', paymentFilter);
      if (selectedDate) params.append('date', selectedDate);
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/admin-orders/?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        apiList = data.orders || data.results || data.orders_list || [];
        apiStats = data.stats;
      }
    } catch (err) {
      console.error("API orders fetch error:", err);
    }

    // Merge with master localStorage dataset
    let masterList = getStoredMasterOrders();

    // If API returned orders, sync into master if missing
    if (apiList.length > 0) {
      const masterMap = new Map();
      masterList.forEach(o => masterMap.set(String(o.id || o.orderId), o));
      apiList.forEach(apiO => {
        const key = String(apiO.id || apiO.orderId);
        if (!masterMap.has(key)) {
          masterMap.set(key, {
            ...apiO,
            orderStatus: apiO.orderStatus || 'Confirmed',
            paymentMethod: apiO.paymentMethod || (apiO.razorpayOrderId && !apiO.razorpayOrderId.startsWith('cod_') ? 'UPI' : 'COD'),
          });
        }
      });
      masterList = Array.from(masterMap.values());
    }

    // Filter master list according to active UI filters
    let filtered = [...masterList];

    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(o => {
        const idMatch = (o.orderId || o.order_number || String(o.id)).toLowerCase().includes(q);
        const nameMatch = (o.customerName || o.customer?.name || o.shipping_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.mobile || o.customer?.phone || o.shipping_phone || '').includes(q);
        const emailMatch = (o.email || o.customer?.email || '').toLowerCase().includes(q);
        const trackMatch = (o.trackingId || o.tracking_id || '').toLowerCase().includes(q);
        const prodMatch = (o.products || []).some(p => (p.productName || p.name || '').toLowerCase().includes(q)) || (o.name || '').toLowerCase().includes(q);
        return idMatch || nameMatch || phoneMatch || emailMatch || trackMatch || prodMatch;
      });
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(o => {
        const s = (o.orderStatus || o.status || '').toLowerCase().trim();
        return s === statusFilter.toLowerCase().trim();
      });
    }

    if (paymentFilter && paymentFilter !== 'all') {
      filtered = filtered.filter(o => {
        const p = (o.paymentStatus || '').toLowerCase().trim();
        return p === paymentFilter.toLowerCase().trim();
      });
    }

    if (selectedDate) {
      filtered = filtered.filter(o => {
        const iso = o.createdAt ? o.createdAt.split('T')[0] : '';
        if (iso && iso === selectedDate) return true;
        if (o.isoDate && o.isoDate === selectedDate) return true;
        try {
          const d = new Date(o.createdAt || o.date);
          return d.toISOString().split('T')[0] === selectedDate;
        } catch {
          return false;
        }
      });
    }

    // Sorting
    if (sortOption === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
    } else if (sortOption === 'highest') {
      filtered.sort((a, b) => (Number(b.grandTotal || b.total || b.totalAmount) || 0) - (Number(a.grandTotal || a.total || a.totalAmount) || 0));
    } else if (sortOption === 'lowest') {
      filtered.sort((a, b) => (Number(a.grandTotal || a.total || a.totalAmount) || 0) - (Number(b.grandTotal || b.total || b.totalAmount) || 0));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    }

    // Recalculate dynamic counters from entire master dataset
    const all = masterList.length > 0 ? masterList : (apiList.length > 0 ? apiList : djangoContext.ordersList || []);
    const calculatedStats = {
      total_orders: all.length,
      pending_orders: all.filter(o => ['pending', 'confirmed', 'processing', 'packed'].includes((o.orderStatus || o.status || '').toLowerCase().trim())).length,
      shipped_orders: all.filter(o => ['shipped', 'out for delivery'].includes((o.orderStatus || o.status || '').toLowerCase().trim())).length,
      delivered_orders: all.filter(o => (o.orderStatus || o.status || '').toLowerCase().trim() === 'delivered').length,
      cancelled_orders: all.filter(o => (o.orderStatus || o.status || '').toLowerCase().trim() === 'cancelled').length,
      total_revenue: all.reduce((acc, o) => {
        const pStatus = (o.paymentStatus || '').toLowerCase();
        if (pStatus === 'paid' || pStatus === 'success') {
          return acc + (Number(o.grandTotal || o.total || o.totalAmount) || 0);
        }
        return acc;
      }, 0),
    };

    setOrders(filtered);
    setStats(calculatedStats);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, statusFilter, paymentFilter, selectedDate, sortOption]);

  // Listen to global order updates across components
  useEffect(() => {
    const handleGlobalUpdate = () => {
      fetchOrders();
    };
    window.addEventListener('moxie_orders_updated', handleGlobalUpdate);
    return () => window.removeEventListener('moxie_orders_updated', handleGlobalUpdate);
  }, []);

  const handleOpenDetail = async (orderItem) => {
    setSelectedOrder(orderItem);
    setOrderDetailLoading(true);
    setUpdateMessage('');

    // Check master dataset first for rich product details
    const master = getStoredMasterOrders();
    const foundLocal = master.find(o => String(o.id) === String(orderItem.id) || String(o.orderId) === String(orderItem.orderId));

    try {
      const res = await fetch(`/api/admin-orders/${orderItem.id}/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const mergedDetail = { ...foundLocal, ...data };
        setSelectedOrderDetail(mergedDetail);
        setUpdateOrderStatus(mergedDetail.orderStatus || mergedDetail.status || 'Confirmed');
        setUpdatePaymentStatus(mergedDetail.paymentStatus || 'Pending');
        setOrderDetailLoading(false);
        return;
      }
    } catch {}

    if (foundLocal) {
      setSelectedOrderDetail(foundLocal);
      setUpdateOrderStatus(foundLocal.orderStatus || foundLocal.status || 'Confirmed');
      setUpdatePaymentStatus(foundLocal.paymentStatus || 'Pending');
    } else {
      setSelectedOrderDetail(orderItem);
      setUpdateOrderStatus(orderItem.orderStatus || orderItem.status || 'Confirmed');
      setUpdatePaymentStatus(orderItem.paymentStatus || 'Pending');
    }
    setOrderDetailLoading(false);
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    setUpdateMessage('');

    try {
      const csrfToken = getCsrfToken();
      await fetch(`/api/admin-orders/${selectedOrder.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          order_status: updateOrderStatus,
          payment_status: updatePaymentStatus,
        }),
      });
    } catch {}

    // Update master dataset
    const master = getStoredMasterOrders();
    const nowIso = new Date().toISOString();
    let updatedObj = null;

    const updatedMaster = master.map(o => {
      if (String(o.id) === String(selectedOrder.id) || String(o.orderId) === String(selectedOrder.orderId)) {
        const history = Array.isArray(o.statusHistory) ? [...o.statusHistory] : [];
        const lastStatus = history.length > 0 ? history[history.length - 1].status : '';
        if (updateOrderStatus && lastStatus !== updateOrderStatus) {
          history.push({
            status: updateOrderStatus,
            timestamp: nowIso,
          });
        }
        updatedObj = {
          ...o,
          orderStatus: updateOrderStatus,
          status: updateOrderStatus,
          paymentStatus: updatePaymentStatus,
          statusHistory: history,
          updatedAt: nowIso,
        };
        return updatedObj;
      }
      return o;
    });

    saveStoredMasterOrders(updatedMaster);

    setUpdateMessage("Order status updated successfully.");
    if (selectedOrderDetail) {
      setSelectedOrderDetail(prev => ({
        ...prev,
        orderStatus: updateOrderStatus,
        status: updateOrderStatus,
        paymentStatus: updatePaymentStatus,
      }));
    }

    fetchOrders();

    if (typeof window.refreshAdminNotifications === 'function') {
      window.refreshAdminNotifications();
    } else {
      window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
    }

    setUpdating(false);
  };

  /* ── Export Filtered Orders to Excel (.xlsx) ── */
  const handleExportExcel = () => {
    if (!orders || orders.length === 0) {
      alert("No orders matching current filter criteria to export.");
      return;
    }

    // Build flattened Excel rows matching exact columns A-P
    const excelRows = [];

    orders.forEach((o) => {
      const orderId = o.orderId || o.order_number || `MOX-${String(o.id).padStart(4, '0')}`;
      const orderDate = o.orderDate || o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "N/A");
      const customerName = o.customerName || o.customer?.name || o.shippingAddress?.name || "Customer";
      const mobile = o.mobile || o.customer?.phone || o.shippingAddress?.phone || "N/A";
      const paymentMethod = o.paymentMethod || (o.razorpayOrderId && !o.razorpayOrderId.startsWith('cod_') ? "UPI" : "COD");
      const paymentStatus = o.paymentStatus || "Pending";
      const fullAddress = o.address || o.shippingAddress?.address || o.shippingAddress?.flat || "N/A";
      const city = o.city || o.shippingAddress?.city || "N/A";
      const district = o.district || o.shippingAddress?.district || city || "N/A";
      const pinCode = o.pinCode || o.pincode || o.shippingAddress?.pincode || "N/A";
      const orderTotal = Number(o.grandTotal || o.total || o.totalAmount || 0);
      const orderStatus = o.orderStatus || o.status || "Confirmed";
      const trackingId = o.trackingId || o.tracking_id || `MOXTRK${String(o.id || '0001').padStart(4, '0')}`;

      const productsList = Array.isArray(o.products) && o.products.length > 0
        ? o.products
        : Array.isArray(o.items) && o.items.length > 0
        ? o.items
        : [
            {
              productName: o.name || "Moxie Item",
              quantity: o.quantity || 1,
              price: o.price || orderTotal,
            },
          ];

      // Export ONE ROW PER PRODUCT, repeating delivery information
      productsList.forEach((prod) => {
        excelRows.push({
          "Order ID": orderId,
          "Order Date": orderDate,
          "Customer Name": customerName,
          "Mobile Number": mobile,
          "Payment Method": paymentMethod,
          "Payment Status": paymentStatus,
          "Full Address": fullAddress,
          "City": city,
          "District": district,
          "PIN Code": pinCode,
          "Product Name": prod.productName || prod.name || "Product",
          "Quantity": Number(prod.quantity || 1),
          "Product Price": `₹${Number(prod.price || 0).toLocaleString("en-IN")}`,
          "Order Total": `₹${orderTotal.toLocaleString("en-IN")}`,
          "Order Status": orderStatus,
          "Tracking ID": trackingId,
        });
      });
    });

    // Create Worksheet & Workbook
    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Set Column Widths for readability
    worksheet["!cols"] = [
      { wch: 14 }, // Order ID
      { wch: 14 }, // Order Date
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Mobile Number
      { wch: 16 }, // Payment Method
      { wch: 16 }, // Payment Status
      { wch: 32 }, // Full Address
      { wch: 16 }, // City
      { wch: 16 }, // District
      { wch: 12 }, // PIN Code
      { wch: 28 }, // Product Name
      { wch: 10 }, // Quantity
      { wch: 14 }, // Product Price
      { wch: 14 }, // Order Total
      { wch: 18 }, // Order Status
      { wch: 18 }, // Tracking ID
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Delivery Orders");

    // Meaningful dynamic filename
    let filename = "Moxie_All_Orders.xlsx";
    const statusPart = statusFilter && statusFilter !== 'all' ? `_${statusFilter}` : "";
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-");
      filename = `Moxie${statusPart}_Orders_${d}-${m}-${y}.xlsx`;
    } else if (statusFilter && statusFilter !== 'all') {
      filename = `Moxie_${statusFilter}_Orders.xlsx`;
    }

    XLSX.writeFile(workbook, filename);
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

      {/* Top 5 Dynamic Metric Cards */}
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
        {/* Filter Toolbar with Calendar Date Picker and Export Button */}
        <div className="table-filter-bar">
          <div className="filter-left-group">
            <div className="order-search-box">
              <span className="order-search-icon">
                <AppIcon icon={SearchIcon} size={16} />
              </span>
              <input
                type="text"
                placeholder="Search orders, customers, products..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="order-search-input"
              />
            </div>
          </div>

          <div className="filter-right-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Calendar Date Picker with Clear X Button */}
            <div className="admin-date-picker-wrap">
              <span className="admin-date-picker-icon" onClick={() => dateInputRef.current?.showPicker?.()}>
                📅
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                className="admin-date-input"
                aria-label="Filter by order date"
              />
              {selectedDate && (
                <button
                  type="button"
                  className="admin-date-clear-btn"
                  onClick={() => { setSelectedDate(''); setCurrentPage(1); }}
                  title="Clear Date Filter"
                >
                  ✕
                </button>
              )}
            </div>

            <CustomSelect
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'Confirmed', label: 'Confirmed' },
                { value: 'Processing', label: 'Processing' },
                { value: 'Packed', label: 'Packed' },
                { value: 'Shipped', label: 'Shipped' },
                { value: 'Out for Delivery', label: 'Out for Delivery' },
                { value: 'Delivered', label: 'Delivered' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              minWidth="130px"
            />

            <CustomSelect
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Payment' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Success', label: 'Success' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Failed', label: 'Failed' },
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
              minWidth="135px"
            />

            {/* Export Excel Button */}
            <button
              type="button"
              className="admin-btn-export-excel"
              onClick={handleExportExcel}
              title="Export filtered orders to Excel (.xlsx)"
            >
              <span style={{ fontSize: '15px' }}>📊</span>
              <span>Export Excel</span>
            </button>
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
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid #cbd5e1', borderTopColor: '#c9a35c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                    <span style={{ fontWeight: '500' }}>Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedOrders.length > 0 ? (
              paginatedOrders.map((o) => {
                const orderId = o.orderId || o.order_number || `MOX-${String(o.id).padStart(4, '0')}`;
                const statusClass = (o.orderStatus || o.status || 'confirmed').toLowerCase().replace(/\s+/g, '-');
                const paymentClass = (o.paymentStatus || 'pending').toLowerCase();
                const customerName = o.customerName || o.customer?.name || o.shippingAddress?.name || "Customer";
                const customerEmail = o.email || o.customer?.email || "customer@example.com";
                const initial = customerName.charAt(0).toUpperCase() || "C";
                const orderTotal = Number(o.grandTotal || o.total || o.totalAmount || 0);

                return (
                  <tr key={o.id || orderId}>
                    <td style={{ fontWeight: '750', color: '#0f172a' }}>{orderId}</td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-circle">
                          {initial}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{customerName}</span>
                          <span className="user-email-sub">{customerEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#475569', fontSize: '13px' }}>{o.orderDate || o.date}</td>
                    <td style={{ fontWeight: '750', color: '#0f172a' }}>
                      ₹{orderTotal.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>
                        {o.orderStatus || o.status || 'Confirmed'}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-pill ${paymentClass}`}>
                        {o.paymentStatus || 'Pending'}
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
              <h2>ORDER {selectedOrder.orderId || selectedOrder.order_number || selectedOrder.id}</h2>
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
                    <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: updateMessage.includes('successfully') ? '#dcfce7' : '#fee2e2', color: updateMessage.includes('successfully') ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '600', marginBottom: '14px' }}>
                      {updateMessage}
                    </div>
                  )}

                  {/* Order Status Change Card */}
                  <div className="order-detail-card">
                    <div className="detail-card-title">UPDATE ORDER STATUS & PAYMENT</div>
                    <div className="status-update-grid">
                      <div className="status-form-group">
                        <label className="status-form-label">Order Status</label>
                        <CustomSelect
                          value={updateOrderStatus}
                          onChange={(e) => setUpdateOrderStatus(e.target.value)}
                          options={[
                            { value: 'Confirmed', label: 'Confirmed' },
                            { value: 'Processing', label: 'Processing' },
                            { value: 'Packed', label: 'Packed' },
                            { value: 'Shipped', label: 'Shipped' },
                            { value: 'Out for Delivery', label: 'Out for Delivery' },
                            { value: 'Delivered', label: 'Delivered' },
                            { value: 'Cancelled', label: 'Cancelled' },
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
                            { value: 'Paid', label: 'Paid' },
                            { value: 'Success', label: 'Success' },
                            { value: 'Pending', label: 'Pending' },
                            { value: 'Failed', label: 'Failed' },
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

                  {/* Customer & Delivery Address Grid */}
                  <div className="info-grid-2">
                    <div className="order-detail-card">
                      <div className="detail-card-title">CUSTOMER INFORMATION</div>
                      <div className="info-item" style={{ marginBottom: '8px' }}>
                        <label>Name</label>
                        <span>{selectedOrderDetail.customerName || selectedOrderDetail.customer?.name || selectedOrderDetail.shippingAddress?.name || "Customer"}</span>
                      </div>
                      <div className="info-item" style={{ marginBottom: '8px' }}>
                        <label>Email</label>
                        <span>{selectedOrderDetail.email || selectedOrderDetail.customer?.email || "customer@example.com"}</span>
                      </div>
                      <div className="info-item" style={{ marginBottom: '8px' }}>
                        <label>Mobile</label>
                        <span>{selectedOrderDetail.mobile || selectedOrderDetail.customer?.phone || selectedOrderDetail.shippingAddress?.phone || "—"}</span>
                      </div>
                      <div className="info-item">
                        <label>Tracking ID</label>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#c9a35c' }}>
                          {selectedOrderDetail.trackingId || selectedOrderDetail.tracking_id || `MOXTRK${String(selectedOrderDetail.id || '0001').padStart(4, '0')}`}
                        </span>
                      </div>
                    </div>

                    <div className="order-detail-card">
                      <div className="detail-card-title">DELIVERY ADDRESS</div>
                      <div className="info-item" style={{ marginBottom: '6px' }}>
                        <label>Recipient</label>
                        <span style={{ fontWeight: '700' }}>{selectedOrderDetail.customerName || selectedOrderDetail.shippingAddress?.name || "Customer"}</span>
                      </div>
                      <div className="info-item" style={{ marginBottom: '6px' }}>
                        <label>Full Address</label>
                        <span style={{ fontWeight: '500', color: '#475569' }}>
                          {selectedOrderDetail.address || selectedOrderDetail.shippingAddress?.address || selectedOrderDetail.shippingAddress?.flat || "—"}
                        </span>
                      </div>
                      <div className="info-item" style={{ marginBottom: '6px' }}>
                        <label>City & District</label>
                        <span style={{ fontWeight: '500', color: '#475569' }}>
                          {selectedOrderDetail.city || selectedOrderDetail.shippingAddress?.city || "—"}, {selectedOrderDetail.district || selectedOrderDetail.shippingAddress?.district || selectedOrderDetail.city || "—"}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>PIN Code</label>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                          {selectedOrderDetail.pinCode || selectedOrderDetail.pincode || selectedOrderDetail.shippingAddress?.pincode || "—"}
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
                        {(selectedOrderDetail.products || selectedOrderDetail.items || []).map((item, idx) => {
                          const pName = item.productName || item.name || "Product";
                          const pPrice = Number(item.price || 0);
                          const pQty = Number(item.quantity || 1);
                          return (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {item.image && <img src={item.image} alt={pName} className="item-thumb" />}
                                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{pName}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span>{item.color || item.colorName || 'Default'}</span>
                                  {item.size && (
                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '1px 6px', borderRadius: '5px', background: '#e0e7ff', color: '#4338ca' }}>
                                      Size: {item.size}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{pQty}</td>
                              <td>₹{pPrice.toLocaleString('en-IN')}</td>
                              <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{(pPrice * pQty).toLocaleString('en-IN')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="pricing-breakdown" style={{ marginTop: '16px' }}>
                      <div className="pricing-row">
                        <span>Subtotal</span>
                        <span>₹{Number(selectedOrderDetail.subtotal || selectedOrderDetail.pricing?.subtotal || selectedOrderDetail.totalAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {Number(selectedOrderDetail.discount || selectedOrderDetail.pricing?.discount || 0) > 0 && (
                        <div className="pricing-row text-success">
                          <span>Discount</span>
                          <span>-₹{Number(selectedOrderDetail.discount || selectedOrderDetail.pricing?.discount).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="pricing-row">
                        <span>Delivery Fee</span>
                        <span>₹{Number(selectedOrderDetail.deliveryCharge || selectedOrderDetail.shippingCharge || selectedOrderDetail.pricing?.shipping || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pricing-row total">
                        <span>Grand Total</span>
                        <span>₹{Number(selectedOrderDetail.grandTotal || selectedOrderDetail.total || selectedOrderDetail.pricing?.total || selectedOrderDetail.totalAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details Card */}
                  <div className="order-detail-card">
                    <div className="detail-card-title">PAYMENT DETAILS</div>
                    <div className="info-grid-2">
                      <div className="info-item">
                        <label>Payment Method</label>
                        <span style={{ fontWeight: '700' }}>{selectedOrderDetail.paymentMethod || selectedOrderDetail.paymentInfo?.method || "UPI"}</span>
                      </div>
                      <div className="info-item">
                        <label>Payment Status</label>
                        <span style={{ fontWeight: '700' }}>{selectedOrderDetail.paymentStatus || selectedOrderDetail.paymentInfo?.status || "Pending"}</span>
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
