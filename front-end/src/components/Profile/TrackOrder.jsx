import React, { useState, useEffect, useCallback } from "react";
import { LuCheck, LuTruck, LuPackage, LuClock, LuCircleCheck, LuBan, LuCopy, LuRefreshCw } from "react-icons/lu";
import { apiFetch } from "../../api/apiConfig";

export default function TrackOrder({ order: initialOrder, onBack }) {
  const [order, setOrder] = useState(initialOrder);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync if initialOrder prop changes
  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
    }
  }, [initialOrder]);

  // Refresh latest order details from backend
  const refreshTracking = useCallback(async (isSilent = false) => {
    if (!initialOrder) return;
    const targetOrderId = String(
      initialOrder.order_number ||
      initialOrder.orderId ||
      initialOrder.tracking_id ||
      initialOrder.trackingId ||
      initialOrder.id ||
      initialOrder.rawId ||
      ""
    ).trim();

    if (!targetOrderId) return;
    if (!isSilent) setRefreshing(true);

    try {
      // 1. Try unified tracking lookup endpoint
      const lookupRes = await apiFetch(`/tracking/lookup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_query: targetOrderId }),
      });
      if (lookupRes.ok) {
        const trackData = await lookupRes.json();
        if (trackData && trackData.success) {
          setOrder((prev) => ({
            ...(prev || {}),
            ...trackData,
            orderStatus: trackData.order_status || trackData.status,
            status: trackData.order_status || trackData.status,
            shippingStatus: trackData.order_status,
            trackingId: trackData.tracking_number || trackData.trackingId,
            courier_name: trackData.courier_display_name || trackData.courier_name,
            statusHistory: trackData.status_history || prev?.statusHistory,
          }));
          return;
        }
      }

      // 2. Try dedicated public tracking endpoint
      const trackRes = await apiFetch(`/orders/${encodeURIComponent(targetOrderId)}/track/`);
      if (trackRes.ok) {
        const trackData = await trackRes.json();
        if (trackData && trackData.success !== false) {
          setOrder((prev) => ({
            ...(prev || {}),
            ...trackData,
            orderStatus: trackData.orderStatus || trackData.status,
            status: trackData.status || trackData.orderStatus,
            shippingStatus: trackData.shippingStatus || trackData.orderStatus,
          }));
          return;
        }
      }

      // 2. Fallback to customer orders endpoint
      const emailParam = initialOrder.email || (initialOrder.customer && initialOrder.customer.email) ? `?email=${encodeURIComponent(initialOrder.email || initialOrder.customer.email)}` : "";
      const res = await apiFetch(`/customer/orders/${emailParam}`);
      if (res.ok) {
        const ordersList = await res.json();
        if (Array.isArray(ordersList)) {
          const matched = ordersList.find((o) => {
            const oCode = String(o.id || o.orderId || o.order_number || "").toLowerCase();
            const tCode = targetOrderId.toLowerCase();
            const oRaw = String(o.rawId || o.id || "").replace(/^[^\d]+/, "");
            const tRaw = targetOrderId.replace(/^[^\d]+/, "");
            return oCode === tCode || (oRaw && tRaw && oRaw === tRaw);
          });
          if (matched) {
            setOrder((prev) => ({
              ...(prev || {}),
              ...matched,
            }));
          }
        }
      }
    } catch {
      // Keep existing data on network fail
    } finally {
      if (!isSilent) setRefreshing(false);
    }
  }, [initialOrder]);

  // Auto-refresh: on mount, on window focus, and 5-second polling interval for real-time tracking
  useEffect(() => {
    refreshTracking(true);

    const onFocus = () => refreshTracking(true);
    window.addEventListener("focus", onFocus);

    const onStorageUpdate = (e) => {
      if (e?.detail?.orders && Array.isArray(e.detail.orders) && initialOrder) {
        const tCode = String(initialOrder.order_number || initialOrder.orderId || initialOrder.id || "").toLowerCase();
        const found = e.detail.orders.find(
          (o) =>
            String(o.orderId || o.order_number || o.id || "").toLowerCase() === tCode
        );
        if (found) {
          setOrder((prev) => ({ ...(prev || {}), ...found }));
        }
      }
      refreshTracking(true);
    };
    window.addEventListener("moxie_orders_updated", onStorageUpdate);

    const interval = setInterval(() => {
      refreshTracking(true);
    }, 5000);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("moxie_orders_updated", onStorageUpdate);
      clearInterval(interval);
    };
  }, [refreshTracking, initialOrder]);

  if (!order) return null;

  const displayOrderId = order.orderId || order.order_number || (order.id ? `MOX-${String(order.id).padStart(4, "0")}` : "MOX-0001");
  const trackingId = order.trackingId || order.tracking_id || order.trackingNumber || order.tracking_number || "";
  const rawCourier = order.courier || order.courier_name || order.deliveryPartner || "";
  const courierName = rawCourier === "ST_COURIER" ? "ST Courier" : rawCourier === "INDIA_POST" ? "India Post" : rawCourier;
  const currentStatus = String(order.orderStatus || order.status || order.shippingStatus || "Confirmed").trim();
  const isCancelled = currentStatus.toLowerCase() === "cancelled";

  const handleCopyTracking = () => {
    if (!trackingId) return;
    navigator.clipboard?.writeText(trackingId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const steps = [
    { label: "Confirmed", icon: LuCircleCheck },
    { label: "Processing", icon: LuClock },
    { label: "Packed", icon: LuPackage },
    { label: "Shipped", icon: LuTruck },
    { label: "Out for Delivery", icon: LuTruck },
    { label: "Delivered", icon: LuCheck },
  ];

  const getStatusIndex = (status) => {
    const s = (status || "").toLowerCase().trim().replace(/[-_]/g, " ");
    switch (s) {
      case "placed":
      case "pending":
      case "confirmed":
        return 0;
      case "processing":
      case "in progress":
        return 1;
      case "packed":
      case "packing":
        return 2;
      case "shipped":
      case "dispatched":
      case "in transit":
        return 3;
      case "out for delivery":
        return 4;
      case "delivered":
      case "completed":
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStatusIndex(currentStatus);

  // Helper to extract timestamp from statusHistory or timeline
  const getStepTimestamp = (stepLabel, stepIdx) => {
    const normStep = stepLabel.toLowerCase().replace(/[\s_-]+/g, "");
    const historyList = Array.isArray(order.statusHistory || order.status_history)
      ? (order.statusHistory || order.status_history)
      : [];

    if (historyList.length > 0) {
      const match = historyList.find(
        (h) => (h.status || "").toLowerCase().replace(/[\s_-]+/g, "") === normStep
      );
      if (match && (match.timestamp || match.date || match.raw_date)) {
        try {
          const d = new Date(match.timestamp || match.raw_date || match.date);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }
        } catch {}
      }
    }

    if (order.timeline) {
      const val = order.timeline[normStep] || order.timeline[normStep === "outfordelivery" ? "outForDelivery" : normStep];
      if (val) return val;
    }

    // Step 0 (Confirmed) timestamp
    if (stepIdx === 0 && (order.orderDate || order.date || order.createdAt)) {
      try {
        const d = new Date(order.createdAt || order.date || order.orderDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
      } catch {}
      return `${order.orderDate || order.date || "Confirmed"}`;
    }

    // Active step timestamp if updated recently
    if (stepIdx === currentStepIndex && (order.tracking_updated_at || order.updatedAt)) {
      try {
        const d = new Date(order.tracking_updated_at || order.updatedAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
      } catch {}
    }

    return null;
  };

  const progressWidth = isCancelled
    ? "0%"
    : `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%`;

  const addressObj = order.shippingAddress || {};
  const customerName = order.customerName || addressObj.name || "Customer";
  const fullAddress = order.address || addressObj.address || addressObj.flat || "";
  const city = order.city || addressObj.city || "";
  const district = order.district || addressObj.district || city;
  const pinCode = order.pinCode || order.pincode || addressObj.pincode || "";

  return (
    <div className="track-order-wrapper">
      <div className="panel-header d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <button className="secondary-btn btn-sm py-1 px-2" onClick={onBack}>
            ← Back
          </button>
          <h2 style={{ fontSize: "20px", margin: 0 }}>Track Order #{displayOrderId}</h2>
        </div>
        <button
          type="button"
          className="secondary-btn btn-sm py-1 px-3 d-flex align-items-center gap-2"
          onClick={() => refreshTracking(false)}
          disabled={refreshing}
          title="Fetch latest tracking status from backend"
        >
          <LuRefreshCw className={refreshing ? "spin-icon" : ""} size={14} />
          <span>{refreshing ? "Refreshing..." : "Refresh Tracking"}</span>
        </button>
      </div>

      {/* ── CANCELLED STATE ── */}
      {isCancelled ? (
        <div className="alert alert-danger p-4 rounded-3 text-center mb-4" style={{ border: "1px solid #fecaca", background: "#fef2f2" }}>
          <div style={{ fontSize: "36px", color: "#dc2626", marginBottom: "8px" }}>
            <LuBan />
          </div>
          <h3 className="mt-1" style={{ fontSize: "18px", fontWeight: "700", color: "#991b1b" }}>
            Order Cancelled
          </h3>
          <p className="m-0 text-muted" style={{ fontSize: "14px" }}>
            Cancelled on: {getStepTimestamp("Cancelled", 0) || order.updatedAt || order.date}
          </p>
          {order.cancelReason && (
            <p className="mt-2 text-danger" style={{ fontSize: "13px", fontWeight: "500" }}>
              Reason: {order.cancelReason}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* ── OUT FOR DELIVERY BANNER ── */}
          {(currentStatus.toLowerCase() === "out for delivery" || currentStatus.toLowerCase() === "out_for_delivery") && (
            <div className="p-3 mb-4 rounded-3 d-flex align-items-center gap-3" style={{ background: "linear-gradient(135deg, #fbf7ee 0%, #f4eacc 100%)", border: "1.5px solid #dfba73", color: "#785817" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#dfba73", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                <LuTruck />
              </div>
              <div>
                <h4 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#59400d" }}>
                  Your order is out for delivery.
                </h4>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#785817" }}>
                  Courier: <strong>{courierName}</strong> | Tracking ID: <strong>{trackingId}</strong>
                </p>
              </div>
            </div>
          )}

          {/* ── DELIVERED BANNER ── */}
          {currentStatus.toLowerCase() === "delivered" && (
            <div className="p-3 mb-4 rounded-3 d-flex align-items-center gap-3" style={{ background: "#f0fdf4", border: "1.5px solid #86efac", color: "#15803d" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#22c55e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                <LuCheck />
              </div>
              <div>
                <h4 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#166534" }}>
                  Delivered successfully
                </h4>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#15803d" }}>
                  Delivered via {courierName}. Thank you for shopping with Moxie!
                </p>
              </div>
            </div>
          )}

          {/* ── TIMELINE ── */}
          <div className="tracking-timeline-container mb-5 border rounded-3 p-4 bg-white" style={{ position: "relative", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <div className="timeline-steps">
              <div className="timeline-progress-bar" style={{ width: progressWidth, background: "linear-gradient(90deg, #dfba73, #c9a35c, #9a7836)" }}></div>
              {steps.map((stepObj, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
                const stepTimestamp = getStepTimestamp(stepObj.label, idx);

                return (
                  <div
                    key={stepObj.label}
                    className={`timeline-step ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""}`}
                  >
                    <div
                      className="timeline-circle"
                      style={
                        isActive
                          ? { borderColor: "#c9a35c", backgroundColor: "#fff", color: "#c9a35c", boxShadow: "0 0 0 4px rgba(201, 163, 92, 0.25)" }
                          : isCompleted
                          ? { backgroundColor: "#c9a35c", borderColor: "#c9a35c", color: "#fff" }
                          : {}
                      }
                    >
                      {isCompleted ? <LuCheck size={16} /> : isActive ? "●" : idx + 1}
                    </div>
                    <span
                      className="timeline-label"
                      style={isActive ? { color: "#c9a35c", fontWeight: "700" } : isCompleted ? { color: "#111827", fontWeight: "600" } : { color: "#9ca3af" }}
                    >
                      {stepObj.label}
                    </span>
                    {stepTimestamp && (
                      <span className="timeline-step-time" style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                        {stepTimestamp}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Meta Specifications */}
      <div className="tracking-meta-grid">
        <div className="meta-col">
          <h4>Shipping Details</h4>
          <div className="meta-row">
            <span className="meta-label">Order ID:</span>
            <span className="meta-val" style={{ fontWeight: "700" }}>{displayOrderId}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Tracking ID:</span>
            <span className="meta-val" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#c9a35c" }}>
                {trackingId}
              </span>
              <button
                type="button"
                onClick={handleCopyTracking}
                title="Copy tracking ID"
                style={{
                  border: "none",
                  background: copied ? "#22c55e" : "#f1f5f9",
                  color: copied ? "#fff" : "#475569",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                {copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Courier Partner:</span>
            <span className="meta-val" style={{ fontWeight: "600" }}>{courierName}</span>
          </div>
          {order.trackingLocation && (
            <div className="meta-row">
              <span className="meta-label">Current Location:</span>
              <span className="meta-val" style={{ color: "#0284c7", fontWeight: "600" }}>{order.trackingLocation}</span>
            </div>
          )}
          <div className="meta-row">
            <span className="meta-label">Est. Delivery:</span>
            <span className="meta-val">{order.estimatedDelivery || order.expectedDelivery || "3-5 Business Days"}</span>
          </div>
        </div>

        <div className="meta-col">
          <h4>Delivery Address</h4>
          <div style={{ fontSize: "13px", color: "#2c3e50", lineHeight: "1.6" }}>
            <div style={{ fontWeight: "700" }}>{customerName}</div>
            {fullAddress && <div>{fullAddress}</div>}
            <div>
              {city ? `${city}, ` : ""}
              {district ? `${district} ` : ""}
              {pinCode ? `- ${pinCode}` : ""}
            </div>
            {order.mobile && <div className="mt-1 text-muted">Phone: {order.mobile}</div>}
          </div>
        </div>
      </div>

      {/* History Log Table if available */}
      {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
        <div className="mt-4 p-3 border rounded-3 bg-white">
          <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "#1e293b" }}>
            Status & Location Updates
          </h4>
          <div className="d-flex flex-column gap-2">
            {order.statusHistory.map((h, i) => (
              <div key={i} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: "#f8fafc", fontSize: "12.5px" }}>
                <div>
                  <strong style={{ color: "#0f172a" }}>{h.status}</strong>
                  {h.location && <span className="ms-2 text-muted">• {h.location}</span>}
                  {h.message && <div style={{ fontSize: "11.5px", color: "#64748b" }}>{h.message}</div>}
                </div>
                <span className="text-muted" style={{ fontSize: "11.5px" }}>{h.date || h.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
