import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuFileText,
  LuTruck,
  LuRotateCcw,
  LuRefreshCcw,
  LuCircleX,
  LuShoppingBag,
} from "react-icons/lu";
import { FaStar } from "react-icons/fa";
import WriteReviewModal from "../Review/WriteReviewModal";
import "./MyOrders.css";

export default function MyOrders({
  orders = [],
  storeSettings,
  user,
  onViewDetails,
  onCancelOrder,
}) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
  const [reviewModalOrder, setReviewModalOrder] = useState(null);
  const [reviewedOrders, setReviewedOrders] = useState(() => {
    const keys = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("reviewed_order_")) {
          keys[k] = true;
        }
      }
    } catch {}
    return keys;
  });

  const allowCancellation = storeSettings?.allow_order_cancellation !== false;
  const enableTracking = storeSettings?.enable_order_tracking !== false;

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase().trim();
    switch (s) {
      case "placed":
      case "confirmed":
        return "status-confirmed";
      case "processing":
        return "status-processing";
      case "packed":
        return "status-packed";
      case "shipped":
        return "status-shipped";
      case "out for delivery":
        return "status-out-for-delivery";
      case "delivered":
        return "status-delivered";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-confirmed";
    }
  };

  const getPaymentBadgeText = (order) => {
    const method = (order.paymentMethod || "").toUpperCase();
    const status = (order.paymentStatus || "").toLowerCase();
    const isCod = method === "COD" || method.includes("CASH");

    if (isCod) {
      if (status === "paid") return "Cash on Delivery • Paid";
      if (status === "partially paid" || order.codAdvancePaid || order.cod_advance_paid) {
        const bal = Number(
          order.balanceDue !== undefined
            ? order.balanceDue
            : order.balance_due !== undefined
            ? order.balance_due
            : Number(order.grandTotal || order.total || order.totalAmount || 0) -
              (order.amountPaid || order.amount_paid || 100)
        );
        return `Cash on Delivery • Advance Paid ₹${
          order.codAdvanceAmount || order.cod_advance_amount || 100
        } • Due ₹${Math.max(0, bal).toLocaleString("en-IN")}`;
      }
      return "Cash on Delivery • Payment on Delivery";
    }
    if (status === "failed") return "Online Payment • Failed";
    if (status === "pending") return "Online Payment • Pending";
    return `${order.paymentMethod || "UPI"} • Paid`;
  };

  const handleReorder = (order) => {
    alert(
      `Reordered "${order.name || order.productName || "Moxie Item"}". Item details have been added to your bag.`
    );
  };

  const handleReturnExchange = (order) => {
    alert(
      `Return request submitted for Order #${order.orderId || order.id}. Our logistics partner will contact you shortly.`
    );
  };

  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    if (activeFilter === "all") return orders;

    return orders.filter((o) => {
      const s = (o.orderStatus || o.status || "").toLowerCase().trim();
      if (activeFilter === "processing") return s === "processing" || s === "in progress";
      if (activeFilter === "packed") return s === "packed";
      if (activeFilter === "shipped") return s === "shipped" || s === "out for delivery";
      if (activeFilter === "delivered") return s === "delivered";
      if (activeFilter === "cancelled") return s === "cancelled";
      return true;
    });
  }, [orders, activeFilter]);

  if (!orders || orders.length === 0) {
    return (
      <div className="my-orders-section">
        <div className="profile-header-wrap orders-header-wrap">
          <div>
            <h2 className="profile-page-title">My Orders</h2>
            <p className="profile-page-subtitle">
              Your MOXIE purchases, all in one place.
            </p>
          </div>
          <span className="orders-count-pill">0 Orders</span>
        </div>

        <div className="orders-empty-state">
          <div className="orders-empty-icon-wrap" aria-hidden="true">
            <LuShoppingBag className="orders-empty-icon" />
          </div>
          <h3 className="orders-empty-title">No orders yet</h3>
          <p className="orders-empty-desc">
            You haven't placed any orders yet. Discover our latest collection.
          </p>
          <button
            type="button"
            className="orders-empty-btn"
            onClick={() => navigate("/products")}
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-section">
      {/* Header */}
      <div className="profile-header-wrap orders-header-wrap">
        <div>
          <h2 className="profile-page-title">My Orders</h2>
          <p className="profile-page-subtitle">
            Your MOXIE purchases, all in one place.
          </p>
        </div>

        <span className="orders-count-pill">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="orders-filter-tabs" role="tablist">
        {[
          { id: "all", label: "All Orders" },
          { id: "processing", label: "Processing" },
          { id: "packed", label: "Packed" },
          { id: "shipped", label: "Shipped" },
          { id: "delivered", label: "Delivered" },
          { id: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === tab.id}
            className={`order-filter-tab ${activeFilter === tab.id ? "active" : ""}`}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="orders-empty-state" style={{ padding: "40px 20px" }}>
            <p className="orders-empty-desc">
              No orders found under "{activeFilter}".
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const currentStatus = order.orderStatus || order.status || "Confirmed";
            const statusLower = currentStatus.toLowerCase();
            const displayOrderId =
              order.orderId ||
              order.order_number ||
              (order.id ? `MOX-${String(order.id).padStart(4, "0")}` : "MOX-0001");
            const orderTotal = Number(
              order.grandTotal || order.total || order.totalAmount || 0
            );

            const isCancellable = [
              "placed",
              "confirmed",
              "processing",
              "packed",
            ].includes(statusLower);

            const isReturnable = statusLower === "delivered";

            const firstProd =
              Array.isArray(order.products) && order.products.length > 0
                ? order.products[0]
                : order.items && order.items.length > 0
                ? order.items[0]
                : null;

            const prodName =
              firstProd?.productName || firstProd?.name || order.name || "Moxie Item";
            const prodImg =
              firstProd?.image || order.image || (order.products && order.products[0]?.image);
            const prodQty =
              firstProd?.quantity ||
              order.quantity ||
              (order.products ? order.products.reduce((s, p) => s + (p.quantity || 1), 0) : 1);
            const prodPrice =
              firstProd?.price || order.price || orderTotal;

            return (
              <article
                key={order.id || displayOrderId}
                className="order-item-card"
                aria-label={`Order #${displayOrderId}`}
              >
                {/* Order Header */}
                <div className="order-card-header">
                  <div className="order-id-block">
                    <span className="order-id-title">
                      Order #{displayOrderId}
                    </span>
                    <span className="order-date-text">
                      Placed on {order.orderDate || order.date || "Recent"}
                    </span>
                  </div>

                  <div className="order-status-block">
                    <span
                      className={`order-status-badge ${getStatusBadgeClass(
                        currentStatus
                      )}`}
                    >
                      {currentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Product Info Row */}
                <div className="order-card-body">
                  <div className="order-product-left">
                    <div className="order-img-wrap">
                      {prodImg ? (
                        <img
                          src={prodImg}
                          alt={prodName}
                          className="order-body-img"
                          loading="lazy"
                        />
                      ) : (
                        <LuShoppingBag size={24} color="#94a3b8" />
                      )}
                    </div>

                    <div className="order-body-info">
                      <h3 className="order-product-name">{prodName}</h3>

                      {order.variant && (
                        <p className="order-product-variant">{order.variant}</p>
                      )}

                      <div className="order-product-meta-row">
                        <span className="order-meta-qty">Qty: {prodQty}</span>
                        <span className="order-meta-dot">•</span>
                        <span className="order-meta-price">
                          ₹{Number(prodPrice).toLocaleString("en-IN")}
                        </span>
                        <span className="order-meta-dot">•</span>
                        <span className="order-meta-payment">
                          Payment: {getPaymentBadgeText(order)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="order-total-block">
                    <span className="order-total-label">Order Total</span>
                    <span className="order-total-amount">
                      ₹{orderTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="order-card-actions">
                  <div className="order-actions-left">
                    <button
                      type="button"
                      className="order-action-btn order-btn-secondary"
                      onClick={() => onViewDetails && onViewDetails(order)}
                    >
                      <LuFileText className="order-btn-icon" aria-hidden="true" />
                      <span>View Details</span>
                    </button>

                    {/* Track Order navigates to /track-order?order=MOX-XXXX */}
                    {enableTracking && statusLower !== "cancelled" && (
                      <button
                        type="button"
                        className="order-action-btn order-btn-track"
                        onClick={() =>
                          navigate(`/track-order?order=${encodeURIComponent(displayOrderId)}`)
                        }
                      >
                        <LuTruck className="order-btn-icon" aria-hidden="true" />
                        <span>Track Order</span>
                      </button>
                    )}

                    {/* Cancellation */}
                    {allowCancellation && isCancellable && (
                      <button
                        type="button"
                        className="order-action-btn order-btn-cancel"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to cancel Order #${displayOrderId}?`
                            )
                          ) {
                            onCancelOrder && onCancelOrder(order.id || displayOrderId);
                          }
                        }}
                      >
                        <LuCircleX className="order-btn-icon" aria-hidden="true" />
                        <span>Cancel Order</span>
                      </button>
                    )}

                    {isReturnable && (
                      <button
                        type="button"
                        className="order-action-btn order-btn-secondary"
                        onClick={() => handleReturnExchange(order)}
                      >
                        <LuRefreshCcw className="order-btn-icon" aria-hidden="true" />
                        <span>Return / Exchange</span>
                      </button>
                    )}

                    {/* Write a Review for delivered items */}
                    {statusLower === "delivered" &&
                      (() => {
                        const prodId = order.productId || order.product_id || order.id;
                        const isReviewed =
                          reviewedOrders[`reviewed_order_${order.id}_prod_${prodId}`];

                        return (
                          <button
                            type="button"
                            className="order-action-btn order-btn-secondary"
                            onClick={() => {
                              if (!isReviewed) setReviewModalOrder(order);
                            }}
                            disabled={isReviewed}
                            style={
                              isReviewed
                                ? { opacity: 0.6, cursor: "default" }
                                : { color: "#d97706" }
                            }
                            title={
                              isReviewed
                                ? "You have already reviewed this purchase"
                                : "Write a review for this delivered item"
                            }
                          >
                            <FaStar
                              className="order-btn-icon"
                              style={{ color: "#f59e0b" }}
                              aria-hidden="true"
                            />
                            <span>
                              {isReviewed ? "Reviewed ✓" : "Write a Review"}
                            </span>
                          </button>
                        );
                      })()}
                  </div>

                  <div className="order-actions-right">
                    <button
                      type="button"
                      className="order-action-btn order-btn-reorder"
                      onClick={() => handleReorder(order)}
                    >
                      <LuRotateCcw className="order-btn-icon" aria-hidden="true" />
                      <span>Reorder</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Bottom Moxie Family Banner */}
      <div className="moxie-family-banner">
        <div>
          <span className="family-banner-sub">Thanks for being part of</span>
          <h3 className="family-banner-title">The MOXIE Family</h3>
          <p className="family-banner-tag">Style today. A better tomorrow.</p>
        </div>
      </div>

      {/* Write Review Modal */}
      {reviewModalOrder && (
        <WriteReviewModal
          order={reviewModalOrder}
          user={user}
          onClose={() => setReviewModalOrder(null)}
          onSuccess={() => {
            const prodId =
              reviewModalOrder.productId ||
              reviewModalOrder.product_id ||
              reviewModalOrder.id;
            setReviewedOrders((prev) => ({
              ...prev,
              [`reviewed_order_${reviewModalOrder.id}_prod_${prodId}`]: true,
            }));
          }}
        />
      )}
    </div>
  );
}
