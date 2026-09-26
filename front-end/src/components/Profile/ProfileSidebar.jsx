import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LuUserRound,
  LuPackage,
  LuHeart,
  LuMapPin,
  LuShieldCheck,
  LuLogOut,
  LuChevronRight,
} from "react-icons/lu";

export default function ProfileSidebar({
  activeTab,
  setActiveTab,
  profile,
  user,
  onLogout,
}) {
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

  const [sidebarImgError, setSidebarImgError] = React.useState(false);
  const avatarUrl = profile?.avatar || user?.avatar || "";

  React.useEffect(() => {
    setSidebarImgError(false);
  }, [avatarUrl]);

  const displayName =
    profile?.name ||
    user?.name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
    (user?.username ? user.username.trim() : "") ||
    (user?.email ? user.email.split("@")[0] : "User");

  const avatarInitial = (
    profile?.name?.trim()?.charAt(0) ||
    user?.name?.trim()?.charAt(0) ||
    user?.first_name?.trim()?.charAt(0) ||
    user?.username?.trim()?.charAt(0) ||
    user?.email?.trim()?.charAt(0) ||
    "U"
  ).toUpperCase();

  return (
    <aside className="profile-sidebar-container" aria-label="Account navigation">
      {/* 1. Top Customer Profile Card */}
      <button
        type="button"
        className="profile-sidebar-user-card"
        onClick={() => handleMenuClick({ id: "profile" })}
        aria-label="View profile details"
      >
        <div className="sidebar-user-avatar" aria-hidden="true">
          {avatarUrl && !sidebarImgError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="sidebar-avatar-img"
              onError={() => setSidebarImgError(true)}
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span>{avatarInitial}</span>
          )}
        </div>
        <div className="sidebar-user-meta">
          <span className="sidebar-user-name">{displayName}</span>
          <span className="sidebar-user-welcome">Welcome to Moxie</span>
        </div>
        <LuChevronRight className="sidebar-user-arrow" aria-hidden="true" />
      </button>

      {/* 2. Navigation Menu Items */}
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

      {/* 3. Bottom Luxury Aesthetic Card */}
      <div className="sidebar-aesthetic-banner" aria-hidden="true">
        <div className="aesthetic-banner-inner">
          <p className="aesthetic-quote">Good style follows you always.</p>
          <span className="aesthetic-gold-line" />
          <span className="aesthetic-moxie-brand">M O X I E</span>
        </div>
      </div>
    </aside>
  );
}
