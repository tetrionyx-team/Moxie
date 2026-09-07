import { apiFetch } from "../api/apiConfig";
import buds from "../assets/images/Buds.png";

// Helper to calculate date offsets relative to today
const getDateOffset = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const orderService = {
  fetchOrders: async (email) => {
    try {
      const res = await apiFetch("/customer/orders/");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((o) => ({
            ...o,
            image: o.image || buds,
          }));
        }
      }
    } catch {
      // Fallback below
    }

    if (!email) return [];

    try {
      const stored = localStorage.getItem(`moxie_orders_${email}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }

    return [];
  },

  cancelOrder: async (email, orderId) => {
    try {
      // Attempt backend cancellation if numeric id or formatted id
      const cleanId = String(orderId).replace(/^[A-Za-z]+-?/, "");
      const res = await apiFetch(`/orders/${cleanId}/cancel/`, {
        method: "POST",
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // Fallback
    }

    if (!email || !orderId) return false;

    const orders = await orderService.fetchOrders(email);
    const updated = orders.map((o) => {
      if (o.id === orderId || o.rawId === orderId) {
        return {
          ...o,
          status: "Cancelled",
          timeline: {
            ...o.timeline,
            cancelled: new Date().toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            }),
          },
        };
      }
      return o;
    });

    try {
      localStorage.setItem(`moxie_orders_${email}`, JSON.stringify(updated));
    } catch {}
    return true;
  },


  placeOrder: async (email, orderData) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (!email) return null;

    const orders = await orderService.fetchOrders(email);
    const newOrder = {
      id: `ORD${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      name: orderData.name || "Moxie Product Purchase",
      image: orderData.image || buds,
      variant: orderData.variant || "",
      quantity: orderData.quantity || 1,
      price: orderData.price || 0,
      subtotal: orderData.subtotal || 0,
      discount: orderData.discount || 0,
      shippingCharge: orderData.shippingCharge || 100,
      tax: orderData.tax || 0,
      total: orderData.total || 0,
      paymentStatus: orderData.paymentStatus || "Paid",
      paymentMethod: orderData.paymentMethod || "UPI",
      transactionRef: `TXN${Math.floor(100000000 + Math.random() * 900000000)}`,
      status: "Placed",
      expectedDelivery: getDateOffset(5),
      deliveryPartner: "Moxie Logistics",
      trackingNumber: `MX${Math.floor(10000000 + Math.random() * 90000000)}`,
      shippingAddress: orderData.shippingAddress || {},
      timeline: {
        placed: `${new Date().toLocaleDateString("en-IN")}, ${new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "numeric" })}`,
        confirmed: null,
        packed: null,
        shipped: null,
        outForDelivery: null,
        delivered: null,
      },
    };

    orders.unshift(newOrder);
    localStorage.setItem(`moxie_orders_${email}`, JSON.stringify(orders));
    return newOrder;
  }
};
