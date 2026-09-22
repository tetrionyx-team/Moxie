import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WishlistContext } from "../../context/WishlistContext";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { profileService } from "../../services/profileService";
import ProfileSidebar from "../../components/Profile/ProfileSidebar";
import LogoutConfirmModal from "../../components/account/LogoutConfirmModal";
import AccountMobileNav from "../../components/Profile/AccountMobileNav";
import { LuHeart, LuShoppingCart, LuTrash2, LuShoppingBag, LuSparkles } from "react-icons/lu";

import { getProductImageUrl, NEUTRAL_PLACEHOLDER } from "../../utils/productImage";

import "./Wishlist.css";
import "../../components/Profile/Profile.css";

export default function Wishlist({ embedded = false }) {
  const { wishlist = [], removeFromWishlist } = useContext(WishlistContext) || {};
  const { cart = [], addToCart } = useContext(CartContext) || {};
  const { user, logout } = useContext(AuthContext) || {};
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    let isMounted = true;
    profileService
      .fetchProfile(user.email)
      .then((prof) => {
        if (isMounted && prof) setProfile(prof);
      })
      .catch(() => {
        if (isMounted) setProfile({ name: user.name || "User", email: user.email });
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (logout) logout();
    navigate("/");
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (addToCart && product) {
      addToCart(product);
      if (toast) toast(`${product.name || "Product"} added to cart`);
    }
  };

  const handleRemove = (e, productId, productName) => {
    e.preventDefault();
    e.stopPropagation();
    if (removeFromWishlist && productId != null) {
      removeFromWishlist(productId);
      if (toast) toast(`${productName || "Product"} removed from wishlist`);
    }
  };

  const savedCount = wishlist.length;
  const availableCount = wishlist.filter((p) => p && !p.outOfStock && p.stock !== 0).length;

  const wishlistContent = (
    <div className="addresses-container wishlist-container">
      {/* 1. Header — Exact alignment with My Address */}
      <div className="addresses-header-wrap wishlist-header-wrap">
        <div className="addresses-title-block">
          <span className="addresses-eyebrow">MY ACCOUNT</span>
          <h1 className="addresses-page-title">My Wishlist</h1>
          <p className="addresses-page-subtitle">
            Your saved favourites, all in one place.
          </p>
        </div>
        {wishlist.length > 0 && (
          <div className="wishlist-header-badge-wrap">
            <span className="orders-count-pill wishlist-count-badge">
              {wishlist.length} {wishlist.length === 1 ? "Saved Item" : "Saved Items"}
            </span>
          </div>
        )}
      </div>

      {/* 2. Dynamic Summary Cards */}
      <div className="addresses-summary-grid wishlist-summary-grid">
        {/* Card 1: Saved Items */}
        <div className="summary-stat-card">
          <div className="stat-icon-circle gold">
            <LuHeart />
          </div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-number">{savedCount}</span>
            </div>
            <span className="stat-label">Saved Items</span>
            <span className="stat-desc">Products bookmarked in your wishlist</span>
          </div>
        </div>

        {/* Card 2: Available Now */}
        <div className="summary-stat-card">
          <div className="stat-icon-circle gold">
            <LuShoppingBag />
          </div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-number">{availableCount}</span>
            </div>
            <span className="stat-label">Available Now</span>
            <span className="stat-desc">In stock and ready to order</span>
          </div>
        </div>

        {/* Card 3: Ready to Shop */}
        <div
          className="summary-stat-card informational"
          onClick={() => navigate("/products")}
          style={{ cursor: "pointer" }}
        >
          <div className="stat-icon-circle gold">
            <LuSparkles />
          </div>
          <div className="stat-content">
            <span className="stat-label prominent">Ready to Shop</span>
            <span className="stat-desc">Discover new seasonal fashion drops ›</span>
          </div>
        </div>
      </div>

      {/* 3. Product Grid or Empty State */}
      {wishlist.length > 0 ? (
        <div className="wishlist-grid">
          {wishlist.map((product) => {
            if (!product) return null;
            const inCart = Array.isArray(cart) && cart.some((item) => item?.id === product.id);
            const displayImg = getProductImageUrl(product);
            const displayPrice = typeof product.price === "number" ? product.price : 0;
            const displayOldPrice =
              typeof product.oldPrice === "number" && product.oldPrice > displayPrice
                ? product.oldPrice
                : null;
            const brandOrCategory = product.specifications?.Brand || product.category || "Moxie";

            return (
              <article
                key={product.id}
                className="wishlist-card"
                aria-label={product.name || "Wishlist item"}
              >
                {/* Image Area */}
                <div className="wishlist-media-wrap">
                  <Link
                    to={`/products/${product.id}`}
                    className="wishlist-img-link"
                    aria-label={`View ${product.name}`}
                  >
                    <img
                      src={displayImg}
                      alt={product.name || "Product"}
                      className="wishlist-product-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = NEUTRAL_PLACEHOLDER;
                      }}
                    />
                  </Link>

                  {/* Active Heart Removal Button */}
                  <button
                    type="button"
                    className="wishlist-heart-btn"
                    title="Remove from Wishlist"
                    aria-label={`Remove ${product.name} from wishlist`}
                    onClick={(e) => handleRemove(e, product.id, product.name)}
                  >
                    <LuHeart className="wishlist-heart-icon active" />
                  </button>

                  {product.discount > 0 && (
                    <span className="wishlist-discount-badge">{product.discount}% OFF</span>
                  )}
                </div>

                {/* Card Body */}
                <div className="wishlist-card-body">
                  <span className="wishlist-brand-tag">{brandOrCategory}</span>
                  <h2 className="wishlist-product-name">
                    <Link to={`/products/${product.id}`} className="wishlist-name-link">
                      {product.name || "Moxie Exclusive"}
                    </Link>
                  </h2>

                  <div className="wishlist-price-row">
                    <span className="wishlist-current-price">
                      ₹{displayPrice.toLocaleString("en-IN")}
                    </span>
                    {displayOldPrice && (
                      <del className="wishlist-old-price">
                        ₹{displayOldPrice.toLocaleString("en-IN")}
                      </del>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="wishlist-actions-row">
                    <button
                      type="button"
                      className={`wishlist-add-cart-btn ${inCart ? "in-cart" : ""}`}
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      <LuShoppingCart className="wishlist-btn-icon" aria-hidden="true" />
                      <span>{inCart ? "In Cart (Add +1)" : "Add to Cart"}</span>
                    </button>

                    <button
                      type="button"
                      className="wishlist-remove-btn"
                      onClick={(e) => handleRemove(e, product.id, product.name)}
                    >
                      <LuTrash2 className="wishlist-btn-icon" aria-hidden="true" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="addresses-empty-state wishlist-empty-box">
          <div className="addresses-empty-icon-wrap" aria-hidden="true">
            <LuHeart className="orders-empty-icon" />
          </div>
          <h3 className="addresses-empty-title">Your wishlist is empty</h3>
          <p className="addresses-empty-subtitle">
            Save products you love and find them here anytime.
          </p>
          <button
            type="button"
            className="address-add-btn addresses-empty-add-btn wishlist-explore-btn"
            onClick={() => navigate("/products")}
          >
            Explore Products
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return wishlistContent;
  }

  return (
    <div className="account-page-wrapper">
      <main className="account-main-layout">
        {/* Mobile Select Tab Navigation */}
        <div className="profile-mobile-nav">
          <AccountMobileNav
            activeTab="wishlist"
            onSelectTab={(tab) => {
              if (tab !== "wishlist") {
                navigate("/profile", { state: { tab } });
              }
            }}
          />
        </div>

        {/* 2-Column Grid Layout matching My Address / Profile */}
        <div className="account-layout-grid">
          <ProfileSidebar
            activeTab="wishlist"
            profile={profile}
            onLogout={handleLogoutClick}
          />

          <section className="account-content-panel">
            {wishlistContent}
          </section>
        </div>

        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      </main>
    </div>
  );
}
