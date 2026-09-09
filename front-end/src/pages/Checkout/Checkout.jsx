import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { orderService } from "../../services/orderService";
import { apiFetch } from "../../api/apiConfig";
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
  const { cart = [], clearCart } = useContext(CartContext) || {};
  const { user } = useContext(AuthContext) || {};
  const location = useLocation();
  const checkoutItem = location.state?.checkoutItem;

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [placed, setPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Use the direct checkoutItem if present, otherwise fallback to the cart list
  const checkoutList = checkoutItem ? [checkoutItem] : cart;

  const subtotal = checkoutList.reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0
  );
  const mrp = checkoutList.reduce(
    (s, i) => s + (Number(i.oldPrice) || Number(i.price) || 0) * (Number(i.quantity) || 1),
    0
  );
  const discount = Math.max(0, mrp - subtotal);

  // Delivery fee: ₹100 for COD, FREE for Online Payment
  const delivery = paymentMethod === "cod" ? 100 : 0;
  const grandTotal = subtotal + delivery;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const nextErrors = {};

    const shippingName = (formData.get("name") || "").trim();
    const shippingPhone = (formData.get("phone") || "").trim();
    const shippingEmail = (formData.get("email") || user?.email || "").trim();
    const shippingAddress = (formData.get("address") || "").trim();
    const shippingCity = (formData.get("city") || "").trim();
    const shippingDistrict = (formData.get("district") || "").trim();
    const shippingPincode = (formData.get("pincode") || "").trim();

    if (!shippingName) nextErrors.name = "Full name is required";
    if (!shippingPhone) {
      nextErrors.phone = "Phone number is required";
    } else if (shippingPhone.replace(/\D/g, "").length !== 10) {
      nextErrors.phone = "Enter a valid 10-digit phone number";
    }

    if (!shippingAddress) nextErrors.address = "Street address is required";
    if (!shippingCity) nextErrors.city = "City is required";
    if (!shippingDistrict) nextErrors.district = "District is required";
    if (!shippingPincode) {
      nextErrors.pincode = "PIN code is required";
    } else if (shippingPincode.replace(/\D/g, "").length !== 6) {
      nextErrors.pincode = "Enter a valid 6-digit PIN code";
    }

    setErrors(nextErrors);
    setPaymentError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const shippingPayload = {
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_district: shippingDistrict,
      shipping_pincode: shippingPincode,
      customer_email: shippingEmail || user?.email || "shopper@moxie.com",
      customer_name: shippingName,
    };

    const orderItems = checkoutList.map((item) => ({
      product_id: item.id,
      quantity: Number(item.quantity) || 1,
      variant_id: item.variant_id || item.variantId || null,
      color_name: item.selectedColor || item.color || null,
      size: item.selectedSize || item.size || null,
    }));

    const productsData = checkoutList.map((item) => ({
      productId: item.id || 1,
      productName: item.name || "Moxie Product",
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      size: item.selectedSize || item.size || "Regular",
      color: item.selectedColor || item.color || "Standard",
      image: item.image || getFallbackImage(item.category, item.name),
    }));

    const effectiveEmail = shippingEmail || user?.email || "shopper@moxie.com";

    // Cash on Delivery flow
    if (paymentMethod === "cod") {
      setLoading(true);
      try {
        const codRes = await apiFetch("/orders/cod/", {
          method: "POST",
          body: JSON.stringify({
            ...shippingPayload,
            items: orderItems,
          }),
        });

        if (!codRes.ok) {
          const errData = await codRes.json().catch(() => ({}));
          let errMsg = errData.error || errData.detail;
          if (!errMsg && typeof errData === "object" && Object.keys(errData).length > 0) {
            const firstKey = Object.keys(errData)[0];
            const firstVal = errData[firstKey];
            errMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
          }
          throw new Error(errMsg || "Failed to place COD order.");
        }

        const codData = await codRes.json().catch(() => ({}));
        const newPlacedId = codData.order_number || codData.order_id || null;
        setPlacedOrderId(newPlacedId);

        // Always save to shared order master dataset
        const firstItem = checkoutList[0] || {};
        await orderService.placeOrder(effectiveEmail, {
          orderId: newPlacedId,
          customerName: shippingName,
          mobile: shippingPhone,
          email: effectiveEmail,
          address: shippingAddress,
          city: shippingCity,
          district: shippingDistrict,
          pinCode: shippingPincode,
          products: productsData,
          name:
            checkoutList.length > 1
              ? `${firstItem.name} + ${checkoutList.length - 1} more items`
              : firstItem.name,
          image: firstItem.image,
          subtotal: subtotal,
          discount: discount,
          deliveryCharge: delivery,
          grandTotal: grandTotal,
          paymentStatus: "Pending",
          paymentMethod: "COD",
          shippingAddress: {
            name: shippingPayload.shipping_name,
            phone: shippingPayload.shipping_phone,
            flat: shippingPayload.shipping_address,
            address: shippingPayload.shipping_address,
            city: shippingPayload.shipping_city,
            district: shippingDistrict,
            pincode: shippingPayload.shipping_pincode,
          },
        });

        if (!checkoutItem && clearCart) {
          clearCart();
        }
        setPlaced(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        setPaymentError(err.message || "Failed to place COD order.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Razorpay Online Payment Flow
    setLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentError("Payment service is temporarily unavailable. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const createOrderRes = await apiFetch("/payment/order/create/", {
        method: "POST",
        body: JSON.stringify({
          ...shippingPayload,
          payment_method: "razorpay",
          items: orderItems,
        }),
      });

      if (!createOrderRes.ok) {
        const errData = await createOrderRes.json().catch(() => ({}));
        let errMsg = errData.error || errData.detail;
        if (!errMsg && typeof errData === "object" && Object.keys(errData).length > 0) {
          const firstKey = Object.keys(errData)[0];
          const firstVal = errData[firstKey];
          errMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        }
        throw new Error(errMsg || "Failed to create payment order.");
      }

      const orderInfo = await createOrderRes.json();

      const options = {
        key: orderInfo.razorpay_key_id,
        amount: orderInfo.amount,
        currency: orderInfo.currency || "INR",
        name: "Moxie",
        description: "Purchase of products from Moxie",
        order_id: orderInfo.razorpay_order_id,
        handler: async (response) => {
          setLoading(true);
          try {
            const verifyRes = await apiFetch("/payment/verify/", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const errVal = await verifyRes.json().catch(() => ({}));
              throw new Error(errVal.error || "Payment verification failed.");
            }

            const verifyData = await verifyRes.json().catch(() => ({}));
            const newPlacedId = verifyData.order_number || verifyData.order_id || null;
            setPlacedOrderId(newPlacedId);

            const firstItem = checkoutList[0] || {};
            await orderService.placeOrder(effectiveEmail, {
              orderId: newPlacedId,
              customerName: shippingName,
              mobile: shippingPhone,
              email: effectiveEmail,
              address: shippingAddress,
              city: shippingCity,
              district: shippingDistrict,
              pinCode: shippingPincode,
              products: productsData,
              name:
                checkoutList.length > 1
                  ? `${firstItem.name} + ${checkoutList.length - 1} more items`
                  : firstItem.name,
              image: firstItem.image,
              subtotal: subtotal,
              discount: discount,
              shippingCharge: delivery,
              grandTotal: grandTotal,
              paymentStatus: "Success",
              paymentMethod: "UPI",
              shippingAddress: {
                name: shippingPayload.shipping_name,
                phone: shippingPayload.shipping_phone,
                flat: shippingPayload.shipping_address,
                address: shippingPayload.shipping_address,
                city: shippingPayload.shipping_city,
                district: shippingDistrict,
                pincode: shippingPayload.shipping_pincode,
              },
            });

            if (!checkoutItem && clearCart) {
              clearCart();
            }
            setPlaced(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (err) {
            setPaymentError(err.message || "Something went wrong during payment verification.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: shippingPayload.shipping_name,
          contact: shippingPayload.shipping_phone,
          email: shippingPayload.customer_email,
        },
        theme: {
          color: "#c9a35c",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setPaymentError("Payment window was closed. You can retry anytime.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (failResp) => {
        setLoading(false);
        setPaymentError(
          failResp?.error?.description || "Payment failed. Please try a different payment method."
        );
      });
      rzp.open();
    } catch (err) {
      setPaymentError(err.message || "An error occurred while initiating payment.");
      setLoading(false);
    }
  };

  // Order Confirmed State
  if (placed) {
    return (
      <main className="checkout-page-wrapper">
        <div className="checkout-page-container">
          <div className="order-success-card">
            <div className="success-icon-badge">✓</div>
            <span className="success-eyebrow">Order Confirmed</span>
            <h1 className="success-title">Thank you for your purchase!</h1>
            <p className="success-subtitle">
              Your order has been placed successfully and payment verified. We'll send shipping updates to your email.
            </p>
            {placedOrderId && (
              <div className="success-order-pill">
                Order ID: <strong>{placedOrderId}</strong>
              </div>
            )}
            <div className="success-actions-row">
              <Link to="/products" className="success-btn primary">
                CONTINUE SHOPPING
              </Link>
              <Link to="/orders" className="success-btn secondary">
                VIEW MY ORDERS
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Empty checkout state
  if (!checkoutList.length) {
    return (
      <main className="checkout-page-wrapper">
        <div className="checkout-page-container">
          <div className="checkout-empty-card">
            <div className="empty-cart-icon-circle">🛒</div>
            <h2 className="empty-cart-heading">Your cart is empty</h2>
            <p className="empty-cart-text">Please add items to your cart before proceeding to checkout.</p>
            <Link to="/products" className="empty-cart-cta-btn">
              EXPLORE PRODUCTS
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page-wrapper">
      <div className="checkout-page-container">
        {/* Header Breadcrumb */}
        <div className="checkout-page-header">
          <span className="checkout-eyebrow">Secure Checkout</span>
          <h1 className="checkout-main-heading">Complete Your Order</h1>
        </div>

        {paymentError && (
          <div className="checkout-alert-error" role="alert">
            <span>⚠️ {paymentError}</span>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setPaymentError("")}
            >
              ✕
            </button>
          </div>
        )}

        <form className="checkout-layout-grid" onSubmit={handlePlaceOrder} noValidate>
          {/* Left Column: Delivery & Payment Details */}
          <div className="checkout-forms-column">
            {/* Delivery Information Section */}
            <section className="checkout-section-card">
              <div className="section-card-header">
                <span className="section-step-badge">1</span>
                <h2 className="section-title">Delivery Information</h2>
              </div>

              <div className="checkout-form-grid">
                <div className="form-field full-width">
                  <label htmlFor="input-name">Full Name *</label>
                  <input
                    id="input-name"
                    name="name"
                    type="text"
                    defaultValue={user?.name || ""}
                    placeholder="e.g. John Doe"
                    className={errors.name ? "input-error" : ""}
                  />
                  {errors.name && <span className="field-error-text">{errors.name}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="input-phone">Phone Number *</label>
                  <input
                    id="input-phone"
                    name="phone"
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className={errors.phone ? "input-error" : ""}
                  />
                  {errors.phone && <span className="field-error-text">{errors.phone}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="input-email">Email Address</label>
                  <input
                    id="input-email"
                    name="email"
                    type="email"
                    defaultValue={user?.email || ""}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="form-field full-width">
                  <label htmlFor="input-address">Street Address / Flat / Building *</label>
                  <input
                    id="input-address"
                    name="address"
                    type="text"
                    placeholder="House / Flat No., Road, Landmark"
                    className={errors.address ? "input-error" : ""}
                  />
                  {errors.address && <span className="field-error-text">{errors.address}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="input-city">City *</label>
                  <input
                    id="input-city"
                    name="city"
                    type="text"
                    placeholder="City / Town"
                    className={errors.city ? "input-error" : ""}
                  />
                  {errors.city && <span className="field-error-text">{errors.city}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="input-district">District *</label>
                  <input
                    id="input-district"
                    name="district"
                    type="text"
                    placeholder="District name"
                    className={errors.district ? "input-error" : ""}
                  />
                  {errors.district && <span className="field-error-text">{errors.district}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="input-pincode">PIN Code *</label>
                  <input
                    id="input-pincode"
                    name="pincode"
                    type="text"
                    maxLength={6}
                    placeholder="6-digit PIN"
                    className={errors.pincode ? "input-error" : ""}
                  />
                  {errors.pincode && <span className="field-error-text">{errors.pincode}</span>}
                </div>
              </div>
            </section>

            {/* Payment Method Section */}
            <section className="checkout-section-card">
              <div className="section-card-header">
                <span className="section-step-badge">2</span>
                <h2 className="section-title">Payment Method</h2>
              </div>

              <div className="payment-selection-group">
                {/* Razorpay Option */}
                <label
                  className={`payment-option-card ${paymentMethod === "razorpay" ? "selected" : ""}`}
                >
                  <div className="payment-radio-wrap">
                    <input
                      type="radio"
                      name="payment_method"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={() => setPaymentMethod("razorpay")}
                    />
                    <span className="payment-radio-custom" />
                  </div>
                  <div className="payment-option-info">
                    <div className="payment-option-title-row">
                      <span className="payment-title">Online Payment (Razorpay)</span>
                      <span className="payment-badge-free">FREE DELIVERY</span>
                    </div>
                    <span className="payment-desc">
                      UPI, Credit/Debit Cards, NetBanking, and Wallets
                    </span>
                  </div>
                </label>

                {/* Cash on Delivery Option */}
                <label className={`payment-option-card ${paymentMethod === "cod" ? "selected" : ""}`}>
                  <div className="payment-radio-wrap">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    <span className="payment-radio-custom" />
                  </div>
                  <div className="payment-option-info">
                    <div className="payment-option-title-row">
                      <span className="payment-title">Cash on Delivery (COD)</span>
                      <span className="payment-badge-fee">+₹100 Fee</span>
                    </div>
                    <span className="payment-desc">
                      Pay cash upon delivery at your doorstep
                    </span>
                  </div>
                </label>
              </div>

              <div className="payment-security-note">
                <span className="security-icon">🔒</span>
                <span>
                  {paymentMethod === "razorpay"
                    ? "256-bit SSL encrypted checkout. Test sandbox mode active."
                    : "Cash on delivery orders are verified before dispatch."}
                </span>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <aside className="checkout-summary-column">
            <div className="checkout-summary-card">
              <h2 className="summary-card-title">Order Summary</h2>

              {/* Items List */}
              <div className="checkout-items-list">
                {checkoutList.map((item) => {
                  const fallback = getFallbackImage(item.category, item.name);
                  const itemImgSrc =
                    item.image && !item.image.includes("ChatGPT_Image") ? item.image : fallback;
                  const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);

                  return (
                    <div key={`${item.id}-${item.selectedSize}`} className="checkout-item-row">
                      <div className="checkout-item-thumb">
                        <img
                          src={itemImgSrc}
                          alt={item.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = fallback;
                          }}
                        />
                      </div>
                      <div className="checkout-item-details">
                        <span className="checkout-item-name">{item.name}</span>
                        <span className="checkout-item-variant">
                          {[item.selectedColor, item.selectedSize ? `Size ${item.selectedSize}` : ""]
                            .filter(Boolean)
                            .join(" · ") || `Qty: ${item.quantity}`}
                          {item.selectedSize || item.selectedColor ? ` · Qty: ${item.quantity}` : ""}
                        </span>
                      </div>
                      <span className="checkout-item-price">
                        ₹{itemTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="checkout-price-breakdown">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{(mrp > subtotal ? mrp : subtotal).toLocaleString("en-IN")}</span>
                </div>

                {discount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount</span>
                    <span className="green">−₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>{paymentMethod === "cod" ? "COD Delivery Fee" : "Delivery"}</span>
                  <span className={paymentMethod === "cod" ? "" : "green"}>
                    {paymentMethod === "cod" ? "₹100" : "FREE"}
                  </span>
                </div>
              </div>

              <div className="summary-divider" />

              <div className="checkout-total-row">
                <span className="total-label">Grand Total</span>
                <span className="total-value">₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : paymentMethod === "razorpay"
                  ? `PAY ₹${grandTotal.toLocaleString("en-IN")}`
                  : "PLACE ORDER (COD)"}
              </button>

              <p className="checkout-terms-note">
                By placing this order you agree to Moxie's Terms of Service and Privacy Policy.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
