import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WishlistContext } from "../../context/WishlistContext";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { profileService } from "../../services/profileService";
import ProfileSidebar from "../../components/Profile/ProfileSidebar";
import LogoutConfirmModal from "../../components/account/LogoutConfirmModal";
import { LuHeart, LuShoppingCart, LuTrash2 } from "react-icons/lu";

import watchImg from "../../assets/images/watch1.png";
import shoeImg from "../../assets/images/shoe.svg";
import capImg from "../../assets/images/cap.png";
import budsImg from "../../assets/images/Buds.png";
import defaultImg from "../../assets/images/offer.png";

import "./Wishlist.css";
import "../../components/Profile/Profile.css";

const getFallbackImage = (category) => {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("watch")) return watchImg;
  if (cat.includes("footwear") || cat.includes("shoe") || cat.includes("slider")) return shoeImg;
  if (cat.includes("cap")) return capImg;
  if (cat.includes("gadget") || cat.includes("bud")) return budsImg;
  return defaultImg;
};

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

  const wishlistContent = (
    <div className="wishlist-inner-container">
      {/* Page Header */}
      <div className="profile-header-wrap wishlist-header-wrap">
        <div>
          <h1 className="profile-page-title wishlist-title">My Wishlist</h1>
          <p className="profile-page-subtitle">Your saved favourites, all in one place.</p>
        </div>
        {wishlist.length > 0 && (
          <span className="orders-count-pill wishlist-count-badge">
            {wishlist.length} {wishlist.length === 1 ? "Saved Item" : "Saved Items"}
          </span>
        )}
      </div>

      {/* Grid or Empty State */}
      {wishlist.length > 0 ? (
        <div className="wishlist-grid">
          {wishlist.map((product) => {
            if (!product) return null;
            const inCart = Array.isArray(cart) && cart.some((item) => item?.id === product.id);
            const fallback = getFallbackImage(product.category);
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
                      src={product.image || fallback}
                      alt={product.name || "Product"}
                      className="wishlist-product-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = fallback;
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
        <div className="orders-empty-state wishlist-empty-box">
          <div className="orders-empty-icon-wrap" aria-hidden="true">
            <LuHeart className="orders-empty-icon" />
          </div>
          <h2 className="orders-empty-title">Your wishlist is empty</h2>
          <p className="orders-empty-desc">
            Save products you love and find them here anytime.
          </p>
          <button
            type="button"
            className="orders-empty-btn wishlist-explore-btn"
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
    <main className="profile-page-container container page-shell wishlist-page-main">
      {/* Mobile Select Tab Navigation */}
      <div className="profile-mobile-nav">
        <select
          className="profile-mobile-select"
          value="wishlist"
          onChange={(e) => {
            if (e.target.value === "wishlist") {
              navigate("/wishlist");
            } else {
              navigate("/profile", { state: { tab: e.target.value } });
            }
          }}
        >
          <option value="profile">My Profile</option>
          <option value="orders">My Orders</option>
          <option value="wishlist">My Wishlist</option>
          <option value="addresses">My Addresses</option>
          <option value="security">Account & Security</option>
        </select>
      </div>

      <div className="profile-layout-grid">
        <ProfileSidebar
          activeTab="wishlist"
          profile={profile}
          onLogout={handleLogoutClick}
        />
        <div className="profile-content-card wishlist-content-card">
          {wishlistContent}
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </main>
  );
}
