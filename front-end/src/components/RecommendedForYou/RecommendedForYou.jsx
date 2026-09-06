import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { useData } from "../../context/DataContext";
import "./RecommendedForYou.css";

import watch1Img from "../../assets/images/recommended/watch_1_black_gold.jpeg";
import watch2Img from "../../assets/images/recommended/watch_2_two_tone.jpeg";
import watch3Img from "../../assets/images/recommended/watch_3_silver_black.jpeg";
import watch4Img from "../../assets/images/recommended/watch_4_silver_blue.jpeg";
import watch5Img from "../../assets/images/recommended/watch_5_orange_skeleton.png";
import watch6Img from "../../assets/images/recommended/watch_6_vertu.png";
import watch7Img from "../../assets/images/recommended/watch_7_garmin.png";
import watch8Img from "../../assets/images/recommended/watch_8_beige.png";

import watchImg from "../../assets/images/watch1.png";
import shoeImg from "../../assets/images/shoe.svg";
import capImg from "../../assets/images/cap.png";
import budsImg from "../../assets/images/Buds.png";
import defaultImg from "../../assets/images/offer.png";

const getFallbackImage = (categorySlug) => {
  const slug = String(categorySlug || "").toLowerCase();
  if (slug.includes("watch")) return watchImg;
  if (slug.includes("footwear") || slug.includes("shoe") || slug.includes("slider")) return shoeImg;
  if (slug.includes("cap")) return capImg;
  if (slug.includes("gadget") || slug.includes("bud")) return budsImg;
  return defaultImg;
};

// Fallback items if database hasn't loaded yet
const FALLBACK_RECOMMENDED = [
  {
    id: 101,
    brand: "CASIO",
    name: "Edifice Men Chronograph Black Gold Watch",
    price: 9999,
    image: watch1Img,
    category: "watches",
    stock: true,
  },
  {
    id: 102,
    brand: "CASIO",
    name: "Edifice Men Chronograph Two Tone Watch",
    price: 10999,
    image: watch2Img,
    category: "watches",
    stock: true,
  },
  {
    id: 103,
    brand: "CASIO",
    name: "Edifice Men Chronograph Classic Black Watch",
    price: 9499,
    image: watch3Img,
    category: "watches",
    stock: true,
  },
  {
    id: 104,
    brand: "CASIO",
    name: "Edifice Men Chronograph Blue Dial Watch",
    price: 9999,
    image: watch4Img,
    category: "watches",
    stock: true,
  },
  {
    id: 105,
    brand: "JACOB & CO",
    name: "Jacob & Co Inspired Skeleton Orange Watch",
    price: 12999,
    image: watch5Img,
    category: "watches",
    stock: true,
  },
  {
    id: 106,
    brand: "OBLIK",
    name: "Vertu Men Quartz Blue Dial Chronograph Leather Watch...",
    price: 9600,
    oldPrice: 28299,
    image: watch6Img,
    category: "watches",
    stock: true,
  },
  {
    id: 107,
    brand: "GARMIN",
    name: "FORERUNNER Unisex Quartz Black Dial Digital Silicone Watch 010-...",
    price: 25990,
    oldPrice: 28299,
    discount: 18,
    rating: 4.5,
    reviewCount: 90,
    image: watch7Img,
    category: "watches",
    stock: true,
  },
  {
    id: 108,
    brand: "CASIO",
    name: "Edifice Men Quartz Beige Dial Chronograph Leather Watch EX303",
    price: 7795,
    image: watch8Img,
    category: "watches",
    stock: true,
  },
];

export default function RecommendedForYou() {
  const { cart, addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();
  const { products = [] } = useData() || {};

  // Use all products from database; fallback to static items if empty
  const displayProducts = products.length > 0 ? products : FALLBACK_RECOMMENDED;

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
    if (addToCart) {
      addToCart(productItem);
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
            to="/products"
            className="recommended-view-all"
            aria-label="View all products"
          >
            View All →
          </Link>
        </div>

        {/* Product Cards Grid with Recommended Card Style */}
        <div className="recommended-grid">
          {displayProducts.map((product) => {
            const inCart = cart?.some((item) => item.id === product.id);
            const isWished = isInWishlist ? isInWishlist(product.id) : false;
            const fallback = getFallbackImage(product.category);
            const cardImage = product.image || fallback;

            const brandName =
              product.brand ||
              product.specifications?.Brand ||
              (product.category ? String(product.category).toUpperCase() : "MOXIE");

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
                    {product.discount > 0 && (
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
                        e.currentTarget.src = fallback;
                      }}
                    />
                  </div>

                  {/* Product Card Body */}
                  <div className="watch-card-body">
                    <span className="watch-brand-name">{brandName}</span>
                    <h3 className="watch-product-title">{product.name}</h3>

                    {/* Price and Rating Row */}
                    <div className="watch-price-row">
                      <strong className="watch-current-price">
                        ₹{Number(product.price || 0).toLocaleString("en-IN")}
                      </strong>
                      {product.oldPrice && (
                        <span className="watch-old-price">
                          ₹{Number(product.oldPrice || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                      {product.rating && (
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
                  >
                    <FiShoppingBag className="watch-cart-icon" />
                    {inCart ? "IN CART (+)" : "ADD TO CART"}
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
