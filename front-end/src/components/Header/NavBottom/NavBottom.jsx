import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavBottom.css";

function NavBottom() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentCategoryParam = (searchParams.get("category") || "").toLowerCase();
  const isDealsQuery = searchParams.get("deals") === "true" || currentCategoryParam === "deals";

  const isCategoryActive = (slug, path) => {
    if (path === "/") {
      return location.pathname === "/" && !location.search;
    }
    if (slug === "deals") {
      return location.pathname === "/products/deals" || isDealsQuery;
    }
    const pathSlug = path.replace("/products/", "").toLowerCase();
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`) ||
      currentCategoryParam === slug ||
      currentCategoryParam === pathSlug
    );
  };

  return (
    <div className="bottom-items">
      <ul className="bottom-menu">
        <li className={isCategoryActive("home", "/") ? "active" : ""}><Link to="/">Home</Link></li>
        <li className={isCategoryActive("watches", "/products/watches") ? "active" : ""}><Link to="/products/watches">Watches</Link></li>
        <li className={isCategoryActive("shoes", "/products/shoes") ? "active" : ""}><Link to="/products/shoes">Shoes</Link></li>
        <li className={isCategoryActive("air-buds", "/products/air-buds") ? "active" : ""}><Link to="/products/air-buds">Air Buds</Link></li>
        <li className={isCategoryActive("sliders", "/products/sliders") ? "active" : ""}><Link to="/products/sliders">Sliders</Link></li>
        <li className={isCategoryActive("caps", "/products/caps") ? "active" : ""}><Link to="/products/caps">Caps</Link></li>
        <li className={isCategoryActive("accessories", "/products/accessories") ? "active" : ""}><Link to="/products/accessories">Accessories</Link></li>
        <li className={isCategoryActive("deals", "/products/deals") ? "active" : ""}><Link to="/products/deals">Deals</Link></li>
      </ul>
    </div>
  );
}

export default NavBottom;