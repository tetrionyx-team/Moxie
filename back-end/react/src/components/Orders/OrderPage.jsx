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

const getOrderStatusHint = (status) => {
  const s = (status || 'CONFIRMED').toUpperCase().replace(/\s+/g, '_');
  if (s === 'CONFIRMED') return 'Order confirmed. Start preparing the order.';
  if (s === 'PROCESSING') return 'Order is being prepared.';
  if (s === 'PACKED') return 'Order is packed and ready to ship.';
  if (s === 'SHIPPED') return 'Order has been handed over to the courier.';
  if (s === 'IN_TRANSIT') return 'Order is moving through the courier network.';
  if (s === 'OUT_FOR_DELIVERY') return 'Order is out for delivery to the customer.';
  if (s === 'DELIVERED') return 'Order delivered successfully.';
  if (s === 'CANCELLED') return 'Order has been cancelled.';
  return `Current order state: ${status}`;
};

const formatShippedDate = (isoStr) => {
  if (!isoStr) return '15 Sep 2026';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n) => String(n).padStart(2, '0');
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(h)}:${m} ${ampm}`;
  } catch {
    return isoStr;
  }
};

export default function OrderPage() {
  const djangoContext = window.DJANGO_CONTEXT || {};
  const initialMasterOrders = useMemo(() => {
    const stored = getStoredMasterOrders();
    if (stored && stored.length > 0) return stored;
    return djangoContext.ordersList || [];
  }, []);

  const [orders, setOrders] = useState(initialMasterOrders);
  const [stats, setStats] = useState(() => {
    const all = initialMasterOrders;
    return {
      total_orders: djangoContext.totalOrders || all.length,
      pending_orders: djangoContext.pendingOrders || all.filter(o => ['pending', 'confirmed', 'processing', 'packed'].includes((o.orderStatus || o.order_status || o.status || '').toLowerCase().trim())).length,
      shipped_orders: djangoContext.shippedOrders || all.filter(o => ['shipped', 'in_transit', 'in transit', 'out for delivery', 'out_for_delivery'].includes((o.orderStatus || o.order_status || o.status || o.shipping_status || '').toLowerCase().trim())).length,
      delivered_orders: djangoContext.deliveredOrders || all.filter(o => (o.orderStatus || o.order_status || o.status || '').toLowerCase().trim() === 'delivered').length,
      cancelled_orders: djangoContext.cancelledOrders || all.filter(o => ['cancelled', 'canceled'].includes((o.orderStatus || o.order_status || o.status || o.shipping_status || '').toLowerCase().trim())).length,
      total_revenue: djangoContext.totalRevenue || all.reduce((acc, o) => {
        const pStatus = (o.paymentStatus || o.payment_status || '').toLowerCase();
        if (pStatus === 'paid' || pStatus === 'success') {
          return acc + (Number(o.grandTotal || o.total || o.totalAmount || o.total_amount) || 0);
        }
        return acc;
      }, 0),
    };
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

  // Shipment & Tracking & OCR States
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);
  const [shipmentMessage, setShipmentMessage] = useState('');
  const [retryingWa, setRetryingWa] = useState(false);
  const [showTrackingConfirmModal, setShowTrackingConfirmModal] = useState(false);

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

    // If API returned orders, sync into master and update existing records with live DB status
    if (apiList.length > 0) {
      const masterMap = new Map();
      masterList.forEach(o => masterMap.set(String(o.id || o.orderId), o));
      apiList.forEach(apiO => {
        const key = String(apiO.id || apiO.orderId);
        const existing = masterMap.get(key) || {};
        masterMap.set(key, {
          ...existing,
          ...apiO,
          orderStatus: apiO.orderStatus || apiO.order_status || existing.orderStatus || 'Confirmed',
          order_status: apiO.order_status || apiO.orderStatus || existing.order_status || 'Confirmed',
          shippingStatus: apiO.shippingStatus || apiO.shipping_status || existing.shippingStatus || apiO.orderStatus,
          shipping_status: apiO.shipping_status || apiO.shippingStatus || existing.shipping_status || apiO.orderStatus,
          paymentStatus: apiO.paymentStatus || apiO.payment_status || existing.paymentStatus || 'Pending',
          paymentMethod: apiO.paymentMethod || existing.paymentMethod || (apiO.razorpayOrderId && !apiO.razorpayOrderId.startsWith('cod_') ? 'UPI' : 'COD'),
          tracking_number: apiO.tracking_number || apiO.tracking_id || apiO.trackingId || existing.tracking_number || '',
          tracking_locked: Boolean(apiO.tracking_locked || apiO.tracking_number || apiO.tracking_id || apiO.trackingId || existing.tracking_locked),
        });
      });
      masterList = Array.from(masterMap.values());
      try {
        localStorage.setItem(ALL_ORDERS_KEY, JSON.stringify(masterList));
      } catch (e) {}
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
        const trackMatch = (o.tracking_number || o.trackingId || o.tracking_id || '').toLowerCase().includes(q);
        const prodMatch = (o.products || []).some(p => (p.productName || p.name || '').toLowerCase().includes(q)) || (o.name || '').toLowerCase().includes(q);
        return idMatch || nameMatch || phoneMatch || emailMatch || trackMatch || prodMatch;
      });
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(o => {
        const s = (o.orderStatus || o.order_status || o.status || '').toLowerCase().trim();
        return s === statusFilter.toLowerCase().trim();
      });
    }

    if (paymentFilter && paymentFilter !== 'all') {
      filtered = filtered.filter(o => {
        const p = (o.paymentStatus || o.payment_status || '').toLowerCase().trim();
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
      filtered.sort((a, b) => (Number(b.grandTotal || b.total || b.totalAmount || b.total_amount) || 0) - (Number(a.grandTotal || a.total || a.totalAmount || a.total_amount) || 0));
    } else if (sortOption === 'lowest') {
      filtered.sort((a, b) => (Number(a.grandTotal || a.total || a.totalAmount || a.total_amount) || 0) - (Number(b.grandTotal || b.total || b.totalAmount || b.total_amount) || 0));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    }

    // Recalculate dynamic counters from entire master dataset
    const all = masterList.length > 0 ? masterList : (apiList.length > 0 ? apiList : djangoContext.ordersList || []);
    const calculatedStats = {
      total_orders: all.length,
      pending_orders: all.filter(o => ['pending', 'confirmed', 'processing', 'packed'].includes((o.orderStatus || o.order_status || o.status || '').toLowerCase().trim())).length,
      shipped_orders: all.filter(o => ['shipped', 'in_transit', 'in transit', 'out for delivery', 'out_for_delivery'].includes((o.orderStatus || o.order_status || o.status || o.shipping_status || '').toLowerCase().trim())).length,
      delivered_orders: all.filter(o => (o.orderStatus || o.order_status || o.status || '').toLowerCase().trim() === 'delivered').length,
      cancelled_orders: all.filter(o => ['cancelled', 'canceled'].includes((o.orderStatus || o.order_status || o.status || o.shipping_status || '').toLowerCase().trim())).length,
      total_revenue: all.reduce((acc, o) => {
        const pStatus = (o.paymentStatus || o.payment_status || '').toLowerCase();
        if (pStatus === 'paid' || pStatus === 'success') {
          return acc + (Number(o.grandTotal || o.total || o.totalAmount || o.total_amount) || 0);
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
    setOcrMessage('');
    setShipmentMessage('');
    setReceiptFile(null);

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
        setUpdateOrderStatus(mergedDetail.orderStatus || mergedDetail.order_status || mergedDetail.status || 'Confirmed');
        setUpdatePaymentStatus(mergedDetail.paymentStatus || mergedDetail.payment_status || 'Pending');
        setCourierName(mergedDetail.courier_name || mergedDetail.courierPartner || '');
        const currentTrk = mergedDetail.tracking_number || mergedDetail.trackingId || mergedDetail.tracking_id || '';
        setTrackingNumber(currentTrk);
        setShowTrackingConfirmModal(false);
        setOrderDetailLoading(false);
        return;
      }
    } catch (err) {
      console.error("API admin order detail fetch error:", err);
    }

    if (foundLocal) {
      setSelectedOrderDetail(foundLocal);
      setUpdateOrderStatus(foundLocal.orderStatus || foundLocal.order_status || foundLocal.status || 'Confirmed');
      setUpdatePaymentStatus(foundLocal.paymentStatus || foundLocal.payment_status || 'Pending');
      setCourierName(foundLocal.courier_name || foundLocal.courierPartner || '');
      const currentTrk = foundLocal.tracking_number || foundLocal.trackingId || foundLocal.tracking_id || '';
      setTrackingNumber(currentTrk);
      setShowTrackingConfirmModal(false);
    } else {
      setSelectedOrderDetail(orderItem);
      setUpdateOrderStatus(orderItem.orderStatus || orderItem.order_status || orderItem.status || 'Confirmed');
      setUpdatePaymentStatus(orderItem.paymentStatus || orderItem.payment_status || 'Pending');
      setCourierName(orderItem.courier_name || orderItem.courierPartner || '');
      const currentTrk = orderItem.tracking_number || orderItem.trackingId || orderItem.tracking_id || '';
      setTrackingNumber(currentTrk);
      setShowTrackingConfirmModal(false);
    }
    setOrderDetailLoading(false);
  };

  const handleOcrScan = async () => {
    if (!receiptFile) {
      setOcrMessage('Please choose a receipt image first.');
      return;
    }
    if (!selectedOrder) return;
    setOcrScanning(true);
    setOcrMessage('');
    try {
      const csrfToken = getCsrfToken();
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      if (courierName) {
        formData.append('courier_name', courierName);
      }

      const res = await fetch(`/api/admin-orders/${selectedOrder.id}/ocr-tracking/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.tracking_number) {
        setTrackingNumber(data.tracking_number);
        if (data.courier_name && !courierName) {
          setCourierName(data.courier_name);
        }
        setOcrMessage(`✓ Extracted: ${data.tracking_number} (${data.confidence ? Math.round(data.confidence * 100) + '% match' : 'Pattern match'}). Verify and save.`);
      } else {
        setOcrMessage(data.message || 'Unable to detect tracking number. Please enter manually.');
      }
    } catch (err) {
      setOcrMessage('Receipt scanning failed. Please enter tracking number manually.');
    }
    setOcrScanning(false);
  };

  const handleInitiateShipment = () => {
    if (!selectedOrder) return;
    if (!courierName) {
      setShipmentMessage('Please select a courier partner (ST Courier or India Post).');
      return;
    }
    if (!trackingNumber.trim()) {
      setShipmentMessage('Please enter a tracking / AWB / consignment number.');
      return;
    }
    setShipmentMessage('');
    setShowTrackingConfirmModal(true);
  };

  const handleExecuteSaveShipment = async () => {
    if (!selectedOrder) return;
    setSavingShipment(true);
    setShipmentMessage('');
    try {
      const csrfToken = getCsrfToken();
      const formData = new FormData();
      formData.append('courier_name', courierName);
      formData.append('tracking_number', trackingNumber.trim());
      formData.append('order_status', 'Shipped');
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await fetch(`/api/admin-orders/${selectedOrder.id}/shipment/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const waStatus = data.whatsapp_notification?.status || 'Sent';
        const finalCourier = data.order?.courier_name || (courierName === 'ST_COURIER' ? 'ST Courier' : (courierName === 'INDIA_POST' ? 'India Post' : courierName));
        setShipmentMessage(`✓ Tracking assigned & locked! Courier: ${finalCourier}. WhatsApp: ${waStatus}`);
        setShowTrackingConfirmModal(false);
        setSelectedOrderDetail(prev => ({
          ...prev,
          courier_name: finalCourier,
          courier: finalCourier,
          tracking_number: data.order?.tracking_number || trackingNumber.trim(),
          trackingId: data.order?.tracking_number || trackingNumber.trim(),
          tracking_id: data.order?.tracking_number || trackingNumber.trim(),
          tracking_locked: true,
          order_status: data.order?.order_status || 'Shipped',
          status: data.order?.order_status || 'Shipped',
          shipping_status: 'SHIPPED',
          shippingStatus: 'Shipped',
          shipped_at: data.order?.shipped_at || prev?.shipped_at || new Date().toISOString(),
          tracking_assigned_at: new Date().toISOString(),
          tracking_updated_at: data.order?.tracking_updated_at || new Date().toISOString(),
          whatsapp_notifications: data.order?.whatsapp_notifications || prev?.whatsapp_notifications,
          notification_logs: data.order?.notification_logs || prev?.notification_logs,
        }));

        // Refetch full fresh order from backend to sync logs
        try {
          const freshRes = await fetch(`/api/admin-orders/${selectedOrder.id}/`, { headers: { Accept: 'application/json' } });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            setSelectedOrderDetail(prev => ({ ...prev, ...freshData }));
          }
        } catch {}

        fetchOrders();
      } else {
        setShipmentMessage(data.error || 'Failed to save shipment.');
        setShowTrackingConfirmModal(false);
      }
    } catch (err) {
      setShipmentMessage('Error saving shipment.');
      setShowTrackingConfirmModal(false);
    }
    setSavingShipment(false);
  };

  const handleRetryWhatsApp = async (eventType) => {
    if (!selectedOrder) return;
    setRetryingWa(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/admin-orders/${selectedOrder.id}/retry-whatsapp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ event_type: eventType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShipmentMessage(`✓ WhatsApp notification resent: ${data.result?.status || 'Sent'}`);
        // Refetch order detail to update logs
        try {
          const freshRes = await fetch(`/api/admin-orders/${selectedOrder.id}/`, { headers: { Accept: 'application/json' } });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            setSelectedOrderDetail(prev => ({ ...prev, ...freshData }));
          }
        } catch {}
      } else {
        setShipmentMessage(data.error || 'Retry failed.');
      }
    } catch {
      setShipmentMessage('Error retrying WhatsApp notification.');
    }
    setRetryingWa(false);
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
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          order_status: updateOrderStatus,
          shipping_status: updateOrderStatus,
          payment_status: updatePaymentStatus,
        }),
      });
      if (res.ok) {
        const freshData = await res.json();
        if (freshData) {
          setSelectedOrderDetail(prev => ({
            ...prev,
            ...freshData,
            order_status: freshData.order_status || freshData.orderStatus || updateOrderStatus,
            status: freshData.order_status || freshData.orderStatus || updateOrderStatus,
            orderStatus: freshData.order_status || freshData.orderStatus || updateOrderStatus,
            payment_status: freshData.payment_status || freshData.paymentStatus || updatePaymentStatus,
            paymentStatus: freshData.payment_status || freshData.paymentStatus || updatePaymentStatus,
          }));
          setUpdateOrderStatus(freshData.order_status || freshData.orderStatus || updateOrderStatus);
          setUpdatePaymentStatus(freshData.payment_status || freshData.paymentStatus || updatePaymentStatus);
        }
      } else {
        setSelectedOrderDetail(prev => ({
          ...prev,
          order_status: updateOrderStatus,
          status: updateOrderStatus,
          orderStatus: updateOrderStatus,
          payment_status: updatePaymentStatus,
          paymentStatus: updatePaymentStatus,
        }));
      }
    } catch {
      setSelectedOrderDetail(prev => ({
        ...prev,
        order_status: updateOrderStatus,
        status: updateOrderStatus,
        orderStatus: updateOrderStatus,
        payment_status: updatePaymentStatus,
        paymentStatus: updatePaymentStatus,
      }));
    } finally {
      setUpdating(false);
    }

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
          order_status: updateOrderStatus,
          paymentStatus: updatePaymentStatus,
          payment_status: updatePaymentStatus,
          statusHistory: history,
          updatedAt: nowIso,
        };
        return updatedObj;
      }
      return o;
    });

    saveStoredMasterOrders(updatedMaster);

    setUpdateMessage("Order status updated successfully.");
    fetchOrders();

    if (typeof window.refreshAdminNotifications === 'function') {
      window.refreshAdminNotifications();
    } else {
      window.dispatchEvent(new CustomEvent('adminNotificationRequestRefresh'));
    }
  };

  const handleMarkCodCollected = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    setUpdateMessage('');
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/admin-orders/${selectedOrder.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          mark_cod_collected: true,
          payment_status: 'Paid',
        }),
      });
      if (res.ok) {
        setUpdateMessage('COD balance marked as collected and order marked as Paid.');
        const tot = Number(selectedOrderDetail?.grandTotal || selectedOrderDetail?.totalAmount || selectedOrderDetail?.total || 0);
        setSelectedOrderDetail(prev => ({
          ...prev,
          paymentStatus: 'Paid',
          amountPaid: tot,
          amount_paid: tot,
          balanceDue: 0,
          balance_due: 0,
          pricing: prev?.pricing ? { ...prev.pricing, amountPaid: tot, balanceDue: 0 } : prev?.pricing,
          paymentInfo: prev?.paymentInfo ? { ...prev.paymentInfo, status: 'Paid', amountPaid: tot, balanceDue: 0 } : prev?.paymentInfo,
        }));
        setUpdatePaymentStatus('Paid');
        fetchOrders();
      } else {
        setUpdateMessage('Failed to update COD balance status.');
      }
    } catch {
      setUpdateMessage('Error updating COD balance.');
    }
    setUpdating(false);
  };

  /* ── Export Filtered Orders to Excel (.xlsx) ── */
  const handleExportExcel = () => {
    if (!orders || orders.length === 0) {
      alert("No orders matching current filter criteria to export.");
      return;
    }

    // Build flattened Excel rows matching all required financial and delivery columns
    const excelRows = [];

    orders.forEach((o) => {
      const orderId = o.orderId || o.order_number || `MOX-${String(o.id).padStart(4, '0')}`;
      const orderDate = o.orderDate || o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "N/A");
      const customerName = o.customerName || o.customer?.name || o.shippingAddress?.name || "Customer";
      const mobile = o.mobile || o.customer?.phone || o.shippingAddress?.phone || "N/A";
      const paymentMethod = o.paymentMethod || (o.razorpayOrderId && !o.razorpayOrderId.startsWith('cod_') ? "UPI" : "COD");
      const paymentStatus = o.paymentStatus || "Pending";
      const subtotal = Number(o.subtotalAmount || o.subtotal || o.totalAmount || 0);
      const discountAmount = Number(o.discountAmount || o.discount || 0);
      const shippingAmount = Number(o.shippingAmount || o.shippingCharge || o.deliveryCharge || 0);
      const orderTotal = Number(o.grandTotal || o.total || o.totalAmount || 0);
      const amountPaid = Number(o.amountPaid !== undefined ? o.amountPaid : (paymentStatus === 'Paid' ? orderTotal : (o.codAdvancePaid ? 100 : 0)));
      const balanceDue = Number(o.balanceDue !== undefined ? o.balanceDue : (paymentStatus === 'Paid' ? 0 : Math.max(0, orderTotal - amountPaid)));
      const codAdvancePaid = o.codAdvancePaid ? "Yes (₹100)" : (paymentMethod === "COD" ? "No" : "N/A");
      const razorpayPaymentId = o.razorpayPaymentId || o.razorpay_payment_id || "—";
      const fullAddress = o.address || o.shippingAddress?.address || o.shippingAddress?.flat || "N/A";
      const city = o.city || o.shippingAddress?.city || "N/A";
      const district = o.district || o.shippingAddress?.district || city || "N/A";
      const pinCode = o.pinCode || o.pincode || o.shippingAddress?.pincode || "N/A";
      const orderStatus = o.orderStatus || o.status || "Confirmed";
      const trackingId = o.tracking_number || o.trackingId || o.tracking_id || 'Not Assigned Yet';

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
          "Subtotal": `₹${subtotal.toLocaleString("en-IN")}`,
          "Discount Amount": `₹${discountAmount.toLocaleString("en-IN")}`,
          "Shipping Amount": `₹${shippingAmount.toLocaleString("en-IN")}`,
          "Total Amount": `₹${orderTotal.toLocaleString("en-IN")}`,
          "Amount Paid": `₹${amountPaid.toLocaleString("en-IN")}`,
          "Balance Due": `₹${balanceDue.toLocaleString("en-IN")}`,
          "COD Advance Paid": codAdvancePaid,
          "Razorpay Payment ID": razorpayPaymentId,
          "Full Address": fullAddress,
          "City": city,
          "District": district,
          "PIN Code": pinCode,
          "Product Name": prod.productName || prod.name || "Product",
          "Quantity": Number(prod.quantity || 1),
          "Product Price": `₹${Number(prod.price || 0).toLocaleString("en-IN")}`,
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
      { wch: 14 }, // Subtotal
      { wch: 16 }, // Discount Amount
      { wch: 16 }, // Shipping Amount
      { wch: 14 }, // Total Amount
      { wch: 14 }, // Amount Paid
      { wch: 14 }, // Balance Due
      { wch: 18 }, // COD Advance Paid
      { wch: 22 }, // Razorpay Payment ID
      { wch: 32 }, // Full Address
      { wch: 16 }, // City
      { wch: 16 }, // District
      { wch: 12 }, // PIN Code
      { wch: 28 }, // Product Name
      { wch: 10 }, // Quantity
      { wch: 14 }, // Product Price
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
                const paymentClass = (o.paymentStatus || 'pending').toLowerCase();
                const customerName = o.customerName || o.customer?.name || o.shippingAddress?.name || "Customer";
                const customerEmail = o.email || o.customer?.email || "customer@example.com";
                const initial = customerName.charAt(0).toUpperCase() || "C";
                const orderTotal = Number(o.grandTotal || o.total || o.totalAmount || o.total_amount || 0);
                const isCancelled = (
                  (o.orderStatus || '').toUpperCase() === 'CANCELLED' ||
                  (o.order_status || '').toUpperCase() === 'CANCELLED' ||
                  (o.status || '').toUpperCase() === 'CANCELLED' ||
                  (o.shipping_status || '').toUpperCase() === 'CANCELLED' ||
                  (o.shippingStatus || '').toUpperCase() === 'CANCELLED'
                );
                const normStatus = (o.shipping_status || o.shippingStatus || o.order_status || o.orderStatus || o.status || '').toUpperCase().replace(/\s+/g, '_');
                const hasTracking = Boolean(o.tracking_locked || o.tracking_number || o.trackingId || o.tracking_id);
                const isNewOrder = !hasTracking && !isCancelled;

                let rowClass = '';
                let displayStatusBadge = o.orderStatus || o.order_status || o.status || 'Confirmed';
                let badgeClass = (o.orderStatus || o.order_status || o.status || 'confirmed').toLowerCase().replace(/\s+/g, '-');

                if (isCancelled) {
                  rowClass = 'order-row-cancelled';
                  displayStatusBadge = 'CANCELLED';
                  badgeClass = 'cancelled';
                } else if (isNewOrder) {
                  rowClass = 'order-row-new';
                  displayStatusBadge = 'NEW ORDER';
                  badgeClass = 'new-order';
                } else if (normStatus === 'DELIVERED') {
                  rowClass = 'order-row-delivered';
                  displayStatusBadge = 'DELIVERED ✓';
                  badgeClass = 'delivered';
                } else if (normStatus === 'OUT_FOR_DELIVERY') {
                  rowClass = 'order-row-out-for-delivery';
                  displayStatusBadge = 'OUT FOR DELIVERY';
                  badgeClass = 'out-for-delivery';
                } else if (normStatus === 'SHIPPED' || normStatus === 'IN_TRANSIT') {
                  rowClass = 'order-row-shipped';
                  displayStatusBadge = normStatus === 'IN_TRANSIT' ? 'IN TRANSIT' : 'SHIPPED';
                  badgeClass = 'shipped';
                }

                return (
                  <tr key={o.id || orderId} className={rowClass}>
                    <td style={{ fontWeight: '750' }}>{orderId}</td>
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
                    <td style={{ fontSize: '13px' }}>{o.orderDate || o.date}</td>
                    <td style={{ fontWeight: '750' }}>
                      ₹{orderTotal.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`status-pill ${badgeClass}`}>
                        {displayStatusBadge}
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

                  {/* 1. ORDER SUMMARY & PAYMENT */}
                  <div className="order-detail-card">
                    <div className="detail-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span>ORDER SUMMARY</span>
                      <span style={{ fontSize: '11px', background: '#071426', color: '#c99b45', padding: '3px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '750', letterSpacing: '0.04em' }}>
                        Current Status: {selectedOrderDetail.order_status || selectedOrderDetail.status || 'Confirmed'}
                      </span>
                    </div>

                    {/* Dynamic Order Lifecycle Status Banner */}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '13px',
                      fontWeight: '600',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '16px' }}>
                        {(() => {
                          const s = (selectedOrderDetail.order_status || selectedOrderDetail.status || 'CONFIRMED').toUpperCase().replace(/\s+/g, '_');
                          if (s === 'DELIVERED') return '✅';
                          if (s === 'CANCELLED') return '❌';
                          if (s === 'SHIPPED' || s === 'IN_TRANSIT') return '🚚';
                          if (s === 'OUT_FOR_DELIVERY') return '📍';
                          if (s === 'PACKED') return '📦';
                          return 'ℹ️';
                        })()}
                      </span>
                      <span>{getOrderStatusHint(selectedOrderDetail.order_status || selectedOrderDetail.status)}</span>
                    </div>

                    {/* Payment Info & COD collection */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Payment Method</span>
                          <span style={{ fontWeight: '750', color: '#0f172a' }}>{selectedOrderDetail.paymentMethod || 'UPI'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Payment Status</span>
                          <span className={`payment-pill ${(selectedOrderDetail.paymentStatus || 'pending').toLowerCase()}`}>
                            {selectedOrderDetail.paymentStatus || 'Pending'}
                          </span>
                        </div>
                        {Number(selectedOrderDetail.balanceDue || selectedOrderDetail.balance_due || 0) > 0 && (
                          <div>
                            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Balance Due</span>
                            <span style={{ fontWeight: '800', color: '#b45309' }}>
                              ₹{Number(selectedOrderDetail.balanceDue || selectedOrderDetail.balance_due || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>

                      {Number(selectedOrderDetail.balanceDue || selectedOrderDetail.balance_due || 0) > 0 && selectedOrderDetail.paymentStatus !== 'Paid' && (
                        <button
                          type="button"
                          onClick={handleMarkCodCollected}
                          disabled={updating}
                          style={{
                            background: '#10b981',
                            color: '#ffffff',
                            border: '1px solid #059669',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: '750',
                            cursor: updating ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {updating ? 'Updating...' : `Mark COD Collected (₹${Number(selectedOrderDetail.balanceDue || selectedOrderDetail.balance_due).toLocaleString('en-IN')})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. SHIPPING SECTION */}
                  <div className="order-detail-card courier-shipment-card" style={{ border: '1px solid rgba(201,155,69,0.35)', background: '#ffffff' }}>
                    <div className="detail-card-title" style={{ color: '#071426', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                        {(selectedOrderDetail.tracking_locked || selectedOrderDetail.tracking_number || selectedOrderDetail.trackingId || selectedOrderDetail.tracking_id)
                          ? 'SHIPPING DETAILS'
                          : 'SHIPPING SETUP'}
                      </span>
                      {(selectedOrderDetail.tracking_locked || selectedOrderDetail.tracking_number || selectedOrderDetail.trackingId || selectedOrderDetail.tracking_id) && (
                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontWeight: '750' }}>
                          ✓ Tracking Locked
                        </span>
                      )}
                    </div>

                    {shipmentMessage && (
                      <div style={{ padding: '8px 12px', borderRadius: '6px', background: shipmentMessage.includes('✓') ? '#dcfce7' : '#fee2e2', color: shipmentMessage.includes('✓') ? '#166534' : '#991b1b', fontSize: '12.5px', fontWeight: '600', marginBottom: '12px' }}>
                        {shipmentMessage}
                      </div>
                    )}

                    {/* Locked Read-Only View if tracking exists / locked */}
                    {(selectedOrderDetail.tracking_locked || selectedOrderDetail.tracking_number || selectedOrderDetail.trackingId || selectedOrderDetail.tracking_id) ? (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', fontSize: '13px' }}>
                          <div>
                            <span style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>Courier Partner</span>
                            <span style={{ fontWeight: '750', color: '#0f172a' }}>
                              {selectedOrderDetail.courier_name === 'ST_COURIER' || selectedOrderDetail.courier === 'ST_COURIER'
                                ? 'ST Courier'
                                : selectedOrderDetail.courier_name === 'INDIA_POST' || selectedOrderDetail.courier === 'INDIA_POST'
                                ? 'India Post'
                                : (selectedOrderDetail.courier_name || selectedOrderDetail.courier || 'ST Courier')}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>
                              {((selectedOrderDetail.courier_name || '').toUpperCase().includes('INDIA') || (selectedOrderDetail.courier || '').toUpperCase().includes('INDIA')) ? 'Consignment Number' : 'AWB Number'}
                            </span>
                            <span style={{ fontWeight: '800', fontFamily: 'monospace', color: '#c99b45', fontSize: '14px' }}>
                              {selectedOrderDetail.tracking_number || selectedOrderDetail.trackingId || selectedOrderDetail.tracking_id}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>Tracking Status</span>
                            <span style={{ fontWeight: '750', color: '#0f172a' }}>
                              {selectedOrderDetail.shippingStatus || selectedOrderDetail.shipping_status || selectedOrderDetail.order_status || 'Shipped'}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '3px' }}>Assigned On</span>
                            <span style={{ fontWeight: '600', color: '#475569' }}>
                              {formatShippedDate(selectedOrderDetail.tracking_assigned_at || selectedOrderDetail.shipped_at || selectedOrderDetail.tracking_updated_at)}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                          <span style={{ color: '#64748b' }}>
                            Carrier Live Sync: <strong style={{ color: '#475569' }}>Waiting for API configuration</strong>
                          </span>
                          <span style={{ color: '#059669', fontWeight: '650' }}>
                            Tracking information is permanently locked.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {((selectedOrderDetail.order_status || selectedOrderDetail.status || '').toUpperCase() === 'CANCELLED') ? (
                          <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                            This order has been cancelled. Shipping creation is disabled.
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                  Courier Partner
                                </label>
                                <CustomSelect
                                  value={courierName}
                                  onChange={(e) => setCourierName(e.target.value)}
                                  options={[
                                    { value: '', label: 'Select Courier' },
                                    { value: 'ST_COURIER', label: 'ST Courier' },
                                    { value: 'INDIA_POST', label: 'India Post' },
                                  ]}
                                  height="38px"
                                  width="100%"
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                  {courierName === 'ST_COURIER'
                                    ? 'ST Courier AWB Number'
                                    : courierName === 'INDIA_POST'
                                    ? 'India Post Consignment Number'
                                    : 'Tracking / AWB / Consignment Number'}
                                </label>
                                <input
                                  type="text"
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                                  placeholder={
                                    courierName === 'ST_COURIER'
                                      ? 'e.g. 1234567890'
                                      : courierName === 'INDIA_POST'
                                      ? 'e.g. EM123456789IN'
                                      : 'Enter tracking number'
                                  }
                                  style={{
                                    width: '100%',
                                    height: '38px',
                                    padding: '6px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontFamily: 'monospace',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    color: '#0f172a',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                            </div>

                            {/* Simple Receipt Upload */}
                            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', display: 'block' }}>Upload Courier Receipt</span>
                                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {receiptFile ? `Selected: ${receiptFile.name}` : 'Upload the courier receipt to detect the tracking number automatically.'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                                    style={{ fontSize: '12px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleOcrScan}
                                    disabled={ocrScanning || !receiptFile}
                                    style={{
                                      background: '#071426',
                                      color: '#c99b45',
                                      border: '1px solid #c99b45',
                                      borderRadius: '6px',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      cursor: ocrScanning || !receiptFile ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    {ocrScanning ? 'Detecting...' : 'Detect Tracking Number'}
                                  </button>
                                </div>
                              </div>
                              {ocrMessage && (
                                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: ocrMessage.includes('✓') ? '#166534' : '#b45309' }}>
                                  {ocrMessage}
                                </div>
                              )}
                            </div>

                            {/* Main Action Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              <button
                                type="button"
                                onClick={handleInitiateShipment}
                                disabled={savingShipment}
                                style={{
                                  background: '#071426',
                                  color: '#c99b45',
                                  border: '1px solid #c99b45',
                                  borderRadius: '8px',
                                  padding: '10px 22px',
                                  fontWeight: '800',
                                  fontSize: '13px',
                                  cursor: savingShipment ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {savingShipment ? 'Saving...' : 'CONFIRM & SEND TRACKING'}
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* 3. CUSTOMER MESSAGES SECTION */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#071426', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        CUSTOMER MESSAGES
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                        {[
                          { key: 'order_confirmed', eventType: 'ORDER_CONFIRMED', label: 'Order Confirmation' },
                          { key: 'shipped', eventType: 'SHIPPED', label: 'Shipment Update' },
                          { key: 'out_for_delivery', eventType: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                          { key: 'delivered', eventType: 'DELIVERED', label: 'Delivered' },
                        ].map((wa) => {
                          const rawStatus = (selectedOrderDetail.whatsapp_notifications && selectedOrderDetail.whatsapp_notifications[wa.key]) || 'NOT_SENT';
                          const isSent = rawStatus === 'SENT';
                          const isFailed = rawStatus === 'FAILED';
                          const isSending = rawStatus === 'SENDING';
                          return (
                            <div key={wa.key} style={{
                              background: isSent ? '#f0fdf4' : isFailed ? '#fef2f2' : isSending ? '#fffbeb' : '#f8fafc',
                              border: `1px solid ${isSent ? '#bbf7d0' : isFailed ? '#fecaca' : isSending ? '#fde68a' : '#e2e8f0'}`,
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontSize: '11.5px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '700', color: '#334155' }}>{wa.label}</span>
                                <span style={{
                                  fontWeight: '700',
                                  color: isSent ? '#166534' : isFailed ? '#991b1b' : isSending ? '#b45309' : '#64748b'
                                }}>
                                  {isSent ? 'Sent' : isFailed ? 'Failed' : isSending ? 'Sending' : 'Not Sent'}
                                </span>
                              </div>
                              {isFailed && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryWhatsApp(wa.eventType)}
                                  disabled={retryingWa}
                                  style={{
                                    background: '#991b1b',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: retryingWa ? 'not-allowed' : 'pointer',
                                    marginTop: '2px',
                                    alignSelf: 'flex-start'
                                  }}
                                >
                                  {retryingWa ? 'Sending...' : 'SEND AGAIN'}
                                </button>
                              )}
                            </div>
                          );
                        })}
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
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#c99b45' }}>
                          {selectedOrderDetail.tracking_number || selectedOrderDetail.trackingId || selectedOrderDetail.tracking_id || 'Not assigned yet'}
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
                      <div className="info-item">
                        <label>Amount Paid</label>
                        <span style={{ fontWeight: '700', color: '#166534' }}>
                          ₹{Number(selectedOrderDetail.amountPaid !== undefined ? selectedOrderDetail.amountPaid : (selectedOrderDetail.pricing?.amountPaid !== undefined ? selectedOrderDetail.pricing.amountPaid : (selectedOrderDetail.paymentStatus === 'Paid' ? (selectedOrderDetail.totalAmount || selectedOrderDetail.grandTotal) : 0))).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Balance Due</label>
                        <span style={{ fontWeight: '700', color: Number(selectedOrderDetail.balanceDue !== undefined ? selectedOrderDetail.balanceDue : (selectedOrderDetail.pricing?.balanceDue !== undefined ? selectedOrderDetail.pricing.balanceDue : 0)) > 0 ? '#b91c1c' : '#166534' }}>
                          ₹{Number(selectedOrderDetail.balanceDue !== undefined ? selectedOrderDetail.balanceDue : (selectedOrderDetail.pricing?.balanceDue !== undefined ? selectedOrderDetail.pricing.balanceDue : (selectedOrderDetail.paymentStatus === 'Paid' ? 0 : (selectedOrderDetail.totalAmount || selectedOrderDetail.grandTotal || 0)))).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>COD Advance</label>
                        <span>
                          {selectedOrderDetail.codAdvancePaid || selectedOrderDetail.paymentInfo?.codAdvancePaid
                            ? 'Paid online (₹100)'
                            : (selectedOrderDetail.paymentMethod === 'COD' || selectedOrderDetail.paymentInfo?.method === 'COD' ? 'Pending' : 'N/A')}
                        </span>
                      </div>
                      <div className="info-item">
                        <label>Razorpay Payment ID</label>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {selectedOrderDetail.razorpayPaymentId || selectedOrderDetail.paymentInfo?.razorpayPaymentId || '—'}
                        </span>
                      </div>
                    </div>

                    {(selectedOrderDetail.paymentMethod === 'COD' || selectedOrderDetail.paymentInfo?.method === 'COD') &&
                      selectedOrderDetail.paymentStatus !== 'Paid' &&
                      Number(selectedOrderDetail.balanceDue !== undefined ? selectedOrderDetail.balanceDue : selectedOrderDetail.pricing?.balanceDue) > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            onClick={handleMarkCodCollected}
                            disabled={updating}
                            style={{
                              background: '#071426',
                              color: '#c99b45',
                              border: '1px solid #c99b45',
                              borderRadius: '8px',
                              padding: '9px 18px',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            ✓ Mark COD Balance Collected
                          </button>
                        </div>
                      )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Tracking Lock Confirmation Modal */}
      {showTrackingConfirmModal && (
        <div className="tracking-confirm-overlay" onClick={() => setShowTrackingConfirmModal(false)}>
          <div className="tracking-confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3>
              <span>📦</span> Confirm Shipment Details?
            </h3>

            <div className="tracking-confirm-meta">
              <div className="tracking-confirm-meta-row">
                <span style={{ color: '#64748b', fontWeight: '600' }}>Courier Partner:</span>
                <strong style={{ color: '#071426' }}>
                  {courierName === 'ST_COURIER' ? 'ST Courier' : courierName === 'INDIA_POST' ? 'India Post' : courierName}
                </strong>
              </div>
              <div className="tracking-confirm-meta-row">
                <span style={{ color: '#64748b', fontWeight: '600' }}>
                  {courierName === 'INDIA_POST' ? 'Consignment Number:' : 'AWB Number:'}
                </span>
                <strong style={{ fontFamily: 'monospace', color: '#c99b45', fontSize: '14.5px' }}>
                  {trackingNumber.trim()}
                </strong>
              </div>
            </div>

            <div className="tracking-confirm-warning">
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div>
                <strong>Important:</strong> This tracking number cannot be edited after confirmation. Please verify it carefully.
              </div>
            </div>

            <div className="tracking-confirm-actions">
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setShowTrackingConfirmModal(false)}
                disabled={savingShipment}
              >
                GO BACK
              </button>
              <button
                type="button"
                className="btn-confirm-submit"
                onClick={handleExecuteSaveShipment}
                disabled={savingShipment}
              >
                {savingShipment ? 'CONFIRMING...' : 'CONFIRM & SEND'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
