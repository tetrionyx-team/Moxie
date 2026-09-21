import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import ProductCard from "../Product/ProductCard";
import "./StyleEssentials.css";

// Helper: check if a product belongs to Style Essentials (Clothing/Apparel or Footwear)
export const isStyleEssentialsProduct = (product) => {
  if (!product || product.is_active === false) return false;

  const catSlug = String(product.category_slug || product.category || "").toLowerCase();
  const catName = String(product.category_name || "").toLowerCase();
  const subSlug = String(product.subcategory_slug || product.subcategory || "").toLowerCase();
  const subName = String(product.subcategory_name || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  const clothingKeywords = [
    "clothes",
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

  const isClothing = clothingKeywords.some(
    (kw) =>
      catSlug.includes(kw) ||
      catName.includes(kw) ||
      subSlug.includes(kw) ||
      subName.includes(kw) ||
      name.includes(kw)
  );

  const isFootwear = footwearKeywords.some(
    (kw) =>
      catSlug.includes(kw) ||
      catName.includes(kw) ||
      subSlug.includes(kw) ||
      subName.includes(kw) ||
      name.includes(kw)
  );

  return isClothing || isFootwear;
};

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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
