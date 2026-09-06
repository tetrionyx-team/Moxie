import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LuFileText,
  LuTruck,
  LuRotateCcw,
  LuRefreshCcw,
  LuCircleX,
  LuShoppingBag,
} from "react-icons/lu";

export default function MyOrders({ orders, onViewDetails, onTrackOrder, onCancelOrder }) {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "placed": return "status-placed";
      case "confirmed": return "status-confirmed";
      case "packed": return "status-packed";
      case "shipped": return "status-shipped";
      case "out for delivery": return "status-out-for-delivery";
      case "delivered": return "status-delivered";
      case "cancelled": return "status-cancelled";
      default: return "";
    }
  };

  const handleReorder = (order) => {
    alert(`Reordered "${order.name}". Item details have been updated in your cart.`);
  };

  const handleReturnExchange = (order) => {
    alert(`Return request submitted for Order #${order.id}. Our logistics partner will contact you shortly.`);
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="my-orders-section">
        <div className="profile-header-wrap">
          <h2 className="profile-page-title">My Orders</h2>
          <p className="profile-page-subtitle">View and manage your recent purchases.</p>
        </div>

        <div className="orders-empty-state">
          <div className="orders-empty-icon-wrap" aria-hidden="true">
            <LuShoppingBag className="orders-empty-icon" />
          </div>
          <h3 className="orders-empty-title">No orders yet</h3>
          <p className="orders-empty-desc">You haven't placed any orders yet.</p>
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
          <h2 className="profile-page-title">My Orders</h2>
          <p className="profile-page-subtitle">View and manage your recent purchases.</p>
        </div>
        <span className="orders-count-pill">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </span>
      </div>

      <div className="orders-list">
        {orders.map((order) => {
          const statusLower = order.status?.toLowerCase() || "";
          const isCancellable = ["placed", "confirmed", "packed"].includes(statusLower);
          const isReturnable = statusLower === "delivered";

          return (
            <article key={order.id} className="order-item-card" aria-label={`Order #${order.id}`}>
              {/* Order Header */}
              <div className="order-card-header">
                <div className="order-id-block">
                  <span className="order-id-title">Order #{order.id}</span>
                  <span className="order-date-text">Placed on: {order.date}</span>
                </div>
                <div className="order-status-block">
                  <span className={`order-status-badge ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Product Info Row */}
              <div className="order-card-body">
                <div className="order-product-left">
                  <div className="order-img-wrap">
                    <img
                      src={order.image}
                      alt={order.name || "Product"}
                      className="order-body-img"
                      loading="lazy"
                    />
                  </div>
                  <div className="order-body-info">
                    <h3 className="order-product-name">{order.name}</h3>
                    {order.variant && (
                      <p className="order-product-variant">{order.variant}</p>
                    )}
                    <div className="order-product-meta-row">
                      <span className="order-meta-qty">Qty: {order.quantity}</span>
                      <span className="order-meta-dot">•</span>
                      <span className="order-meta-price">
                        Price: ₹{order.price ? order.price.toLocaleString("en-IN") : 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="order-total-block">
                  <span className="order-total-label">Order Total</span>
                  <span className="order-total-amount">
                    ₹{order.total ? order.total.toLocaleString("en-IN") : 0}
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
                    <LuFileText className="order-btn-icon" aria-hidden="true" />
                    <span>View Details</span>
                  </button>

                  {statusLower !== "cancelled" && (
                    <button
                      type="button"
                      className="order-action-btn order-btn-secondary"
                      onClick={() => onTrackOrder(order)}
                    >
                      <LuTruck className="order-btn-icon" aria-hidden="true" />
                      <span>Track Order</span>
                    </button>
                  )}

                  {isCancellable && (
                    <button
                      type="button"
                      className="order-action-btn order-btn-cancel"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to cancel Order #${order.id}?`)) {
                          onCancelOrder(order.id);
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
                </div>

                <div className="order-actions-right">
                  <button
                    type="button"
                    className="order-action-btn order-btn-primary"
                    onClick={() => handleReorder(order)}
                  >
                    <LuRotateCcw className="order-btn-icon" aria-hidden="true" />
                    <span>Reorder</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
