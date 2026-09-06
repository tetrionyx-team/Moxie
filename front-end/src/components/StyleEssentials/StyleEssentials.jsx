import React, { useState, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiShoppingBag } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { useData } from "../../context/DataContext";
import "./StyleEssentials.css";

// 2 T-Shirts & 2 Slipper / Slider Assets
import tshirt1Img from "../../assets/images/style/style_tshirt_1.jpg";
import tshirt2Img from "../../assets/images/style/style_tshirt_2.jpg";
import slipper1Img from "../../assets/images/style/style_slipper_1.jpg";
import slipper2Img from "../../assets/images/style/style_slipper_2.jpg";

// 4 Curated Style Essentials: 2 T-Shirts & 2 Slippers
const STYLE_ESSENTIALS_ITEMS = [
  {
    id: 201,
    category: "clothing",
    subcategory: "STREETWEAR",
    name: "Urban Cotton Oversized Black Graphic T-Shirt",
    price: 1499,
    oldPrice: 1799,
    discount: 15,
    image: tshirt1Img,
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: true,
  },
  {
    id: 202,
    category: "clothing",
    subcategory: "ESSENTIALS",
    name: "Essential Relaxed Fit Cotton Daily T-Shirt",
    price: 1199,
    oldPrice: 1499,
    discount: 20,
    image: tshirt2Img,
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: true,
  },
  {
    id: 203,
    category: "footwear",
    subcategory: "FOOTWEAR",
    name: "Comfort Foam Lightweight Street Sliders",
    price: 2499,
    oldPrice: null,
    discount: 0,
    image: slipper1Img,
    sizes: ["7", "8", "9", "10", "11"],
    stock: true,
  },
  {
    id: 204,
    category: "footwear",
    subcategory: "CASUALS",
    name: "Air Cushion Daily Streetwear Slide Slippers",
    price: 1799,
    oldPrice: 1999,
    discount: 10,
    image: slipper2Img,
    sizes: ["7", "8", "9", "10", "11"],
    stock: true,
  },
];

// Determine sizes for each product
const getProductSizeConfig = (product) => {
  if (!product) return { requiresSize: false, sizes: [] };

  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    return { requiresSize: true, sizes: product.sizes };
  }

  const cat = String(product.category || "").toLowerCase();
  const sub = String(product.subcategory || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  // Footwear / Slippers / Sliders / Shoes
  if (
    cat.includes("footwear") ||
    cat.includes("slipper") ||
    cat.includes("slider") ||
    cat.includes("shoe") ||
    sub.includes("footwear") ||
    sub.includes("slider") ||
    sub.includes("slipper") ||
    sub.includes("casual") ||
    name.includes("slider") ||
    name.includes("slipper") ||
    name.includes("shoe")
  ) {
    return { requiresSize: true, sizes: ["7", "8", "9", "10", "11"] };
  }

  // T-Shirts / Clothing / Streetwear / Essentials
  return { requiresSize: true, sizes: ["S", "M", "L", "XL", "XXL"] };
};

// Format currency safely in INR
const formatINR = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
};

// Format category label nicely
const formatCategoryLabel = (product) => {
  if (product.subcategory) {
    return product.subcategory.replaceAll("-", " ").toUpperCase();
  }
  if (product.category) {
    return product.category.replaceAll("-", " ").toUpperCase();
  }
  return "ESSENTIALS";
};

// Individual Style Product Card
function StyleCard({ product }) {
  const { cart, addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();

  const [selectedSize, setSelectedSize] = useState(null);

  if (!product) return null;

  const sizeConfig = getProductSizeConfig(product);
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
    setSelectedSize((prev) => (prev === size ? null : size));
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock === false) {
      if (toast) toast("Item is currently out of stock");
      return;
    }

    if (sizeConfig.requiresSize && !selectedSize) {
      if (toast) {
        toast("Please select a size.");
      }
      return;
    }

    if (addToCart) {
      const cartItem = selectedSize
        ? { ...product, selectedSize }
        : { ...product };
      addToCart(cartItem, 1);
      if (toast) {
        const sizeInfo = selectedSize ? ` (Size ${selectedSize})` : "";
        toast(`${product.name}${sizeInfo} added to cart`);
      }
    }
  };

  const productLink =
    product.id && typeof product.id === "number" && product.id <= 100
      ? `/products/${product.id}`
      : `/products/${(product.category || "clothing").toLowerCase().replaceAll(" ", "-")}`;

  const hasDiscount =
    product.discount &&
    product.discount > 0 &&
    product.oldPrice &&
    product.oldPrice > product.price;

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
            src={product.image}
            alt={product.name}
            className="style-card-img"
            loading="lazy"
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

        {/* Size Selector */}
        {sizeConfig.requiresSize && (
          <div className="style-size-section">
            <span className="style-size-label">Select Size</span>
            <div
              className="style-size-options"
              role="radiogroup"
              aria-label="Size options"
            >
              {sizeConfig.sizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    className={`style-size-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSizeClick(size)}
                    aria-checked={isSelected}
                    role="radio"
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
          {product.oldPrice && product.oldPrice > product.price && (
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
            disabled={product.stock === false}
            aria-label={`Add ${product.name} to cart`}
          >
            <FiShoppingBag className="style-cart-icon" />
            {product.stock === false
              ? "OUT OF STOCK"
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

  // Display the 4 Style Essentials (2 T-shirts and 2 Slippers), mapped with backend IDs if available
  const displayProducts = useMemo(() => {
    const nonWatches = (products || []).filter((p) => {
      const cat = String(p.category || "").toLowerCase();
      return !cat.includes("watch");
    });

    return STYLE_ESSENTIALS_ITEMS.map((item, index) => {
      const matchedBackend = nonWatches[index];
      if (matchedBackend) {
        return {
          ...item,
          id: matchedBackend.id,
          // maintain clean bespoke t-shirt and slipper images
          image: item.image,
        };
      }
      return item;
    });
  }, [products]);

  return (
    <section className="style-essentials-section" aria-label="Style Essentials">
      <div className="style-essentials-container">
        {/* Section Header */}
        <header className="style-essentials-header">
          <span className="style-essentials-subtitle">Complete Your Look</span>
          <h2 className="style-essentials-title">STYLE ESSENTIALS</h2>
          <div className="style-essentials-line" aria-hidden="true" />
        </header>

        {/* Desktop 4-Card Row: 2 T-Shirts & 2 Slippers */}
        <div className="style-essentials-grid">
          {displayProducts.map((product) => (
            <StyleCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
