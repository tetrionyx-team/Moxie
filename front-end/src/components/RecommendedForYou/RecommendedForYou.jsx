import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { useData } from "../../context/DataContext";
import "./RecommendedForYou.css";

import watchFallbackImg from "../../assets/images/watch1.png";

// Helper to filter ONLY real backend Watch products
export const isWatchProduct = (product) => {
  if (!product || product.is_active === false) return false;

  const catSlug = String(product.category_slug || product.category || "").toLowerCase();
  const catName = String(product.category_name || "").toLowerCase();
  const subSlug = String(product.subcategory_slug || product.subcategory || "").toLowerCase();
  const subName = String(product.subcategory_name || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  const watchKeywords = [
    "watch",
    "watches",
    "chronograph",
    "analog",
    "digital",
    "smartwatch",
    "smart-watch",
    "wrist-watch",
    "wristwatch",
  ];

  if (watchKeywords.some((k) => catSlug.includes(k) || catName.includes(k))) {
    return true;
  }

  if (watchKeywords.some((k) => subSlug.includes(k) || subName.includes(k))) {
    return true;
  }

  const unrelatedCategories = [
    "clothing",
    "footwear",
    "shoe",
    "shoes",
    "slider",
    "slipper",
    "cap",
    "gadget",
    "bag",
    "electronics",
  ];

  const isUnrelated = unrelatedCategories.some(
    (u) => catSlug === u || catSlug.startsWith(`${u}-`) || catName.includes(u)
  );

  if (!isUnrelated && watchKeywords.some((k) => name.includes(k))) {
    return true;
  }

  return false;
};

export default function RecommendedForYou() {
  const { cart, addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();
  const { products = [] } = useData() || {};

  // Filter ONLY backend Watch products and limit to 2 rows (max 8 products on desktop)
  const displayProducts = useMemo(() => {
    const watchProducts = (products || []).filter((p) => isWatchProduct(p));
    return watchProducts.slice(0, 8);
  }, [products]);

  // Cleanly hide section if zero Watch products exist in backend
  if (!displayProducts || displayProducts.length === 0) {
    return null;
  }

  const handleWishlistClick = (e, productItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleWishlist) {
      toggleWishlist(productItem);
      const isWished = isInWishlist ? isInWishlist(productItem.id) : false;
      if (toast) {
        toast(isWished ? "Removed from wishlist" : "Saved to wishlist");
      }
    }
  };

  const handleAddToCart = (e, productItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (productItem.stock === false || productItem.rawStock <= 0) {
      if (toast) toast("Item is currently out of stock");
      return;
    }

    if (addToCart) {
      addToCart(productItem, 1);
      if (toast) {
        toast(`${productItem.name} added to cart`);
      }
    }
  };

  return (
    <section className="recommended-section" aria-label="Recommended For You">
      <div className="recommended-container">
        {/* Section Header: Subtitle & Title Centered, View All on the Right */}
        <div className="recommended-header">
          <div className="recommended-header-center">
            <span className="recommended-subtitle">MOXIE GADGETS & STYLE</span>
            <h2 className="recommended-title">RECOMMENDED FOR YOU</h2>
          </div>
          <Link
            to="/products?category=watches"
            className="recommended-view-all"
            aria-label="View all Watch products"
          >
            View All →
          </Link>
        </div>

        {/* Product Cards Grid with Recommended Watch Card Style (max 2 rows) */}
        <div className="recommended-grid">
          {displayProducts.map((product) => {
            const inCart = cart?.some((item) => item.id === product.id);
            const isWished = isInWishlist ? isInWishlist(product.id) : false;
            const cardImage = product.image || watchFallbackImg;

            const brandLabel =
              product.brand ||
              product.specifications?.Brand ||
              (product.category_name && !product.category_name.toLowerCase().includes("all")
                ? product.category_name.toUpperCase()
                : "WATCHES");

            const hasDiscount =
              Boolean(product.discount) &&
              product.discount > 0 &&
              Boolean(product.oldPrice) &&
              Number(product.oldPrice) > Number(product.price);

            const hasOldPrice =
              Boolean(product.oldPrice) &&
              Number(product.oldPrice) > Number(product.price);

            const hasRating = Boolean(product.rating) && Number(product.rating) > 0;

            const targetLink = `/product/${product.id}`;

            return (
              <article key={product.id} className="watch-card-item">
                <Link
                  to={targetLink}
                  className="watch-card-link"
                  aria-label={product.name}
                >
                  {/* Top Image Media Area */}
                  <div className="watch-card-media product-image-container">
                    {hasDiscount && (
                      <span className="watch-discount-badge">
                        {product.discount}% OFF
                      </span>
                    )}

                    <button
                      type="button"
                      className={`watch-heart-btn ${isWished ? "active" : ""}`}
                      onClick={(e) => handleWishlistClick(e, product)}
                      aria-label={
                        isWished ? "Remove from wishlist" : "Add to wishlist"
                      }
                    >
                      {isWished ? <FaHeart /> : <FaRegHeart />}
                    </button>

                    <img
                      src={cardImage}
                      alt={product.name}
                      className="watch-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = watchFallbackImg;
                      }}
                    />
                  </div>

                  {/* Product Card Body */}
                  <div className="watch-card-body">
                    {brandLabel && <span className="watch-brand-name">{brandLabel}</span>}
                    <h3 className="watch-product-title" title={product.name}>
                      {product.name}
                    </h3>

                    {/* Price and Rating Row */}
                    <div className="watch-price-row">
                      <strong className="watch-current-price">
                        ₹{Number(product.price || 0).toLocaleString("en-IN")}
                      </strong>
                      {hasOldPrice && (
                        <span className="watch-old-price">
                          ₹{Number(product.oldPrice || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                      {hasRating && (
                        <div className="watch-rating-row">
                          <span className="watch-star-icon">★</span>
                          <span className="watch-rating-val">{product.rating}</span>
                          {product.reviewCount ? (
                            <>
                              <span className="watch-rating-sep">|</span>
                              <span className="watch-review-count">
                                {product.reviewCount}
                              </span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Add to Cart Button */}
                <div className="watch-btn-wrapper">
                  <button
                    type="button"
                    className={`watch-add-to-cart-btn ${inCart ? "added" : ""}`}
                    onClick={(e) => handleAddToCart(e, product)}
                    aria-label={`Add ${product.name} to cart`}
                    disabled={product.stock === false}
                  >
                    <FiShoppingBag className="watch-cart-icon" />
                    {product.stock === false
                      ? "OUT OF STOCK"
                      : inCart
                      ? "IN CART (+)"
                      : "ADD TO CART"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
