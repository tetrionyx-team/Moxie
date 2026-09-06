import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LuUserRound,
  LuPackage,
  LuHeart,
  LuMapPin,
  LuShieldCheck,
  LuLogOut,
} from "react-icons/lu";

export default function ProfileSidebar({ activeTab, setActiveTab, profile, onLogout }) {
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const menuItems = [
    { id: "profile", label: "My Profile", icon: <LuUserRound className="sidebar-icon" /> },
    { id: "orders", label: "My Orders", icon: <LuPackage className="sidebar-icon" /> },
    { id: "wishlist", label: "My Wishlist", icon: <LuHeart className="sidebar-icon" />, isLink: true, path: "/wishlist" },
    { id: "addresses", label: "My Addresses", icon: <LuMapPin className="sidebar-icon" /> },
    { id: "security", label: "Account & Security", icon: <LuShieldCheck className="sidebar-icon" /> },
  ];

  const handleMenuClick = (item) => {
    if (item.id === "wishlist") {
      if (window.location.pathname !== "/wishlist") {
        navigate("/wishlist");
      }
      if (setActiveTab) {
        setActiveTab("wishlist");
      }
    } else {
      if (window.location.pathname === "/wishlist") {
        navigate("/profile", { state: { tab: item.id } });
      } else if (setActiveTab) {
        setActiveTab(item.id);
      } else {
        navigate("/profile", { state: { tab: item.id } });
      }
    }
  };

  const userName = profile?.name || "User";
  const userEmail = profile?.email || "";

  return (
    <aside className="profile-sidebar-card">
      {profile && (
        <div className="profile-user-summary">
          <div className="profile-summary-avatar-wrap">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={userName}
                className="profile-summary-avatar"
              />
            ) : (
              <div className="profile-summary-avatar-initials">
                {getInitials(userName)}
              </div>
            )}
          </div>
          <h3 className="profile-summary-name">{userName}</h3>
          {userEmail && <p className="profile-summary-email">{userEmail}</p>}
        </div>
      )}

      <nav className="profile-menu-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`profile-menu-btn ${
              activeTab === item.id ||
              (item.id === "orders" &&
                (activeTab === "order-details" || activeTab === "track-order"))
                ? "active"
                : ""
            }`}
            onClick={() => handleMenuClick(item)}
          >
            <span className="profile-menu-icon-wrap" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}

        <button
          type="button"
          className="profile-menu-btn profile-menu-btn-logout"
          onClick={onLogout}
        >
          <span className="profile-menu-icon-wrap" aria-hidden="true">
            <LuLogOut className="sidebar-icon" />
          </span>
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
