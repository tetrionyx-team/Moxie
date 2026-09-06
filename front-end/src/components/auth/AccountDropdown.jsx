import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { LuUserRound, LuPackage, LuHeart, LuLogOut } from "react-icons/lu";
import "./AccountDropdown.css";

/**
 * AccountDropdown
 * Premium cleaned-up dropdown menu shown below the Profile icon when logged in.
 */
function AccountDropdown({ user, onLogout, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleLogoutClick = (e) => {
    e.stopPropagation();
    onClose();
    onLogout();
  };

  const handleLinkClick = () => {
    onClose();
  };

  const userName = user?.name || "User";

  // Calculate initials from user name (e.g., "Harish Raja" -> "HR")
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div
      className="profile-dropdown-menu"
      role="menu"
      aria-label="User account menu"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Profile Header: User Name ONLY (No Email) */}
      <div className="profile-dropdown-user">
        <div className="profile-avatar" aria-hidden="true">
          {user?.avatar || user?.image ? (
            <img
              src={user.avatar || user.image}
              alt={userName}
              className="profile-avatar-img"
            />
          ) : (
            <span className="profile-avatar-initials">{getInitials(userName)}</span>
          )}
        </div>
        <div className="profile-user-name" title={userName}>
          {userName}
        </div>
      </div>

      {/* Subtle Divider */}
      <div className="profile-dropdown-divider" role="separator" />

      {/* 2. Menu Links */}
      <div className="profile-dropdown-links">
        <Link
          to="/profile"
          state={{ tab: "profile" }}
          className="profile-dropdown-item"
          role="menuitem"
          onClick={handleLinkClick}
        >
          <LuUserRound className="profile-item-icon" aria-hidden="true" />
          <span>My Account</span>
        </Link>

        <Link
          to="/profile"
          state={{ tab: "orders" }}
          className="profile-dropdown-item"
          role="menuitem"
          onClick={handleLinkClick}
        >
          <LuPackage className="profile-item-icon" aria-hidden="true" />
          <span>My Orders</span>
        </Link>

        <Link
          to="/wishlist"
          className="profile-dropdown-item"
          role="menuitem"
          onClick={handleLinkClick}
        >
          <LuHeart className="profile-item-icon" aria-hidden="true" />
          <span>My Wishlist</span>
        </Link>
      </div>

      {/* Divider before Logout */}
      <div className="profile-dropdown-divider" role="separator" />

      {/* 3. Logout */}
      <button
        type="button"
        className="profile-dropdown-logout-btn"
        role="menuitem"
        onClick={handleLogoutClick}
      >
        <LuLogOut className="profile-item-icon profile-logout-icon" aria-hidden="true" />
        <span>Logout</span>
      </button>
    </div>
  );
}

export default AccountDropdown;
