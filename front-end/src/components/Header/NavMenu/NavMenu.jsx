import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WishlistContext } from "../../../context/WishlistContext";
import { CartContext } from "../../../context/CartContext";
import { AuthContext } from "../../../context/AuthContext";
import { useData } from "../../../context/DataContext";
import { useModal } from "../../../context/ModalContext";
import AccountDropdown from "../../auth/AccountDropdown";
import LogoutConfirmModal from "../../account/LogoutConfirmModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  FavouriteIcon,
  ShoppingCart01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import "./NavMenu.css";

function NavMenu() {
  const { wishlistCount } = useContext(WishlistContext) || {};
  const { cartCount, openCart } = useContext(CartContext) || {};
  const { user, isLoggedIn, logout } = useContext(AuthContext) || {};
  const { categories = [] } = useData() || {};
  const { openLogin } = useModal() || {};
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const categoryRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Handle Profile click
  const handleProfileClick = () => {
    if (user || isLoggedIn) {
      setShowUserMenu((prev) => !prev);
    } else {
      if (openLogin) openLogin();
    }
  };

  // Handle Logout Trigger
  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (logout) logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="nav-menu">
      {/* Categories Nav Item with Hugeicons Menu Icon */}
      <div
        ref={categoryRef}
        className="nav-item position-relative"
        onClick={() => setShowDropdown((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <div className="nav-icon-box">
          <HugeiconsIcon
            icon={Menu01Icon}
            size={24}
            strokeWidth={1.8}
            className="nav-hugeicon"
          />
        </div>
        <span>CATEGORIES</span>

        {/* Floating Categories Dropdown List with Nested Subcategories */}
        {showDropdown && categories && categories.length > 0 && (
          <div
            className="category-dropdown-list"
            onClick={(e) => e.stopPropagation()}
          >
            {categories.map((cat, index) => (
              <div key={index} className="category-dropdown-item-wrapper">
                <Link
                  className="category-dropdown-item d-flex justify-content-between align-items-center"
                  to={`/products/${cat.slug}`}
                  onClick={() => setShowDropdown(false)}
                  style={{ textDecoration: "none" }}
                >
                  <span>{cat.name}</span>
                  {cat.subcategories?.length > 0 && (
                    <span className="arrow-indicator">›</span>
                  )}
                </Link>

                {cat.subcategories?.length > 0 && (
                  <div className="category-subcategory-flyout">
                    {cat.subcategories.map((sub, sIndex) => (
                      <Link
                        key={sIndex}
                        className="category-subcategory-item"
                        to={`/products/${cat.slug}/${sub.slug}`}
                        onClick={() => setShowDropdown(false)}
                        style={{ textDecoration: "none" }}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wishlist Nav Item with Hugeicons Heart Icon */}
      <Link
        to="/wishlist"
        className="nav-item"
        style={{ textDecoration: "none", color: "inherit" }}
        aria-label="Wishlist"
      >
        <div className="wishlist-icon-wrapper nav-icon-box">
          <HugeiconsIcon
            icon={FavouriteIcon}
            size={24}
            strokeWidth={1.8}
            className="nav-hugeicon"
          />
          {wishlistCount > 0 && (
            <span className="wishlist-badge">{wishlistCount}</span>
          )}
        </div>
        <span>WISHLIST</span>
      </Link>

      {/* Cart Nav Item with Hugeicons Shopping Cart Icon - Opens Mini Cart Drawer */}
      <button
        type="button"
        className="nav-item nav-item--btn"
        onClick={openCart}
        aria-label="Open Cart Drawer"
      >
        <div className="cart-icon-wrapper nav-icon-box">
          <HugeiconsIcon
            icon={ShoppingCart01Icon}
            size={24}
            strokeWidth={1.8}
            className="nav-hugeicon"
          />
          {cartCount > 0 && (
            <span className="cart-badge">{cartCount}</span>
          )}
        </div>
        <span>CART</span>
      </button>

      {/* Profile Nav Item with Hugeicons User Icon */}
      <div ref={userMenuRef} className="nav-item position-relative">
        <button
          id="nav-profile-btn"
          type="button"
          className="profile-button nav-item nav-item--btn"
          onClick={handleProfileClick}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          aria-label={
            user || isLoggedIn ? "User account menu" : "Sign in to your account"
          }
        >
          <div className="nav-icon-box">
            <HugeiconsIcon
              icon={UserIcon}
              size={24}
              strokeWidth={1.8}
              className="nav-hugeicon"
            />
          </div>
          <span>{user?.name ? user.name.toUpperCase() : "PROFILE"}</span>
        </button>

        {/* Logged In Account Dropdown */}
        {(user || isLoggedIn) && showUserMenu && (
          <AccountDropdown
            user={user}
            onLogout={handleLogoutClick}
            onClose={() => setShowUserMenu(false)}
          />
        )}
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}

export default NavMenu;
