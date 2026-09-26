import React, { useState } from "react";
import { FaStar } from "react-icons/fa";
import { LuCheck } from "react-icons/lu";
import WriteReviewModal from "../Review/WriteReviewModal";
import { getOrderImageUrl, getFallbackImage } from "../../utils/orderImage";

export default function OrderDetails({ order, onBack, user }) {
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewedItems, setReviewedItems] = useState({});

  if (!order) return null;

  const displayOrderId = order.orderId || order.order_number || (order.id ? `MOX-${String(order.id).padStart(4, '0')}` : "MOX-0001");
  const trackingId = order.trackingId || order.tracking_id || order.tracking_number || "";
  const products = Array.isArray(order.products) && order.products.length > 0
    ? order.products
    : Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [
        {
          productId: order.productId || 1,
          productName: order.name || "Moxie Item",
          price: order.price || order.total || 0,
          quantity: order.quantity || 1,
          size: order.variant || "Regular",
          color: "Standard",
          image: order.image,
        },
      ];

  const subtotal = Number(order.subtotal || order.pricing?.subtotal || order.price || order.total || 0);
  const discount = Number(order.discount || order.pricing?.discount || 0);
  const deliveryCharge = Number(order.deliveryCharge || order.shippingCharge || order.pricing?.shipping || 0);
  const tax = Number(order.tax || order.pricing?.tax || 0);
  const grandTotal = Number(order.grandTotal || order.total || order.pricing?.total || order.totalAmount || 0);

  const addressObj = order.shippingAddress || {};
  const customerName = order.customerName || addressObj.name || order.customer?.name || "Customer";
  const mobile = order.mobile || addressObj.phone || order.customer?.phone || "—";
  const addressText = order.address || addressObj.address || addressObj.flat || "—";
  const city = order.city || addressObj.city || "—";
  const district = order.district || addressObj.district || city;
  const pinCode = order.pinCode || order.pincode || addressObj.pincode || "—";
  const currentStatus = order.orderStatus || order.status || "Confirmed";
  const isDelivered = (currentStatus || "").toLowerCase() === "delivered" || (order.shippingStatus || "").toUpperCase() === "DELIVERED";

  return (
    <div>
      <div className="panel-header">
        <div className="d-flex align-items-center gap-3">
          <button className="secondary-btn btn-sm py-1 px-2" onClick={onBack}>
            ← Back
          </button>
          <h2 style={{ fontSize: "20px" }}>Order #{displayOrderId} Details</h2>
        </div>
      </div>

      {/* Product Information */}
      <div className="mb-4">
        <h4 className="mb-3" style={{ fontSize: "16px", fontWeight: "700", color: "#2c3e50" }}>
          Items Ordered ({products.length})
        </h4>
        <div className="d-flex flex-column gap-2">
          {products.map((item, idx) => {
            const itemPrice = Number(item.price || 0);
            const itemQty = Number(item.quantity || 1);
            const rawImg = item.image || item.product_image || item.variant_image || order.image;
            const fallback = getFallbackImage(item.productName || item.name, order.category);
            const itemImg = getOrderImageUrl(rawImg, item.productName || item.name, order.category);

            const isItemReviewed = Boolean(
              reviewedItems[item.id] ||
              item.review_status === "SUBMITTED" ||
              item.review
            );
            const canItemReview = isDelivered && (item.can_review || item.canReview || item.review_status === "OPEN") && !isItemReviewed;
            const isExpired = isDelivered && item.review_status === "EXPIRED" && !isItemReviewed;

            return (
              <div key={idx} className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light flex-wrap gap-2">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={itemImg || fallback}
                    alt={item.productName || item.name || "Product"}
                    style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "6px" }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallback;
                    }}
                  />
                  <div>
                    <h5 className="m-0" style={{ fontSize: "14px", fontWeight: "700" }}>
                      {item.productName || item.name || "Moxie Product"}
                    </h5>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      {item.size ? `Size: ${item.size}` : ""} {item.color ? `• Color: ${item.color}` : ""}
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  {canItemReview && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: "#fbf7ef",
                        border: "1px solid #f3e8cf",
                        color: "#9a7228",
                        fontWeight: "700",
                        fontSize: "12px",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                      onClick={() => setReviewModalItem({ item, order })}
                    >
                      <FaStar style={{ color: "#f59e0b" }} /> Write Review
                    </button>
                  )}

                  {isItemReviewed && (
                    <span
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        fontWeight: "700",
                        fontSize: "11.5px",
                        borderRadius: "8px",
                        padding: "4px 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <LuCheck /> Reviewed
                    </span>
                  )}

                  {isExpired && (
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        padding: "4px 8px"
                      }}
                    >
                      Review closed
                    </span>
                  )}

                  <div className="text-end">
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>
                      ₹{itemPrice.toLocaleString("en-IN")} × {itemQty}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#2c3e50" }}>
                      ₹{(itemPrice * itemQty).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Delivery Details */}
        <div className="col-md-6">
          <div className="p-3 border rounded-3 h-100">
            <h4 className="mb-3" style={{ fontSize: "15px", fontWeight: "700", color: "#2c3e50" }}>
              Delivery Information
            </h4>
            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#2c3e50" }}>
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>{customerName}</div>
              <div><strong>Address:</strong> {addressText}</div>
              <div><strong>City:</strong> {city}</div>
              <div><strong>District:</strong> {district}</div>
              <div><strong>PIN Code:</strong> {pinCode}</div>
              <div className="mt-2 text-muted"><strong>Mobile:</strong> {mobile}</div>
            </div>
          </div>
        </div>

        {/* Shipping Status & Tracking Info */}
        <div className="col-md-6">
          <div className="p-3 border rounded-3 h-100">
            <h4 className="mb-3" style={{ fontSize: "15px", fontWeight: "700", color: "#2c3e50" }}>
              Order & Shipment Info
            </h4>
            <div style={{ fontSize: "13px", lineHeight: "1.8", color: "#2c3e50" }}>
              <div><strong>Order ID:</strong> {displayOrderId}</div>
              <div><strong>Order Date:</strong> {order.orderDate || order.date}</div>
              <div className="d-flex align-items-center gap-2">
                <strong>Tracking ID:</strong>
                <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#c9a35c" }}>{trackingId}</span>
              </div>
              <div><strong>Status:</strong> <span className="text-capitalize" style={{ fontWeight: "700" }}>{currentStatus}</span></div>
              <div><strong>Courier:</strong> {order.courier || order.courier_name || order.deliveryPartner || "India Post"}</div>
              {order.trackingLocation && (
                <div><strong>Current Location:</strong> <span style={{ color: "#0284c7" }}>{order.trackingLocation}</span></div>
              )}
              {order.estimatedDelivery && (
                <div><strong>Est. Delivery:</strong> {order.estimatedDelivery}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Payment details */}
        <div className="col-md-6">
          <div className="p-3 border rounded-3 h-100">
            <h4 className="mb-3" style={{ fontSize: "15px", fontWeight: "700", color: "#2c3e50" }}>
              Payment Information
            </h4>
            <div style={{ fontSize: "13px", lineHeight: "1.8", color: "#2c3e50" }}>
              <div><strong>Payment Method:</strong> {order.paymentMethod || "UPI"}</div>
              <div><strong>Payment Status:</strong> {order.paymentStatus || "Success"}</div>
              <div><strong>Amount Paid:</strong> <span style={{ color: "#166534", fontWeight: "700" }}>₹{Number(order.amountPaid !== undefined ? order.amountPaid : (order.amount_paid !== undefined ? order.amount_paid : (order.paymentStatus === 'Paid' ? grandTotal : (order.codAdvancePaid || order.cod_advance_paid ? 100 : 0)))).toLocaleString("en-IN")}</span></div>
              <div><strong>Balance Due:</strong> <span style={{ color: Number(order.balanceDue !== undefined ? order.balanceDue : (order.balance_due !== undefined ? order.balance_due : (order.paymentStatus === 'Paid' ? 0 : grandTotal))) > 0 ? "#b91c1c" : "#166534", fontWeight: "700" }}>₹{Number(order.balanceDue !== undefined ? order.balanceDue : (order.balance_due !== undefined ? order.balance_due : (order.paymentStatus === 'Paid' ? 0 : Math.max(0, grandTotal - (order.amountPaid || order.amount_paid || 0))))).toLocaleString("en-IN")}</span></div>
              {(order.codAdvancePaid || order.cod_advance_paid || order.paymentMethod === 'COD') && (
                <div><strong>COD Advance:</strong> {order.codAdvancePaid || order.cod_advance_paid ? "Paid Online (₹100)" : "Pending"}</div>
              )}
              {order.transactionRef && (
                <div><strong>Transaction ID:</strong> {order.transactionRef}</div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing details */}
        <div className="col-md-6">
          <div className="p-3 border rounded-3 bg-light">
            <h4 className="mb-3" style={{ fontSize: "15px", fontWeight: "700", color: "#2c3e50" }}>
              Invoice Summary
            </h4>
            <div style={{ fontSize: "13px", lineHeight: "2" }}>
              <div className="d-flex justify-content-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between text-success">
                  <span>Discount</span>
                  <span>-₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="d-flex justify-content-between">
                <span>Delivery Charge</span>
                <span>{deliveryCharge > 0 ? `₹${deliveryCharge.toLocaleString("en-IN")}` : "FREE"}</span>
              </div>
              {tax > 0 && (
                <div className="d-flex justify-content-between">
                  <span>GST</span>
                  <span>₹{tax.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="d-flex justify-content-between border-top pt-2 mt-2" style={{ fontSize: "15px", fontWeight: "700", color: "#2c3e50" }}>
                <span>Grand Total</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {reviewModalItem && (
        <WriteReviewModal
          orderItem={reviewModalItem.item}
          order={reviewModalItem.order}
          user={user}
          onClose={() => setReviewModalItem(null)}
          onSuccess={() => {
            if (reviewModalItem.item?.id) {
              setReviewedItems((prev) => ({
                ...prev,
                [reviewModalItem.item.id]: true,
              }));
            }
          }}
        />
      )}
    </div>
  );
}
