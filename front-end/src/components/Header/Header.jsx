import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo/Logo";
import SearchBar from "./SearchBar/SearchBar";
import NavMenu from "./NavMenu/NavMenu";
import NavBottom from "./NavBottom/NavBottom";
import Offer from "../Banner/Offer";
import MobileLeftDrawer from "./MobileLeftDrawer/MobileLeftDrawer";
import { WishlistContext } from "../../context/WishlistContext";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  FavouriteIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import "./Header.css";

function Header({ searchQuery, setSearchQuery }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { wishlistCount } = useContext(WishlistContext) || {};
  const navigate = useNavigate();

  return (
    <header className="site-header">
      {/* Mobile Top Header (Mobile Viewports < 768px) */}
      <div className="mobile-header-bar">
        <div className="mobile-header-inner">
          {/* Left: Hamburger Icon */}
          <button
            type="button"
            className="mobile-header-icon-btn mobile-hamburger-btn"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <HugeiconsIcon icon={Menu01Icon} size={22} strokeWidth={2} />
          </button>

          {/* Center: MOXIE Logo */}
          <div className="mobile-header-logo">
            <Logo />
          </div>

          {/* Right: Search & Wishlist Actions */}
          <div className="mobile-header-actions">
            <button
              type="button"
              className={`mobile-header-icon-btn ${
                isMobileSearchOpen ? "active" : ""
              }`}
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              aria-label={isMobileSearchOpen ? "Close Search" : "Open Search"}
            >
              <HugeiconsIcon
                icon={isMobileSearchOpen ? Cancel01Icon : Search01Icon}
                size={21}
                strokeWidth={2}
              />
            </button>

            <button
              type="button"
              className="mobile-header-icon-btn mobile-wishlist-btn"
              onClick={() => navigate("/wishlist")}
              aria-label="Wishlist"
            >
              <HugeiconsIcon icon={FavouriteIcon} size={21} strokeWidth={2} />
              {wishlistCount > 0 && (
                <span className="mobile-header-badge">{wishlistCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Mobile Search Row */}
        {isMobileSearchOpen && (
          <div className="mobile-expandable-search">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
        )}
      </div>

      {/* Desktop Header (Desktop/Laptop Viewports >= 768px) */}
      <div className="main-header-wrapper desktop-header-wrapper">
        <div className="container">
          <div className="header">
            <Logo />
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            <NavMenu />
          </div>
        </div>
      </div>

      {/* Desktop Sub-Navbar Category Bar (Hidden on Mobile < 768px) */}
      <NavBottom />

      {/* Top Banner / Offer */}
      <Offer />

      {/* Mobile Sliding Left Drawer */}
      <MobileLeftDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </header>
  );
}

export default Header;
