import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import ProductCard from "../Product/ProductCard";
import "./RecommendedForYou.css";

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
    "clothes",
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

        {/* Product Cards Grid with Premium MOXIE Card Style */}
        <div className="recommended-grid">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
