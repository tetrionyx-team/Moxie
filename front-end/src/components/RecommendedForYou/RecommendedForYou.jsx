import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { useData } from "../../context/DataContext";
import "./RecommendedForYou.css";

// 8 Watch Images matching user specifications
import watch1Img from "../../assets/images/recommended/watch_1_black_gold.jpeg";
import watch2Img from "../../assets/images/recommended/watch_2_two_tone.jpeg";
import watch3Img from "../../assets/images/recommended/watch_3_silver_black.jpeg";
import watch4Img from "../../assets/images/recommended/watch_4_silver_blue.jpeg";
import watch5Img from "../../assets/images/recommended/watch_5_orange_skeleton.png";
import watch6Img from "../../assets/images/recommended/watch_6_vertu.png";
import watch7Img from "../../assets/images/recommended/watch_7_garmin.png";
import watch8Img from "../../assets/images/recommended/watch_8_beige.png";

// Exact 8 Watch Collection from user reference
const RECOMMENDED_WATCHES = [
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

  const backendWatches = products.filter((p) =>
    String(p.category || "").toLowerCase().includes("watch")
  );

  const handleWishlistClick = (e, watchItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleWishlist) {
      toggleWishlist(watchItem);
      const isWished = isInWishlist ? isInWishlist(watchItem.id) : false;
      if (toast) {
        toast(isWished ? "Removed from wishlist" : "Saved to wishlist");
      }
    }
  };

  const handleAddToCart = (e, watchItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (addToCart) {
      addToCart(watchItem);
      if (toast) {
        toast(`${watchItem.name} added to cart`);
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
            to="/products/watches"
            className="recommended-view-all"
            aria-label="View all watches"
          >
            View All →
          </Link>
        </div>

        {/* 8 Watch Cards Grid: Spaced Evenly (4 per row desktop, 2 tablet, 1 mobile) */}
        <div className="recommended-grid">
          {RECOMMENDED_WATCHES.map((watch, index) => {
            const inCart = cart?.some((item) => item.id === watch.id);
            const isWished = isInWishlist ? isInWishlist(watch.id) : false;

            const targetLink = backendWatches[index]?.id
              ? `/products/${backendWatches[index].id}`
              : "/products/watches";

            return (
              <article key={watch.id} className="watch-card-item">
                <Link
                  to={targetLink}
                  className="watch-card-link"
                  aria-label={watch.name}
                >
                  {/* Top Image Media Area */}
                  <div className="watch-card-media product-image-container">
                    {watch.discount > 0 && (
                      <span className="watch-discount-badge">
                        {watch.discount}% OFF
                      </span>
                    )}

                    <button
                      type="button"
                      className={`watch-heart-btn ${isWished ? "active" : ""}`}
                      onClick={(e) => handleWishlistClick(e, watch)}
                      aria-label={
                        isWished ? "Remove from wishlist" : "Add to wishlist"
                      }
                    >
                      {isWished ? <FaHeart /> : <FaRegHeart />}
                    </button>

                    <img
                      src={watch.image}
                      alt={watch.name}
                      className="watch-card-img"
                      loading="lazy"
                    />
                  </div>

                  {/* Watch Card Body */}
                  <div className="watch-card-body">
                    <span className="watch-brand-name">{watch.brand}</span>
                    <h3 className="watch-product-title">{watch.name}</h3>

                    {/* Price and Rating Row */}
                    <div className="watch-price-row">
                      <strong className="watch-current-price">
                        ₹{watch.price.toLocaleString("en-IN")}
                      </strong>
                      {watch.oldPrice && (
                        <span className="watch-old-price">
                          ₹{watch.oldPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                      {watch.rating && (
                        <div className="watch-rating-row">
                          <span className="watch-star-icon">★</span>
                          <span className="watch-rating-val">{watch.rating}</span>
                          <span className="watch-rating-sep">|</span>
                          <span className="watch-review-count">
                            {watch.reviewCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Add to Cart Button (Dark Navy with Bag/Cart Icon) */}
                <div className="watch-btn-wrapper">
                  <button
                    type="button"
                    className={`watch-add-to-cart-btn ${inCart ? "added" : ""}`}
                    onClick={(e) => handleAddToCart(e, watch)}
                    aria-label={`Add ${watch.name} to cart`}
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
