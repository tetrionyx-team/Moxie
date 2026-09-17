import React, { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LuMapPin,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuCheck,
  LuX,
  LuCrown,
  LuShieldCheck,
  LuTruck,
  LuCreditCard,
  LuBanknote,
  LuBuilding,
  LuUser,
  LuSmartphone,
  LuHouse,
  LuBuilding2,
  LuMap,
  LuArrowRight,
  LuLock,
  LuPackage,
  LuHeadphones,
  LuHeart,
} from "react-icons/lu";

import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { addressService } from "../../services/addressService";
import { orderService } from "../../services/orderService";
import { apiFetch } from "../../api/apiConfig";
import "./Checkout.css";

import watchImg from "../../assets/images/watch1.png";
import shoeImg from "../../assets/images/shoe.svg";
import capImg from "../../assets/images/cap.png";
import budsImg from "../../assets/images/Buds.png";
import defaultImg from "../../assets/images/offer.png";

// Custom Road icon for Street / Area
const RoadIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19L8 5" />
    <path d="M20 19L16 5" />
    <line x1="12" y1="7" x2="12" y2="9" />
    <line x1="12" y1="13" x2="12" y2="15" />
  </svg>
);

// UPI Tri-color Icon
const UpiIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M14 6L8 26H13L15.5 17.5H21.5L19 26H24L30 6H14Z" fill="#E57E24" />
    <path d="M13 14H19.5L20.8 9.5H14.3L13 14Z" fill="#097937" />
    <path d="M6 14L2 26H7L8.5 21H12.5L14 14H6Z" fill="#4B6584" />
  </svg>
);

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
  const { openLogin } = useModal() || {};
  const location = useLocation();
  const checkoutItem = location.state?.checkoutItem;

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [modalErrors, setModalErrors] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Address Form state inside modal
  const [modalForm, setModalForm] = useState({
    name: "",
    phone: "",
    alternate_mobile_number: "",
    flat: "",
    area: "",
    landmark: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    type: "Home",
    isDefault: false,
  });

  // Payment method selection: "upi", "card", "netbanking", "cod"
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [placed, setPlaced] = useState(false);
  const [placedOrderData, setPlacedOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const states = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  // Fetch customer's saved addresses dynamically from Django backend
  const loadAddresses = useCallback(async () => {
    if (!user?.email) {
      setAddresses([]);
      setSelectedAddressId(null);
      setLoadingAddresses(false);
      return;
    }
    setLoadingAddresses(true);
    try {
      const list = await addressService.fetchAddresses(user.email);
      setAddresses(list);

      // Auto-select default address, or fallback to first address
      if (list.length > 0) {
        setSelectedAddressId((prev) => {
          if (prev && list.some((a) => a.id === prev)) return prev;
          const def = list.find((a) => a.isDefault || a.is_default);
          return def ? def.id : list[0].id;
        });
      } else {
        setSelectedAddressId(null);
      }
    } catch (err) {
      console.error("Failed to load customer addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Selected address object
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  // Cart totals & Backend Authoritative Summary
  const checkoutList = useMemo(() => {
    return checkoutItem ? [checkoutItem] : cart;
  }, [checkoutItem, cart]);
  const [backendSummary, setBackendSummary] = useState(null);

  const fetchCheckoutSummary = useCallback(async () => {
    if (!checkoutList || checkoutList.length === 0) return;
    try {
      const res = await apiFetch("/checkout/summary/", {
        method: "POST",
        body: JSON.stringify({
          payment_method: paymentMethod,
          items: checkoutList.map((item) => ({
            product_id: item.id,
            quantity: Number(item.quantity) || 1,
            variant_id: item.variant_id || item.variantId || null,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBackendSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch checkout summary:", err);
    }
  }, [checkoutList, paymentMethod]);

  useEffect(() => {
    fetchCheckoutSummary();
  }, [fetchCheckoutSummary]);

  const isCod = paymentMethod === "cod";
  const subtotal = backendSummary?.subtotal !== undefined
    ? backendSummary.subtotal
    : checkoutList.reduce((s, i) => s + (Number(i.oldPrice) || Number(i.mrp) || Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

  const discount = backendSummary?.discount !== undefined
    ? backendSummary.discount
    : Math.max(0, subtotal - checkoutList.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0));

  const shipping = backendSummary?.shipping !== undefined
    ? backendSummary.shipping
    : 0;

  const totalAmount = backendSummary?.total !== undefined
    ? backendSummary.total
    : (subtotal - discount + shipping);

  const codAdvance = backendSummary?.cod_advance !== undefined ? backendSummary.cod_advance : 100;
  const codBalance = backendSummary?.cod_balance !== undefined ? backendSummary.cod_balance : Math.max(0, totalAmount - codAdvance);
  const totalItemCount = checkoutList.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  // Address Modal Handlers
  const handleOpenAddModal = () => {
    if (!user) {
      if (openLogin) openLogin();
      return;
    }
    setEditingAddress(null);
    setModalForm({
      name: user?.name || "",
      phone: user?.mobile || "",
      alternate_mobile_number: "",
      flat: "",
      area: "",
      landmark: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      type: "Home",
      isDefault: addresses.length === 0,
    });
    setModalErrors({});
    setIsAddressModalOpen(true);
  };

  const handleOpenEditModal = (addr, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      if (openLogin) openLogin();
      return;
    }
    setEditingAddress(addr);
    setModalForm({
      name: addr.name || addr.full_name || "",
      phone: addr.phone || addr.mobile_number || "",
      alternate_mobile_number: addr.alternate_mobile_number || "",
      flat: addr.flat || addr.address_line_1 || "",
      area: addr.area || addr.address_line_2 || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      district: addr.district || addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      type: addr.type || addr.address_type || "Home",
      isDefault: Boolean(addr.isDefault || addr.is_default),
    });
    setModalErrors({});
    setIsAddressModalOpen(true);
  };

  const handleDeleteAddress = async (addrId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this delivery address?")) return;
    setDeletingAddressId(addrId);
    try {
      await addressService.deleteAddress(user?.email, addrId);
      await loadAddresses();
    } catch (err) {
      setPaymentError(err.message || "Failed to delete address.");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleModalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setModalForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (modalErrors[name]) {
      setModalErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateModalForm = () => {
    const errors = {};
    if (!modalForm.name.trim()) errors.name = "Full name is required.";
    if (!modalForm.phone.trim()) {
      errors.phone = "Mobile number is required.";
    } else if (modalForm.phone.replace(/\D/g, "").length !== 10) {
      errors.phone = "Enter a valid 10-digit mobile number.";
    }
    if (!modalForm.flat.trim()) errors.flat = "House / Flat / Address Line 1 is required.";
    if (!modalForm.city.trim()) errors.city = "City is required.";
    if (!modalForm.district.trim() && !modalForm.city.trim()) errors.district = "District is required.";
    if (!modalForm.state.trim()) errors.state = "State is required.";
    if (!modalForm.pincode.trim()) {
      errors.pincode = "PIN code is required.";
    } else if (modalForm.pincode.replace(/\D/g, "").length !== 6) {
      errors.pincode = "PIN code must be 6 digits.";
    }
    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveModalAddress = async (e) => {
    e.preventDefault();
    if (!validateModalForm() || modalSubmitting) return;

    setModalSubmitting(true);
    try {
      const payload = {
        name: modalForm.name.trim(),
        full_name: modalForm.name.trim(),
        phone: modalForm.phone.trim(),
        mobile_number: modalForm.phone.trim(),
        alternate_mobile_number: modalForm.alternate_mobile_number?.trim() || "",
        flat: modalForm.flat.trim(),
        address_line_1: modalForm.flat.trim(),
        area: modalForm.area.trim(),
        address_line_2: modalForm.area.trim(),
        landmark: modalForm.landmark.trim(),
        city: modalForm.city.trim(),
        district: modalForm.district.trim() || modalForm.city.trim(),
        state: modalForm.state.trim(),
        pincode: modalForm.pincode.trim(),
        type: modalForm.type || "Home",
        address_type: modalForm.type || "Home",
        isDefault: Boolean(modalForm.isDefault),
        is_default: Boolean(modalForm.isDefault),
      };

      let saved;
      if (editingAddress) {
        saved = await addressService.updateAddress(user?.email, editingAddress.id, payload);
      } else {
        saved = await addressService.addAddress(user?.email, payload);
      }

      await loadAddresses();
      if (saved?.id) {
        setSelectedAddressId(saved.id);
      }
      setIsAddressModalOpen(false);
    } catch (err) {
      setPaymentError(err.message || "Failed to save address.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
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

    // Must have a valid delivery address selected
    if (!selectedAddress) {
      setPaymentError("Please select or add a delivery address to continue.");
      return;
    }

    if (!user) {
      if (openLogin) openLogin();
      return;
    }

    setPaymentError("");

    // Build immutable shipping address snapshot
    const line1 = selectedAddress.flat || selectedAddress.address_line_1 || "";
    const line2 = selectedAddress.area || selectedAddress.address_line_2 || "";
    const landmark = selectedAddress.landmark || "";
    const city = selectedAddress.city || "";
    const district = selectedAddress.district || city;
    const state = selectedAddress.state || "";
    const pincode = selectedAddress.pincode || "";

    const combinedAddress = [line1, line2, landmark].filter(Boolean).join(", ") || city;

    const shippingPayload = {
      shipping_name: selectedAddress.name || selectedAddress.full_name || user?.name || "Customer",
      shipping_phone: selectedAddress.phone || selectedAddress.mobile_number || "",
      shipping_address: combinedAddress,
      shipping_address_line_1: line1 || combinedAddress,
      shipping_address_line_2: line2 || "",
      shipping_landmark: landmark || "",
      shipping_city: city,
      shipping_district: district,
      shipping_state: state,
      shipping_pincode: pincode,
      shipping_address_type: selectedAddress.type || selectedAddress.address_type || "Home",
      customer_email: user?.email || "shopper@moxie.com",
      customer_name: selectedAddress.name || selectedAddress.full_name || user?.name || "Customer",
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

    const effectiveEmail = user?.email || "shopper@moxie.com";

    // Unified Payment Flow (Razorpay for both online total and COD advance)
    setLoading(true);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentError("Payment gateway is temporarily unavailable. Please refresh and try again.");
      setLoading(false);
      return;
    }

    try {
      const createOrderRes = await apiFetch("/payment/order/create/", {
        method: "POST",
        body: JSON.stringify({
          ...shippingPayload,
          payment_method: paymentMethod,
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
        throw new Error(errMsg || "Failed to initiate payment.");
      }

      const orderInfo = await createOrderRes.json();

      const methodLabel =
        paymentMethod === "cod"
          ? "Cash on Delivery"
          : paymentMethod === "upi"
          ? "UPI"
          : paymentMethod === "card"
          ? "Card"
          : paymentMethod === "netbanking"
          ? "Net Banking"
          : "Online Payment";

      const options = {
        key: orderInfo.razorpay_key_id,
        amount: orderInfo.amount,
        currency: orderInfo.currency || "INR",
        name: "MOXIE",
        description: paymentMethod === "cod" ? "COD Advance Payment (₹100)" : "Purchase of premium lifestyle styles",
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

            const firstItem = checkoutList[0] || {};
            const placedRecord = {
              orderId: newPlacedId,
              customerName: shippingPayload.shipping_name,
              mobile: shippingPayload.shipping_phone,
              email: effectiveEmail,
              address: combinedAddress,
              city,
              district,
              state,
              pinCode: pincode,
              products: productsData,
              name:
                checkoutList.length > 1
                  ? `${firstItem.name} + ${checkoutList.length - 1} more items`
                  : firstItem.name,
              image: firstItem.image,
              subtotal,
              discount,
              shippingCharge: shipping,
              grandTotal: totalAmount,
              amountPaid: verifyData.amount_paid !== undefined ? verifyData.amount_paid : (paymentMethod === "cod" ? codAdvance : totalAmount),
              balanceDue: verifyData.balance_due !== undefined ? verifyData.balance_due : (paymentMethod === "cod" ? codBalance : 0),
              codAdvancePaid: paymentMethod === "cod",
              paymentStatus: verifyData.payment_status || (paymentMethod === "cod" ? "Partially Paid" : "Paid"),
              paymentMethod: methodLabel,
              shippingAddress: {
                name: shippingPayload.shipping_name,
                phone: shippingPayload.shipping_phone,
                flat: line1,
                address: combinedAddress,
                city,
                district,
                state,
                pincode,
                type: shippingPayload.shipping_address_type,
              },
            };

            await orderService.placeOrder(effectiveEmail, placedRecord);

            if (!checkoutItem && clearCart) {
              clearCart();
            }
            setPlacedOrderData(placedRecord);
            setPlaced(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (err) {
            setPaymentError(err.message || "Payment verification failed.");
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
          color: "#C99B45",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setPaymentError(
              paymentMethod === "cod"
                ? "COD advance payment was cancelled. An advance of ₹100 is required to confirm a Cash on Delivery order."
                : "Payment window was dismissed. You can retry anytime."
            );
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (failResp) => {
        setLoading(false);
        setPaymentError(
          failResp?.error?.description || "Payment failed. Please try again."
        );
      });
      rzp.open();
    } catch (err) {
      setPaymentError(err.message || "An error occurred while initiating payment.");
      setLoading(false);
    }
  };

  // Order Confirmed Screen
  if (placed) {
    const displayId = placedOrderData?.orderId || "MOX-ORDER";
    const snapAddr = placedOrderData?.shippingAddress || {};

    return (
      <main className="checkout-page-wrapper">
        <div className="checkout-page-container">
          <div className="order-success-card">
            <div className="success-icon-badge">✓</div>
            <span className="success-eyebrow">ORDER CONFIRMED</span>
            <h1 className="success-title">Thank you for your purchase!</h1>
            <p className="success-subtitle">
              Your order has been placed successfully. A delivery confirmation and tracking updates
              will be sent to your registered contact.
            </p>

            <div className="success-order-pill">
              Order ID: <strong>{displayId}</strong>
            </div>

            {/* Payment Summary Snapshot */}
            <div className="success-snapshot-card" style={{ marginBottom: "16px" }}>
              <div className="snapshot-title-row">
                <LuShieldCheck className="snapshot-icon" />
                <span>PAYMENT SUMMARY</span>
              </div>
              <div className="snapshot-content">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Payment Method:</span>
                  <strong>{placedOrderData?.paymentMethod}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Payment Status:</span>
                  <strong style={{ color: "#166534" }}>{placedOrderData?.paymentStatus}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Amount Paid:</span>
                  <strong style={{ color: "#166534" }}>₹{Number(placedOrderData?.amountPaid || 0).toLocaleString("en-IN")}</strong>
                </div>
                {Number(placedOrderData?.balanceDue || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                    <span>Payable on Delivery:</span>
                    <strong style={{ color: "#b91c1c" }}>₹{Number(placedOrderData?.balanceDue || 0).toLocaleString("en-IN")}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Snapshot Display */}
            {snapAddr.name && (
              <div className="success-snapshot-card">
                <div className="snapshot-title-row">
                  <LuTruck className="snapshot-icon" />
                  <span>SHIPPING ADDRESS SNAPSHOT</span>
                </div>
                <div className="snapshot-content">
                  <strong>{snapAddr.name}</strong>
                  <span>{snapAddr.phone}</span>
                  <span>{snapAddr.address || snapAddr.flat}</span>
                  <span>
                    {[snapAddr.city, snapAddr.district, snapAddr.state]
                      .filter(Boolean)
                      .join(", ")}
                    {snapAddr.pincode ? ` - ${snapAddr.pincode}` : ""}
                  </span>
                </div>
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

  // Empty cart state
  if (!checkoutList.length) {
    return (
      <main className="checkout-page-wrapper">
        <div className="checkout-page-container">
          <div className="checkout-empty-card">
            <div className="empty-cart-icon-circle">🛒</div>
            <h2 className="empty-cart-heading">Your cart is empty</h2>
            <p className="empty-cart-text">
              Please add your favorite Moxie styles before proceeding to checkout.
            </p>
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
        {/* Page Top Header */}
        <div className="checkout-header-banner">
          <div className="checkout-header-left">
            <span className="checkout-eyebrow">SECURE CHECKOUT</span>
            <h1 className="checkout-main-heading">Delivery &amp; Payment</h1>
            <p className="checkout-subheading">
              Choose your saved delivery address and preferred payment method.
            </p>
          </div>
          <div className="checkout-header-right-tag" aria-hidden="true">
            <span className="checkout-script-text">Good Outfits Brighter Days</span>
          </div>
        </div>

        {paymentError && (
          <div className="checkout-alert-error" role="alert">
            <span>⚠️ {paymentError}</span>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setPaymentError("")}
              aria-label="Close error message"
            >
              ✕
            </button>
          </div>
        )}

        <form className="checkout-layout-grid" onSubmit={handlePlaceOrder} noValidate>
          {/* Left Column: Delivery Address & Payment Selection */}
          <div className="checkout-forms-column">
            {/* STEP 1: DELIVERY ADDRESS CARD */}
            <section className="checkout-section-card" id="checkout-address-section">
              <div className="section-card-header">
                <div className="step-badge-title-group">
                  <div className="section-step-badge">1</div>
                  <div className="step-heading-wrap">
                    <h2 className="section-title">Delivery Address</h2>
                    <p className="section-subtitle">
                      Select the address where your order should be delivered.
                    </p>
                  </div>
                </div>
                {user && addresses.length > 0 && (
                  <button
                    type="button"
                    className="checkout-add-addr-btn"
                    onClick={handleOpenAddModal}
                  >
                    <LuPlus className="btn-icon" />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {loadingAddresses ? (
                <div className="checkout-address-loading">
                  <div className="checkout-addr-skeleton" />
                  <div className="checkout-addr-skeleton" />
                </div>
              ) : !user ? (
                /* LUXURY UNAUTHENTICATED ADDRESS STATE */
                <div className="checkout-no-address-box">
                  <div className="no-addr-illustration-wrap">
                    <div className="no-addr-icon-circle">
                      <LuUser className="no-addr-pin-icon" />
                    </div>
                    <span className="sparkle-accent sparkle-left">✦</span>
                    <span className="sparkle-accent sparkle-right">✦</span>
                  </div>
                  <h3 className="no-addr-title">Login to add delivery address</h3>
                  <p className="no-addr-desc">
                    Please log in to your MOXIE account to add a delivery address and proceed with your order.
                  </p>
                  <button
                    type="button"
                    className="checkout-gold-cta-btn"
                    onClick={() => openLogin && openLogin()}
                  >
                    <LuUser className="btn-icon" />
                    <span>Login to Continue</span>
                  </button>

                  {/* Empty State Guarantee Feature Pills */}
                  <div className="empty-state-guarantees-row">
                    <div className="guarantee-pill-item">
                      <div className="guarantee-pill-icon-circle">
                        <LuShieldCheck />
                      </div>
                      <div className="guarantee-pill-text">
                        <strong>Safe &amp; Secure</strong>
                        <span>Your details are protected</span>
                      </div>
                    </div>

                    <div className="guarantee-pill-item">
                      <div className="guarantee-pill-icon-circle">
                        <LuTruck />
                      </div>
                      <div className="guarantee-pill-text">
                        <strong>Faster Checkout</strong>
                        <span>Save address for next time</span>
                      </div>
                    </div>

                    <div className="guarantee-pill-item">
                      <div className="guarantee-pill-icon-circle">
                        <LuHeart />
                      </div>
                      <div className="guarantee-pill-text">
                        <strong>A Better Experience</strong>
                        <span>Shop more, hassle less</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : addresses.length === 0 ? (
                /* LUXURY EMPTY ADDRESS STATE */
                <div className="checkout-no-address-box">
                  <div className="no-addr-illustration-wrap">
                    <div className="no-addr-icon-circle">
                      <LuMapPin className="no-addr-pin-icon" />
                    </div>
                    <span className="sparkle-accent sparkle-left">✦</span>
                    <span className="sparkle-accent sparkle-right">✦</span>
                  </div>
                  <h3 className="no-addr-title">No saved addresses</h3>
                  <p className="no-addr-desc">
                    Add a delivery address to continue with your checkout.
                  </p>
                  <button
                    type="button"
                    className="checkout-gold-cta-btn"
                    onClick={handleOpenAddModal}
                  >
                    <LuPlus className="btn-icon" />
                    <span>Add Delivery Address</span>
                  </button>

                  {/* Empty State Guarantee Feature Pills */}
                  <div className="empty-state-guarantees-row">
                    <div className="guarantee-pill-item">
                      <div className="guarantee-pill-icon-circle">
                        <LuShieldCheck />
                      </div>
                      <div className="guarantee-pill-text">
                        <strong>Safe &amp; Secure</strong>
                        <span>Your details are protected</span>
                      </div>
                    </div>

                    <div className="guarantee-pill-item">
                      <div className="guarantee-pill-icon-circle">
                        <LuTruck />
                      </div>
                      <div className="guarantee-pill-text">
                        <strong>Faster Checkout</strong>
                        <span>Save address for next time</span>
                      </div>
                    </div>

                    <div className="guarantee-pill-item">
                      <div className="guarantee-pill-icon-circle">
                        <LuHeart />
                      </div>
                      <div className="guarantee-pill-text">
                        <strong>A Better Experience</strong>
                        <span>Shop more, hassle less</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* LUXURY SAVED ADDRESS CARDS LIST */
                <div className="checkout-address-cards-list">
                  {addresses.map((addr) => {
                    const isSelected = addr.id === selectedAddressId;
                    const displayName = addr.name || addr.full_name || "Customer";
                    const displayPhone = addr.phone || addr.mobile_number || "";
                    const line1 = addr.flat || addr.address_line_1 || "";
                    const line2 = addr.area || addr.address_line_2 || "";
                    const landmark = addr.landmark || "";
                    const city = addr.city || "";
                    const district = addr.district || city;
                    const state = addr.state || "";
                    const pincode = addr.pincode || "";
                    const isDefault = Boolean(addr.isDefault || addr.is_default);

                    const locationText = [
                      line1,
                      line2,
                      landmark ? `Landmark: ${landmark}` : "",
                      city,
                      district !== city ? district : "",
                      state ? `${state} - ${pincode}` : pincode,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div
                        key={addr.id}
                        className={`checkout-selectable-addr-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedAddressId(addr.id)}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedAddressId(addr.id);
                          }
                        }}
                      >
                        {/* Radio Check Icon */}
                        <div className="addr-radio-indicator" aria-hidden="true">
                          <span className={`addr-radio-circle ${isSelected ? "checked" : ""}`}>
                            {isSelected && <span className="addr-radio-dot" />}
                          </span>
                        </div>

                        {/* Address Info */}
                        <div className="addr-card-main-content">
                          <div className="addr-top-meta-row">
                            <span className="addr-name-text">{displayName}</span>
                            <div className="addr-badges-group">
                              <span className="addr-type-pill-checkout">
                                {addr.type || addr.address_type || "Home"}
                              </span>
                              {isDefault && (
                                <span className="addr-default-pill-checkout">
                                  <LuCrown className="crown-icon" /> Default
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="addr-phone-text">
                            {displayPhone.startsWith("+91") ? displayPhone : `+91 ${displayPhone}`}
                          </div>

                          <div className="addr-full-text">{locationText}</div>
                        </div>

                        {/* Actions (Edit & Delete) */}
                        <div className="addr-card-actions-group">
                          <button
                            type="button"
                            className="addr-action-icon-btn"
                            onClick={(e) => handleOpenEditModal(addr, e)}
                            title="Edit this address"
                            aria-label="Edit address"
                          >
                            <LuPencil />
                          </button>
                          <button
                            type="button"
                            className="addr-action-icon-btn delete"
                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                            title="Delete this address"
                            aria-label="Delete address"
                            disabled={deletingAddressId === addr.id}
                          >
                            <LuTrash2 />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* STEP 2: PAYMENT METHOD CARD */}
            <section className="checkout-section-card">
              <div className="section-card-header">
                <div className="step-badge-title-group">
                  <div className="section-step-badge">2</div>
                  <div className="step-heading-wrap">
                    <h2 className="section-title">Payment Method</h2>
                    <p className="section-subtitle">
                      Choose your preferred payment option.
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivering To Summary Badge */}
              {selectedAddress && (
                <div className="delivering-to-badge-card">
                  <div className="delivering-to-left">
                    <span className="delivering-to-label">DELIVERING TO</span>
                    <strong className="delivering-to-name">
                      {selectedAddress.name || selectedAddress.full_name} •{" "}
                      {selectedAddress.phone || selectedAddress.mobile_number}
                    </strong>
                    <span className="delivering-to-address">
                      {[
                        selectedAddress.flat || selectedAddress.address_line_1,
                        selectedAddress.city,
                        selectedAddress.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                    <div className="delivering-change-actions">
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          className="delivering-change-btn select-other"
                          onClick={() => {
                            const el = document.getElementById("checkout-address-section");
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                              el.classList.add("highlight-pulse");
                              setTimeout(() => el.classList.remove("highlight-pulse"), 1500);
                            }
                          }}
                        >
                          Select Another
                        </button>
                      )}
                      <button
                        type="button"
                        className="delivering-change-btn"
                        onClick={() => {
                          if (selectedAddress) {
                            handleOpenEditModal(selectedAddress);
                          } else {
                            handleOpenAddModal();
                          }
                        }}
                      >
                        Change Address
                      </button>
                    </div>
                  </div>
                )}

              {/* 4 Luxury Selectable Payment Tiles Grid */}
              <div className="payment-tiles-grid" role="radiogroup" aria-label="Payment Method Options">
                {/* 1. UPI */}
                <div
                  className={`payment-tile-card ${paymentMethod === "upi" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("upi")}
                  role="radio"
                  aria-checked={paymentMethod === "upi"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setPaymentMethod("upi");
                  }}
                >
                  <div className="payment-tile-radio">
                    <span className={`tile-radio-circle ${paymentMethod === "upi" ? "checked" : ""}`} />
                  </div>
                  <div className="payment-tile-icon-box">
                    <UpiIcon />
                  </div>
                  <div className="payment-tile-texts">
                    <strong className="payment-tile-title">UPI</strong>
                    <span className="payment-tile-desc">Pay via any UPI app</span>
                  </div>
                </div>

                {/* 2. Card */}
                <div
                  className={`payment-tile-card ${paymentMethod === "card" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("card")}
                  role="radio"
                  aria-checked={paymentMethod === "card"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setPaymentMethod("card");
                  }}
                >
                  <div className="payment-tile-radio">
                    <span className={`tile-radio-circle ${paymentMethod === "card" ? "checked" : ""}`} />
                  </div>
                  <div className="payment-tile-icon-box">
                    <LuCreditCard className="tile-svg-icon" />
                  </div>
                  <div className="payment-tile-texts">
                    <strong className="payment-tile-title">Card</strong>
                    <span className="payment-tile-desc">Debit / Credit Card</span>
                  </div>
                </div>

                {/* 3. Net Banking */}
                <div
                  className={`payment-tile-card ${paymentMethod === "netbanking" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("netbanking")}
                  role="radio"
                  aria-checked={paymentMethod === "netbanking"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setPaymentMethod("netbanking");
                  }}
                >
                  <div className="payment-tile-radio">
                    <span className={`tile-radio-circle ${paymentMethod === "netbanking" ? "checked" : ""}`} />
                  </div>
                  <div className="payment-tile-icon-box">
                    <LuBuilding className="tile-svg-icon" />
                  </div>
                  <div className="payment-tile-texts">
                    <strong className="payment-tile-title">Net Banking</strong>
                    <span className="payment-tile-desc">All major banks</span>
                  </div>
                </div>

                {/* 4. Cash on Delivery */}
                <div
                  className={`payment-tile-card ${paymentMethod === "cod" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("cod")}
                  role="radio"
                  aria-checked={paymentMethod === "cod"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setPaymentMethod("cod");
                  }}
                >
                  <div className="payment-tile-radio">
                    <span className={`tile-radio-circle ${paymentMethod === "cod" ? "checked" : ""}`} />
                  </div>
                  <div className="payment-tile-icon-box">
                    <LuBanknote className="tile-svg-icon" />
                  </div>
                  <div className="payment-tile-texts">
                    <strong className="payment-tile-title">Cash on Delivery</strong>
                    <span className="payment-tile-desc">Pay at your doorstep</span>
                  </div>
                </div>
              </div>

              {/* Secure Payments Footer */}
              <div className="payment-security-footer">
                <LuLock className="lock-icon" />
                <span>All payments are secured and encrypted</span>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary & Trust Badges */}
          <aside className="checkout-summary-column">
            <div className="checkout-summary-card">
              <div className="summary-card-header-row">
                <h2 className="summary-card-title">Order Summary</h2>
                <span className="summary-items-count-badge">
                  {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Items List */}
              <div className="checkout-items-list">
                {checkoutList.map((item, idx) => {
                  const fallback = getFallbackImage(item.category, item.name);
                  const itemImgSrc =
                    item.image && !item.image.includes("ChatGPT_Image") ? item.image : fallback;
                  const itemPrice = Number(item.price) || 0;
                  const itemOldPrice = Number(item.oldPrice) || Number(item.mrp) || 0;
                  const itemQty = Number(item.quantity) || 1;

                  return (
                    <div key={`${item.id}-${item.selectedSize}-${idx}`} className="checkout-item-row">
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
                          {[
                            item.selectedColor ? `Color: ${item.selectedColor}` : item.color ? `Color: ${item.color}` : "",
                            item.selectedSize ? `Size: ${item.selectedSize}` : item.size ? `Size: ${item.size}` : "",
                          ]
                            .filter(Boolean)
                            .join(" | ") || "Standard"}
                          {` | Qty: ${itemQty}`}
                        </span>
                      </div>
                      <div className="checkout-item-pricing-wrap">
                        <span className="checkout-item-price">
                          ₹{(itemPrice * itemQty).toLocaleString("en-IN")}
                        </span>
                        {itemOldPrice > itemPrice && (
                          <span className="checkout-item-old-price">
                            ₹{(itemOldPrice * itemQty).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="checkout-price-breakdown">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {discount > 0 && (
                  <div className="summary-row discount">
                    <span>Discount</span>
                    <span className="green">−₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Shipping</span>
                  <span className={shipping > 0 ? "" : "green"}>
                    {shipping > 0 ? `₹${shipping.toLocaleString("en-IN")}` : "Free"}
                  </span>
                </div>

                {isCod && (
                  <>
                    <div className="summary-row" style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
                      <span style={{ fontWeight: "600", color: "#071426" }}>Advance Payable Now</span>
                      <span style={{ fontWeight: "700", color: "#c99b45" }}>₹{codAdvance.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="summary-row">
                      <span style={{ color: "#64748b" }}>Pay on Delivery</span>
                      <span style={{ fontWeight: "600", color: "#071426" }}>₹{codBalance.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Total Amount Highlight Row */}
              <div className="checkout-total-highlight-card">
                <span className="total-highlight-label">{isCod ? "Order Total" : "Total Amount"}</span>
                <span className="total-highlight-value">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>

              {/* Action Button: Disabled if no address selected */}
              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={loading || (user && !selectedAddress)}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : !user ? (
                  <>
                    <span>Login to Continue Checkout</span>
                    <LuArrowRight className="btn-arrow-icon" />
                  </>
                ) : !selectedAddress ? (
                  <span>Select Delivery Address</span>
                ) : isCod ? (
                  <>
                    <span>Pay ₹{codAdvance.toLocaleString("en-IN")} &amp; Confirm COD</span>
                    <LuArrowRight className="btn-arrow-icon" />
                  </>
                ) : (
                  <>
                    <span>Pay ₹{totalAmount.toLocaleString("en-IN")} Securely</span>
                    <LuArrowRight className="btn-arrow-icon" />
                  </>
                )}
              </button>

              <div className="summary-secure-badge-note">
                <LuLock className="lock-icon-small" />
                <span>Secure Payment | 100% Safe &amp; Encrypted</span>
              </div>

              {!selectedAddress && (
                <p className="checkout-address-needed-warning">
                  ⚠️ Please select or add a delivery address to continue.
                </p>
              )}
            </div>

            {/* Trust Guarantee 2x2 Feature Grid */}
            <div className="checkout-trust-grid">
              <div className="trust-grid-item">
                <div className="trust-grid-icon-wrap">
                  <LuTruck />
                </div>
                <div className="trust-grid-text">
                  <strong>Free Delivery</strong>
                  <span>On orders above ₹999</span>
                </div>
              </div>

              <div className="trust-grid-item">
                <div className="trust-grid-icon-wrap">
                  <LuPackage />
                </div>
                <div className="trust-grid-text">
                  <strong>7-Day Returns</strong>
                  <span>Hassle-free exchange</span>
                </div>
              </div>

              <div className="trust-grid-item">
                <div className="trust-grid-icon-wrap">
                  <LuShieldCheck />
                </div>
                <div className="trust-grid-text">
                  <strong>100% Genuine</strong>
                  <span>Direct from Moxie Store</span>
                </div>
              </div>

              <div className="trust-grid-item">
                <div className="trust-grid-icon-wrap">
                  <LuHeadphones />
                </div>
                <div className="trust-grid-text">
                  <strong>Need Help?</strong>
                  <span>We're here for you</span>
                </div>
              </div>
            </div>
          </aside>
        </form>

        {/* Add / Edit Address Modal in Checkout */}
        {isAddressModalOpen && (
          <div
            className="address-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-addr-modal-title"
          >
            <div className="address-modal-container address-modal-card-premium">
              <div className="address-modal-header-premium">
                <div className="address-modal-header-left">
                  <div className="address-modal-badge-icon" aria-hidden="true">
                    <LuMapPin />
                  </div>
                  <div>
                    <h3 id="checkout-addr-modal-title" className="address-modal-title-premium">
                      {editingAddress ? "Edit Delivery Address" : "Add Delivery Address"}
                    </h3>
                    <p className="address-modal-subtitle-premium">
                      {editingAddress
                        ? "Update your address details for this delivery."
                        : "Save your delivery address for a smooth checkout."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="address-modal-close-btn"
                  onClick={() => setIsAddressModalOpen(false)}
                  aria-label="Close modal"
                >
                  <LuX />
                </button>
              </div>

              <form onSubmit={handleSaveModalAddress} noValidate>
                <div className="address-fields-grid">
                  {/* Full Name */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuUser />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressName">
                        FULL NAME <span className="text-danger">*</span>
                      </label>
                      <input
                        id="chkAddressName"
                        type="text"
                        name="name"
                        className={`address-field-input ${modalErrors.name ? "has-error" : ""}`}
                        value={modalForm.name}
                        onChange={handleModalChange}
                        placeholder="e.g. Harish Raja"
                        required
                      />
                      {modalErrors.name && (
                        <span className="profile-form-error">{modalErrors.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuSmartphone />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressPhone">
                        MOBILE NUMBER <span className="text-danger">*</span>
                      </label>
                      <input
                        id="chkAddressPhone"
                        type="tel"
                        name="phone"
                        maxLength={10}
                        className={`address-field-input ${modalErrors.phone ? "has-error" : ""}`}
                        value={modalForm.phone}
                        onChange={handleModalChange}
                        placeholder="10-digit mobile number"
                        required
                      />
                      {modalErrors.phone && (
                        <span className="profile-form-error">{modalErrors.phone}</span>
                      )}
                    </div>
                  </div>

                  {/* House / Flat / Address Line 1 */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuHouse />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressFlat">
                        HOUSE / FLAT / BUILDING <span className="text-danger">*</span>
                      </label>
                      <input
                        id="chkAddressFlat"
                        type="text"
                        name="flat"
                        className={`address-field-input ${modalErrors.flat ? "has-error" : ""}`}
                        value={modalForm.flat}
                        onChange={handleModalChange}
                        placeholder="e.g. 12, Example Street"
                        required
                      />
                      {modalErrors.flat && (
                        <span className="profile-form-error">{modalErrors.flat}</span>
                      )}
                    </div>
                  </div>

                  {/* Street / Area */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <RoadIcon />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressArea">
                        STREET / AREA / LOCALITY
                      </label>
                      <input
                        id="chkAddressArea"
                        type="text"
                        name="area"
                        className="address-field-input"
                        value={modalForm.area}
                        onChange={handleModalChange}
                        placeholder="e.g. Sathankulam"
                      />
                    </div>
                  </div>

                  {/* Landmark */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuMapPin />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressLandmark">
                        LANDMARK
                      </label>
                      <input
                        id="chkAddressLandmark"
                        type="text"
                        name="landmark"
                        className="address-field-input"
                        value={modalForm.landmark}
                        onChange={handleModalChange}
                        placeholder="e.g. Near Bus Stand"
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuBuilding2 />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressCity">
                        CITY <span className="text-danger">*</span>
                      </label>
                      <input
                        id="chkAddressCity"
                        type="text"
                        name="city"
                        className={`address-field-input ${modalErrors.city ? "has-error" : ""}`}
                        value={modalForm.city}
                        onChange={handleModalChange}
                        placeholder="e.g. Thoothukudi"
                        required
                      />
                      {modalErrors.city && (
                        <span className="profile-form-error">{modalErrors.city}</span>
                      )}
                    </div>
                  </div>

                  {/* District */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuBuilding2 />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressDistrict">
                        DISTRICT <span className="text-danger">*</span>
                      </label>
                      <input
                        id="chkAddressDistrict"
                        type="text"
                        name="district"
                        className={`address-field-input ${modalErrors.district ? "has-error" : ""}`}
                        value={modalForm.district}
                        onChange={handleModalChange}
                        placeholder="e.g. Thoothukudi District"
                        required
                      />
                      {modalErrors.district && (
                        <span className="profile-form-error">{modalErrors.district}</span>
                      )}
                    </div>
                  </div>

                  {/* State */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuMap />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressState">
                        STATE <span className="text-danger">*</span>
                      </label>
                      <div className="address-select-wrap">
                        <select
                          id="chkAddressState"
                          name="state"
                          className={`address-field-select ${modalErrors.state ? "has-error" : ""}`}
                          value={modalForm.state}
                          onChange={handleModalChange}
                          required
                        >
                          <option value="">Select State</option>
                          {states.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      {modalErrors.state && (
                        <span className="profile-form-error">{modalErrors.state}</span>
                      )}
                    </div>
                  </div>

                  {/* PIN Code */}
                  <div className="address-field-card">
                    <div className="address-field-icon-box" aria-hidden="true">
                      <LuMapPin />
                    </div>
                    <div className="address-field-content">
                      <label className="address-field-label" htmlFor="chkAddressPincode">
                        PIN CODE <span className="text-danger">*</span>
                      </label>
                      <input
                        id="chkAddressPincode"
                        type="text"
                        name="pincode"
                        className={`address-field-input ${modalErrors.pincode ? "has-error" : ""}`}
                        value={modalForm.pincode}
                        onChange={handleModalChange}
                        maxLength="6"
                        placeholder="6-digit PIN"
                        required
                      />
                      {modalErrors.pincode && (
                        <span className="profile-form-error">{modalErrors.pincode}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Default Address Checkbox Card */}
                <label className="address-default-card" htmlFor="chkIsDefaultAddr">
                  <input
                    type="checkbox"
                    id="chkIsDefaultAddr"
                    name="isDefault"
                    checked={modalForm.isDefault}
                    onChange={handleModalChange}
                    className="address-default-input-hidden"
                  />
                  <div
                    className={`address-custom-checkbox ${modalForm.isDefault ? "is-checked" : ""}`}
                    aria-hidden="true"
                  >
                    {modalForm.isDefault && <LuCheck />}
                  </div>
                  <div className="address-default-card-text">
                    <span className="address-default-card-title">
                      Set as my default delivery address
                    </span>
                    <span className="address-default-card-desc">
                      This address will be automatically selected for future checkouts.
                    </span>
                  </div>
                </label>

                <div className="address-modal-footer">
                  <button
                    type="button"
                    className="address-modal-btn-cancel"
                    onClick={() => setIsAddressModalOpen(false)}
                    disabled={modalSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="address-modal-btn-submit"
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? (
                      <span>Saving...</span>
                    ) : editingAddress ? (
                      <>
                        <LuPencil className="btn-icon" />
                        <span>Update Address</span>
                      </>
                    ) : (
                      <>
                        <LuPlus className="btn-icon" />
                        <span>Save &amp; Select Address</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
