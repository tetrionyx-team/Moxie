import { apiFetch } from "../api/apiConfig";
import watchImg from "../assets/images/watch1.png";
import shoeImg from "../assets/images/shoe.svg";
import capImg from "../assets/images/cap.png";
import budsImg from "../assets/images/Buds.png";
import defaultImg from "../assets/images/offer.png";

const ALL_ORDERS_KEY = "moxie_orders";

const getFallbackImage = (name, category) => {
  const str = (String(name || "") + " " + String(category || "")).toLowerCase();
  if (str.includes("watch")) return watchImg;
  if (str.includes("footwear") || str.includes("shoe") || str.includes("slider")) return shoeImg;
  if (str.includes("cap")) return capImg;
  if (str.includes("gadget") || str.includes("bud")) return budsImg;
  return defaultImg;
};

// Seed sample orders if master storage is completely empty
const SEED_ORDERS = [
  {
    id: 1,
    orderId: "MOX-0001",
    trackingId: "MOXTRK0001",
    customerId: 1,
    customerName: "Harish Raja",
    email: "harish@example.com",
    mobile: "9876543210",
    paymentMethod: "UPI",
    paymentStatus: "Success",
    address: "12 Main Road, Anna Nagar",
    city: "Chennai",
    district: "Chennai",
    pinCode: "600040",
    products: [
      {
        productId: 1,
        productName: "Moxie Classic Leather Watch",
        price: 1499,
        quantity: 1,
        size: "Regular",
        color: "Brown",
        image: watchImg,
      },
    ],
    name: "Moxie Classic Leather Watch",
    image: watchImg,
    quantity: 1,
    price: 1499,
    subtotal: 1499,
    discount: 0,
    deliveryCharge: 0,
    grandTotal: 1499,
    total: 1499,
    orderStatus: "Delivered",
    status: "Delivered",
    orderDate: "08 Sep 2026",
    date: "08 Sep 2026",
    createdAt: "2026-09-08T09:15:00.000Z",
    updatedAt: "2026-09-08T17:30:00.000Z",
    statusHistory: [
      { status: "Confirmed", timestamp: "2026-09-08T09:15:00.000Z" },
      { status: "Processing", timestamp: "2026-09-08T11:30:00.000Z" },
      { status: "Packed", timestamp: "2026-09-08T13:45:00.000Z" },
      { status: "Shipped", timestamp: "2026-09-08T15:00:00.000Z" },
      { status: "Out for Delivery", timestamp: "2026-09-08T16:20:00.000Z" },
      { status: "Delivered", timestamp: "2026-09-08T17:30:00.000Z" },
    ],
    shippingAddress: {
      name: "Harish Raja",
      phone: "9876543210",
      flat: "12 Main Road",
      area: "Anna Nagar",
      address: "12 Main Road, Anna Nagar",
      city: "Chennai",
      district: "Chennai",
      state: "Tamil Nadu",
      pincode: "600040",
    },
    deliveryPartner: "Moxie Express Logistics",
    expectedDelivery: "08 Sep 2026",
  },
  {
    id: 2,
    orderId: "MOX-0002",
    trackingId: "MOXTRK0002",
    customerId: 2,
    customerName: "Harish Raja",
    email: "harish@gmail.com",
    mobile: "9876543211",
    paymentMethod: "COD",
    paymentStatus: "Pending",
    address: "45 Lake View Road, Nungambakkam",
    city: "Chennai",
    district: "Chennai",
    pinCode: "600034",
    products: [
      {
        productId: 2,
        productName: "Air Pro Wireless Earbuds",
        price: 999,
        quantity: 2,
        size: "Standard",
        color: "Matte Black",
        image: budsImg,
      },
    ],
    name: "Air Pro Wireless Earbuds",
    image: budsImg,
    quantity: 2,
    price: 999,
    subtotal: 1998,
    discount: 0,
    deliveryCharge: 100,
    grandTotal: 2098,
    total: 2098,
    orderStatus: "Confirmed",
    status: "Confirmed",
    orderDate: "08 Sep 2026",
    date: "08 Sep 2026",
    createdAt: "2026-09-08T10:30:00.000Z",
    updatedAt: "2026-09-08T10:30:00.000Z",
    statusHistory: [
      { status: "Confirmed", timestamp: "2026-09-08T10:30:00.000Z" },
    ],
    shippingAddress: {
      name: "Harish Raja",
      phone: "9876543211",
      flat: "45 Lake View Road",
      area: "Nungambakkam",
      address: "45 Lake View Road, Nungambakkam",
      city: "Chennai",
      district: "Chennai",
      state: "Tamil Nadu",
      pincode: "600034",
    },
    deliveryPartner: "Moxie Express Logistics",
    expectedDelivery: "11 Sep 2026",
  },
];

export const getMasterOrders = () => {
  try {
    const raw = localStorage.getItem(ALL_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading master orders:", e);
  }
  try {
    localStorage.setItem(ALL_ORDERS_KEY, JSON.stringify(SEED_ORDERS));
  } catch {}
  return SEED_ORDERS;
};

export const saveMasterOrders = (orders) => {
  try {
    localStorage.setItem(ALL_ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("moxie_orders_updated", { detail: { orders } }));
  } catch (e) {
    console.error("Error saving master orders:", e);
  }
};

export const orderService = {
  // Fetch orders for customer
  fetchOrders: async (email) => {
    // 1. Check API if available
    let apiOrders = [];
    try {
      const res = await apiFetch("/customer/orders/");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          apiOrders = data.map((o) => ({
            ...o,
            image: o.image || getFallbackImage(o.name || o.productName),
          }));
        }
      }
    } catch {
      // Backend unavailable or offline
    }

    // 2. Read from local master dataset
    const master = getMasterOrders();
    let localOrders = [];
    if (email) {
      const normEmail = email.trim().toLowerCase();
      localOrders = master.filter(
        (o) => o.email && o.email.trim().toLowerCase() === normEmail
      );
    }

    // Merge API and local orders, prioritizing latest status in master
    const orderMap = new Map();
    localOrders.forEach((o) => {
      const key = String(o.orderId || o.id);
      orderMap.set(key, o);
    });

    apiOrders.forEach((o) => {
      const key = String(o.orderId || o.id || o.order_number);
      if (!orderMap.has(key)) {
        orderMap.set(key, o);
      } else {
        // Keep updated status from master if newer
        const existing = orderMap.get(key);
        orderMap.set(key, { ...o, ...existing });
      }
    });

    const merged = Array.from(orderMap.values());
    merged.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    // Also persist per-email key for compatibility
    if (email) {
      try {
        localStorage.setItem(`moxie_orders_${email}`, JSON.stringify(merged));
      } catch {}
    }

    return merged;
  },

  // Fetch all orders for Admin
  fetchAdminOrders: async (filters = {}) => {
    const { searchTerm = "", statusFilter = "all", paymentFilter = "all", dateFilter = "all", sortOption = "newest" } = filters;

    // 1. Try backend API
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("q", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (paymentFilter !== "all") params.append("payment_status", paymentFilter);
      if (dateFilter !== "all") params.append("date", dateFilter);
      if (sortOption) params.append("sort", sortOption);

      const res = await fetch(`/api/admin-orders/?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const apiList = data.orders || data.results || data.orders_list || [];
        if (apiList.length > 0) {
          return {
            orders: apiList,
            stats: data.stats,
          };
        }
      }
    } catch {
      // Backend unavailable
    }

    // 2. Filter local master orders
    let list = [...getMasterOrders()];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((o) => {
        const idMatch = (o.orderId || "").toLowerCase().includes(term);
        const nameMatch = (o.customerName || o.customer?.name || "").toLowerCase().includes(term);
        const phoneMatch = (o.mobile || o.customer?.phone || "").includes(term);
        const emailMatch = (o.email || o.customer?.email || "").toLowerCase().includes(term);
        const trackMatch = (o.trackingId || "").toLowerCase().includes(term);
        const prodMatch = (o.products || []).some((p) => (p.productName || p.name || "").toLowerCase().includes(term)) || (o.name || "").toLowerCase().includes(term);
        return idMatch || nameMatch || phoneMatch || emailMatch || trackMatch || prodMatch;
      });
    }

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      list = list.filter(
        (o) => (o.orderStatus || o.status || "").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Payment filter
    if (paymentFilter && paymentFilter !== "all") {
      list = list.filter(
        (o) => (o.paymentStatus || "").toLowerCase() === paymentFilter.toLowerCase()
      );
    }

    // Date filter
    if (dateFilter && dateFilter !== "all") {
      const today = new Date().toISOString().split("T")[0];
      if (dateFilter === "today") {
        list = list.filter((o) => (o.createdAt || "").startsWith(today));
      } else if (dateFilter === "yesterday") {
        const yDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        list = list.filter((o) => (o.createdAt || "").startsWith(yDate));
      } else if (dateFilter === "7days") {
        const d7 = Date.now() - 7 * 86400000;
        list = list.filter((o) => new Date(o.createdAt || o.date).getTime() >= d7);
      } else if (dateFilter === "30days") {
        const d30 = Date.now() - 30 * 86400000;
        list = list.filter((o) => new Date(o.createdAt || o.date).getTime() >= d30);
      } else {
        // Exact date matching (YYYY-MM-DD or DD-MM-YYYY)
        list = list.filter((o) => {
          const orderDateStr = o.createdAt ? o.createdAt.split("T")[0] : "";
          if (orderDateStr && orderDateStr === dateFilter) return true;
          if (o.orderDate && o.orderDate === dateFilter) return true;
          // check formatted date
          try {
            const d = new Date(o.createdAt || o.date);
            const iso = d.toISOString().split("T")[0];
            return iso === dateFilter;
          } catch {
            return false;
          }
        });
      }
    }

    // Sorting
    if (sortOption === "oldest") {
      list.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
    } else if (sortOption === "highest") {
      list.sort((a, b) => (Number(b.grandTotal || b.total) || 0) - (Number(a.grandTotal || a.total) || 0));
    } else if (sortOption === "lowest") {
      list.sort((a, b) => (Number(a.grandTotal || a.total) || 0) - (Number(b.grandTotal || b.total) || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    }

    // Calculate dynamic stats
    const all = getMasterOrders();
    const stats = {
      total_orders: all.length,
      pending_orders: all.filter((o) => ["pending", "confirmed", "processing", "packed"].includes((o.orderStatus || o.status || "").toLowerCase())).length,
      shipped_orders: all.filter((o) => ["shipped", "out for delivery"].includes((o.orderStatus || o.status || "").toLowerCase())).length,
      delivered_orders: all.filter((o) => (o.orderStatus || o.status || "").toLowerCase() === "delivered").length,
      cancelled_orders: all.filter((o) => (o.orderStatus || o.status || "").toLowerCase() === "cancelled").length,
      total_revenue: all.reduce((sum, o) => ((o.paymentStatus || "").toLowerCase() === "paid" || (o.paymentStatus || "").toLowerCase() === "success" ? sum + (Number(o.grandTotal || o.total) || 0) : sum), 0),
    };

    return { orders: list, stats };
  },

  // Update order status & payment status
  updateOrderStatus: async (orderId, newOrderStatus, newPaymentStatus) => {
    // 1. Try Backend API
    try {
      const cleanId = String(orderId).replace(/^[A-Za-z]+-?/, "");
      await fetch(`/api/admin-orders/${cleanId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_status: newOrderStatus,
          payment_status: newPaymentStatus,
        }),
      });
    } catch {}

    // 2. Update Master Dataset in localStorage
    const master = getMasterOrders();
    let updatedOrder = null;
    const nowIso = new Date().toISOString();

    const updatedList = master.map((o) => {
      const match = String(o.id) === String(orderId) || String(o.orderId) === String(orderId);
      if (match) {
        const history = Array.isArray(o.statusHistory) ? [...o.statusHistory] : [];
        const lastStatus = history.length > 0 ? history[history.length - 1].status : "";

        if (newOrderStatus && lastStatus !== newOrderStatus) {
          history.push({
            status: newOrderStatus,
            timestamp: nowIso,
          });
        }

        updatedOrder = {
          ...o,
          orderStatus: newOrderStatus || o.orderStatus,
          status: newOrderStatus || o.status,
          paymentStatus: newPaymentStatus || o.paymentStatus,
          statusHistory: history,
          updatedAt: nowIso,
        };
        return updatedOrder;
      }
      return o;
    });

    saveMasterOrders(updatedList);

    // Sync user order list
    if (updatedOrder && updatedOrder.email) {
      try {
        const userOrders = await orderService.fetchOrders(updatedOrder.email);
        localStorage.setItem(`moxie_orders_${updatedOrder.email}`, JSON.stringify(userOrders));
      } catch {}
    }

    return updatedOrder;
  },

  // Place a new order
  placeOrder: async (email, orderData) => {
    const master = getMasterOrders();
    const nextSeq = master.length + 1;
    const orderNum = `MOX-${String(nextSeq).padStart(4, "0")}`;
    const trackNum = `MOXTRK${String(nextSeq).padStart(4, "0")}`;
    const now = new Date();
    const nowIso = now.toISOString();
    const orderDateFormatted = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Extract products list
    const productsList = Array.isArray(orderData.products) && orderData.products.length > 0
      ? orderData.products.map((p) => ({
          productId: p.productId || p.id || 1,
          productName: p.productName || p.name || "Moxie Item",
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 1,
          size: p.size || p.selectedSize || "Regular",
          color: p.color || p.selectedColor || "Standard",
          image: p.image || getFallbackImage(p.productName || p.name),
        }))
      : [
          {
            productId: orderData.productId || 1,
            productName: orderData.name || "Moxie Item",
            price: Number(orderData.price) || Number(orderData.total) || 0,
            quantity: Number(orderData.quantity) || 1,
            size: orderData.size || "Regular",
            color: orderData.color || "Standard",
            image: orderData.image || getFallbackImage(orderData.name),
          },
        ];

    const firstProduct = productsList[0];
    const customerName = orderData.customerName || orderData.shippingAddress?.name || "Customer";
    const mobile = orderData.mobile || orderData.shippingAddress?.phone || "";
    const address = orderData.address || orderData.shippingAddress?.address || orderData.shippingAddress?.flat || "";
    const city = orderData.city || orderData.shippingAddress?.city || "";
    const district = orderData.district || orderData.shippingAddress?.district || city;
    const pinCode = orderData.pinCode || orderData.pincode || orderData.shippingAddress?.pincode || "";

    const newOrder = {
      id: nextSeq,
      orderId: orderNum,
      order_number: orderNum,
      trackingId: trackNum,
      tracking_id: trackNum,
      customerId: orderData.customerId || nextSeq,
      customerName,
      email: email || orderData.email || "customer@example.com",
      mobile,
      paymentMethod: orderData.paymentMethod === "cod" || orderData.paymentMethod === "Cash on Delivery" ? "COD" : "UPI",
      paymentStatus:
        orderData.paymentStatus ||
        (orderData.paymentMethod === "cod" || orderData.paymentMethod === "Cash on Delivery"
          ? "Pending"
          : "Success"),
      address,
      city,
      district,
      pinCode,
      products: productsList,
      name:
        productsList.length > 1
          ? `${firstProduct.productName} + ${productsList.length - 1} more items`
          : firstProduct.productName,
      image: firstProduct.image,
      quantity: productsList.reduce((sum, p) => sum + p.quantity, 0),
      price: firstProduct.price,
      subtotal: Number(orderData.subtotal) || Number(orderData.total) || 0,
      discount: Number(orderData.discount) || 0,
      deliveryCharge: Number(orderData.deliveryCharge || orderData.shippingCharge) || 0,
      grandTotal: Number(orderData.grandTotal || orderData.total) || 0,
      total: Number(orderData.grandTotal || orderData.total) || 0,
      orderStatus: "Confirmed",
      status: "Confirmed",
      orderDate: orderDateFormatted,
      date: orderDateFormatted,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusHistory: [
        {
          status: "Confirmed",
          timestamp: nowIso,
        },
      ],
      shippingAddress: {
        name: customerName,
        phone: mobile,
        address,
        flat: address,
        city,
        district,
        state: orderData.shippingAddress?.state || "Tamil Nadu",
        pincode: pinCode,
      },
      customer: {
        name: customerName,
        email: email || "customer@example.com",
        phone: mobile,
        initial: customerName.charAt(0).toUpperCase() || "C",
      },
      deliveryPartner: "Moxie Express Logistics",
      expectedDelivery: new Date(Date.now() + 4 * 86400000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    const updated = [newOrder, ...master];
    saveMasterOrders(updated);

    if (email) {
      try {
        const userOrders = await orderService.fetchOrders(email);
        localStorage.setItem(`moxie_orders_${email}`, JSON.stringify(userOrders));
      } catch {}
    }

    return newOrder;
  },

  // Cancel order
  cancelOrder: async (email, orderId, reason = "") => {
    return await orderService.updateOrderStatus(orderId, "Cancelled");
  },
};
