import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import {
  LuShoppingBag,
  LuX,
  LuArrowRight,
  LuCrown,
  LuGem,
  LuHeart,
  LuTrash2,
  LuPlus,
  LuMinus,
  LuLock,
} from "react-icons/lu";
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

// Luxury 3D MOXIE Shopping Bag Graphic
const MoxieBagIllustration = () => (
  <div className="empty-cart-hero-visual" aria-hidden="true">
    <div className="hero-bag-glow-circle" />
    <svg
      className="hero-bag-svg"
      viewBox="0 0 280 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="moxieGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2C485" />
          <stop offset="45%" stopColor="#C99B45" />
          <stop offset="100%" stopColor="#A87A29" />
        </linearGradient>
        <linearGradient id="bagFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F9F6EE" />
        </linearGradient>
        <linearGradient id="bagSideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F2ECE0" />
          <stop offset="100%" stopColor="#E5DDCD" />
        </linearGradient>
        <filter id="softBagGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#071426" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Decorative Handwritten Script */}
      <g className="hero-script-tag">
        <text
          x="214"
          y="42"
          textAnchor="middle"
          fill="#9c7128"
          fontFamily="'Brush Script MT', 'Dancing Script', 'Caveat', cursive, serif"
          fontStyle="italic"
          fontSize="17"
          fontWeight="600"
        >
          Good Outfits
        </text>
        <text
          x="214"
          y="62"
          textAnchor="middle"
          fill="#9c7128"
          fontFamily="'Brush Script MT', 'Dancing Script', 'Caveat', cursive, serif"
          fontStyle="italic"
          fontSize="17"
          fontWeight="600"
        >
          Brighter Days
        </text>
        <path
          d="M172 70 C194 75, 230 66, 252 72"
          stroke="#C99B45"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Sparkles / Gold accents */}
      <path d="M66 52 L73 55 L66 58 L63 65 L60 58 L53 55 L60 52 L63 45 Z" fill="#D4AF63" opacity="0.85" />
      <path d="M64 88 L68 90 L64 92 L62 96 L60 92 L56 90 L60 88 L62 84 Z" fill="#D4AF63" opacity="0.75" />
      <path d="M236 118 L241 120 L236 122 L234 127 L232 122 L227 120 L232 118 L234 113 Z" fill="#D4AF63" opacity="0.75" />

      {/* Ambient shadow underneath bag */}
      <ellipse cx="140" cy="210" rx="84" ry="12" fill="#071426" fillOpacity="0.08" />

      {/* Gold Handles */}
      <path
        d="M112 82 C112 36, 142 36, 142 82"
        stroke="url(#moxieGoldGrad)"
        strokeWidth="4.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M138 82 C138 36, 168 36, 168 82"
        stroke="url(#moxieGoldGrad)"
        strokeWidth="4.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bag Group with Shadow */}
      <g filter="url(#softBagGlow)">
        {/* Bag Side (Left Depth Panel) */}
        <path
          d="M92 82 L75 97 L87 198 L106 189 Z"
          fill="url(#bagSideGrad)"
          stroke="#DFD7C7"
          strokeWidth="0.8"
        />

        {/* Bag Front Panel */}
        <path
          d="M92 82 L188 82 L204 189 L106 189 Z"
          fill="url(#bagFrontGrad)"
          stroke="#E6DFD0"
          strokeWidth="0.8"
        />

        {/* Bag Top Fold Rim */}
        <path
          d="M92 82 L106 91 L190 91 L188 82 Z"
          fill="#E7DFD0"
        />

        {/* MOXIE Gold Logo Mark on Front */}
        <path
          d="M141.5 118 L148 129.5 L154.5 118 L160 138 L155 138 L152 127.5 L148 135 L144 127.5 L141 138 L136 138 Z"
          fill="url(#moxieGoldGrad)"
        />
        {/* MOXIE Wordmark */}
        <text
          x="148"
          y="154"
          textAnchor="middle"
          fill="#071426"
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="13.5"
          fontWeight="800"
          letterSpacing="3.5"
        >
          MOXIE
        </text>
        {/* Tagline */}
        <text
          x="148"
          y="165"
          textAnchor="middle"
          fill="#667085"
          fontFamily="'Outfit', -apple-system, sans-serif"
          fontSize="5.5"
          fontWeight="700"
          letterSpacing="1.6"
        >
          WEAR YOUR MOOD
        </text>
      </g>
    </svg>
  </div>
);

export default function CartDrawer() {
  const {
    cart = [],
    cartCount = 0,
    subtotal = 0,
    isCartOpen = false,
    closeCart,
    updateQuantity,
    removeFromCart,
  } = useCart() || {};
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isCartOpen && closeCart) {
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

  const handleProceedToCheckout = () => {
    if (closeCart) closeCart();
    navigate("/checkout");
  };

  const handleViewFullCart = () => {
    if (closeCart) closeCart();
    navigate("/cart");
  };

  const handleExploreCollection = () => {
    if (closeCart) closeCart();
    navigate("/products");
  };

  return (
    <div
      className={`cart-drawer-backdrop ${isCartOpen ? "open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeCart) {
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
        aria-label="Shopping Bag Drawer"
      >
        {/* ====================================================
            1. HEADER DESIGN
            ==================================================== */}
        <header className="cart-drawer-header">
          <div className="cart-drawer-header-left">
            <div className="cart-header-icon-circle" aria-hidden="true">
              <LuShoppingBag className="cart-header-bag-icon" />
            </div>
            <div className="cart-header-title-group">
              <h2 className="cart-drawer-title">
                Shopping Bag ({cartCount})
              </h2>
              <span className="cart-drawer-subtitle">
                YOUR PICKS, YOUR STYLE
              </span>
            </div>
          </div>
          <button
            type="button"
            className="cart-drawer-close-btn"
            onClick={closeCart}
            aria-label="Close shopping bag drawer"
          >
            <LuX />
          </button>
        </header>

        {/* ====================================================
            2. SCROLLABLE BODY (EMPTY STATE vs POPULATED ITEMS)
            ==================================================== */}
        <div className="cart-drawer-body">
          {cart && cart.length > 0 ? (
            /* POPULATED CART ITEMS LIST */
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
                  item.selectedColor ? item.selectedColor : (item.color || null),
                  item.selectedSize ? `Size: ${item.selectedSize}` : (item.size ? `Size: ${item.size}` : null),
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
                    {/* Item Thumbnail */}
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

                    {/* Item Details */}
                    <div className="cart-item-details">
                      <div className="cart-item-header-row">
                        <div className="cart-item-title-col">
                          {brand && <span className="cart-item-brand">{brand}</span>}
                          <Link
                            to={`/product/${item.id}`}
                            onClick={closeCart}
                            className="cart-item-name"
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                        </div>
                        <button
                          type="button"
                          className="cart-item-delete-btn"
                          onClick={() => removeFromCart && removeFromCart(itemKey)}
                          aria-label={`Remove ${item.name} from cart`}
                          title="Remove item"
                        >
                          <LuTrash2 />
                        </button>
                      </div>

                      {variantDisplay && (
                        <div className="cart-item-variant">{variantDisplay}</div>
                      )}

                      {/* Quantity & Price Row */}
                      <div className="cart-item-bottom-row">
                        <div className="cart-quantity-picker" aria-label="Quantity Controls">
                          <button
                            type="button"
                            className="qty-btn minus"
                            onClick={() => updateQuantity && updateQuantity(itemKey, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            <LuMinus />
                          </button>
                          <span className="qty-count">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-btn plus"
                            onClick={() => updateQuantity && updateQuantity(itemKey, item.quantity + 1)}
                            disabled={isAtMax}
                            aria-label="Increase quantity"
                            title={isAtMax ? "Maximum stock reached" : "Increase quantity"}
                          >
                            <LuPlus />
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
            /* ====================================================
               LUXURY MOXIE EMPTY STATE HERO
               ==================================================== */
            <div className="cart-drawer-empty-state">
              {/* 1. Hero Bag Graphic */}
              <MoxieBagIllustration />

              {/* 2. Main Empty Copy */}
              <div className="empty-cart-text-wrap">
                <h3 className="empty-cart-title">Your MOXIE bag is waiting</h3>
                <p className="empty-cart-subtitle">
                  Explore our curated collection and<br />
                  add something worth wearing.
                </p>
              </div>

              {/* 3. Benefit Row */}
              <div className="empty-cart-benefits-row">
                <div className="empty-benefit-item">
                  <div className="empty-benefit-icon-box">
                    <LuGem />
                  </div>
                  <span className="empty-benefit-label">Premium<br />Collection</span>
                </div>

                <div className="benefit-separator" />

                <div className="empty-benefit-item">
                  <div className="empty-benefit-icon-box">
                    <LuCrown />
                  </div>
                  <span className="empty-benefit-label">Trendy<br />Essentials</span>
                </div>

                <div className="benefit-separator" />

                <div className="empty-benefit-item">
                  <div className="empty-benefit-icon-box">
                    <LuHeart />
                  </div>
                  <span className="empty-benefit-label">Styles<br />You'll Love</span>
                </div>
              </div>

              {/* 4. Primary CTA Button */}
              <button
                type="button"
                className="cart-explore-collection-btn"
                onClick={handleExploreCollection}
              >
                <LuShoppingBag className="btn-bag-icon" />
                <span>Explore Collection</span>
                <LuArrowRight className="btn-arrow-icon" />
              </button>

              {/* 5. Bottom Brand Footer */}
              <div className="empty-cart-brand-footer">
                <div className="brand-footer-moxie-row">
                  <span className="gold-line" />
                  <span className="brand-footer-moxie-text">MOXIE</span>
                  <span className="gold-line" />
                </div>
                <div className="brand-footer-taglines">
                  <span>MORE THAN A STORE</span>
                  <span>A LIFESTYLE</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            3. STICKY FOOTER FOR FILLED CART
            ==================================================== */}
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
                <LuLock className="lock-icon" />
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
