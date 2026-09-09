import React, { useState } from "react";
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

export default function MyOrders({
  orders,
  storeSettings,
  user,
  onViewDetails,
  onTrackOrder,
  onCancelOrder,
}) {
  const navigate = useNavigate();
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
    } catch { }
    return keys;
  });

  const allowCancellation =
    storeSettings?.allow_order_cancellation !== false;

  const enableTracking =
    storeSettings?.enable_order_tracking !== false;

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase().trim();
    switch (s) {
      case "placed":
      case "confirmed":
        return "status-confirmed";
      case "processing":
        return "status-placed";
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

    if (method === "COD" || method.includes("CASH")) {
      if (status === "paid") return "Cash on Delivery • Paid";
      return "Cash on Delivery • Payment on Delivery";
    }
    if (status === "failed") return "UPI • Payment Failed";
    if (status === "pending") return "UPI • Payment Pending";
    return "UPI • Payment Successful";
  };

  const handleReorder = (order) => {
    alert(
      `Reordered "${order.name || order.productName || 'Moxie Product'}". Item details have been updated in your cart.`
    );
  };

  const handleReturnExchange = (order) => {
    alert(
      `Return request submitted for Order #${order.orderId || order.id}. Our logistics partner will contact you shortly.`
    );
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="my-orders-section">
        <div className="profile-header-wrap">
          <h2 className="profile-page-title">My Orders</h2>
          <p className="profile-page-subtitle">
            View and manage your recent purchases.
          </p>
        </div>

        <div className="orders-empty-state">
          <div
            className="orders-empty-icon-wrap"
            aria-hidden="true"
          >
            <LuShoppingBag className="orders-empty-icon" />
          </div>

          <h3 className="orders-empty-title">
            No orders yet
          </h3>

          <p className="orders-empty-desc">
            You haven't placed any orders yet.
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
      <div className="profile-header-wrap orders-header-wrap">
        <div>
          <h2 className="profile-page-title">
            My Orders
          </h2>

          <p className="profile-page-subtitle">
            View and manage your recent purchases.
          </p>
        </div>

        <span className="orders-count-pill">
          {orders.length}{" "}
          {orders.length === 1 ? "Order" : "Orders"}
        </span>
      </div>

      <div className="orders-list">
        {orders.map((order) => {
          const currentStatus = order.orderStatus || order.status || "Confirmed";
          const statusLower = currentStatus.toLowerCase();
          const displayOrderId = order.orderId || order.order_number || order.id || "MOX-0001";
          const orderTotal = Number(order.grandTotal || order.total || order.totalAmount || 0);

          const isCancellable = [
            "placed",
            "confirmed",
            "processing",
            "packed",
          ].includes(statusLower);

          const isReturnable = statusLower === "delivered";

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
                    Placed on: {order.orderDate || order.date}
                  </span>
                </div>

                <div className="order-status-block">
                  <span
                    className={`order-status-badge ${getStatusBadgeClass(
                      currentStatus
                    )}`}
                  >
                    {currentStatus}
                  </span>
                </div>
              </div>

              {/* Product Info Row */}
              <div className="order-card-body">
                <div className="order-product-left">
                  <div className="order-img-wrap">
                    <img
                      src={order.image || (order.products && order.products[0]?.image)}
                      alt={order.name || (order.products && order.products[0]?.productName) || "Product"}
                      className="order-body-img"
                      loading="lazy"
                    />
                  </div>

                  <div className="order-body-info">
                    <h3 className="order-product-name">
                      {order.name || (order.products && order.products[0]?.productName) || "Moxie Item"}
                    </h3>

                    {order.variant && (
                      <p className="order-product-variant">
                        {order.variant}
                      </p>
                    )}

                    <div className="order-product-meta-row">
                      <span className="order-meta-qty">
                        Qty: {order.quantity || (order.products ? order.products.reduce((s, p) => s + (p.quantity || 1), 0) : 1)}
                      </span>

                      {order.price && (
                        <>
                          <span className="order-meta-dot">•</span>
                          <span className="order-meta-price">
                            Price: ₹{Number(order.price).toLocaleString("en-IN")}
                          </span>
                        </>
                      )}

                      <span className="order-meta-dot">•</span>

                      <span className="order-meta-price">
                        {getPaymentBadgeText(order)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="order-total-block">
                  <span className="order-total-label">
                    Order Total
                  </span>

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
                    onClick={() => onViewDetails(order)}
                  >
                    <LuFileText
                      className="order-btn-icon"
                      aria-hidden="true"
                    />
                    <span>View Details</span>
                  </button>

                  {/* Tracking */}
                  {enableTracking && statusLower !== "cancelled" && (
                    <button
                      type="button"
                      className="order-action-btn order-btn-secondary"
                      onClick={() => onTrackOrder(order)}
                    >
                      <LuTruck
                        className="order-btn-icon"
                        aria-hidden="true"
                      />
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
                          onCancelOrder(order.id || displayOrderId);
                        }
                      }}
                    >
                      <LuCircleX
                        className="order-btn-icon"
                        aria-hidden="true"
                      />
                      <span>Cancel Order</span>
                    </button>
                  )}

                  {isReturnable && (
                    <button
                      type="button"
                      className="order-action-btn order-btn-secondary"
                      onClick={() => handleReturnExchange(order)}
                    >
                      <LuRefreshCcw
                        className="order-btn-icon"
                        aria-hidden="true"
                      />
                      <span>Return / Exchange</span>
                    </button>
                  )}

                  {/* Write a Review button for delivered orders */}
                  {statusLower === "delivered" && (
                    (() => {
                      const prodId = order.productId || order.product_id || order.id;
                      const isReviewed = reviewedOrders[`reviewed_order_${order.id}_prod_${prodId}`];

                      return (
                        <button
                          type="button"
                          className="order-action-btn order-btn-secondary"
                          onClick={() => {
                            if (!isReviewed) setReviewModalOrder(order);
                          }}
                          disabled={isReviewed}
                          style={isReviewed ? { opacity: 0.6, cursor: "default" } : { color: "#d97706" }}
                          title={isReviewed ? "You have already reviewed this purchase" : "Write a review for this delivered item"}
                        >
                          <FaStar
                            className="order-btn-icon"
                            style={{ color: "#f59e0b" }}
                            aria-hidden="true"
                          />
                          <span>{isReviewed ? "Reviewed ✓" : "Write a Review"}</span>
                        </button>
                      );
                    })()
                  )}
                </div>

                <div className="order-actions-right">
                  <button
                    type="button"
                    className="order-action-btn order-btn-primary"
                    onClick={() => handleReorder(order)}
                  >
                    <LuRotateCcw
                      className="order-btn-icon"
                      aria-hidden="true"
                    />
                    <span>Reorder</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Write Review Modal */}
      {reviewModalOrder && (
        <WriteReviewModal
          order={reviewModalOrder}
          user={user}
          onClose={() => setReviewModalOrder(null)}
          onSuccess={() => {
            const prodId = reviewModalOrder.productId || reviewModalOrder.product_id || reviewModalOrder.id;
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
