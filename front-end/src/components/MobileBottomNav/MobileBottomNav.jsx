import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Menu01Icon,
  FavouriteIcon,
  ShoppingBag01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { AuthContext } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import "./MobileBottomNav.css";

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useContext(CartContext) || {};
  const { wishlistCount } = useContext(WishlistContext) || {};
  const { user, isLoggedIn } = useContext(AuthContext) || {};
  const { openLogin } = useModal() || {};

  // Determine active tab
  const isHomeActive = pathname === "/";
  const isCategoriesActive =
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/product/");
  const isWishlistActive = pathname === "/wishlist";
  const isCartActive = pathname === "/cart";
  const isProfileActive =
    pathname === "/profile" ||
    pathname === "/orders" ||
    pathname === "/my-orders" ||
    pathname.startsWith("/profile/");

  const handleProfileClick = () => {
    if (user || isLoggedIn) {
      navigate("/profile");
    } else {
      if (openLogin) openLogin();
    }
  };

  return (
    <nav className="moxie-mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-nav-container">
        {/* Tab 1: Home */}
        <button
          type="button"
          className={`mobile-nav-item ${isHomeActive ? "active" : ""}`}
          onClick={() => navigate("/")}
          aria-label="Home"
        >
          <div className="mobile-nav-icon-wrapper">
            <HugeiconsIcon
              icon={Home01Icon}
              size={21}
              strokeWidth={isHomeActive ? 2.2 : 1.8}
            />
          </div>
          <span className="mobile-nav-label">HOME</span>
        </button>

        {/* Tab 2: Categories / Catalog */}
        <button
          type="button"
          className={`mobile-nav-item ${isCategoriesActive ? "active" : ""}`}
          onClick={() => navigate("/products")}
          aria-label="Categories"
        >
          <div className="mobile-nav-icon-wrapper">
            <HugeiconsIcon
              icon={Menu01Icon}
              size={21}
              strokeWidth={isCategoriesActive ? 2.2 : 1.8}
            />
          </div>
          <span className="mobile-nav-label">CATEGORIES</span>
        </button>

        {/* Tab 3: Wishlist */}
        <button
          type="button"
          className={`mobile-nav-item ${isWishlistActive ? "active" : ""}`}
          onClick={() => navigate("/wishlist")}
          aria-label="Wishlist"
        >
          <div className="mobile-nav-icon-wrapper">
            <HugeiconsIcon
              icon={FavouriteIcon}
              size={21}
              strokeWidth={isWishlistActive ? 2.2 : 1.8}
            />
            {wishlistCount > 0 && (
              <span className="mobile-nav-badge">{wishlistCount}</span>
            )}
          </div>
          <span className="mobile-nav-label">WISHLIST</span>
        </button>

        {/* Tab 4: Cart */}
        <button
          type="button"
          className={`mobile-nav-item ${isCartActive ? "active" : ""}`}
          onClick={() => navigate("/cart")}
          aria-label="Cart"
        >
          <div className="mobile-nav-icon-wrapper">
            <HugeiconsIcon
              icon={ShoppingBag01Icon}
              size={21}
              strokeWidth={isCartActive ? 2.2 : 1.8}
            />
            {cartCount > 0 && (
              <span className="mobile-nav-badge">{cartCount}</span>
            )}
          </div>
          <span className="mobile-nav-label">CART</span>
        </button>

        {/* Tab 5: Profile */}
        <button
          type="button"
          className={`mobile-nav-item ${isProfileActive ? "active" : ""}`}
          onClick={handleProfileClick}
          aria-label="Profile"
        >
          <div className="mobile-nav-icon-wrapper">
            <HugeiconsIcon
              icon={UserIcon}
              size={21}
              strokeWidth={isProfileActive ? 2.2 : 1.8}
            />
          </div>
          <span className="mobile-nav-label">
            {user || isLoggedIn ? "PROFILE" : "ACCOUNT"}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
