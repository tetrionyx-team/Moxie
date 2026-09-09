import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../../context/DataContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import "./SearchBar.css";

export default function SearchBar({ searchQuery, setSearchQuery }) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { products = [] } = useData() || {};

  const query = (searchQuery || "").toLowerCase().trim();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAllProductsQuery = (q) => {
    const normalized = (q || "").trim().toLowerCase();
    return (
      normalized === "all product" ||
      normalized === "all products" ||
      normalized === "products" ||
      normalized === "product"
    );
  };

  const matchesAllProducts =
    query &&
    ("all products".includes(query) ||
      "all product".includes(query) ||
      "products".includes(query) ||
      "product".includes(query));

  const matchedProducts = query
    ? products
        .filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.category && p.category.toLowerCase().includes(query)) ||
            (p.category_name && p.category_name.toLowerCase().includes(query)) ||
            (p.subcategory && p.subcategory.toLowerCase().includes(query)) ||
            (p.subcategory_name && p.subcategory_name.toLowerCase().includes(query))
        )
        .slice(0, matchesAllProducts ? 5 : 6)
    : [];

  const suggestions = [];
  if (matchesAllProducts) {
    suggestions.push({
      id: "all-products",
      name: "All Products",
      category_name: "Catalog",
      isAllProducts: true,
    });
  }
  suggestions.push(...matchedProducts);

  const select = (p) => {
    if (setSearchQuery) setSearchQuery("");
    setIsOpen(false);
    if (p.isAllProducts || p.id === "all-products") {
      navigate("/products");
    } else {
      navigate(`/product/${p.id}`);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const normalized = (searchQuery || "").trim().toLowerCase();
    if (!normalized) return;

    if (isAllProductsQuery(normalized)) {
      if (setSearchQuery) setSearchQuery("");
      navigate("/products");
    } else {
      if (setSearchQuery) setSearchQuery("");
      navigate(`/products?search=${encodeURIComponent(normalized)}`);
    }
    setIsOpen(false);
  };

  return (
    <form className="search-wrapper" onSubmit={submit}>
      <div className="search-container" onClick={() => inputRef.current?.focus()}>
        <span className="search-leading-icon" aria-hidden="true">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            strokeWidth={1.8}
            className="search-hugeicon"
          />
        </span>
        <input
          ref={inputRef}
          id="search-bar"
          value={searchQuery || ""}
          onChange={(e) => {
            if (setSearchQuery) setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search products, categories, orders, menus..."
          aria-label="Search products, categories, orders, menus"
          autoComplete="off"
        />
        <div className="search-trailing-actions">
          {searchQuery && (
            <button
              type="button"
              className="search-clear-pill"
              onClick={(e) => {
                e.stopPropagation();
                if (setSearchQuery) setSearchQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <span className="search-shortcut-badge" title="Press ⌘ K to search">
            ⌘ K
          </span>
        </div>
      </div>

      {isOpen && query && (
        <div className="search-suggestions-dropdown">
          {suggestions.map((p) => (
            <div
              key={p.id}
              className="suggestion-item d-flex align-items-center"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(p)}
            >
              {p.image ? (
                <img src={p.image} alt={p.name} className="suggestion-image" />
              ) : (
                <div
                  className="suggestion-image suggestion-image-placeholder"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f1f5f9",
                    color: "#64748b",
                  }}
                >
                  <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
                </div>
              )}
              <div className="suggestion-details ms-3">
                <h5 className="suggestion-title mb-0">{p.name}</h5>
                <span className="suggestion-category">
                  {p.category_name || p.category}
                </span>
              </div>
              {!p.isAllProducts && p.price !== undefined && (
                <span className="suggestion-price ms-auto">
                  ₹{Number(p.price || 0).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          ))}
          {!suggestions.length && (
            <div className="no-suggestions text-center py-3">No products found</div>
          )}
        </div>
      )}
    </form>
  );
}

