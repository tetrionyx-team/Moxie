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
  FileIcon,
  PrinterIcon,
  DownloadIcon,
} from '../../icons';
import {
  generateInvoiceHtml,
  printOrderInvoice,
  downloadOrderInvoiceFile,
  getCleanOrderId,
} from '../../utils/invoicePrinter';
import './OrderPage.css';

// High-contrast, crystal clear PDF Badge Icon
function PdfIcon({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path
        d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2V8H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="currentColor"
        fontSize="7.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.2px"
      >
        PDF
      </text>
    </svg>
  );
}

function getCsrfToken() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
  if (cookie) return cookie.split('=')[1];
  const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (input) return input.value;
  if (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) return window.DJANGO_CONTEXT.csrfToken;
  return '';
}

// Force purge any old mock localStorage orders
try {
  localStorage.removeItem("moxie_orders");
} catch {}

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
  if (!isoStr) return '';
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
  const [orders, setOrders] = useState(() => djangoContext.ordersList || []);
  const [stats, setStats] = useState(() => ({
    total_orders: djangoContext.totalOrders || (djangoContext.ordersList ? djangoContext.ordersList.length : 0),
    pending_orders: djangoContext.pendingOrders || 0,
    shipped_orders: djangoContext.shippedOrders || 0,
    delivered_orders: djangoContext.deliveredOrders || 0,
    cancelled_orders: djangoContext.cancelledOrders || 0,
    total_revenue: djangoContext.totalRevenue || 0,
  }));

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

  // PDF Invoice & Dispatch Slip State
  const [pdfPreviewOrder, setPdfPreviewOrder] = useState(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

  const handleOpenPdfPreview = async (orderItem) => {
    if (!orderItem) return;
    setPdfPreviewOrder(orderItem);
    setPdfPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin-orders/${orderItem.id}/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const fullDetail = await res.json();
        setPdfPreviewOrder(prev => ({ ...orderItem, ...fullDetail }));
      }
    } catch (err) {
      console.warn("Failed to fetch full order details for invoice preview:", err);
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  const dateInputRef = useRef(null);

  const fetchOrders = async () => {
    setLoading(true);
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
        const apiList = data.orders || data.results || data.orders_list || [];
        setOrders(apiList);
        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats({
            total_orders: apiList.length,
            pending_orders: apiList.filter(o => ['pending', 'confirmed', 'processing', 'packed'].includes((o.orderStatus || o.order_status || o.status || '').toLowerCase().trim())).length,
            shipped_orders: apiList.filter(o => ['shipped', 'in_transit', 'in transit', 'out for delivery', 'out_for_delivery'].includes((o.orderStatus || o.order_status || o.status || o.shipping_status || '').toLowerCase().trim())).length,
            delivered_orders: apiList.filter(o => (o.orderStatus || o.order_status || o.status || '').toLowerCase().trim() === 'delivered').length,
            cancelled_orders: apiList.filter(o => ['cancelled', 'canceled'].includes((o.orderStatus || o.order_status || o.status || o.shipping_status || '').toLowerCase().trim())).length,
            total_revenue: apiList.reduce((acc, o) => {
              const pStatus = (o.paymentStatus || o.payment_status || '').toLowerCase();
              if (pStatus === 'paid' || pStatus === 'success') {
                return acc + (Number(o.grandTotal || o.total || o.totalAmount || o.total_amount) || 0);
              }
              return acc;
            }, 0),
          });
        }
      }
    } catch (err) {
      console.error("API orders fetch error:", err);
    } finally {
      setLoading(false);
    }
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

    try {
      const res = await fetch(`/api/admin-orders/${orderItem.id}/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const mergedDetail = { ...orderItem, ...data };
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

    setSelectedOrderDetail(orderItem);
    setUpdateOrderStatus(orderItem.orderStatus || orderItem.order_status || orderItem.status || 'Confirmed');
    setUpdatePaymentStatus(orderItem.paymentStatus || orderItem.payment_status || 'Pending');
    setCourierName(orderItem.courier_name || orderItem.courierPartner || '');
    const currentTrk = orderItem.tracking_number || orderItem.trackingId || orderItem.tracking_id || '';
    setTrackingNumber(currentTrk);
    setShowTrackingConfirmModal(false);
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
            minWidth="110px"
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
            minWidth="110px"
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
            minWidth="115px"
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

        {/* Orders Table */}
        <div className="order-table-wrapper">
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
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="order-actions-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="action-btn view"
                            title="View Order Details"
                            aria-label="View Order Details"
                            onClick={() => handleOpenDetail(o)}
                          >
                            <AppIcon icon={ViewIcon} size={16} />
                          </button>
                          <button
                            type="button"
                            className="action-btn pdf"
                            title="View & Download PDF Invoice / Dispatch Slip"
                            aria-label="View & Download PDF Invoice"
                            onClick={() => handleOpenPdfPreview(o)}
                          >
                            <PdfIcon size={18} />
                          </button>
                        </div>
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
        </div>

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
            <div className="modal-header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <h2>ORDER {selectedOrder.orderId || selectedOrder.order_number || selectedOrder.id}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="admin-btn-header-pdf"
                  onClick={() => handleOpenPdfPreview(selectedOrderDetail || selectedOrder)}
                  title="View & Download PDF Invoice / Dispatch Slip"
                >
                  <PdfIcon size={16} />
                  <span>PDF Invoice</span>
                </button>
                <button className="close-modal-btn" onClick={() => setSelectedOrder(null)} aria-label="Close modal">
                  <AppIcon icon={CancelIcon} size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body-scroll">
              {orderDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading order details...
                </div>
              ) : selectedOrderDetail ? (() => {
                const currentStatusNorm = (
                  selectedOrderDetail.order_status ||
                  selectedOrderDetail.orderStatus ||
                  selectedOrderDetail.status ||
                  selectedOrderDetail.shipping_status ||
                  selectedOrderDetail.shippingStatus ||
                  selectedOrder?.orderStatus ||
                  selectedOrder?.order_status ||
                  selectedOrder?.status ||
                  ''
                ).toUpperCase().trim();
                const isOrderCancelled = currentStatusNorm === 'CANCELLED' || currentStatusNorm === 'CANCELED';

                return (
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
                        <span style={{
                          fontSize: '11px',
                          background: isOrderCancelled ? '#fee2e2' : '#071426',
                          color: isOrderCancelled ? '#991b1b' : '#c99b45',
                          border: isOrderCancelled ? '1px solid #fca5a5' : 'none',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: '750',
                          letterSpacing: '0.04em'
                        }}>
                          Current Status: {isOrderCancelled ? 'CANCELLED' : (selectedOrderDetail.order_status || selectedOrderDetail.status || 'Confirmed')}
                        </span>
                      </div>

                      {/* Dynamic Order Lifecycle Status / Cancelled Notice */}
                      {isOrderCancelled ? (
                        <div style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          marginBottom: '14px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#991b1b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span style={{ fontSize: '18px' }}>❌</span>
                          <div>
                            <strong>Order Cancelled:</strong> This order has been cancelled by the customer. Shipping fulfillment and tracking setup are closed.
                          </div>
                        </div>
                      ) : (
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
                              if (s === 'SHIPPED' || s === 'IN_TRANSIT') return '🚚';
                              if (s === 'OUT_FOR_DELIVERY') return '📍';
                              if (s === 'PACKED') return '📦';
                              return 'ℹ️';
                            })()}
                          </span>
                          <span>{getOrderStatusHint(selectedOrderDetail.order_status || selectedOrderDetail.status)}</span>
                        </div>
                      )}

                      {/* Payment Info */}
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

                        {!isOrderCancelled && Number(selectedOrderDetail.balanceDue || selectedOrderDetail.balance_due || 0) > 0 && selectedOrderDetail.paymentStatus !== 'Paid' && (
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

                    {/* 2. SHIPPING & CUSTOMER MESSAGES SECTION (Only for Active Non-Cancelled Orders) */}
                    {!isOrderCancelled && (
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
                    )}

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
              );
            })() : null}
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

      {/* PDF Invoice & Dispatch Slip Preview Modal */}
      {pdfPreviewOrder && (
        <div className="order-modal-backdrop" onClick={() => setPdfPreviewOrder(null)}>
          <div className="order-modal-dialog pdf-invoice-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📄</span>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  INVOICE & DISPATCH SLIP #{getCleanOrderId(pdfPreviewOrder)}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-pdf-print"
                  onClick={() => printOrderInvoice(pdfPreviewOrder)}
                  title="Print or Save as PDF"
                >
                  <AppIcon icon={PrinterIcon} size={16} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  className="btn-pdf-download"
                  onClick={() => downloadOrderInvoiceFile(pdfPreviewOrder)}
                  title="Download HTML/PDF Invoice"
                >
                  <AppIcon icon={DownloadIcon} size={16} />
                  <span>Download Invoice</span>
                </button>
                <button
                  type="button"
                  className="close-modal-btn"
                  onClick={() => setPdfPreviewOrder(null)}
                  aria-label="Close modal"
                >
                  <AppIcon icon={CancelIcon} size={20} />
                </button>
              </div>
            </div>

            <div
              className="modal-body-scroll pdf-modal-body"
              style={{
                padding: '24px',
                background: '#f8fafc',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overflowY: 'auto'
              }}
            >
              {pdfPreviewLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <span style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTopColor: '#c99b45', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: '10px', verticalAlign: 'middle' }} />
                  Loading invoice details...
                </div>
              ) : (() => {
                const ord = pdfPreviewOrder;
                const orderId = getCleanOrderId(ord);
                const orderDate = ord.orderDate || ord.date || (ord.createdAt ? new Date(ord.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"));
                const customerName = ord.customerName || ord.customer?.name || ord.shippingAddress?.name || "Customer";
                const mobile = ord.mobile || ord.customer?.phone || ord.shippingAddress?.phone || "—";
                const email = ord.email || ord.customer?.email || "customer@example.com";
                const address = ord.address || ord.shippingAddress?.address || ord.shippingAddress?.flat || "—";
                const city = ord.city || ord.shippingAddress?.city || "—";
                const district = ord.district || ord.shippingAddress?.district || city || "—";
                const pinCode = ord.pinCode || ord.pincode || ord.shippingAddress?.pincode || "—";
                const paymentMethod = ord.paymentMethod || ord.paymentInfo?.method || (ord.razorpayOrderId && !ord.razorpayOrderId.startsWith('cod_') ? "UPI" : "COD");
                const paymentStatus = ord.paymentStatus || ord.paymentInfo?.status || "Pending";
                const orderStatus = ord.orderStatus || ord.status || "Confirmed";
                const courier = ord.courier_name || ord.courier || ord.courierPartner || "ST Courier";
                const trackingId = ord.tracking_number || ord.trackingId || ord.tracking_id || "";

                const subtotal = Number(ord.subtotal || ord.subtotalAmount || ord.pricing?.subtotal || ord.totalAmount || ord.total || 0);
                const discount = Number(ord.discount || ord.discountAmount || ord.pricing?.discount || 0);
                const shipping = Number(ord.deliveryCharge || ord.shippingCharge || ord.shippingAmount || ord.pricing?.shipping || 0);
                const grandTotal = Number(ord.grandTotal || ord.total || ord.totalAmount || ord.pricing?.total || 0);
                const amountPaid = Number(ord.amountPaid !== undefined ? ord.amountPaid : (paymentStatus === 'Paid' ? grandTotal : (ord.codAdvancePaid ? 100 : 0)));
                const balanceDue = Number(ord.balanceDue !== undefined ? ord.balanceDue : (paymentStatus === 'Paid' ? 0 : Math.max(0, grandTotal - amountPaid)));
                const transactionId = ord.transactionRef || ord.razorpayPaymentId || ord.razorpay_payment_id || ord.paymentInfo?.razorpayPaymentId || "—";

                const items = Array.isArray(ord.products) && ord.products.length > 0
                  ? ord.products
                  : Array.isArray(ord.items) && ord.items.length > 0
                  ? ord.items
                  : [{ productName: ord.name || "Moxie Item", quantity: ord.quantity || 1, price: ord.price || grandTotal, size: ord.variant || "Standard", color: "Default", image: ord.image }];

                return (
                  <div className="pdf-invoice-sheet" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', color: '#0f172a' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #071426', paddingBottom: '18px', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'serif', fontSize: '24px', fontWeight: '800', letterSpacing: '0.1em', color: '#071426' }}>MOXIE</div>
                        <div style={{ fontSize: '11px', color: '#c99b45', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>LUXURY TIMEPIECES</div>
                        <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#64748b', lineHeight: '1.4' }}>
                          Official Moxie Store • Support: +91 7871327802 / +91 7448327802<br />
                          Email: support@moxietimepieces.com
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', background: '#071426', color: '#c99b45', padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                          TAX INVOICE / DISPATCH SLIP
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#334155', marginBottom: '2px' }}><strong>Order ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '800', color: '#c99b45' }}>{orderId}</span></div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}><strong>Date:</strong> {orderDate}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <strong>Payment:</strong> <span className={`payment-pill ${(paymentStatus || 'pending').toLowerCase()}`} style={{ fontSize: '11px', padding: '1px 8px' }}>{paymentStatus}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer TO Section & Shipment Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      {/* Customer Address Details (TO) */}
                      <div style={{ background: '#fdfbf7', border: '1px solid #faeccb', borderRadius: '8px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#854d0e', borderBottom: '1px solid #f3e8cf', paddingBottom: '6px', marginBottom: '10px' }}>
                          📍 TO (DELIVERY ADDRESS)
                        </div>
                        <div style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#334155' }}>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>Name:</strong> <span style={{ fontWeight: '750', color: '#0f172a' }}>{customerName}</span></div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>Mobile:</strong> {mobile}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>Email:</strong> {email}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>Address:</strong> {address}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>City:</strong> {city}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>District:</strong> {district}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '75px' }}>PIN Code:</strong> <span style={{ fontWeight: '750', color: '#0f172a' }}>{pinCode}</span></div>
                        </div>
                      </div>

                      {/* Shipment & Payment Meta */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#071426', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '10px' }}>
                          📦 SHIPMENT & PAYMENT DETAILS
                        </div>
                        <div style={{ fontSize: '12.5px', lineHeight: '1.7', color: '#334155' }}>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '100px' }}>Payment Mode:</strong> {paymentMethod}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '100px' }}>Payment Status:</strong> {paymentStatus}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '100px' }}>Courier Partner:</strong> {courier}</div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '100px' }}>Tracking / AWB:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '750', color: '#c99b45' }}>{trackingId || 'Pending Dispatch'}</span></div>
                          <div><strong style={{ color: '#0f172a', display: 'inline-block', width: '100px' }}>Transaction ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>{transactionId}</span></div>
                          {ord.codAdvancePaid && (
                            <div style={{ color: '#166534', fontWeight: '650' }}><strong style={{ color: '#166534', display: 'inline-block', width: '100px' }}>COD Advance:</strong> ₹100 Paid Online</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Items (Below Customer Address) */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#071426', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '10px' }}>
                        🛍️ ORDER DETAILS & ITEMS ({items.length})
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'center', width: '35px', color: '#475569', fontSize: '11px', fontWeight: '700' }}>#</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontSize: '11px', fontWeight: '700' }}>PRODUCT DESCRIPTION</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', width: '60px', color: '#475569', fontSize: '11px', fontWeight: '700' }}>QTY</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px', color: '#475569', fontSize: '11px', fontWeight: '700' }}>PRICE</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', width: '100px', color: '#475569', fontSize: '11px', fontWeight: '700' }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, idx) => {
                            const pName = it.productName || it.name || "Moxie Item";
                            const pQty = Number(it.quantity || 1);
                            const pPrice = Number(it.price || 0);
                            const pVariant = it.size ? `Size: ${it.size}` : (it.variant || "");
                            const pColor = it.color ? `Color: ${it.color}` : "";
                            const variantStr = [pVariant, pColor].filter(Boolean).join(" • ");

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '9px 10px' }}>
                                  <div style={{ fontWeight: '750', color: '#0f172a' }}>{pName}</div>
                                  {variantStr && <div style={{ fontSize: '11px', color: '#64748b' }}>{variantStr}</div>}
                                </td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '650' }}>{pQty}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right' }}>₹{pPrice.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '750', color: '#0f172a' }}>₹{(pPrice * pQty).toLocaleString('en-IN')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Pricing Summary */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                        <div style={{ width: '260px', fontSize: '12.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#475569' }}>
                            <span>Subtotal:</span>
                            <span style={{ fontWeight: '650', color: '#0f172a' }}>₹{subtotal.toLocaleString('en-IN')}</span>
                          </div>
                          {discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#166534' }}>
                              <span>Discount:</span>
                              <span style={{ fontWeight: '650' }}>-₹{discount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#475569' }}>
                            <span>Delivery Fee:</span>
                            <span style={{ fontWeight: '650', color: '#0f172a' }}>{shipping > 0 ? `₹${shipping.toLocaleString('en-IN')}` : 'FREE'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '2px solid #071426', borderBottom: '2px solid #071426', marginTop: '4px', fontSize: '14.5px', fontWeight: '800', color: '#071426' }}>
                            <span>Grand Total:</span>
                            <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#166534', fontWeight: '700', fontSize: '12px' }}>
                            <span>Amount Paid:</span>
                            <span>₹{amountPaid.toLocaleString('en-IN')}</span>
                          </div>
                          {balanceDue > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#b45309', fontWeight: '750', fontSize: '12px' }}>
                              <span>Balance Due (COD):</span>
                              <span>₹{balanceDue.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Notice & Stamp */}
                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px', fontSize: '11px', color: '#64748b' }}>
                      <div style={{ maxWidth: '460px', lineHeight: '1.45' }}>
                        <strong style={{ color: '#0f172a' }}>Important Notice:</strong> 360° continuous unboxing video mandatory for any return or transit damage claims. Contact support on WhatsApp/Call: <strong>+91 7871327802</strong>.
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#475569' }}>Authorized Signatory</div>
                        <div style={{ fontWeight: '750', color: '#071426' }}>MOXIE TIMEPIECES</div>
                        <div style={{ display: 'inline-block', border: '1px solid #c99b45', color: '#c99b45', padding: '2px 8px', borderRadius: '4px', fontSize: '9.5px', fontWeight: '800', textTransform: 'uppercase', marginTop: '3px' }}>VERIFIED INVOICE</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
