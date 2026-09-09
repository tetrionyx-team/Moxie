import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Home01Icon,
  ShoppingBag01Icon,
  Layers01Icon,
  DeliveryTruck01Icon,
  FavouriteIcon,
  SparklesIcon,
  UserIcon,
  Logout01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  SecurityLockIcon,
} from "@hugeicons/core-free-icons";
import { useData } from "../../../context/DataContext";
import { AuthContext } from "../../../context/AuthContext";
import { WishlistContext } from "../../../context/WishlistContext";
import { useModal } from "../../../context/ModalContext";
import Logo from "../Logo/Logo";
import "./MobileLeftDrawer.css";

export default function MobileLeftDrawer({ isOpen, onClose }) {
  const location = useLocation() || {};
  const pathname = location.pathname || "";
  const search = location.search || "";
  const navigate = useNavigate();
  const { categories = [] } = useData() || {};
  const { user, isLoggedIn, logout } = useContext(AuthContext) || {};
  const { wishlistCount } = useContext(WishlistContext) || {};
  const { openLogin } = useModal() || {};

  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [expandedCatSlug, setExpandedCatSlug] = useState(null);

  // Close drawer and lock/unlock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleAuthClick = () => {
    onClose();
    if (user || isLoggedIn) {
      navigate("/profile");
    } else {
      if (openLogin) openLogin();
    }
  };

  const handleLogout = () => {
    onClose();
    if (logout) logout();
    navigate("/", { replace: true });
  };

  const toggleSubcategory = (catSlug, e) => {
    e.stopPropagation();
    setExpandedCatSlug((prev) => (prev === catSlug ? null : catSlug));
  };

  const isHomeActive = pathname === "/" && !search;
  const isProductsActive = pathname === "/products" && !search.includes("category=");
  const isOrdersActive = pathname === "/orders" || pathname === "/my-orders";
  const isWishlistActive = pathname === "/wishlist";
  const isDealsActive = pathname === "/deals" || pathname === "/products/deals";
  const isProfileActive = pathname === "/profile";

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        className={`mobile-drawer-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Left Slide-in Drawer Container */}
      <aside
        className={`mobile-left-drawer ${isOpen ? "open" : ""}`}
        aria-label="Mobile Navigation Menu"
        aria-hidden={!isOpen}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-brand" onClick={() => handleNavigate("/")}>
            <Logo />
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
          </button>
        </div>

        {/* User Greeting / Auth Bar */}
        <div className="drawer-auth-banner">
          <div className="drawer-user-avatar">
            <HugeiconsIcon icon={UserIcon} size={18} strokeWidth={2} />
          </div>
          <div className="drawer-user-info">
            {user || isLoggedIn ? (
              <>
                <span className="drawer-greeting">WELCOME BACK</span>
                <strong className="drawer-username">
                  {user?.first_name || user?.name || user?.username || "Moxie Member"}
                </strong>
              </>
            ) : (
              <>
                <span className="drawer-greeting">EXPERIENCE LUXURY</span>
                <button
                  type="button"
                  className="drawer-signin-link"
                  onClick={handleAuthClick}
                >
                  Sign In / Register →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Drawer Scrollable Navigation Area */}
        <nav className="drawer-nav-list">
          {/* Home */}
          <button
            type="button"
            className={`drawer-nav-item ${isHomeActive ? "active" : ""}`}
            onClick={() => handleNavigate("/")}
          >
            <span className="drawer-nav-icon">
              <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.8} />
            </span>
            <span className="drawer-nav-text">HOME</span>
          </button>

          {/* Shop / All Products */}
          <button
            type="button"
            className={`drawer-nav-item ${isProductsActive ? "active" : ""}`}
            onClick={() => handleNavigate("/products")}
          >
            <span className="drawer-nav-icon">
              <HugeiconsIcon icon={ShoppingBag01Icon} size={20} strokeWidth={1.8} />
            </span>
            <span className="drawer-nav-text">ALL PRODUCTS</span>
          </button>

          {/* Categories Expandable Accordion */}
          <div className="drawer-category-group">
            <button
              type="button"
              className={`drawer-nav-item drawer-accordion-trigger ${
                pathname.startsWith("/products/") || search.includes("category=")
                  ? "active-parent"
                  : ""
              }`}
              onClick={() => setCategoriesExpanded((prev) => !prev)}
              aria-expanded={categoriesExpanded}
            >
              <span className="drawer-nav-icon">
                <HugeiconsIcon icon={Layers01Icon} size={20} strokeWidth={1.8} />
              </span>
              <span className="drawer-nav-text">CATEGORIES</span>
              <span className="drawer-chevron">
                <HugeiconsIcon
                  icon={categoriesExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                  size={16}
                  strokeWidth={2}
                />
              </span>
            </button>

            {/* Dynamic Backend Categories List */}
            {categoriesExpanded && (
              <div className="drawer-sub-menu">
                <button
                  type="button"
                  className="drawer-sub-item view-all-cats"
                  onClick={() => handleNavigate("/products")}
                >
                  <span>Browse All Categories</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                </button>

                {categories.map((cat) => {
                  const hasSub = cat.subcategories && cat.subcategories.length > 0;
                  const isCatOpen = expandedCatSlug === cat.slug;

                  return (
                    <div key={cat.id || cat.slug} className="drawer-cat-block">
                      <div className="drawer-cat-row">
                        <button
                          type="button"
                          className="drawer-sub-item drawer-cat-link"
                          onClick={() => handleNavigate(`/products/${cat.slug}`)}
                        >
                          {cat.name}
                        </button>
                        {hasSub && (
                          <button
                            type="button"
                            className="drawer-nested-toggle"
                            onClick={(e) => toggleSubcategory(cat.slug, e)}
                            aria-label={`Toggle ${cat.name} subcategories`}
                          >
                            <HugeiconsIcon
                              icon={isCatOpen ? ArrowDown01Icon : ArrowRight01Icon}
                              size={14}
                            />
                          </button>
                        )}
                      </div>

                      {/* Nested Subcategories */}
                      {hasSub && isCatOpen && (
                        <div className="drawer-nested-list">
                          {cat.subcategories.map((sub) => (
                            <button
                              key={sub.id || sub.slug}
                              type="button"
                              className="drawer-nested-item"
                              onClick={() =>
                                handleNavigate(`/products/${cat.slug}/${sub.slug}`)
                              }
                            >
                              <span>{sub.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deals */}
          <button
            type="button"
            className={`drawer-nav-item ${isDealsActive ? "active" : ""}`}
            onClick={() => handleNavigate("/deals")}
          >
            <span className="drawer-nav-icon">
              <HugeiconsIcon icon={SparklesIcon} size={20} strokeWidth={1.8} />
            </span>
            <span className="drawer-nav-text">HOT DEALS</span>
            <span className="drawer-nav-tag">EXCLUSIVE</span>
          </button>

          {/* Wishlist */}
          <button
            type="button"
            className={`drawer-nav-item ${isWishlistActive ? "active" : ""}`}
            onClick={() => handleNavigate("/wishlist")}
          >
            <span className="drawer-nav-icon">
              <HugeiconsIcon icon={FavouriteIcon} size={20} strokeWidth={1.8} />
            </span>
            <span className="drawer-nav-text">WISHLIST</span>
            {wishlistCount > 0 && (
              <span className="drawer-badge">{wishlistCount}</span>
            )}
          </button>

          {/* My Orders (when authenticated) */}
          {(user || isLoggedIn) && (
            <button
              type="button"
              className={`drawer-nav-item ${isOrdersActive ? "active" : ""}`}
              onClick={() => handleNavigate("/orders")}
            >
              <span className="drawer-nav-icon">
                <HugeiconsIcon icon={DeliveryTruck01Icon} size={20} strokeWidth={1.8} />
              </span>
              <span className="drawer-nav-text">MY ORDERS</span>
            </button>
          )}

          <div className="drawer-divider" />

          {/* Account / Profile */}
          <button
            type="button"
            className={`drawer-nav-item ${isProfileActive ? "active" : ""}`}
            onClick={handleAuthClick}
          >
            <span className="drawer-nav-icon">
              <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={1.8} />
            </span>
            <span className="drawer-nav-text">
              {user || isLoggedIn ? "MY ACCOUNT" : "SIGN IN / REGISTER"}
            </span>
          </button>

          {/* Logout (when authenticated) */}
          {(user || isLoggedIn) && (
            <button
              type="button"
              className="drawer-nav-item drawer-logout-item"
              onClick={handleLogout}
            >
              <span className="drawer-nav-icon">
                <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.8} />
              </span>
              <span className="drawer-nav-text">LOG OUT</span>
            </button>
          )}
        </nav>

        {/* Drawer Footer Branding */}
        <div className="drawer-footer">
          <div className="drawer-secure-tag">
            <HugeiconsIcon icon={SecurityLockIcon} size={14} />
            <span>100% SECURE CHECKOUT</span>
          </div>
          <div className="drawer-footer-brand">MOXIE LUXURY COLLECTION</div>
        </div>
      </aside>
    </>
  );
}
