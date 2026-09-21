import React, { useContext, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import {
  getSaleState,
} from "../../utils/inventory";

import "./ProductCard.css";

import { getProductImageUrl, NEUTRAL_PLACEHOLDER } from "../../utils/productImage";

/**
 * Identifies if a product is a Shirt or T-Shirt
 */
export const isShirtCategory = (product) => {
  if (!product) return false;
  const catSlug = String(product.category_slug || product.category || "").toLowerCase().trim();
  const catName = String(
    product.category_name ||
    (typeof product.category === "object" ? product.category?.name : product.category) ||
    ""
  ).toLowerCase().trim();
  const subCatSlug = String(product.subcategory_slug || product.subcategory || "").toLowerCase().trim();
  const subCatName = String(product.subcategory_name || "").toLowerCase().trim();
  const prodName = String(product.name || "").toLowerCase().trim();

  return (
    catSlug.includes("clothes") ||
    catName.includes("clothes") ||
    catSlug.includes("clothing") ||
    catName.includes("clothing") ||
    catSlug.includes("shirt") ||
    catName.includes("shirt") ||
    subCatSlug.includes("shirt") ||
    subCatName.includes("shirt") ||
    prodName.includes("shirt") ||
    catSlug.includes("t-shirt") ||
    catName.includes("t-shirt") ||
    subCatSlug.includes("t-shirt") ||
    subCatName.includes("t-shirt") ||
    prodName.includes("t-shirt") ||
    catSlug.includes("tshirt") ||
    catName.includes("tshirt") ||
    subCatSlug.includes("tshirt") ||
    subCatName.includes("tshirt") ||
    prodName.includes("tshirt")
  );
};

/**
 * Identifies if a product is a watch
 */
export const isWatchCategory = (product) => {
  if (!product) return false;
  const catSlug = String(product.category_slug || product.category || "").toLowerCase().trim();
  const catName = String(
    product.category_name ||
    (typeof product.category === "object" ? product.category?.name : product.category) ||
    ""
  ).toLowerCase().trim();
  const subCatSlug = String(product.subcategory_slug || product.subcategory || "").toLowerCase().trim();
  const subCatName = String(product.subcategory_name || "").toLowerCase().trim();
  const prodName = String(product.name || "").toLowerCase().trim();

  return (
    catSlug.includes("watch") ||
    catName.includes("watch") ||
    subCatSlug.includes("watch") ||
    subCatName.includes("watch") ||
    prodName.includes("watch")
  );
};

/**
 * Backwards-compatibility alias
 */
export const isPremiumFashionCategory = isShirtCategory;

export default function ProductCard({ product }) {
  const { cart = [], addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();

  const isShirt = isShirtCategory(product);

  const inCart = cart.some((item) => item.id === product?.id);
  const wished = isInWishlist ? isInWishlist(product?.id) : false;

  // Inventory & Stock logic
  const saleState = getSaleState(product);
  const isAvailable =
    saleState === "in_stock" &&
    product?.stock !== false &&
    (product?.rawStock === undefined || product?.rawStock > 0);

  // Available Sizes from real backend data (ONLY for Shirts)
  const availableSizes = useMemo(() => {
    if (!isShirt) return [];

    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
      return product.sizes.filter(Boolean);
    }
    if (typeof product?.sizes === "string" && product.sizes.trim()) {
      return product.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      const extracted = Array.from(
        new Set(
          product.variants
            .flatMap((v) =>
              Array.isArray(v.sizes)
                ? v.sizes
                : typeof v.sizes === "string"
                ? v.sizes.split(",").map((s) => s.trim())
                : []
            )
            .filter(Boolean)
        )
      );
      if (extracted.length > 0) return extracted;
    }

    return [];
  }, [product, isShirt]);

  const [selectedSize, setSelectedSize] = useState(null);

  const wishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (toggleWishlist) toggleWishlist(product);
    if (toast) toast(wished ? "Removed from wishlist" : "Saved to wishlist");
  };

  const add = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAvailable) return;

    if (isShirt && availableSizes.length > 0 && !selectedSize) {
      if (toast) toast("Please select a size.");
      return;
    }

    let matchedVariant = null;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      if (selectedSize) {
        matchedVariant =
          product.variants.find(
            (v) =>
              v.is_active !== false &&
              Array.isArray(v.sizes) &&
              v.sizes.includes(selectedSize)
          ) || product.variants[0];
      } else {
        matchedVariant = product.variants[0];
      }
    }

    if (addToCart) {
      addToCart(
        {
          ...product,
          selectedSize: isShirt ? selectedSize : undefined,
          selectedVariant: matchedVariant || product.selectedVariant,
          variant_id: matchedVariant?.id || product.variant_id,
        },
        1
      );
    }

    if (toast) {
      toast(
        isShirt && selectedSize
          ? `${product.name} (Size: ${selectedSize}) added to cart`
          : `${product.name} added to cart`
      );
    }
  };

  const displayImage = getProductImageUrl(product);

  // Universal pricing resolution for ProductCard:
  // Final Rule:
  // price = Original Price (e.g. ₹1000)
  // discount_price = Discount / Selling Price (e.g. ₹600)
  const rawPPrice = Number(product?.price || 0);
  const rawPDisc = product?.discount_price !== undefined && product?.discount_price !== null && product?.discount_price !== "" && Number(product?.discount_price) > 0
    ? Number(product.discount_price)
    : product?.discountPrice !== undefined && product?.discountPrice !== null && product?.discountPrice !== "" && Number(product.discountPrice) > 0
    ? Number(product.discountPrice)
    : null;

  const rawPOrig = product?.original_price !== undefined && product?.original_price !== null && product?.original_price !== "" && Number(product.original_price) > 0
    ? Number(product.original_price)
    : product?.oldPrice !== undefined && product?.oldPrice !== null && product?.oldPrice !== "" && Number(product.oldPrice) > 0
    ? Number(product.oldPrice)
    : product?.discount !== undefined && product?.discount !== null && product?.discount !== "" && Number(product.discount) > 0
    ? Number(product.discount)
    : null;

  let sellingPrice = rawPPrice;
  let originalPrice = null;

  if (rawPDisc && rawPDisc > 0 && rawPDisc < rawPPrice) {
    sellingPrice = rawPDisc;
    originalPrice = rawPPrice;
  } else if (rawPOrig && rawPOrig > rawPPrice) {
    sellingPrice = rawPPrice;
    originalPrice = rawPOrig;
  } else if (rawPDisc && rawPDisc > rawPPrice) {
    sellingPrice = rawPPrice;
    originalPrice = rawPDisc;
  }

  const hasStrikePrice = Boolean(originalPrice && originalPrice > sellingPrice);

  return (
    <article className="moxie-premium-card">
      <Link to={`/product/${product.id}`} className="premium-card-link">
        {/* Top Section: Product Image & Wishlist Button */}
        <div className="premium-card-media">
          <button
            type="button"
            className={`premium-heart-btn ${wished ? "active" : ""}`}
            onClick={wishlist}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            {wished ? (
              <svg className="premium-heart-icon filled" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg className="premium-heart-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>

          <img
            src={displayImage}
            alt={product.name}
            className="premium-card-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = NEUTRAL_PLACEHOLDER;
            }}
          />
        </div>

        {/* Card Body Section */}
        <div className="premium-card-body">
          <h3 className="premium-card-title">{product.name}</h3>

          {product.description && (
            <p className="moxie-card-desc">
              {product.description}
            </p>
          )}

          {/* Size Selector Section - ONLY for Shirts when real sizes exist */}
          {isShirt && availableSizes.length > 0 && (
            <div className="premium-size-section">
              <div
                className="premium-size-options"
                role="radiogroup"
                aria-label="Size options"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {availableSizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    role="radio"
                    aria-checked={selectedSize === sz}
                    className={`premium-size-btn ${selectedSize === sz ? "selected" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSize(sz);
                    }}
                    aria-label={sz}
                    title={`Size ${sz}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Section */}
          <div className="product-price-row premium-price-section">
            <span className="product-current-price premium-current-price">
              ₹{sellingPrice.toLocaleString("en-IN")}
            </span>
            {hasStrikePrice && (
              <span className="product-original-price premium-old-price">
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Premium Full-Width Add To Cart Button */}
      <div className="premium-btn-wrapper">
        <button
          type="button"
          className={`premium-add-cart-btn ${inCart && isAvailable ? "added" : ""}`}
          disabled={!isAvailable}
          onClick={add}
          aria-label={`Add ${product.name} to cart`}
        >
          <svg className="premium-bag-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="premium-btn-sep" />
          <span className="premium-btn-text">
            {!isAvailable ? "OUT OF STOCK" : "ADD TO CART"}
          </span>
          <svg className="premium-arrow-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  );
}