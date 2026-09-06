import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WishlistContext } from "../../../context/WishlistContext";
import { CartContext } from "../../../context/CartContext";
import { AuthContext } from "../../../context/AuthContext";
import { useData } from "../../../context/DataContext";
import { useModal } from "../../../context/ModalContext";
import AccountDropdown from "../../auth/AccountDropdown";
import LogoutConfirmModal from "../../account/LogoutConfirmModal";
import CategoryIcon from "../../../assets/icons/categories.svg";
import WishlistIcon from "../../../assets/icons/wishlist.svg";
import CartIcon from "../../../assets/icons/cart.svg";
import ProfileIcon from "../../../assets/icons/user.svg";
import "./NavMenu.css";

function NavMenu() {
  const { wishlistCount } = useContext(WishlistContext);
  const { cartCount } = useContext(CartContext);
  const { user, isLoggedIn, logout } = useContext(AuthContext);
  const { categories } = useData();
  const { openLogin } = useModal();
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
      // Toggle account dropdown for logged-in user
      setShowUserMenu((prev) => !prev);
    } else {
      // Logged-out user -> open login modal directly
      openLogin();
    }
  };

  // Handle Logout Trigger
  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="nav-menu">

      {/* Categories Nav Item */}
      <div
        ref={categoryRef}
        className="nav-item position-relative"
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        <img src={CategoryIcon} alt="Categories" />
        <span>CATEGORIES</span>

        {/* Floating Categories Dropdown List with Nested Subcategories */}
        {showDropdown && (
          <div className="category-dropdown-list" onClick={(e) => e.stopPropagation()}>
            {categories.map((cat, index) => (
              <div key={index} className="category-dropdown-item-wrapper">
                <Link
                  className="category-dropdown-item d-flex justify-content-between align-items-center"
                  to={`/products/${cat.slug}`}
                  onClick={() => setShowDropdown(false)}
                  style={{ textDecoration: "none" }}
                >
                  <span>{cat.name}</span>
                  {cat.subcategories?.length > 0 && <span className="arrow-indicator">›</span>}
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
            {/* Deals static link */}
            <div className="category-dropdown-item-wrapper">
              <Link
                className="category-dropdown-item"
                to="/products/deals"
                onClick={() => setShowDropdown(false)}
                style={{ textDecoration: "none" }}
              >
                Deals
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Wishlist Nav Item with Dynamic Notification Badge */}
      <Link to="/wishlist" className="nav-item" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="wishlist-icon-wrapper">
          <img src={WishlistIcon} alt="Wishlist" />
          {wishlistCount > 0 && (
            <span className="wishlist-badge">{wishlistCount}</span>
          )}
        </div>
        <span>WISHLIST</span>
      </Link>

      {/* Cart Nav Item with Dynamic Notification Badge */}
      <Link to="/cart" className="nav-item" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="cart-icon-wrapper">
          <img src={CartIcon} alt="Cart" />
          {cartCount > 0 && (
            <span className="cart-badge">{cartCount}</span>
          )}
        </div>
        <span>CART</span>
      </Link>

      {/* Profile Nav Item */}
      <div ref={userMenuRef} className="nav-item position-relative">
        <button
          id="nav-profile-btn"
          type="button"
          className="profile-button nav-item nav-item--btn"
          onClick={handleProfileClick}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          aria-label={user || isLoggedIn ? "User account menu" : "Sign in to your account"}
        >
          <img src={ProfileIcon} alt="Profile" />
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
