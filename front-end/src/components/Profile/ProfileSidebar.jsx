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

  const menuItems = [
    { id: "profile", label: "My Profile", icon: <LuUserRound className="sidebar-icon" /> },
    { id: "orders", label: "My Orders", icon: <LuPackage className="sidebar-icon" /> },
    { id: "wishlist", label: "My Wishlist", icon: <LuHeart className="sidebar-icon" />, isLink: true, path: "/wishlist" },
    { id: "addresses", label: "My Address", icon: <LuMapPin className="sidebar-icon" /> },
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

  return (
    <aside className="profile-sidebar-container" aria-label="Account navigation">
      {/* Navigation menu items */}
      <nav className="profile-menu-nav">
        {menuItems.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === "orders" &&
              (activeTab === "order-details" || activeTab === "track-order"));

          return (
            <button
              key={item.id}
              type="button"
              className={`profile-menu-btn ${isActive ? "active" : ""}`}
              onClick={() => handleMenuClick(item)}
            >
              <span className="profile-menu-icon-wrap" aria-hidden="true">
                {item.icon}
              </span>
              <span className="profile-menu-label">{item.label}</span>
            </button>
          );
        })}

        <div className="profile-menu-divider" role="separator" />

        <button
          type="button"
          className="profile-menu-btn profile-menu-btn-logout"
          onClick={onLogout}
        >
          <span className="profile-menu-icon-wrap" aria-hidden="true">
            <LuLogOut className="sidebar-icon" />
          </span>
          <span className="profile-menu-label">Logout</span>
        </button>
      </nav>
    </aside>
  );
}
