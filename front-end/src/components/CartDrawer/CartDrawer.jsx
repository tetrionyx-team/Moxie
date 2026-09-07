import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useData } from "../../context/DataContext";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Delete02Icon,
  DeliveryTruck01Icon,
  SecurityLockIcon,
  ShoppingBag01Icon,
  Add01Icon,
  Remove01Icon,
} from "@hugeicons/core-free-icons";
import "./CartDrawer.css";

import watchFallbackImg from "../../assets/images/watch1.png";
import shoeFallbackImg from "../../assets/images/shoe.svg";
import capFallbackImg from "../../assets/images/cap.png";
import budsFallbackImg from "../../assets/images/Buds.png";
import defaultFallbackImg from "../../assets/images/offer.png";

const getFallbackImage = (category, name) => {
  const str = (String(category || "") + " " + String(name || "")).toLowerCase();
  if (str.includes("watch")) return watchFallbackImg;
  if (str.includes("footwear") || str.includes("shoe") || str.includes("slider") || str.includes("slipper")) return shoeFallbackImg;
  if (str.includes("cap")) return capFallbackImg;
  if (str.includes("gadget") || str.includes("bud") || str.includes("airpod")) return budsFallbackImg;
  return defaultFallbackImg;
};

export default function CartDrawer() {
  const {
    cart,
    cartCount,
    subtotal,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
  } = useCart() || {};
  const { storeSettings } = useData() || {};
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isCartOpen]);

  // Free shipping calculation
  const freeShippingThreshold = Number(storeSettings?.free_shipping_min_amount || 999);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const isFreeShippingUnlocked = subtotal >= freeShippingThreshold;

  const handleProceedToCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  const handleViewFullCart = () => {
    closeCart();
    navigate("/cart");
  };

  const handleContinueShopping = () => {
    closeCart();
    navigate("/products");
  };

  return (
    <div
      className={`cart-drawer-backdrop ${isCartOpen ? "open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeCart();
        }
      }}
      aria-hidden={!isCartOpen}
    >
      <aside
        ref={drawerRef}
        className={`cart-drawer-panel ${isCartOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your Cart Drawer"
      >
        {/* Drawer Header */}
        <header className="cart-drawer-header">
          <h2 className="cart-drawer-title">
            Your Cart ({cartCount})
          </h2>
          <button
            type="button"
            className="cart-drawer-close-btn"
            onClick={closeCart}
            aria-label="Close cart drawer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={22} strokeWidth={2} />
          </button>
        </header>

        {/* Free Shipping Indicator */}
        <div className="cart-drawer-shipping-bar">
          <div className="shipping-progress-info">
            <span className="shipping-icon-badge" aria-hidden="true">
              <HugeiconsIcon icon={DeliveryTruck01Icon} size={18} strokeWidth={2} />
            </span>
            <span className="shipping-progress-text">
              {isFreeShippingUnlocked ? (
                <strong className="shipping-unlocked-text">
                  You unlocked <span>FREE Shipping!</span>
                </strong>
              ) : (
                <>
                  <strong>₹{remainingForFreeShipping.toLocaleString("en-IN")}</strong> more for{" "}
                  <span className="free-shipping-highlight">FREE Shipping</span>
                </>
              )}
            </span>
          </div>
          <div className="shipping-progress-track">
            <div
              className={`shipping-progress-fill ${isFreeShippingUnlocked ? "unlocked" : ""}`}
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="cart-drawer-body">
          {cart && cart.length > 0 ? (
            <div className="cart-drawer-items-list">
              {cart.map((item) => {
                const itemKey = item.cartItemId || item.id;
                const fallback = getFallbackImage(item.category, item.name);
                const itemImage = item.image || fallback;
                const brand =
                  item.brand ||
                  item.specifications?.Brand ||
                  (item.category_name && !item.category_name.toLowerCase().includes("all")
                    ? item.category_name.toUpperCase()
                    : item.category
                    ? String(item.category).toUpperCase()
                    : "");

                const variantParts = [
                  item.selectedColor,
                  item.selectedSize ? item.selectedSize : (item.selectedVariant?.name || null),
                ].filter(Boolean);

                const variantDisplay = variantParts.length > 0 ? variantParts.join(" | ") : "";

                const maxStock =
                  item.selectedVariant?.stock ??
                  item.rawStock ??
                  item.stock_quantity ??
                  (typeof item.stock === "number" ? item.stock : 999);

                const isAtMax = item.quantity >= maxStock;

                return (
                  <div key={itemKey} className="cart-drawer-item">
                    {/* Item Image */}
                    <div className="cart-item-thumbnail">
                      <img
                        src={itemImage}
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallback;
                        }}
                      />
                    </div>

                    {/* Item Info */}
                    <div className="cart-item-details">
                      <div className="cart-item-header-row">
                        {brand && <span className="cart-item-brand">{brand}</span>}
                        <button
                          type="button"
                          className="cart-item-delete-btn"
                          onClick={() => removeFromCart(itemKey)}
                          aria-label={`Remove ${item.name} from cart`}
                          title="Remove item"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.8} />
                        </button>
                      </div>

                      <Link
                        to={`/product/${item.id}`}
                        onClick={closeCart}
                        className="cart-item-name"
                        title={item.name}
                      >
                        {item.name}
                      </Link>

                      {variantDisplay && (
                        <div className="cart-item-variant">{variantDisplay}</div>
                      )}

                      {/* Quantity and Price Row */}
                      <div className="cart-item-bottom-row">
                        <div className="cart-quantity-picker" aria-label="Quantity Controls">
                          <button
                            type="button"
                            className="qty-btn minus"
                            onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <HugeiconsIcon icon={Remove01Icon} size={14} strokeWidth={2.2} />
                          </button>
                          <span className="qty-count">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-btn plus"
                            onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                            disabled={isAtMax}
                            aria-label="Increase quantity"
                            title={isAtMax ? "Maximum stock reached" : "Increase quantity"}
                          >
                            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.2} />
                          </button>
                        </div>

                        <div className="cart-item-price">
                          ₹{(Number(item.price || 0) * item.quantity).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cart-drawer-empty-state">
              <div className="empty-cart-icon-wrap">
                <HugeiconsIcon icon={ShoppingBag01Icon} size={48} strokeWidth={1.6} />
              </div>
              <h3 className="empty-cart-title">Your cart is empty</h3>
              <p className="empty-cart-subtitle">
                Looks like you haven't added anything to your cart yet.
              </p>
              <button
                type="button"
                className="cart-continue-shopping-btn"
                onClick={handleContinueShopping}
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Sticky Footer Summary & Action Buttons */}
        {cart && cart.length > 0 && (
          <footer className="cart-drawer-footer">
            <div className="cart-subtotal-row">
              <span className="subtotal-label">
                Subtotal ({cartCount} {cartCount === 1 ? "item" : "items"})
              </span>
              <strong className="subtotal-value">
                ₹{subtotal.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="cart-shipping-notice-row">
              <span className="shipping-notice-label">Shipping</span>
              <span className="shipping-notice-value">Calculated at checkout</span>
            </div>

            <div className="cart-drawer-actions">
              <button
                type="button"
                className="cart-proceed-checkout-btn"
                onClick={handleProceedToCheckout}
              >
                <HugeiconsIcon icon={SecurityLockIcon} size={18} strokeWidth={2} className="lock-icon" />
                <span>PROCEED TO CHECKOUT</span>
              </button>

              <button
                type="button"
                className="cart-view-full-btn"
                onClick={handleViewFullCart}
              >
                VIEW FULL CART
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
