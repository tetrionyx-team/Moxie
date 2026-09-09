import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import "./Cart.css";

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

export default function Cart() {
  const { cart = [], updateQuantity, removeFromCart, clearCart } = useContext(CartContext) || {};
  const { addToWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();

  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const mrp = cart.reduce((acc, item) => acc + (Number(item.oldPrice) || Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const discount = Math.max(0, mrp - subtotal);
  const totalItemsCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  const handleQtyChange = (item, nextQty) => {
    if (nextQty < 1) return;
    const maxStock = typeof item.stock === "number" && item.stock > 0 ? item.stock : 99;
    if (nextQty > maxStock) {
      if (toast) toast(`Maximum available quantity is ${maxStock}`);
      return;
    }
    if (updateQuantity) {
      updateQuantity(item.id, nextQty);
    }
  };

  const handleMoveToWishlist = (item) => {
    if (addToWishlist) {
      addToWishlist(item);
    }
    if (removeFromCart) {
      removeFromCart(item.id);
    }
    if (toast) {
      toast("Saved to wishlist");
    }
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-container">
        {/* Header Bar */}
        <div className="cart-page-header">
          <div className="cart-header-title-box">
            <span className="cart-header-eyebrow">Your Bag</span>
            <h1 className="cart-header-heading">
              Shopping Cart{" "}
              {totalItemsCount > 0 && <span className="cart-count-pill">({totalItemsCount})</span>}
            </h1>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              className="cart-clear-btn"
              onClick={clearCart}
              title="Remove all items"
            >
              Clear Cart
            </button>
          )}
        </div>

        {cart.length > 0 ? (
          <div className="cart-layout-grid">
            {/* Left Column: Cart Item Cards */}
            <div className="cart-items-column">
              <div className="cart-items-card-list">
                {cart.map((item) => {
                  const fallback = getFallbackImage(item.category, item.name);
                  const itemImgSrc = item.image && !item.image.includes("ChatGPT_Image") ? item.image : fallback;
                  const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                  const itemKey = `${item.id}-${item.selectedSize || "nosize"}-${item.selectedColor || "nocolor"}`;
                  const maxStock = typeof item.stock === "number" && item.stock > 0 ? item.stock : 99;

                  return (
                    <article key={itemKey} className="cart-item-row">
                      {/* Product Thumbnail */}
                      <Link to={`/product/${item.id}`} className="cart-item-thumb-link">
                        <div className="cart-item-thumb-box">
                          <img
                            src={itemImgSrc}
                            alt={item.name}
                            className="cart-item-thumb-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = fallback;
                            }}
                          />
                        </div>
                      </Link>

                      {/* Product Details */}
                      <div className="cart-item-meta-info">
                        {item.category && (
                          <span className="cart-item-category-label">
                            {String(item.category).toUpperCase()}
                          </span>
                        )}
                        <Link to={`/product/${item.id}`} className="cart-item-name-link">
                          <h3 className="cart-item-name">{item.name}</h3>
                        </Link>

                        {/* Variants (Size / Color) */}
                        <div className="cart-item-variants-row">
                          {item.selectedColor && (
                            <span className="cart-variant-chip">
                              Color: <strong>{item.selectedColor}</strong>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="cart-variant-chip">
                              Size: <strong>{item.selectedSize}</strong>
                            </span>
                          )}
                        </div>

                        {/* Unit price */}
                        <div className="cart-item-unit-price-box">
                          <span className="cart-item-unit-price">
                            ₹{Number(item.price || 0).toLocaleString("en-IN")}
                          </span>
                          {item.oldPrice && Number(item.oldPrice) > Number(item.price) && (
                            <span className="cart-item-old-price">
                              ₹{Number(item.oldPrice).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Item Total & Actions */}
                      <div className="cart-item-controls-block">
                        {/* Quantity Stepper */}
                        <div className="cart-qty-stepper">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            disabled={item.quantity <= 1}
                            onClick={() => handleQtyChange(item, item.quantity - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="cart-qty-number">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            disabled={item.quantity >= maxStock}
                            onClick={() => handleQtyChange(item, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total Price */}
                        <div className="cart-item-total-price">
                          ₹{itemSubtotal.toLocaleString("en-IN")}
                        </div>

                        {/* Action buttons */}
                        <div className="cart-item-actions-row">
                          <button
                            type="button"
                            className="cart-save-wishlist-btn"
                            onClick={() => handleMoveToWishlist(item)}
                            title="Save for later"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="cart-remove-item-btn"
                            onClick={() => removeFromCart && removeFromCart(item.id)}
                            aria-label={`Remove ${item.name} from cart`}
                            title="Remove item"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Order Summary Panel */}
            <aside className="cart-summary-column">
              <div className="cart-summary-card">
                <h2 className="cart-summary-title">Order Summary</h2>

                <div className="cart-summary-breakdown">
                  <div className="cart-summary-row">
                    <span className="summary-label">Subtotal</span>
                    <span className="summary-value">₹{mrp > subtotal ? mrp.toLocaleString("en-IN") : subtotal.toLocaleString("en-IN")}</span>
                  </div>

                  {discount > 0 && (
                    <div className="cart-summary-row discount-row">
                      <span className="summary-label">Discount</span>
                      <span className="summary-value green">−₹{discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="cart-summary-row">
                    <span className="summary-label">Shipping</span>
                    <span className="summary-value green">FREE</span>
                  </div>
                </div>

                <div className="cart-summary-divider" />

                <div className="cart-summary-total-row">
                  <span className="total-label">Grand Total</span>
                  <span className="total-value">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {/* Primary CTA */}
                <Link to="/checkout" className="cart-primary-checkout-btn">
                  PROCEED TO CHECKOUT
                </Link>

                {/* Secondary CTA */}
                <Link to="/products" className="cart-continue-shopping-link">
                  CONTINUE SHOPPING
                </Link>

                {/* Trust Badges */}
                <div className="cart-trust-badges">
                  <div className="trust-badge-item">
                    <span className="trust-icon">✓</span>
                    <span>100% Authentic Products</span>
                  </div>
                  <div className="trust-badge-item">
                    <span className="trust-icon">🔒</span>
                    <span>Secure Encrypted Checkout</span>
                  </div>
                  <div className="trust-badge-item">
                    <span className="trust-icon">📦</span>
                    <span>Free Pan-India Delivery</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          /* Premium Empty Cart State */
          <div className="cart-empty-state-card">
            <div className="empty-cart-icon-circle">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <h2 className="empty-cart-heading">Your cart is empty</h2>
            <p className="empty-cart-text">
              Looks like you haven't added anything yet. Explore our curated collections and discover your next favorite item.
            </p>
            <Link to="/products" className="empty-cart-cta-btn">
              CONTINUE SHOPPING
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
