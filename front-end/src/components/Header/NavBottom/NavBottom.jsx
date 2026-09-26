import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./NavBottom.css";

const NAV_ITEMS = [
  { name: "Home", path: "/", slug: "home" },
  { name: "Watches", path: "/products/watches", slug: "watches" },
  { name: "Shoes", path: "/products/shoes", slug: "shoes" },
  { name: "Air Buds", path: "/products/air-buds", slug: "air-buds" },
  { name: "Sliders", path: "/products/sliders", slug: "sliders" },
  { name: "Caps", path: "/products/caps", slug: "caps" },
  { name: "Accessories", path: "/products/accessories", slug: "accessories" },
  { name: "Deals", path: "/products/deals", slug: "deals" },
];

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
    <nav className="bottom-items" aria-label="Product Categories Navigation">
      <ul className="bottom-menu">
        {NAV_ITEMS.map((item) => {
          const isActive = isCategoryActive(item.slug, item.path);
          return (
            <li
              key={item.slug}
              className={`bottom-menu-item ${isActive ? "active" : ""}`}
            >
              <Link
                to={item.path}
                className={`bottom-menu-link ${isActive ? "active" : ""}`}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default NavBottom;