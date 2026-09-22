import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuFileText,
  LuTruck,
  LuRotateCcw,
  LuRefreshCcw,
  LuCircleX,
  LuShoppingBag,
  LuClock,
  LuCheck,
  LuChevronRight,
  LuChevronDown,
  LuPackage,
} from "react-icons/lu";
import { FaStar } from "react-icons/fa";
import WriteReviewModal from "../Review/WriteReviewModal";
import { getOrderImageUrl, getFallbackImage } from "../../utils/orderImage";
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

  // Format dates cleanly like "22 Sept 2026" or "22 Sept"
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
      ];
      const month = months[d.getMonth()];
      return `${day} ${month}`;
    } catch {
      return dateStr;
    }
  };

  const getDisplayOrderId = (order) => {
    if (order.order_number) return order.order_number;
    if (order.orderId) return order.orderId;
    if (order.id) {
      const idStr = String(order.id);
      if (idStr.startsWith("MOX-") || idStr.startsWith("MOX")) {
        return idStr;
      }
      if (isNaN(Number(idStr))) {
        return `MOX-${idStr}`;
      }
      return `MOX-${idStr.padStart(4, "0")}`;
    }
    return "MOX-0001";
  };

  const getStatusBadgeConfig = (status) => {
    const s = (status || "").toLowerCase().trim();
    switch (s) {
      case "placed":
      case "confirmed":
        return {
          className: "status-confirmed",
          icon: <LuCheck size={12} className="status-pill-icon" />,
          label: "CONFIRMED",
        };
      case "processing":
      case "in progress":
        return {
          className: "status-processing",
          icon: <LuClock size={12} className="status-pill-icon" />,
          label: "PROCESSING",
        };
      case "packed":
        return {
          className: "status-packed",
          icon: <LuPackage size={12} className="status-pill-icon" />,
          label: "PACKED",
        };
      case "shipped":
      case "in transit":
        return {
          className: "status-shipped",
          icon: <LuTruck size={12} className="status-pill-icon" />,
          label: "SHIPPED",
        };
      case "out for delivery":
        return {
          className: "status-out-for-delivery",
          icon: <LuTruck size={12} className="status-pill-icon" />,
          label: "OUT FOR DELIVERY",
        };
      case "delivered":
      case "completed":
        return {
          className: "status-delivered",
          icon: <LuCheck size={12} className="status-pill-icon" />,
          label: "DELIVERED",
        };
      case "cancelled":
        return {
          className: "status-cancelled",
          icon: <LuCircleX size={12} className="status-pill-icon" />,
          label: "CANCELLED",
        };
      default:
        return {
          className: "status-confirmed",
          icon: <LuCheck size={12} className="status-pill-icon" />,
          label: (status || "CONFIRMED").toUpperCase(),
        };
    }
  };

  const getPaymentBadgeText = (order) => {
    const method = (order.paymentMethod || "UPI").toUpperCase();
    const status = (order.paymentStatus || "paid").toLowerCase();
    const isCod = method === "COD" || method.includes("CASH");

    if (isCod) {
      if (status === "paid" || status === "success") return "Cash on Delivery • Paid";
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
    if (status === "pending") return `${order.paymentMethod || "UPI"} • Pending`;
    return `${order.paymentMethod || "UPI"} • Paid`;
  };

  const handleReorder = (order) => {
    const name = order.name || order.productName || (order.products && order.products[0]?.productName) || "Moxie Item";
    alert(`Reordered "${name}". Item details have been added to your bag.`);
  };

  const handleReturnExchange = (order) => {
    const dispId = getDisplayOrderId(order);
    alert(`Return request submitted for Order #${dispId}. Our logistics partner will contact you shortly.`);
  };

  // Dynamic Summary Counts
  const summaryCounts = useMemo(() => {
    const total = orders.length;
    const processing = orders.filter((o) => {
      const s = (o.orderStatus || o.status || "").toLowerCase().trim();
      return ["processing", "in progress", "placed", "confirmed", "pending", "packed"].includes(s);
    }).length;
    const delivered = orders.filter((o) => {
      const s = (o.orderStatus || o.status || "").toLowerCase().trim();
      return s === "delivered" || s === "completed";
    }).length;
    const cancelled = orders.filter((o) => {
      const s = (o.orderStatus || o.status || "").toLowerCase().trim();
      return s === "cancelled";
    }).length;

    return { total, processing, delivered, cancelled };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    if (activeFilter === "all") return orders;

    return orders.filter((o) => {
      const s = (o.orderStatus || o.status || "").toLowerCase().trim();
      if (activeFilter === "processing") return s === "processing" || s === "in progress" || s === "placed" || s === "confirmed" || s === "pending";
      if (activeFilter === "packed") return s === "packed";
      if (activeFilter === "shipped") return s === "shipped" || s === "in transit" || s === "out for delivery";
      if (activeFilter === "delivered") return s === "delivered" || s === "completed";
      if (activeFilter === "cancelled") return s === "cancelled";
      return true;
    });
  }, [orders, activeFilter]);

  // If no orders at all
  if (!orders || orders.length === 0) {
    return (
      <div className="my-orders-section">
        {/* Top Header */}
        <div className="orders-top-header">
          <div className="orders-header-titles">
            <span className="orders-account-badge">MY ACCOUNT</span>
            <h1 className="orders-main-title">My Orders</h1>
            <p className="orders-main-subtitle">
              Track, manage and review all your Moxie purchases in one place.
            </p>
          </div>
          <div className="orders-header-style-tag" aria-hidden="true">
            <span className="script-slogan">Style Lives Here</span>
            <span className="script-gold-line" />
          </div>
        </div>

        {/* Empty State */}
        <div className="orders-empty-state">
          <div className="orders-empty-icon-wrap" aria-hidden="true">
            <LuShoppingBag className="orders-empty-icon" />
          </div>
          <h2 className="orders-empty-title">No orders yet</h2>
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
      {/* 1. MY ORDERS TOP HEADER */}
      <div className="orders-top-header">
        <div className="orders-header-titles">
          <span className="orders-account-badge">MY ACCOUNT</span>
          <h1 className="orders-main-title">My Orders</h1>
          <p className="orders-main-subtitle">
            Track, manage and review all your Moxie purchases in one place.
          </p>
        </div>

        <div className="orders-header-style-tag" aria-hidden="true">
          <span className="script-slogan">Style Lives Here</span>
          <span className="script-gold-line" />
        </div>
      </div>

      {/* 2. 4 DYNAMIC SUMMARY CARDS */}
      <div className="orders-summary-grid">
        {/* Total Orders */}
        <button
          type="button"
          className={`summary-stat-card card-total ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <div className="summary-card-left">
            <div className="summary-icon-circle icon-circle-gold">
              <LuShoppingBag size={20} />
            </div>
            <div className="summary-text-block">
              <span className="summary-count-val">{summaryCounts.total}</span>
              <span className="summary-label-text">Total Orders</span>
            </div>
          </div>
          <LuChevronRight className="summary-chevron-icon" />
        </button>

        {/* Processing */}
        <button
          type="button"
          className={`summary-stat-card card-processing ${activeFilter === "processing" ? "active" : ""}`}
          onClick={() => setActiveFilter("processing")}
        >
          <div className="summary-card-left">
            <div className="summary-icon-circle icon-circle-blue">
              <LuClock size={20} />
            </div>
            <div className="summary-text-block">
              <span className="summary-count-val">{summaryCounts.processing}</span>
              <span className="summary-label-text">Processing</span>
            </div>
          </div>
          <LuChevronRight className="summary-chevron-icon" />
        </button>

        {/* Delivered */}
        <button
          type="button"
          className={`summary-stat-card card-delivered ${activeFilter === "delivered" ? "active" : ""}`}
          onClick={() => setActiveFilter("delivered")}
        >
          <div className="summary-card-left">
            <div className="summary-icon-circle icon-circle-green">
              <LuTruck size={20} />
            </div>
            <div className="summary-text-block">
              <span className="summary-count-val">{summaryCounts.delivered}</span>
              <span className="summary-label-text">Delivered</span>
            </div>
          </div>
          <LuChevronRight className="summary-chevron-icon" />
        </button>

        {/* Cancelled */}
        <button
          type="button"
          className={`summary-stat-card card-cancelled ${activeFilter === "cancelled" ? "active" : ""}`}
          onClick={() => setActiveFilter("cancelled")}
        >
          <div className="summary-card-left">
            <div className="summary-icon-circle icon-circle-red">
              <LuCircleX size={20} />
            </div>
            <div className="summary-text-block">
              <span className="summary-count-val">{summaryCounts.cancelled}</span>
              <span className="summary-label-text">Cancelled</span>
            </div>
          </div>
          <LuChevronRight className="summary-chevron-icon" />
        </button>
      </div>

      {/* 3. STATUS FILTER TABS & COUNT DROPDOWN */}
      <div className="orders-filters-bar">
        <div className="orders-tabs-scroll" role="tablist">
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
              className={`orders-filter-tab-btn ${activeFilter === tab.id ? "active" : ""}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              <span>{tab.label}</span>
              {activeFilter === tab.id && <span className="tab-gold-indicator" />}
            </button>
          ))}
        </div>

        <div className="orders-count-dropdown-wrap">
          <span className="orders-count-pill-btn">
            {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
            <LuChevronDown className="count-dropdown-icon" />
          </span>
        </div>
      </div>

      {/* 4. ORDERS LIST */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="orders-empty-filter-state">
            <p className="empty-filter-msg">
              No orders found under "{activeFilter}".
            </p>
            <button
              type="button"
              className="btn-clear-filter"
              onClick={() => setActiveFilter("all")}
            >
              View All Orders
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const currentStatus = order.orderStatus || order.status || "Confirmed";
            const statusLower = currentStatus.toLowerCase().trim();
            const displayOrderId = getDisplayOrderId(order);
            const orderTotal = Number(
              order.grandTotal || order.total || order.totalAmount || 0
            );

            const isCancellable = [
              "placed",
              "confirmed",
              "processing",
              "in progress",
              "packed",
            ].includes(statusLower);

            const isReturnable = statusLower === "delivered" || statusLower === "completed";

            // Products list
            const allItems =
              Array.isArray(order.products) && order.products.length > 0
                ? order.products
                : Array.isArray(order.items) && order.items.length > 0
                ? order.items
                : [];

            const firstProd = allItems.length > 0 ? allItems[0] : null;
            const extraCount = allItems.length > 1 ? allItems.length - 1 : 0;

            const prodName =
              firstProd?.productName ||
              firstProd?.name ||
              order.name ||
              "Classic Chrono Watch";

            const prodSubtitle =
              order.variant ||
              firstProd?.variant ||
              firstProd?.subtitle ||
              (firstProd?.color && `Color: ${firstProd.color}${firstProd.size ? ` • Size: ${firstProd.size}` : ""}`) ||
              order.subtitle ||
              "Timeless design for modern living.";

            const rawProdImg =
              firstProd?.image ||
              firstProd?.product_image ||
              firstProd?.variant_image ||
              order.image ||
              order.product_image;

            const fallback = getFallbackImage(prodName, order.category || firstProd?.category);
            const prodImg = getOrderImageUrl(rawProdImg, prodName, order.category || firstProd?.category);

            const prodQty =
              firstProd?.quantity ||
              order.quantity ||
              (allItems.length > 0 ? allItems.reduce((s, p) => s + (p.quantity || 1), 0) : 1);

            const prodPrice =
              firstProd?.price || order.price || orderTotal;

            const badgeConfig = getStatusBadgeConfig(currentStatus);
            const rawTracking =
              order.tracking_number ||
              order.trackingNumber ||
              order.tracking_id ||
              order.trackingId ||
              order.awb ||
              "";
            const hasUsableTracking = Boolean(
              typeof rawTracking === "string" && rawTracking.trim() !== ""
            );

            // Estimated Delivery Date (if present)
            const estDelivery =
              order.expectedDelivery ||
              order.expected_delivery ||
              order.estimatedDelivery ||
              order.estimated_delivery ||
              (statusLower === "shipped" || statusLower === "confirmed" || statusLower === "processing"
                ? order.estimated_delivery_date
                : "");

            // Timeline Calculation: Order Placed -> Packed -> Shipped -> Out for Delivery -> Delivered
            const getTimelineProgress = () => {
              switch (statusLower) {
                case "placed":
                case "confirmed":
                case "pending":
                case "order placed":
                  return 1;
                case "processing":
                case "in progress":
                  return 1;
                case "packed":
                  return 2;
                case "shipped":
                case "in transit":
                case "intransit":
                  return 3;
                case "out for delivery":
                case "out_for_delivery":
                case "outfordelivery":
                  return 4;
                case "delivered":
                case "completed":
                  return 5;
                case "cancelled":
                  return 0;
                default:
                  return 1;
              }
            };

            const timelineStage = getTimelineProgress();
            const isCancelledOrder = statusLower === "cancelled";

            // Stage timestamps from statusHistory if available
            const getStageTime = (stageName) => {
              if (stageName === "placed") {
                return formatShortDate(order.orderDate || order.date || order.createdAt);
              }
              if (order.statusHistory && Array.isArray(order.statusHistory)) {
                const match = order.statusHistory.find((h) => {
                  const s = (h.status || "").toLowerCase();
                  if (stageName === "out_for_delivery") {
                    return s.includes("out") || s.includes("delivery");
                  }
                  return s.includes(stageName);
                });
                if (match && (match.timestamp || match.date)) {
                  return formatShortDate(match.timestamp || match.date);
                }
              }
              return "";
            };

            return (
              <article
                key={order.id || displayOrderId}
                className="premium-order-card"
                aria-label={`Order #${displayOrderId}`}
              >
                {/* A. TOP ORDER HEADER */}
                <div className="order-card-top-header">
                  <div className="order-header-left-meta">
                    <h3 className="order-id-display">
                      Order #{displayOrderId}
                    </h3>
                    <span className="order-placed-date">
                      Placed on {formatDate(order.orderDate || order.date || order.createdAt)}
                    </span>
                  </div>

                  <div className="order-header-right-meta">
                    <span className={`order-status-pill ${badgeConfig.className}`}>
                      {badgeConfig.icon}
                      <span>{badgeConfig.label}</span>
                    </span>

                    {estDelivery && !isCancelledOrder && (
                      <div className="order-est-delivery-block">
                        <LuTruck className="est-truck-icon" />
                        <div className="est-text-col">
                          <span className="est-label">Estimated Delivery</span>
                          <span className="est-date-val">{estDelivery}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* B. PRODUCT & ORDER CONTENT (3-COLUMN GRID) */}
                <div className="order-card-content-grid">
                  {/* Left Column: Product Info */}
                  <div className="order-product-col">
                    <div className="product-thumb-container">
                      <img
                        src={prodImg || fallback}
                        alt={prodName}
                        className="product-thumb-img"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallback;
                        }}
                      />
                      {extraCount > 0 && (
                        <span className="multi-item-badge">+{extraCount} more</span>
                      )}
                    </div>

                    <div className="product-details-col">
                      <h4 className="product-title-heading">{prodName}</h4>
                      {prodSubtitle && (
                        <p className="product-subtitle-tag">{prodSubtitle}</p>
                      )}

                      <div className="product-meta-strip">
                        <span className="meta-qty-text">Qty: {prodQty}</span>
                        <span className="meta-sep-dot">•</span>
                        <span className="meta-price-text">
                          ₹{Number(prodPrice).toLocaleString("en-IN")}
                        </span>
                        <span className="meta-sep-dot">•</span>
                        <span className="meta-payment-text">
                          Payment: {getPaymentBadgeText(order)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center Column: Status Timeline */}
                  <div className="order-timeline-col">
                    {isCancelledOrder ? (
                      <div className="cancelled-timeline-notice">
                        <LuCircleX className="cancelled-notice-icon" />
                        <span>This order was cancelled.</span>
                      </div>
                    ) : (
                      <div className="order-timeline-stepper">
                        {/* Connecting track line */}
                        <div className="timeline-track-bg">
                          <div
                            className="timeline-track-fill"
                            style={{
                              width:
                                timelineStage >= 5
                                  ? "100%"
                                  : timelineStage === 4
                                  ? "75%"
                                  : timelineStage === 3
                                  ? "50%"
                                  : timelineStage === 2
                                  ? "25%"
                                  : "0%",
                            }}
                          />
                        </div>

                        {/* 5 Stages */}
                        {[
                          { key: "placed", label: "Order Placed", step: 1 },
                          { key: "packed", label: "Packed", step: 2 },
                          { key: "shipped", label: "Shipped", step: 3 },
                          { key: "out_for_delivery", label: "Out for Delivery", step: 4 },
                          { key: "delivered", label: "Delivered", step: 5 },
                        ].map((stg) => {
                          const isDone = timelineStage >= stg.step;
                          const isCurrent = timelineStage === stg.step;
                          const stageTime = getStageTime(stg.key);

                          return (
                            <div
                              key={stg.key}
                              ref={(el) => {
                                if (el && (isCurrent || (timelineStage >= 5 && stg.step === 5))) {
                                  try {
                                    el.scrollIntoView({
                                      behavior: "smooth",
                                      inline: "center",
                                      block: "nearest",
                                    });
                                  } catch (_) {}
                                }
                              }}
                              className={`timeline-node ${
                                isDone ? "completed" : isCurrent ? "current" : "future"
                              }`}
                            >
                              <div className="node-circle-wrap">
                                {isDone ? (
                                  <LuCheck size={12} className="node-check-icon" />
                                ) : (
                                  <span className="node-dot" />
                                )}
                              </div>
                              <span className="node-label">{stg.label}</span>
                              {stageTime && (
                                <span className="node-date">{stageTime}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Order Total */}
                  <div className="order-total-col">
                    <span className="order-total-micro-label">ORDER TOTAL</span>
                    <span className="order-total-price-val">
                      ₹{orderTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* C. BOTTOM ACTION BUTTONS ROW */}
                <div className="order-card-actions-row">
                  <div className="actions-left-group">
                    {/* View Details */}
                    <button
                      type="button"
                      className="btn-order-action btn-action-secondary"
                      onClick={() => onViewDetails && onViewDetails(order)}
                    >
                      <LuFileText className="btn-action-icon" aria-hidden="true" />
                      <span>View Details</span>
                    </button>

                    {/* Track Order */}
                    {enableTracking && !isCancelledOrder && (
                      hasUsableTracking ? (
                        <button
                          type="button"
                          className="btn-order-action btn-action-track"
                          onClick={() =>
                            navigate(`/track-order?order=${encodeURIComponent(displayOrderId)}`)
                          }
                        >
                          <LuTruck className="btn-action-icon gold-accent" aria-hidden="true" />
                          <span>Track Order</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-order-action btn-action-track-pending"
                          disabled
                          title="Tracking information will be available once your shipment is dispatched."
                        >
                          <LuClock className="btn-action-icon" aria-hidden="true" />
                          <span>Tracking Pending</span>
                        </button>
                      )
                    )}

                    {/* Write Review (for delivered items) */}
                    {statusLower === "delivered" &&
                      (() => {
                        const prodId = order.productId || order.product_id || order.id;
                        const isReviewed =
                          reviewedOrders[`reviewed_order_${order.id}_prod_${prodId}`];

                        return (
                          <button
                            type="button"
                            className="btn-order-action btn-action-review"
                            onClick={() => {
                              if (!isReviewed) setReviewModalOrder(order);
                            }}
                            disabled={isReviewed}
                            title={
                              isReviewed
                                ? "You have already reviewed this purchase"
                                : "Write a review for this delivered item"
                            }
                          >
                            <FaStar
                              className="btn-action-icon star-gold"
                              aria-hidden="true"
                            />
                            <span>
                              {isReviewed ? "Reviewed ✓" : "Write Review"}
                            </span>
                          </button>
                        );
                      })()}

                    {/* Return / Exchange (for delivered items) */}
                    {isReturnable && (
                      <button
                        type="button"
                        className="btn-order-action btn-action-secondary"
                        onClick={() => handleReturnExchange(order)}
                      >
                        <LuRefreshCcw className="btn-action-icon" aria-hidden="true" />
                        <span>Return / Exchange</span>
                      </button>
                    )}
                  </div>

                  <div className="actions-right-group">
                    {/* Cancel Order */}
                    {allowCancellation && isCancellable && (
                      <button
                        type="button"
                        className="btn-order-action btn-action-cancel"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to cancel Order #${displayOrderId}?`
                            )
                          ) {
                            const rawId = order.id ? String(order.id) : displayOrderId;
                            onCancelOrder && onCancelOrder(rawId);
                          }
                        }}
                      >
                        <LuCircleX className="btn-action-icon" aria-hidden="true" />
                        <span>Cancel Order</span>
                      </button>
                    )}

                    {/* Reorder */}
                    <button
                      type="button"
                      className="btn-order-action btn-action-reorder"
                      onClick={() => handleReorder(order)}
                    >
                      <LuRotateCcw className="btn-action-icon" aria-hidden="true" />
                      <span>Reorder</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 5. WRITE REVIEW MODAL */}
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
