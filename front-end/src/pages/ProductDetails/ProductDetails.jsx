import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiShoppingBag,
  FiTruck,
  FiShield,
  FiCheck,
  FiChevronRight,
  FiChevronLeft,
  FiZoomIn,
  FiX,
  FiHeadphones,
  FiZap,
} from "react-icons/fi";
import { FaHeart, FaRegHeart, FaStar, FaRegStar } from "react-icons/fa";
import { useData } from "../../context/DataContext";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { getSaleState, getSaleStateLabel } from "../../utils/inventory";
import ProductCard, { isWatchCategory } from "../../components/Product/ProductCard";
import { getProductReviews } from "../../api/reviewApi";
import { API_BASE_URL } from "../../api/apiConfig";
import "./ProductDetails.css";

import { resolveMediaUrl, NEUTRAL_PLACEHOLDER } from "../../utils/productImage";

const getImageUrl = (image) => resolveMediaUrl(image);

const getVideoUrl = (video) => resolveMediaUrl(video);

export default function ProductDetails() {
  const { productId, category: paramCategory } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { products = [], storeSettings, loading: globalLoading } = useData() || {};

  const { cart = [], addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};

  const reviewsSectionRef = useRef(null);
  const mainVideoRef = useRef(null);

  const [apiProduct, setApiProduct] = useState(null);
  const [fetchingProduct, setFetchingProduct] = useState(false);

  // Directly fetch product from backend API on mount or route param change
  useEffect(() => {
    const rawId = productId || paramCategory;
    if (!rawId) return;

    let isMounted = true;
    setApiProduct(null);
    setFetchingProduct(true);

    fetch(`${API_BASE_URL}/products/${rawId}/`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Product fetch failed");
      })
      .then((data) => {
        if (isMounted && data && data.id) {
          setApiProduct(data);
        }
      })
      .catch(() => {
        // Fallback handled by products list in DataContext
      })
      .finally(() => {
        if (isMounted) setFetchingProduct(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, paramCategory]);

  // Match active product by numeric or slug ID, prioritizing direct API response
  const product = useMemo(() => {
    const rawTarget = String(productId || paramCategory || "").toLowerCase().trim();
    if (!rawTarget) return null;

    if (
      apiProduct &&
      (String(apiProduct.id).toLowerCase() === rawTarget ||
        String(apiProduct.slug || "").toLowerCase() === rawTarget)
    ) {
      return apiProduct;
    }
    return products.find(
      (i) =>
        String(i.id).toLowerCase() === rawTarget ||
        (i.slug && String(i.slug).toLowerCase() === rawTarget) ||
        (i.name && String(i.name).toLowerCase().replace(/\s+/g, "-") === rawTarget)
    );
  }, [apiProduct, products, productId, paramCategory]);

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Reset transient product selections when navigating between products
  useEffect(() => {
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
    }
    setActiveImageIndex(0);
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    setIsZoomOpen(false);
  }, [productId, paramCategory]);

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

  // Derive available sizes dynamically based on selected color / variants (strictly excluded for watches)
  const availableSizes = useMemo(() => {
    if (!product || isWatchCategory(product)) return [];

    const normColor = (c) => String(c || "").trim().toLowerCase();

    if (selectedColor && Array.isArray(product.variants) && product.variants.length > 0) {
      const colorMatches = product.variants.filter(
        (v) => normColor(v.color_name || v.color) === normColor(selectedColor)
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

    const normColor = (c) => String(c || "").trim().toLowerCase();
    const normSize = (s) => String(s || "").trim().toLowerCase();

    if (selectedColor && selectedSize) {
      const exact = product.variants.find(
        (v) =>
          normColor(v.color_name || v.color) === normColor(selectedColor) &&
          Array.isArray(v.sizes) &&
          v.sizes.map(normSize).includes(normSize(selectedSize))
      );
      if (exact) return exact;
    }

    if (selectedColor) {
      const colorMatch = product.variants.find(
        (v) => normColor(v.color_name || v.color) === normColor(selectedColor)
      );
      if (colorMatch) return colorMatch;
    }

    if (selectedSize) {
      const sizeMatch = product.variants.find(
        (v) =>
          Array.isArray(v.sizes) &&
          v.sizes.map(normSize).includes(normSize(selectedSize))
      );
      if (sizeMatch) return sizeMatch;
    }

    return product.variants[0] || null;
  }, [product, selectedColor, selectedSize]);

  // Resolve gallery media dynamically based on active selected variant (with exact backend mapping)
  const allMedia = useMemo(() => {
    if (!product) return [];
    const mediaList = [];
    const addedUrls = new Set();

    const addImage = (imgSrc) => {
      if (!imgSrc) return;
      const rawUrl = typeof imgSrc === "object" && imgSrc ? (imgSrc.image || imgSrc.url) : imgSrc;
      const url = getImageUrl(rawUrl);
      if (!url || typeof url !== "string" || addedUrls.has(url)) return;
      addedUrls.add(url);
      mediaList.push({
        type: "image",
        url,
        isVideo: false,
      });
    };

    const addVideo = (vidSrc) => {
      if (!vidSrc) return;
      const rawUrl = typeof vidSrc === "object" && vidSrc ? (vidSrc.video || vidSrc.url) : vidSrc;
      const url = getVideoUrl(rawUrl);
      if (!url || typeof url !== "string" || addedUrls.has(url)) return;
      addedUrls.add(url);
      mediaList.push({
        type: "video",
        url,
        isVideo: true,
      });
    };

    // 1. If active variant has images or video, display active variant's media
    let hasVariantMedia = false;
    if (selectedVariant) {
      if (Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0) {
        const sortedImages = [...selectedVariant.images].sort((a, b) => {
          const aPri = typeof a === "object" && a?.is_primary ? 1 : 0;
          const bPri = typeof b === "object" && b?.is_primary ? 1 : 0;
          return bPri - aPri;
        });
        sortedImages.forEach(addImage);
        hasVariantMedia = true;
      }
      if (selectedVariant.image) {
        addImage(selectedVariant.image);
        hasVariantMedia = true;
      }
      if (selectedVariant.primary_image) {
        addImage(selectedVariant.primary_image);
        hasVariantMedia = true;
      }
      if (selectedVariant.variant_image) {
        addImage(selectedVariant.variant_image);
        hasVariantMedia = true;
      }
      if (selectedVariant.main_image) {
        addImage(selectedVariant.main_image);
        hasVariantMedia = true;
      }
      if (selectedVariant.video) {
        addVideo(selectedVariant.video);
        hasVariantMedia = true;
      }
    }

    // 2. If no variant media for active variant, fall back to product gallery / primary image / product video
    if (!hasVariantMedia || mediaList.length === 0) {
      if (Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach(addImage);
      }
      if (product.image) {
        addImage(product.image);
      }
      if (product.primary_image) {
        addImage(product.primary_image);
      }
      if (product.video) {
        addVideo(product.video);
      }
    }

    // 3. Fallback if completely empty
    if (mediaList.length === 0) {
      mediaList.push({
        type: "image",
        url: NEUTRAL_PLACEHOLDER,
        isVideo: false,
      });
    }

    return mediaList;
  }, [product, selectedVariant]);

  const allImages = useMemo(() => allMedia.map((m) => m.url), [allMedia]);

  // Primary static image specifically for Cart, Wishlist, Checkout, Orders (strictly image, never video)
  const primaryStaticImage = useMemo(() => {
    const firstImg = allMedia.find((m) => m.type === "image");
    return firstImg ? firstImg.url : NEUTRAL_PLACEHOLDER;
  }, [allMedia]);

  // Reset active image index whenever product ID or selected variant changes
  useEffect(() => {
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
    }
    setActiveImageIndex(0);
  }, [product?.id, selectedVariant?.id]);

  // When user selects a thumbnail or color, pause video and update index
  const handleMediaSelect = (index) => {
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
    }
    setActiveImageIndex(index);
  };

  const handleColorSelect = (colorName) => {
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
    }
    setSelectedColor(colorName);
    setActiveImageIndex(0);
  };

  // Pricing resolution (variant price override if available, else product price)
  // Final Rule:
  // price = Original Price (e.g. ₹1000)
  // discount_price = Discount / Selling Price (e.g. ₹600)
  const rawPPrice = selectedVariant?.price
    ? Number(selectedVariant.price)
    : Number(product?.price || 0);

  const rawPDisc = selectedVariant?.discount_price !== undefined && selectedVariant?.discount_price !== null && selectedVariant?.discount_price !== "" && Number(selectedVariant.discount_price) > 0
    ? Number(selectedVariant.discount_price)
    : product?.discount_price !== undefined && product?.discount_price !== null && product?.discount_price !== "" && Number(product.discount_price) > 0
    ? Number(product.discount_price)
    : null;

  const rawPOrig = product?.original_price !== undefined && product?.original_price !== null && product?.original_price !== "" && Number(product.original_price) > 0
    ? Number(product.original_price)
    : product?.oldPrice !== undefined && product?.oldPrice !== null && product?.oldPrice !== "" && Number(product.oldPrice) > 0
    ? Number(product.oldPrice)
    : product?.discount !== undefined && product?.discount !== null && product?.discount !== "" && Number(product.discount) > 0
    ? Number(product.discount)
    : null;

  let currentPrice = rawPPrice;
  let currentOldPrice = 0;
  let hasDiscount = false;
  let currentDiscount = 0;

  if (rawPDisc && rawPDisc < rawPPrice) {
    currentPrice = rawPDisc;
    currentOldPrice = rawPPrice;
    hasDiscount = true;
    currentDiscount = Math.round(((rawPPrice - rawPDisc) / rawPPrice) * 100);
  } else if (rawPOrig && rawPOrig > rawPPrice) {
    currentPrice = rawPPrice;
    currentOldPrice = rawPOrig;
    hasDiscount = true;
    currentDiscount = Math.round(((rawPOrig - rawPPrice) / rawPOrig) * 100);
  }

  // Inventory / Stock resolution from backend
  const saleState = product ? getSaleState(product, selectedVariant) : "unavailable";
  const isAvailable = saleState === "in_stock";
  const stateLabel = getSaleStateLabel(saleState);

  const availableMaxStock = selectedVariant && selectedVariant.stock !== undefined
    ? Number(selectedVariant.stock)
    : product?.rawStock !== undefined
  const wished = isInWishlist ? isInWishlist(product?.id) : false;

  const handleWishlistToggle = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();
    if (toggleWishlist) {
      toggleWishlist(product);
      if (toast) {
        toast(wished ? "Removed from wishlist" : "Saved to wishlist");
      }
    }
  };

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

    const prodSubCat = String(
      product.subcategory_slug ||
      product.subcategory_name ||
      (typeof product.subcategory === "object" ? product.subcategory?.name : product.subcategory) ||
      ""
    ).toLowerCase().trim();

    const prodCat = String(
      product.category_slug ||
      product.category_name ||
      (typeof product.category === "object" ? product.category?.name : product.category) ||
      ""
    ).toLowerCase().trim();

    if (prodSubCat) {
      const sameSub = others.filter((p) => {
        const otherSub = String(
          p.subcategory_slug ||
          p.subcategory_name ||
          (typeof p.subcategory === "object" ? p.subcategory?.name : p.subcategory) ||
          ""
        ).toLowerCase().trim();
        return otherSub && otherSub === prodSubCat;
      });
      if (sameSub.length > 0) return sameSub.slice(0, 4);
    }

    if (prodCat) {
      const sameCat = others.filter((p) => {
        const otherCat = String(
          p.category_slug ||
          p.category_name ||
          (typeof p.category === "object" ? p.category?.name : p.category) ||
          ""
        ).toLowerCase().trim();
        return otherCat && otherCat === prodCat;
      });
      if (sameCat.length > 0) return sameCat.slice(0, 4);
    }

    return others.slice(0, 4);
  }, [products, product]);

  const isLoading = Boolean(globalLoading || fetchingProduct);

  if (isLoading) {
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

  const inCart = cart?.some((item) => item.id === product.id);

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
        image: primaryStaticImage,
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
      image: primaryStaticImage,
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

  const activeMediaItem = allMedia[activeImageIndex] || allMedia[0];
  const isVideoActive = activeMediaItem?.type === "video";

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
              <Link to={`/products?category=${encodeURIComponent(String(product.category_slug || (typeof product.category === 'object' ? product.category?.slug || product.category?.name : product.category) || "").toLowerCase())}`}>
                {typeof product.category === 'object' ? product.category?.name : (product.category_name || String(product.category))}
              </Link>
            </>
          )}
          {product.subcategory && (
            <>
              <FiChevronRight className="breadcrumb-chevron" />
              <Link to={`/products?category=${encodeURIComponent(String(product.category_slug || (typeof product.category === 'object' ? product.category?.slug || product.category?.name : product.category) || "").toLowerCase())}&subcategory=${encodeURIComponent(String(product.subcategory_slug || (typeof product.subcategory === 'object' ? product.subcategory?.slug || product.subcategory?.name : product.subcategory) || "").toLowerCase())}`}>
                {typeof product.subcategory === 'object' ? product.subcategory?.name : (product.subcategory_name || String(product.subcategory))}
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
            {allMedia.length > 0 && (
              <div className="pdp-vertical-thumbnails">
                {allMedia.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-thumbnail-btn ${activeImageIndex === idx ? "active" : ""} ${item.type === "video" ? "pdp-thumb-video-btn" : ""}`}
                    onClick={() => handleMediaSelect(idx)}
                    onMouseEnter={() => handleMediaSelect(idx)}
                    aria-label={item.type === "video" ? `View product video ${idx + 1}` : `View product image ${idx + 1}`}
                  >
                    {item.type === "video" ? (
                      <div className="pdp-thumb-video-preview-wrap">
                        <video src={item.url} preload="metadata" muted className="pdp-thumb-video-preview" />
                        <div className="pdp-thumb-play-overlay">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="pdp-thumb-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = NEUTRAL_PLACEHOLDER;
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Main Media Container */}
            <div className={`pdp-main-image-box ${isVideoActive ? "has-video" : ""}`}>
              {hasDiscount && (
                <span className="pdp-badge-discount">{currentDiscount}% OFF</span>
              )}
              {!hasDiscount && product.isNew && (
                <span className="pdp-badge-new">NEW</span>
              )}

              {isVideoActive ? (
                <div className="pdp-main-video-wrapper">
                  <video
                    ref={mainVideoRef}
                    key={activeMediaItem.url}
                    src={activeMediaItem.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="pdp-main-video-player"
                  />
                </div>
              ) : (
                <>
                  <img
                    src={activeMediaItem?.url || allImages[0]}
                    alt={product.name}
                    className="pdp-main-img"
                    onClick={() => setIsZoomOpen(true)}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = NEUTRAL_PLACEHOLDER;
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
                </>
              )}

              {/* Bottom Pagination / Navigation Capsule */}
              {allMedia.length > 1 && (
                <div className="pdp-gallery-pager-capsule">
                  <button
                    type="button"
                    className="pdp-gallery-nav-btn"
                    onClick={() => handleMediaSelect((activeImageIndex - 1 + allMedia.length) % allMedia.length)}
                    aria-label="Previous image"
                  >
                    <FiChevronLeft />
                  </button>
                  <span className="pdp-gallery-counter">
                    {activeImageIndex + 1} / {allMedia.length}
                  </span>
                  <button
                    type="button"
                    className="pdp-gallery-nav-btn"
                    onClick={() => handleMediaSelect((activeImageIndex + 1) % allMedia.length)}
                    aria-label="Next image"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Horizontal Thumbnails */}
            {allMedia.length > 0 && (
              <div className="pdp-mobile-horizontal-thumbnails">
                {allMedia.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-mobile-thumb-btn ${activeImageIndex === idx ? "active" : ""} ${item.type === "video" ? "pdp-thumb-video-btn" : ""}`}
                    onClick={() => handleMediaSelect(idx)}
                    aria-label={item.type === "video" ? `View video ${idx + 1}` : `View image ${idx + 1}`}
                  >
                    {item.type === "video" ? (
                      <div className="pdp-thumb-video-preview-wrap">
                        <video src={item.url} preload="metadata" muted className="pdp-mobile-thumb-img" />
                        <div className="pdp-thumb-play-overlay">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={`Mobile thumb ${idx + 1}`}
                        className="pdp-mobile-thumb-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = NEUTRAL_PLACEHOLDER;
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Product Info & Purchase Form */}
          <div className="pdp-info-column">
            {/* Category / Brand Eyebrow */}
            <div className="pdp-category-eyebrow">
              {product.category_name || (typeof product.category === "object" ? product.category?.name?.toUpperCase() : String(product.category || "WATCH").toUpperCase())}
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
                <div className="pdp-no-rating-stars-row">
                  <div className="pdp-stars-group empty">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaRegStar key={star} className="star-empty-outline" />
                    ))}
                  </div>
                  <span className="pdp-no-rating-label">No reviews yet</span>
                </div>
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
                    SAVE ₹{(currentOldPrice - currentPrice).toLocaleString("en-IN")}
                  </span>
                </>
              )}
            </div>

            {/* Short Description */}
            {product.description && (
              <p className="pdp-short-description">{product.description}</p>
            )}

            <div className="pdp-divider" />

            {/* Color Options (ONLY when backend has colors) + Stock Pill */}
            {backendColors.length > 0 && (
              <div className="pdp-option-group">
                <div className="pdp-option-header">
                  <span className="pdp-option-title">COLOR :</span>
                  <strong className="pdp-option-selected-name">
                    {selectedColor ? selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1) : ""}
                  </strong>
                </div>

                <div className="pdp-color-and-stock-row">
                  <div className="pdp-color-swatches-row">
                    {backendColors.map((colorObj) => {
                      const isSelected = selectedColor?.trim().toLowerCase() === colorObj.name.trim().toLowerCase();
                      const colorCode = colorObj.code || (colorObj.name.toLowerCase() === "black" ? "#000000" : "#ffffff");

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
                            style={{ backgroundColor: colorCode }}
                          />
                          {isSelected && <FiCheck className="pdp-swatch-check" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline In-Stock Pill */}
                  <div className="pdp-stock-status-inline">
                    <span className={`pdp-stock-indicator ${isAvailable ? "in-stock" : "out-of-stock"}`}>
                      <span className="stock-dot" /> {isAvailable ? "In stock — ready to dispatch" : stateLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Size Options (ONLY when backend has sizes) */}
            {availableSizes.length > 0 && (
              <div className="pdp-option-group">
                <div className="pdp-option-header">
                  <span className="pdp-option-title">SIZE :</span>
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

            {/* If no colors exist, display Standalone Stock status */}
            {backendColors.length === 0 && (
              <div className="pdp-standalone-stock-row">
                <span className={`pdp-stock-indicator ${isAvailable ? "in-stock" : "out-of-stock"}`}>
                  <span className="stock-dot" /> {isAvailable ? "In stock — ready to dispatch" : stateLabel}
                </span>
              </div>
            )}

            {/* Quantity Selector */}
            {isAvailable && (
              <div className="pdp-quantity-inline-row">
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

            {/* CTA Action Buttons (2-Column Grid) */}
            <div className="pdp-action-buttons-grid">
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
                    : "ADD TO CART"}
                </span>
              </button>

              <button
                type="button"
                className="pdp-buy-now-btn"
                onClick={handleBuyNow}
                disabled={!isAvailable}
              >
                <FiZap className="pdp-btn-icon-zap" />
                <span>BUY NOW</span>
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

            {/* Trust / Service Card (3 equal columns) */}
            <div className="pdp-trust-service-card">
              <div className="pdp-trust-col">
                <FiShield className="pdp-trust-icon" />
                <div className="pdp-trust-text-wrap">
                  <strong>Secure Payment</strong>
                  <span>100% secure checkout</span>
                </div>
              </div>
              <div className="pdp-trust-col">
                <FiTruck className="pdp-trust-icon" />
                <div className="pdp-trust-text-wrap">
                  <strong>Order Tracking</strong>
                  <span>Track your order easily</span>
                </div>
              </div>
              <div className="pdp-trust-col">
                <FiHeadphones className="pdp-trust-icon" />
                <div className="pdp-trust-text-wrap">
                  <strong>Customer Support</strong>
                  <span>Here to help, always</span>
                </div>
              </div>
            </div>

            {/* Informational Payment Methods */}
            <div className="pdp-payment-options-note">
              Payment options available: <strong>UPI · Cards · Net Banking · COD</strong>
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
                      <strong>Shipping Charges:</strong>{" "}
                      {product?.shipping_charge && Number(product.shipping_charge) > 0
                        ? `Standard Shipping: ₹${Number(product.shipping_charge).toLocaleString("en-IN")}`
                        : `Free standard shipping on orders over ₹${storeSettings?.free_shipping_min_amount || 999}`}
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
              <span className="pdp-related-eyebrow">RECOMMENDATIONS</span>
              <h2 className="pdp-related-title">You May Also Like</h2>
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
            aria-label="Close media preview"
          >
            <FiX />
          </button>
          <div className="pdp-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {isVideoActive ? (
              <video
                src={activeMediaItem?.url}
                controls
                playsInline
                autoPlay
                className="pdp-lightbox-video"
              />
            ) : (
              <img src={activeMediaItem?.url || allImages[0]} alt={product.name} className="pdp-lightbox-img" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
