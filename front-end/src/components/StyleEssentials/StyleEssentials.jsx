import React, { useState, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { useData } from "../../context/DataContext";
import { getSaleState, getSaleStateLabel } from "../../utils/inventory";
import "./StyleEssentials.css";

import shoeFallbackImg from "../../assets/images/shoe.svg";
import defaultFallbackImg from "../../assets/images/offer.png";

// Helper: check if a product belongs to Style Essentials (Clothing/Apparel or Footwear)
export const isStyleEssentialsProduct = (product) => {
  if (!product || product.is_active === false) return false;

  const catSlug = String(product.category_slug || product.category || "").toLowerCase();
  const catName = String(product.category_name || "").toLowerCase();
  const subSlug = String(product.subcategory_slug || product.subcategory || "").toLowerCase();
  const subName = String(product.subcategory_name || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  const clothingKeywords = [
    "clothing",
    "apparel",
    "shirt",
    "shirts",
    "t-shirt",
    "t-shirts",
    "tshirt",
    "tshirts",
    "oversized",
    "hoodie",
    "hoodies",
    "sweatshirt",
    "sweatshirts",
    "top",
    "tops",
    "streetwear",
    "essentials",
  ];

  const footwearKeywords = [
    "footwear",
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "slipper",
    "slippers",
    "slide",
    "slides",
    "slider",
    "sliders",
    "sandal",
    "sandals",
    "flip-flop",
    "flipflop",
  ];

  const hasClothingCat = clothingKeywords.some(
    (k) => catSlug.includes(k) || catName.includes(k)
  );
  const hasFootwearCat = footwearKeywords.some(
    (k) => catSlug.includes(k) || catName.includes(k)
  );

  if (hasClothingCat || hasFootwearCat) return true;

  const hasClothingSub = clothingKeywords.some(
    (k) => subSlug.includes(k) || subName.includes(k)
  );
  const hasFootwearSub = footwearKeywords.some(
    (k) => subSlug.includes(k) || subName.includes(k)
  );

  const unrelatedCategories = [
    "watch",
    "watches",
    "gadget",
    "gadgets",
    "bud",
    "buds",
    "bag",
    "bags",
    "beauty",
    "electronics",
  ];

  const isUnrelatedCat = unrelatedCategories.some(
    (u) => catSlug.includes(u) || catName.includes(u)
  );

  if ((hasClothingSub || hasFootwearSub) && !isUnrelatedCat) {
    return true;
  }

  if (
    !isUnrelatedCat &&
    (clothingKeywords.some((k) => name.includes(k)) ||
      footwearKeywords.some((k) => name.includes(k)))
  ) {
    return true;
  }

  return false;
};

// Format currency safely in INR
const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
};

// Format category label nicely
const formatCategoryLabel = (product) => {
  if (product.subcategory_name) {
    return product.subcategory_name.toUpperCase();
  }
  if (product.subcategory) {
    return String(product.subcategory).replaceAll("-", " ").toUpperCase();
  }
  if (product.category_name) {
    return product.category_name.toUpperCase();
  }
  if (product.category) {
    return String(product.category).replaceAll("-", " ").toUpperCase();
  }
  return "STYLE ESSENTIAL";
};

// Get clean fallback image if primary fails
const getProductFallback = (product) => {
  const cat = String(product.category || "").toLowerCase();
  if (
    cat.includes("footwear") ||
    cat.includes("shoe") ||
    cat.includes("slider") ||
    cat.includes("slipper")
  ) {
    return shoeFallbackImg;
  }
  return defaultFallbackImg;
};

// Individual Dynamic Style Product Card
function StyleCard({ product }) {
  const { cart, addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();

  const [selectedSize, setSelectedSize] = useState(null);

  // Extract ONLY real backend sizes
  const availableSizes = useMemo(() => {
    if (!product) return [];
    const rawSizes = [];
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      rawSizes.push(...product.sizes);
    }
    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        if (Array.isArray(v.sizes)) {
          rawSizes.push(...v.sizes);
        }
      });
    }
    // Unique list of non-empty sizes
    return Array.from(new Set(rawSizes.map((s) => String(s).trim()))).filter(
      Boolean
    );
  }, [product]);

  if (!product) return null;

  // Check stock per size
  const isSizeInStock = (size) => {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const matchingVariants = product.variants.filter(
        (v) =>
          v.is_active !== false &&
          Array.isArray(v.sizes) &&
          v.sizes.includes(size)
      );
      if (matchingVariants.length > 0) {
        return matchingVariants.some((v) => Number(v.stock || 0) > 0);
      }
    }
    return product.stock !== false && (product.rawStock || 0) > 0;
  };

  const saleState = getSaleState(product);
  const isAvailable = saleState === "in_stock";
  const stateLabel = getSaleStateLabel(saleState);

  const isWished = isInWishlist ? isInWishlist(product.id) : false;
  const inCart = cart?.some(
    (item) =>
      item.id === product.id &&
      (!item.selectedSize || item.selectedSize === selectedSize)
  );

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleWishlist) {
      toggleWishlist(product);
      if (toast) {
        toast(isWished ? "Removed from wishlist" : "Saved to wishlist");
      }
    }
  };

  const handleSizeClick = (size) => {
    if (!isSizeInStock(size)) return;
    setSelectedSize((prev) => (prev === size ? null : size));
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAvailable) {
      if (toast) toast("Item is currently out of stock");
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      if (toast) {
        toast("Please select a size.");
      }
      return;
    }

    if (addToCart) {
      let matchedVariant = null;
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        if (selectedSize) {
          matchedVariant =
            product.variants.find(
              (v) =>
                v.is_active !== false &&
                Array.isArray(v.sizes) &&
                v.sizes.includes(selectedSize) &&
                Number(v.stock || 0) > 0
            ) ||
            product.variants.find(
              (v) =>
                Array.isArray(v.sizes) && v.sizes.includes(selectedSize)
            ) ||
            product.variants[0];
        } else {
          matchedVariant = product.variants[0];
        }
      }

      const cartItem = {
        ...product,
        variant_id: matchedVariant?.id || null,
        selectedSize: selectedSize || null,
        price: matchedVariant?.price || product.price,
        stock: matchedVariant ? matchedVariant.stock : product.rawStock,
      };

      addToCart(cartItem, 1);
      if (toast) {
        const sizeInfo = selectedSize ? ` (Size ${selectedSize})` : "";
        toast(`${product.name}${sizeInfo} added to cart`);
      }
    }
  };

  const productLink = `/product/${product.id}`;

  const hasDiscount =
    Boolean(product.discount) &&
    product.discount > 0 &&
    Boolean(product.oldPrice) &&
    Number(product.oldPrice) > Number(product.price);

  const fallback = getProductFallback(product);
  const cardImage = product.image || fallback;

  return (
    <article className="style-essential-card">
      {/* Media Top Container */}
      <div className="style-card-media">
        {hasDiscount && (
          <span className="style-discount-badge">{product.discount}% OFF</span>
        )}

        <button
          type="button"
          className={`style-wishlist-btn ${isWished ? "active" : ""}`}
          onClick={handleWishlistClick}
          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
        >
          {isWished ? <FaHeart /> : <FaRegHeart />}
        </button>

        <Link
          to={productLink}
          className="style-card-img-link"
          aria-label={product.name}
        >
          <img
            src={cardImage}
            alt={product.name}
            className="style-card-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallback;
            }}
          />
        </Link>
      </div>

      {/* Card Content Area */}
      <div className="style-card-body">
        {/* Category Label */}
        <span className="style-card-category">
          {formatCategoryLabel(product)}
        </span>

        {/* Product Name */}
        <Link to={productLink} className="style-card-name-link">
          <h3 className="style-card-name" title={product.name}>
            {product.name}
          </h3>
        </Link>

        {/* Size Selector - ONLY shown when backend product has sizes */}
        {availableSizes.length > 0 && (
          <div className="style-size-section">
            <span className="style-size-label">Select Size</span>
            <div
              className="style-size-options"
              role="radiogroup"
              aria-label="Size options"
            >
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                const inStock = isSizeInStock(size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={`style-size-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSizeClick(size)}
                    aria-checked={isSelected}
                    role="radio"
                    disabled={!inStock}
                    title={!inStock ? `Size ${size} Out of Stock` : `Size ${size}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Divider & Display */}
        <div className="style-price-divider">
          <strong className="style-current-price">
            ₹{formatINR(product.price)}
          </strong>
          {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
            <span className="style-old-price">
              ₹{formatINR(product.oldPrice)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <div className="style-cart-btn-wrapper">
          <button
            type="button"
            className="style-add-cart-btn"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            aria-label={`Add ${product.name} to cart`}
          >
            <FiShoppingBag className="style-cart-icon" />
            {!isAvailable
              ? stateLabel?.toUpperCase() || "OUT OF STOCK"
              : inCart
              ? "ADD ANOTHER"
              : "ADD TO CART"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function StyleEssentials() {
  const { products = [] } = useData() || {};

  // Filter ONLY real backend Style Essentials products (Clothing & Footwear)
  const matchingProducts = useMemo(() => {
    return (products || []).filter((p) => isStyleEssentialsProduct(p));
  }, [products]);

  // Display at most 2 rows on Home (Desktop: 4 columns x 2 rows = max 8 products)
  const displayProducts = useMemo(() => {
    return matchingProducts.slice(0, 8);
  }, [matchingProducts]);

  // Cleanly hide if no matching products exist in backend
  if (!displayProducts || displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="style-essentials-section" aria-label="Style Essentials">
      <div className="style-essentials-container">
        {/* Section Header with View All Link on Top-Right */}
        <header className="style-essentials-header">
          <div className="style-essentials-header-center">
            <span className="style-essentials-subtitle">Complete Your Look</span>
            <h2 className="style-essentials-title">STYLE ESSENTIALS</h2>
            <div className="style-essentials-line" aria-hidden="true" />
          </div>

          <Link
            to="/products?collection=style-essentials"
            className="style-essentials-view-all"
            aria-label="View all Style Essentials products"
          >
            View All →
          </Link>
        </header>

        {/* Dynamic Product Grid: Desktop 4 columns x max 2 rows */}
        <div className="style-essentials-grid">
          {displayProducts.map((product) => (
            <StyleCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
