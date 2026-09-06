import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { orderService } from "../../services/orderService";
import { API_URL } from "../../config";
import "./Checkout.css";
import watchImg from "../../assets/images/watch1.png";
import shoeImg from "../../assets/images/shoe.svg";
import capImg from "../../assets/images/cap.png";
import budsImg from "../../assets/images/Buds.png";
import defaultImg from "../../assets/images/offer.png";

const getFallbackImage = (category, name) => {
  const str = (String(category || "") + " " + String(name || "")).toLowerCase();
  if (str.includes("watch")) return watchImg;
  if (str.includes("footwear") || str.includes("shoe") || str.includes("slider")) return shoeImg;
  if (str.includes("cap")) return capImg;
  if (str.includes("gadget") || str.includes("bud")) return budsImg;
  return defaultImg;
};

export default function Checkout() {
  const { cart, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const checkoutItem = location.state?.checkoutItem;
  
  const [payment, setPayment] = useState("razorpay");
  const [placed, setPlaced] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Use the direct checkoutItem if present, otherwise fallback to the cart list
  const checkoutList = checkoutItem ? [checkoutItem] : cart;

  const subtotal = checkoutList.reduce((s, i) => s + i.price * i.quantity, 0);
  const mrp = checkoutList.reduce((s, i) => s + (i.oldPrice || i.price) * i.quantity, 0);
  
  // Dynamic Delivery Fee: Rs. 100 for COD Promise Fee, FREE for Online Payment
  const delivery = payment === "cod" ? 100 : 0;
  const grandTotal = subtotal + delivery;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const place = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = {};

    const shippingData = {
      shipping_name: f.get("name"),
      shipping_phone: f.get("phone"),
      shipping_address: f.get("address"),
      shipping_city: f.get("city"),
      shipping_pincode: f.get("pincode"),
    };

    ["name", "phone", "address", "city", "pincode"].forEach((k) => {
      if (!String(f.get(k) || "").trim()) next[k] = "Required";
    });

    if (String(f.get("phone") || "").replace(/\D/g, "").length !== 10) {
      next.phone = "Enter a valid 10-digit number";
    }

    if (String(f.get("pincode") || "").replace(/\D/g, "").length !== 6) {
      next.pincode = "Enter a valid 6-digit PIN";
    }

    setErrors(next);
    setPaymentError("");

    if (!Object.keys(next).length) {
      if (payment === "cod") {
        if (user?.email) {
          const firstItem = checkoutList[0] || {};
          orderService.placeOrder(user.email, {
            name: checkoutList.length > 1 ? `${firstItem.name} + ${checkoutList.length - 1} more items` : firstItem.name,
            image: firstItem.image,
            variant: firstItem.selectedSize ? `Size: ${firstItem.selectedSize}` : "",
            quantity: checkoutList.reduce((acc, i) => acc + i.quantity, 0),
            price: firstItem.price || 0,
            subtotal: subtotal,
            discount: mrp - subtotal,
            shippingCharge: delivery,
            total: grandTotal,
            paymentStatus: "Pending (COD)",
            paymentMethod: "Cash on Delivery",
            shippingAddress: {
              name: shippingData.shipping_name,
              phone: shippingData.shipping_phone,
              flat: shippingData.shipping_address,
              city: shippingData.shipping_city,
              pincode: shippingData.shipping_pincode,
            }
          });
        }
        if (!checkoutItem) {
          clearCart();
        }
        setPlaced(true);
        window.scrollTo(0, 0);
        return;
      }

      // Razorpay checkout integration
      setLoading(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError("Razorpay SDK failed to load. Are you online?");
        setLoading(false);
        return;
      }

      try {
        const orderItems = checkoutList.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          variant_id: item.variant_id || item.variantId || null,
          color_name: item.selectedColor || item.color || null,
          size: item.selectedSize || item.size || null,
        }));

        const createOrderRes = await fetch(`${API_URL}/payment/order/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...shippingData,
            customer_email: user?.email,
            customer_name: user?.name,
            items: orderItems
          })
        });

        if (!createOrderRes.ok) {
          const errData = await createOrderRes.json().catch(() => ({}));
          let errMsg = errData.error || errData.detail;
          if (!errMsg && typeof errData === "object" && Object.keys(errData).length > 0) {
            const firstKey = Object.keys(errData)[0];
            const firstVal = errData[firstKey];
            errMsg = Array.isArray(firstVal) ? firstVal[0] : (typeof firstVal === "object" ? JSON.stringify(firstVal) : String(firstVal));
          }
          throw new Error(errMsg || "Failed to create order on server.");
        }

        const orderInfo = await createOrderRes.json();
        
        const options = {
          key: orderInfo.razorpay_key_id,
          amount: orderInfo.amount,
          currency: orderInfo.currency,
          name: "Moxie E-Commerce",
          description: "Purchase of products from Moxie",
          order_id: orderInfo.razorpay_order_id,
          handler: async (response) => {
            setLoading(true);
            try {
              const verifyRes = await fetch(`${API_URL}/payment/verify/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (!verifyRes.ok) {
                const errVal = await verifyRes.json().catch(() => ({}));
                throw new Error(errVal.error || "Payment verification failed.");
              }

              // Success! Clear cart and record in customer profile if logged in
              if (user?.email) {
                const firstItem = checkoutList[0] || {};
                orderService.placeOrder(user.email, {
                  name: checkoutList.length > 1 ? `${firstItem.name} + ${checkoutList.length - 1} more items` : firstItem.name,
                  image: firstItem.image,
                  variant: firstItem.selectedSize ? `Size: ${firstItem.selectedSize}` : (firstItem.selectedColor || ""),
                  quantity: checkoutList.reduce((acc, i) => acc + i.quantity, 0),
                  price: firstItem.price || 0,
                  subtotal: subtotal,
                  discount: mrp - subtotal,
                  shippingCharge: delivery,
                  total: grandTotal,
                  paymentStatus: "Paid",
                  paymentMethod: "Razorpay (Online)",
                  shippingAddress: {
                    name: shippingData.shipping_name,
                    phone: shippingData.shipping_phone,
                    flat: shippingData.shipping_address,
                    city: shippingData.shipping_city,
                    pincode: shippingData.shipping_pincode,
                  }
                });
              }

              if (!checkoutItem) {
                clearCart();
              }
              setPlaced(true);
              window.scrollTo(0, 0);
            } catch (err) {
              setPaymentError(err.message || "Something went wrong during payment verification.");
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: shippingData.shipping_name,
            contact: shippingData.shipping_phone
          },
          theme: {
            color: "#6657ec"
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              setPaymentError("Checkout window was closed by the user.");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        setPaymentError(err.message || "An error occurred while initiating payment.");
        setLoading(false);
      }
    }
  };

  if (placed) {
    return (
      <main className="order-success page-shell">
        <div className="success-check">✓</div>
        <span className="eyebrow">Order confirmed</span>
        <h1>Thank you for shopping with Moxie!</h1>
        <p>Your order has been placed successfully. Payment verified.</p>
        <Link className="primary-btn" to="/products">
          Continue shopping
        </Link>
      </main>
    );
  }

  if (!checkoutList.length) {
    return (
      <main className="empty-state">
        <div className="empty-icon">🛒</div>
        <h1>Your cart is empty</h1>
        <Link className="primary-btn" to="/products">
          Explore products
        </Link>
      </main>
    );
  }

  return (
    <main className="checkout-page page-shell">
      <span className="eyebrow">Secure checkout</span>
      <h1>Complete your order</h1>
      <form className="checkout-layout" onSubmit={place}>
        <div className="checkout-main">
          <section className="checkout-card">
            <h2>Delivery address</h2>
            <div className="form-grid">
              {[
                ["name", "Full name"],
                ["phone", "Phone number"],
                ["address", "Address"],
                ["city", "City"],
                ["pincode", "PIN code"],
              ].map(([id, label]) => (
                <label key={id} className={id === "address" ? "full" : ""}>
                  {label}
                  <input name={id} placeholder={label} />
                  {errors[id] && <small>{errors[id]}</small>}
                </label>
              ))}
            </div>
          </section>

          <section className="checkout-card">
            <h2>Payment method</h2>
            <div className="payment-options">
              {[
                ["razorpay", "Razorpay (UPI / Card / NetBanking)"],
                ["cod", "Cash on Delivery"],
              ].map(([id, title]) => (
                <label key={id} className={payment === id ? "selected" : ""}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === id}
                    onChange={() => setPayment(id)}
                  />
                  <b>{title}</b>
                </label>
              ))}
            </div>
            <p className="mock-note">
              {payment === "razorpay" 
                ? "Razorpay Test Mode is active. Do not make real payments." 
                : "Cash on Delivery mock checkout."}
            </p>
          </section>
        </div>

        <aside className="order-summary">
          <h2>Order summary</h2>
          {checkoutList.map((i) => {
            const fallback = getFallbackImage(i.category, i.name);
            const itemImgSrc = i.image && !i.image.includes("ChatGPT_Image") ? i.image : fallback;
            return (
              <div className="summary-item" key={i.id}>
                <img
                  src={itemImgSrc}
                  alt={i.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallback;
                  }}
                />
                <span>
                  {i.name}
                  <small>
                    {i.selectedColor}
                    {i.selectedSize ? ` · Size ${i.selectedSize}` : ""} · Qty: {i.quantity}
                  </small>
                </span>
                <b>₹{(i.price * i.quantity).toLocaleString("en-IN")}</b>
              </div>
            );
          })}
          <dl>
            <div>
              <dt>MRP</dt>
              <dd>₹{mrp.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>−₹{(mrp - subtotal).toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>{payment === "cod" ? "COD Promise Fee" : "Delivery"}</dt>
              <dd style={{ color: payment === "cod" ? "#111" : "#16a34a" }}>
                {payment === "cod" ? "₹100" : "FREE"}
              </dd>
            </div>
            <div className="summary-total">
              <dt>Total</dt>
              <dd>₹{grandTotal.toLocaleString("en-IN")}</dd>
            </div>
          </dl>
          <button className="primary-btn" disabled={loading}>
            {loading ? "Processing..." : payment === "razorpay" ? "Pay now" : "Place mock order"}
          </button>
          {paymentError && (
            <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "12px", textAlign: "center", fontWeight: "600" }}>
              {paymentError}
            </p>
          )}
        </aside>
      </form>
    </main>
  );
}
