import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiShoppingBag, FiTruck, FiRotateCcw, FiShield, FiCheck, FiChevronRight, FiZoomIn, FiX } from "react-icons/fi";
import { FaHeart, FaRegHeart, FaStar, FaRegStar } from "react-icons/fa";
import { useData } from "../../context/DataContext";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { getSaleState, getSaleStateLabel } from "../../utils/inventory";
import ProductCard from "../../components/Product/ProductCard";
import { getProductReviews } from "../../api/reviewApi";
import "./ProductDetails.css";

import watchImg from "../../assets/images/watch1.png";
import shoeImg from "../../assets/images/shoe.svg";
import capImg from "../../assets/images/cap.png";
import budsImg from "../../assets/images/Buds.png";
import defaultImg from "../../assets/images/offer.png";

const getFallbackImage = (categorySlug) => {
  const slug = String(categorySlug || "").toLowerCase();
  if (slug.includes("watch")) return watchImg;
  if (slug.includes("footwear") || slug.includes("shoe") || slug.includes("slider") || slug.includes("slipper")) return shoeImg;
  if (slug.includes("cap")) return capImg;
  if (slug.includes("gadget") || slug.includes("bud")) return budsImg;
  return defaultImg;
};

export default function ProductDetails() {
  const { productId, category: paramCategory } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { products = [], storeSettings, loading } = useData() || {};

  const { cart = [], addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};

  const reviewsSectionRef = useRef(null);

  // Match active product by numeric or slug ID
  const product = useMemo(() => {
    return products.find(
      (i) =>
        i.id === Number(productId || paramCategory) ||
        String(i.id) === String(productId || paramCategory)
    );
  }, [products, productId, paramCategory]);

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Fetch product-specific reviews whenever product changes
  useEffect(() => {
    if (!product?.id) return;
    setLoadingReviews(true);
    getProductReviews(product.id)
      .then((data) => {
        setReviews(data || []);
      })
      .catch(() => {
        setReviews([]);
      })
      .finally(() => {
        setLoadingReviews(false);
      });
  }, [product?.id]);

  // Extract real colors dynamically from backend variants / product
  const backendColors = useMemo(() => {
    if (!product) return [];
    const map = new Map();

    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        const name = (v.color_name || "").trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            name: name,
            code: v.color_code && v.color_code.trim() ? v.color_code.trim() : null,
          });
        }
      });
    }

    if (map.size === 0 && Array.isArray(product.colors)) {
      product.colors.forEach((c) => {
        const name = (c || "").trim();
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), {
            name: name,
            code: (product.colorCodes && product.colorCodes[name]) || null,
          });
        }
      });
    }

    return Array.from(map.values());
  }, [product]);

  // Initializing state when product loads or switches
  useEffect(() => {
    if (!product) return;

    // Save product to recently viewed list in localStorage (up to 8 items)
    try {
      const viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
      const updated = [product.id, ...viewed.filter((id) => id !== product.id)].slice(0, 8);
      localStorage.setItem("recentlyViewed", JSON.stringify(updated));
    } catch {}

    setQuantity(1);
    setActiveImageIndex(0);

    // Initialize color from real backend colors
    if (backendColors.length > 0) {
      setSelectedColor(backendColors[0].name);
    } else {
      setSelectedColor(null);
    }
  }, [product, backendColors]);

  // Derive available sizes dynamically based on selected color / variants
  const availableSizes = useMemo(() => {
    if (!product) return [];

    if (selectedColor && Array.isArray(product.variants) && product.variants.length > 0) {
      const colorMatches = product.variants.filter(
        (v) => (v.color_name || "").toLowerCase() === selectedColor.toLowerCase()
      );
      const sizesFromVariants = Array.from(
        new Set(colorMatches.flatMap((v) => (Array.isArray(v.sizes) ? v.sizes : [])))
      ).filter(Boolean);

      if (sizesFromVariants.length > 0) {
        return sizesFromVariants;
      }
    }

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const allVarSizes = Array.from(
        new Set(product.variants.flatMap((v) => (Array.isArray(v.sizes) ? v.sizes : [])))
      ).filter(Boolean);
      if (allVarSizes.length > 0) return allVarSizes;
    }

    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes.filter(Boolean);
    }

    return [];
  }, [product, selectedColor]);

  // Sync selected size when availableSizes changes
  useEffect(() => {
    if (availableSizes.length > 0) {
      if (!selectedSize || !availableSizes.includes(selectedSize)) {
        setSelectedSize(availableSizes[0]);
      }
    } else {
      setSelectedSize(null);
    }
  }, [availableSizes, selectedSize]);

  // Resolve exact backend variant from selectedColor + selectedSize combination
  const selectedVariant = useMemo(() => {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) return null;

    if (selectedColor && selectedSize) {
      const exact = product.variants.find(
        (v) =>
          (v.color_name || "").toLowerCase() === selectedColor.toLowerCase() &&
          Array.isArray(v.sizes) &&
          v.sizes.map((s) => String(s).toLowerCase()).includes(String(selectedSize).toLowerCase())
      );
      if (exact) return exact;
    }

    if (selectedColor) {
      const colorMatch = product.variants.find(
        (v) => (v.color_name || "").toLowerCase() === selectedColor.toLowerCase()
      );
      if (colorMatch) return colorMatch;
    }

    if (selectedSize) {
      const sizeMatch = product.variants.find(
        (v) =>
          Array.isArray(v.sizes) &&
          v.sizes.map((s) => String(s).toLowerCase()).includes(String(selectedSize).toLowerCase())
      );
      if (sizeMatch) return sizeMatch;
    }

    return product.variants[0] || null;
  }, [product, selectedColor, selectedSize]);

  // Combine product gallery images with variant images strictly from backend
  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [];

    // Primary product image
    if (product.image) imgs.push(product.image);

    // Gallery images from ProductImage
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img && !imgs.includes(img)) imgs.push(img);
      });
    }

    // Variant images
    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        if (Array.isArray(v.images)) {
          v.images.forEach((vImg) => {
            if (vImg && !imgs.includes(vImg)) imgs.push(vImg);
          });
        }
      });
    }

    // Fallback if empty
    if (imgs.length === 0) {
      imgs.push(getFallbackImage(product.category));
    }

    return imgs;
  }, [product]);

  // If user selects color that has its own image, switch to that image
  const handleColorSelect = (colorName) => {
    setSelectedColor(colorName);
    const foundVar = (product?.variants || []).find(
      (v) => (v.color_name || "").toLowerCase() === colorName.toLowerCase()
    );
    if (foundVar && Array.isArray(foundVar.images) && foundVar.images.length > 0) {
      const vImg = foundVar.images[0];
      const idx = allImages.indexOf(vImg);
      if (idx !== -1) {
        setActiveImageIndex(idx);
      }
    }
  };

  // Pricing resolution (variant price override if available, else product price)
  const currentPrice = selectedVariant?.discount_price
    ? Number(selectedVariant.discount_price)
    : selectedVariant?.price
    ? Number(selectedVariant.price)
    : Number(product?.price || 0);

  const currentOldPrice = selectedVariant?.discount_price && selectedVariant?.price
    ? Number(selectedVariant.price)
    : product?.oldPrice
    ? Number(product.oldPrice)
    : null;

  const currentDiscount = currentOldPrice && currentOldPrice > currentPrice
    ? Math.round((1 - currentPrice / currentOldPrice) * 100)
    : (product?.discount || 0);

  const hasDiscount = currentDiscount > 0 && currentOldPrice && currentOldPrice > currentPrice;

  // Inventory / Stock resolution from backend
  const saleState = product ? getSaleState(product, selectedVariant) : "unavailable";
  const isAvailable = saleState === "in_stock";
  const stateLabel = getSaleStateLabel(saleState);

  const availableMaxStock = selectedVariant && selectedVariant.stock !== undefined
    ? Number(selectedVariant.stock)
    : product?.rawStock !== undefined
    ? Number(product.rawStock)
    : 99;

  // Rating & Review stats derived from real product-specific reviews
  const { averageRating, totalReviewsCount, ratingBreakdown } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return {
        averageRating: null,
        totalReviewsCount: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const total = reviews.length;
    let sum = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((r) => {
      const num = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
      counts[num] = (counts[num] || 0) + 1;
      sum += Number(r.rating || 5);
    });

    const avg = parseFloat((sum / total).toFixed(1));

    const breakdown = {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };

    return {
      averageRating: avg,
      totalReviewsCount: total,
      ratingBreakdown: breakdown,
    };
  }, [reviews]);

  // Related products filtered strictly from backend:
  // Priority: 1. same subcategory, 2. same category, 3. exclude current product, 4. active only, limit 4
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const others = products.filter((p) => p.id !== product.id && p.is_active !== false);

    if (product.subcategory) {
      const sameSub = others.filter(
        (p) =>
          (p.subcategory && p.subcategory.toLowerCase() === product.subcategory.toLowerCase()) ||
          (p.subcategory_slug &&
            p.subcategory_slug.toLowerCase() === (product.subcategory_slug || "").toLowerCase())
      );
      if (sameSub.length > 0) return sameSub.slice(0, 4);
    }

    const sameCat = others.filter(
      (p) =>
        (p.category && p.category.toLowerCase() === product.category.toLowerCase()) ||
        (p.category_slug &&
          p.category_slug.toLowerCase() === (product.category_slug || "").toLowerCase())
    );
    if (sameCat.length > 0) return sameCat.slice(0, 4);

    return others.slice(0, 4);
  }, [products, product]);

  if (loading) {
    return (
      <div className="product-detail-loading-screen">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading product details...</span>
        </div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <main className="product-detail-empty-container">
        <div className="product-empty-icon-circle">?</div>
        <h1>Product not found</h1>
        <p>The product you are looking for is unavailable or has been removed.</p>
        <Link className="primary-brand-btn" to="/products">
          Browse all products
        </Link>
      </main>
    );
  }

  const wished = isInWishlist ? isInWishlist(product.id) : false;
  const inCart = cart?.some((item) => item.id === product.id);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleWishlist) {
      toggleWishlist(product);
      if (toast) {
        toast(wished ? "Removed from wishlist" : "Saved to wishlist");
      }
    }
  };

  const handleAddToCart = () => {
    if (!isAvailable) {
      if (toast) toast("Item is currently not available for purchase");
      return;
    }

    if (backendColors.length > 0 && !selectedColor) {
      if (toast) toast("Please select a color option");
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      if (toast) toast("Please select a size option");
      return;
    }

    if (addToCart) {
      const cartItem = {
        ...product,
        price: currentPrice,
        oldPrice: currentOldPrice,
        discount: currentDiscount,
        image: activeMainImage,
        variant_id: selectedVariant?.id || null,
        selectedColor,
        selectedSize,
        selectedVariant,
      };
      addToCart(cartItem, quantity);
      const variantInfo = [selectedColor, selectedSize ? `Size ${selectedSize}` : ""]
        .filter(Boolean)
        .join(" / ");
      if (toast) {
        toast(`${product.name}${variantInfo ? ` (${variantInfo})` : ""} added to cart`);
      }
    }
  };

  const handleBuyNow = () => {
    if (!isAvailable) {
      if (toast) toast("Item is currently not available for purchase");
      return;
    }

    if (backendColors.length > 0 && !selectedColor) {
      if (toast) toast("Please select a color option");
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      if (toast) toast("Please select a size option");
      return;
    }

    const purchaseItem = {
      ...product,
      price: currentPrice,
      oldPrice: currentOldPrice,
      discount: currentDiscount,
      image: activeMainImage,
      variant_id: selectedVariant?.id || null,
      selectedColor,
      selectedSize,
      selectedVariant,
      quantity,
    };
    navigate("/checkout", { state: { checkoutItem: purchaseItem } });
  };

  const scrollToReviews = (e) => {
    e.preventDefault();
    setActiveTab("reviews");
    if (reviewsSectionRef.current) {
      reviewsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const activeMainImage = allImages[activeImageIndex] || allImages[0];

  return (
    <div className="product-detail-page-wrapper">
      <div className="product-detail-container">
        {/* Breadcrumb Navigation */}
        <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <FiChevronRight className="breadcrumb-chevron" />
          <Link to="/products">Products</Link>
          {product.category && (
            <>
              <FiChevronRight className="breadcrumb-chevron" />
              <Link to={`/products?category=${encodeURIComponent((product.category_slug || product.category || "").toLowerCase())}`}>
                {product.category_name || product.category}
              </Link>
            </>
          )}
          {product.subcategory && (
            <>
              <FiChevronRight className="breadcrumb-chevron" />
              <Link to={`/products?category=${encodeURIComponent((product.category_slug || product.category || "").toLowerCase())}&subcategory=${encodeURIComponent((product.subcategory_slug || product.subcategory || "").toLowerCase())}`}>
                {product.subcategory_name || product.subcategory}
              </Link>
            </>
          )}
          <FiChevronRight className="breadcrumb-chevron" />
          <span className="breadcrumb-current-product" title={product.name}>
            {product.name}
          </span>
        </nav>

        {/* Top Section: Gallery + Product Info Grid */}
        <div className="pdp-main-grid">
          {/* LEFT SIDE: Image Gallery */}
          <div className="pdp-gallery-column">
            {/* Vertical Thumbnails (Desktop) */}
            {allImages.length > 1 && (
              <div className="pdp-vertical-thumbnails">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-thumbnail-btn ${activeImageIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveImageIndex(idx)}
                    onMouseEnter={() => setActiveImageIndex(idx)}
                    aria-label={`View product image ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="pdp-thumb-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackImage(product.category);
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image Container */}
            <div className="pdp-main-image-box">
              {hasDiscount && (
                <span className="pdp-badge-discount">{currentDiscount}% OFF</span>
              )}
              {!hasDiscount && product.isNew && (
                <span className="pdp-badge-new">NEW</span>
              )}

              <img
                src={activeMainImage}
                alt={product.name}
                className="pdp-main-img"
                onClick={() => setIsZoomOpen(true)}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getFallbackImage(product.category);
                }}
              />

              <button
                type="button"
                className="pdp-image-zoom-trigger"
                onClick={() => setIsZoomOpen(true)}
                aria-label="Zoom image"
                title="Click to zoom image"
              >
                <FiZoomIn />
              </button>
            </div>

            {/* Mobile Horizontal Thumbnails */}
            {allImages.length > 1 && (
              <div className="pdp-mobile-horizontal-thumbnails">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-mobile-thumb-btn ${activeImageIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Mobile thumb ${idx + 1}`}
                      className="pdp-mobile-thumb-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackImage(product.category);
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Product Info & Purchase Form */}
          <div className="pdp-info-column">
            {/* Category / Brand Eyebrow */}
            <div className="pdp-category-eyebrow">
              {product.category_name || (typeof product.category === "string" ? product.category.toUpperCase() : "MOXIE")}
            </div>

            {/* Product Title */}
            <h1 className="pdp-product-title">{product.name}</h1>

            {/* Rating & Review Count Row */}
            <div className="pdp-rating-summary-row">
              {averageRating ? (
                <div className="pdp-rating-stars-badge">
                  <div className="pdp-stars-group">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= Math.round(averageRating) ? "star-filled" : "star-empty"}
                      />
                    ))}
                  </div>
                  <span className="pdp-rating-score-val">{averageRating}</span>
                </div>
              ) : (
                <span className="pdp-no-rating-label">No reviews yet</span>
              )}

              {totalReviewsCount > 0 ? (
                <a href="#reviews-section" onClick={scrollToReviews} className="pdp-review-count-link">
                  ({totalReviewsCount} {totalReviewsCount === 1 ? "review" : "reviews"})
                </a>
              ) : null}
            </div>

            {/* Pricing Section */}
            <div className="pdp-pricing-box">
              <strong className="pdp-current-price">
                ₹{Number(currentPrice || 0).toLocaleString("en-IN")}
              </strong>

              {hasDiscount && (
                <>
                  <del className="pdp-original-price">
                    ₹{Number(currentOldPrice).toLocaleString("en-IN")}
                  </del>
                  <span className="pdp-savings-pill">
                    Save ₹{(currentOldPrice - currentPrice).toLocaleString("en-IN")}
                  </span>
                </>
              )}
            </div>

            {/* Short Description */}
            {product.description && (
              <p className="pdp-short-description">{product.description}</p>
            )}

            <div className="pdp-divider" />

            {/* Color Options (ONLY when backend has colors) */}
            {backendColors.length > 0 && (
              <div className="pdp-option-group">
                <div className="pdp-option-header">
                  <span className="pdp-option-title">Color :</span>
                  <strong className="pdp-option-selected-name">
                    {selectedColor ? selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1) : ""}
                  </strong>
                </div>

                <div className="pdp-color-swatches-row">
                  {backendColors.map((colorObj) => {
                    const isSelected = selectedColor?.toLowerCase() === colorObj.name.toLowerCase();

                    if (colorObj.code) {
                      return (
                        <button
                          key={colorObj.name}
                          type="button"
                          className={`pdp-color-swatch-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => handleColorSelect(colorObj.name)}
                          title={colorObj.name}
                          aria-label={`Select color ${colorObj.name}`}
                        >
                          <span
                            className="pdp-swatch-circle"
                            style={{ backgroundColor: colorObj.code }}
                          />
                          {isSelected && <FiCheck className="pdp-swatch-check" />}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={colorObj.name}
                        type="button"
                        className={`pdp-color-pill-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleColorSelect(colorObj.name)}
                        title={colorObj.name}
                        aria-pressed={isSelected}
                      >
                        {colorObj.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Options (ONLY when backend has sizes) */}
            {availableSizes.length > 0 && (
              <div className="pdp-option-group">
                <div className="pdp-option-header">
                  <span className="pdp-option-title">Select Size :</span>
                  {selectedSize && (
                    <strong className="pdp-option-selected-name">{selectedSize}</strong>
                  )}
                </div>

                <div className="pdp-size-options-grid">
                  {availableSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`pdp-size-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedSize(size)}
                        aria-pressed={isSelected}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock / Availability Indicator */}
            <div className="pdp-stock-status-row">
              <span className={`pdp-stock-indicator ${isAvailable ? "in-stock" : "out-of-stock"}`}>
                ● {isAvailable ? "In stock and ready to dispatch" : stateLabel}
              </span>
            </div>

            {/* Quantity Selector & Actions */}
            {isAvailable && (
              <div className="pdp-quantity-row">
                <span className="pdp-qty-label">Quantity :</span>
                <div className="pdp-qty-control-box">
                  <button
                    type="button"
                    className="pdp-qty-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="pdp-qty-number">{quantity}</span>
                  <button
                    type="button"
                    className="pdp-qty-btn"
                    onClick={() => setQuantity(Math.min(availableMaxStock, quantity + 1))}
                    disabled={quantity >= availableMaxStock}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* CTA Action Buttons */}
            <div className="pdp-action-buttons-stack">
              <button
                type="button"
                className={`pdp-add-to-cart-btn ${inCart && isAvailable ? "in-cart" : ""}`}
                onClick={handleAddToCart}
                disabled={!isAvailable}
              >
                <FiShoppingBag className="pdp-btn-icon" />
                <span>
                  {!isAvailable
                    ? stateLabel
                    : inCart
                    ? "Added to Cart (+)"
                    : "Add to Cart"}
                </span>
              </button>

              <button
                type="button"
                className="pdp-buy-now-btn"
                onClick={handleBuyNow}
                disabled={!isAvailable}
              >
                Buy Now
              </button>

              <button
                type="button"
                className={`pdp-wishlist-toggle-btn ${wished ? "active" : ""}`}
                onClick={handleWishlistToggle}
                aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                title={wished ? "Remove from wishlist" : "Save to wishlist"}
              >
                {wished ? <FaHeart className="heart-active" /> : <FaRegHeart />}
              </button>
            </div>

            {/* Shopping Guarantees */}
            <div className="pdp-guarantees-grid">
              <div className="pdp-guarantee-card">
                <FiTruck className="pdp-guarantee-icon" />
                <div>
                  <strong>Free Delivery</strong>
                  <span>On orders above ₹{storeSettings?.free_shipping_min_amount || 999}</span>
                </div>
              </div>

              <div className="pdp-guarantee-card">
                <FiRotateCcw className="pdp-guarantee-icon" />
                <div>
                  <strong>7-Day Returns</strong>
                  <span>Hassle-free exchange policy</span>
                </div>
              </div>

              <div className="pdp-guarantee-card">
                <FiShield className="pdp-guarantee-icon" />
                <div>
                  <strong>100% Genuine</strong>
                  <span>Direct from Moxie Store</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER SECTION: Details, Shipping & Customer Reviews Tabs */}
        <section className="pdp-lower-section" ref={reviewsSectionRef} id="reviews-section">
          {/* Tab Navigation */}
          <div className="pdp-tabs-nav" role="tablist">
            <button
              type="button"
              className={`pdp-tab-btn ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
              role="tab"
              aria-selected={activeTab === "details"}
            >
              Details & Specifications
            </button>
            <button
              type="button"
              className={`pdp-tab-btn ${activeTab === "shipping" ? "active" : ""}`}
              onClick={() => setActiveTab("shipping")}
              role="tab"
              aria-selected={activeTab === "shipping"}
            >
              Shipping & Returns
            </button>
            <button
              type="button"
              className={`pdp-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
              role="tab"
              aria-selected={activeTab === "reviews"}
            >
              Customer Reviews ({totalReviewsCount})
            </button>
          </div>

          {/* Tab 1: Details & Specifications */}
          {activeTab === "details" && (
            <div className="pdp-tab-content pdp-details-tab-content">
              <div className="pdp-details-grid">
                <div className="pdp-description-full">
                  <h3>About this Product</h3>
                  <p>{product.description || "No description provided for this product."}</p>
                </div>

                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div className="pdp-specifications-box">
                    <h3>Specifications</h3>
                    <table className="pdp-spec-table">
                      <tbody>
                        {Object.entries(product.specifications).map(([key, val]) => (
                          <tr key={key}>
                            <td className="pdp-spec-label">{key}</td>
                            <td className="pdp-spec-value">{String(val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Shipping & Returns */}
          {activeTab === "shipping" && (
            <div className="pdp-tab-content pdp-shipping-tab-content">
              <div className="pdp-shipping-grid">
                <div className="pdp-shipping-card">
                  <h4>Delivery Information</h4>
                  <ul>
                    <li>
                      <strong>Processing Time:</strong> {storeSettings?.processing_time || "1-2 Business Days"}
                    </li>
                    <li>
                      <strong>Standard Delivery:</strong> {storeSettings?.delivery_estimate || "3-5 Business Days"} across India
                    </li>
                    <li>
                      <strong>Carrier Partners:</strong> {storeSettings?.shipping_provider || "Delhivery, BlueDart, DTDC"}
                    </li>
                    <li>
                      <strong>Shipping Charges:</strong> Free standard shipping on orders over ₹{storeSettings?.free_shipping_min_amount || 999}
                    </li>
                  </ul>
                </div>

                <div className="pdp-shipping-card">
                  <h4>Returns & Replacement</h4>
                  <ul>
                    <li>
                      <strong>Return Window:</strong> 7 days from the date of confirmed delivery
                    </li>
                    <li>
                      <strong>Eligibility:</strong> Unused item in original packaging with brand tags intact
                    </li>
                    <li>
                      <strong>Easy Pickup:</strong> Doorstep return pickup arranged upon submission in My Orders
                    </li>
                    <li>
                      <strong>Instant Refunds:</strong> Processed within 24-48 hours after quality check
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Product-Specific Reviews */}
          {activeTab === "reviews" && (
            <div className="pdp-tab-content pdp-reviews-tab-content">
              {loadingReviews ? (
                <div className="pdp-reviews-loading">
                  <div className="spinner-border spinner-border-sm text-primary" />
                  <span>Loading customer reviews...</span>
                </div>
              ) : reviews.length > 0 ? (
                <div className="pdp-reviews-layout">
                  {/* Left: Overall Score Summary & Breakdown */}
                  <div className="pdp-reviews-summary-panel">
                    <div className="pdp-score-big-wrap">
                      <span className="pdp-score-big">{averageRating}</span>
                      <div className="pdp-score-stars-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={star <= Math.round(averageRating) ? "star-filled" : "star-empty"}
                          />
                        ))}
                      </div>
                      <span className="pdp-total-verified-count">
                        Based on {totalReviewsCount} verified {totalReviewsCount === 1 ? "purchase" : "purchases"}
                      </span>
                    </div>

                    {/* Breakdown Bars */}
                    <div className="pdp-rating-bars-stack">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="pdp-rating-bar-row">
                          <span className="pdp-bar-label">{stars} ★</span>
                          <div className="pdp-bar-track">
                            <div
                              className="pdp-bar-fill"
                              style={{ width: `${ratingBreakdown[stars]}%` }}
                            />
                          </div>
                          <span className="pdp-bar-percent">{ratingBreakdown[stars]}%</span>
                        </div>
                      ))}
                    </div>

                    <div className="pdp-verified-purchase-note">
                      <FiShield className="note-icon" />
                      <span>Only verified customers who ordered this product can submit reviews.</span>
                    </div>
                  </div>

                  {/* Right: Reviews List */}
                  <div className="pdp-reviews-list">
                    {reviews.map((rev) => (
                      <article key={rev.id} className="pdp-review-card">
                        <div className="pdp-review-card-head">
                          <div className="pdp-reviewer-meta">
                            <span className="pdp-reviewer-avatar">
                              {(rev.name || "C").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong className="pdp-reviewer-name">{rev.name || "Verified Customer"}</strong>
                              {rev.is_verified !== false && (
                                <span className="pdp-verified-badge">
                                  <FiCheck className="check-icon" /> Verified Buyer
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="pdp-review-date">
                            {rev.created_at
                              ? new Date(rev.created_at).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Verified Purchase"}
                          </span>
                        </div>

                        <div className="pdp-review-stars-row">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                              key={star}
                              className={star <= Math.round(Number(rev.rating || 5)) ? "star-filled" : "star-empty"}
                            />
                          ))}
                        </div>

                        <p className="pdp-review-text">{rev.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pdp-reviews-empty-state">
                  <div className="empty-stars-row">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <FaRegStar key={s} />
                    ))}
                  </div>
                  <h3>No reviews yet for this product</h3>
                  <p>
                    Purchased this item? You can submit your verified review directly from your delivered order
                    in the <strong>My Orders</strong> section.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* RELATED PRODUCTS ("You May Also Like") */}
        {relatedProducts.length > 0 && (
          <section className="pdp-related-section" aria-label="Related Products">
            <div className="pdp-related-header">
              <span className="pdp-related-eyebrow">Recommendations</span>
              <h2 className="pdp-related-title">YOU MAY ALSO LIKE</h2>
              <div className="pdp-related-accent-line" aria-hidden="true" />
            </div>

            <div className="pdp-related-grid">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomOpen && (
        <div className="pdp-lightbox-overlay" onClick={() => setIsZoomOpen(false)}>
          <button
            type="button"
            className="pdp-lightbox-close-btn"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Close image preview"
          >
            <FiX />
          </button>
          <div className="pdp-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={activeMainImage} alt={product.name} className="pdp-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}
