import React from "react";
import watchImg from "../../assets/images/watch1.png";

export default function OrderDetails({ order, onBack }) {
  if (!order) return null;

  const displayOrderId = order.orderId || order.order_number || (order.id ? `MOX-${String(order.id).padStart(4, '0')}` : "MOX-0001");
  const trackingId = order.trackingId || order.tracking_id || `MOXTRK${String(order.id || '0001').padStart(4, '0')}`;
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
          image: order.image || watchImg,
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
            return (
              <div key={idx} className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-light">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={item.image || watchImg}
                    alt={item.productName || item.name || "Product"}
                    style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "6px" }}
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
                <div className="text-end">
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>
                    ₹{itemPrice.toLocaleString("en-IN")} × {itemQty}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#2c3e50" }}>
                    ₹{(itemPrice * itemQty).toLocaleString("en-IN")}
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
              <div><strong>Tracking ID:</strong> <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#c9a35c" }}>{trackingId}</span></div>
              <div><strong>Status:</strong> <span className="text-capitalize" style={{ fontWeight: "700" }}>{currentStatus}</span></div>
              <div><strong>Delivery Partner:</strong> {order.deliveryPartner || "Moxie Logistics"}</div>
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
    </div>
  );
}
