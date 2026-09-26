import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { LuUserRound, LuPackage, LuHeart, LuLogOut, LuChevronRight } from "react-icons/lu";
import "./AccountDropdown.css";

/**
 * AccountDropdown
 * Premium compact MOXIE-style dropdown menu shown below the Profile icon when logged in.
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

  const [imgError, setImgError] = React.useState(false);
  const avatarUrl = user?.avatar || user?.image || "";

  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const userName =
    user?.name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
    user?.username ||
    "User";

  // Calculate initial from user name with priority: full_name -> first_name -> username -> email -> "U"
  const getInitials = (name) => {
    const raw =
      name?.trim() ||
      user?.name?.trim() ||
      user?.first_name?.trim() ||
      user?.username?.trim() ||
      user?.email?.trim() ||
      "U";
    return raw.charAt(0).toUpperCase() || "U";
  };

  return (
    <div
      className="profile-dropdown-menu"
      role="menu"
      aria-label="User account menu"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Profile Header: Avatar + User Name + MOXIE Member Badge */}
      <div className="profile-dropdown-user">
        <div className="profile-avatar" aria-hidden="true">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="profile-avatar-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="profile-avatar-initials">{getInitials(userName)}</span>
          )}
        </div>
        <div className="profile-user-meta">
          <div className="profile-user-name" title={userName}>
            {userName}
          </div>
          <span className="profile-user-badge">MOXIE Member</span>
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
          <div className="profile-item-left">
            <LuUserRound className="profile-item-icon" aria-hidden="true" />
            <span className="profile-item-text">My Account</span>
          </div>
          <LuChevronRight className="profile-item-chevron" aria-hidden="true" />
        </Link>

        <Link
          to="/profile"
          state={{ tab: "orders" }}
          className="profile-dropdown-item"
          role="menuitem"
          onClick={handleLinkClick}
        >
          <div className="profile-item-left">
            <LuPackage className="profile-item-icon" aria-hidden="true" />
            <span className="profile-item-text">My Orders</span>
          </div>
          <LuChevronRight className="profile-item-chevron" aria-hidden="true" />
        </Link>

        <Link
          to="/wishlist"
          className="profile-dropdown-item"
          role="menuitem"
          onClick={handleLinkClick}
        >
          <div className="profile-item-left">
            <LuHeart className="profile-item-icon" aria-hidden="true" />
            <span className="profile-item-text">My Wishlist</span>
          </div>
          <LuChevronRight className="profile-item-chevron" aria-hidden="true" />
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
        <div className="profile-item-left">
          <LuLogOut className="profile-item-icon profile-logout-icon" aria-hidden="true" />
          <span className="profile-item-text">Logout</span>
        </div>
      </button>

      {/* 4. Subtle Brand Footer */}
      <div className="profile-dropdown-brand">
        <span>MOXIE</span>
        <span className="brand-dot">&middot;</span>
        <span>Wear Your Mood</span>
      </div>
    </div>
  );
}

export default AccountDropdown;
