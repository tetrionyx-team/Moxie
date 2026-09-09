import React from "react";
import { LuCheck, LuTruck, LuPackage, LuClock, LuCircleCheck, LuBan, LuSparkles } from "react-icons/lu";

export default function TrackOrder({ order, onBack }) {
  if (!order) return null;

  const displayOrderId = order.orderId || order.order_number || (order.id ? `MOX-${String(order.id).padStart(4, '0')}` : "MOX-0001");
  const trackingId = order.trackingId || order.tracking_id || `MOXTRK${String(order.id || '0001').padStart(4, '0')}`;
  const currentStatus = order.orderStatus || order.status || "Confirmed";
  const isCancelled = currentStatus.toLowerCase() === "cancelled";

  const steps = [
    { label: "Confirmed", icon: LuCircleCheck },
    { label: "Processing", icon: LuClock },
    { label: "Packed", icon: LuPackage },
    { label: "Shipped", icon: LuTruck },
    { label: "Out for Delivery", icon: LuTruck },
    { label: "Delivered", icon: LuCheck },
  ];

  const getStatusIndex = (status) => {
    const s = (status || "").toLowerCase().trim();
    switch (s) {
      case "placed":
      case "confirmed":
        return 0;
      case "processing":
        return 1;
      case "packed":
        return 2;
      case "shipped":
        return 3;
      case "out for delivery":
        return 4;
      case "delivered":
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStatusIndex(currentStatus);

  // Helper to extract timestamp from statusHistory or timeline
  const getStepTimestamp = (stepLabel, stepIdx) => {
    if (Array.isArray(order.statusHistory)) {
      const match = order.statusHistory.find(
        (h) => (h.status || "").toLowerCase().trim() === stepLabel.toLowerCase().trim()
      );
      if (match && match.timestamp) {
        try {
          const d = new Date(match.timestamp);
          return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } catch {}
      }
    }

    if (order.timeline) {
      const key = stepLabel.toLowerCase().replace(/\s+/g, "");
      const val = order.timeline[key] || order.timeline[key === "outfordelivery" ? "outForDelivery" : key];
      if (val) return val;
    }

    if (stepIdx <= currentStepIndex) {
      return `${order.orderDate || order.date || "Today"}`;
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
      <div className="panel-header">
        <div className="d-flex align-items-center gap-3">
          <button className="secondary-btn btn-sm py-1 px-2" onClick={onBack}>
            ← Back
          </button>
          <h2 style={{ fontSize: "20px" }}>Track Order #{displayOrderId}</h2>
        </div>
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
          {currentStatus.toLowerCase() === "out for delivery" && (
            <div className="p-3 mb-4 rounded-3 d-flex align-items-center gap-3" style={{ background: "linear-gradient(135deg, #fbf7ee 0%, #f4eacc 100%)", border: "1.5px solid #dfba73", color: "#785817" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#dfba73", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                <LuTruck />
              </div>
              <div>
                <h4 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#59400d" }}>
                  Your order is out for delivery.
                </h4>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#785817" }}>
                  Your order is on the way and should arrive soon. Tracking ID: <strong>{trackingId}</strong>
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
                  Thank you for shopping with Moxie. Hope you love your new style!
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
            <span className="meta-val" style={{ fontFamily: "monospace", fontWeight: "700", color: "#c9a35c" }}>
              {trackingId}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Delivery Partner:</span>
            <span className="meta-val">{order.deliveryPartner || "Moxie Logistics"}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Est. Delivery:</span>
            <span className="meta-val">{order.expectedDelivery || "3-5 Business Days"}</span>
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
    </div>
  );
}
