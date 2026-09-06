import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { profileService } from "../../services/profileService";
import { orderService } from "../../services/orderService";
import { addressService } from "../../services/addressService";

// Import subcomponents
import ProfileSidebar from "../../components/Profile/ProfileSidebar";
import ProfileDetails from "../../components/Profile/ProfileDetails";
import MyOrders from "../../components/Profile/MyOrders";
import OrderDetails from "../../components/Profile/OrderDetails";
import TrackOrder from "../../components/Profile/TrackOrder";
import Addresses from "../../components/Profile/Addresses";
import AccountSecurity from "../../components/Profile/AccountSecurity";
import Wishlist from "../Wishlist/Wishlist";
import LogoutConfirmModal from "../../components/account/LogoutConfirmModal";

import "../../components/Profile/Profile.css";

export default function ProfilePage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State
  const [activeTab, setActiveTab] = useState(location.state?.tab || "profile");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  // Data States
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect to home if user session is not found
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Load user data dynamically
  useEffect(() => {
    if (!user?.email) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const prof = await profileService.fetchProfile(user.email);
        const ords = await orderService.fetchOrders(user.email);
        const addrs = await addressService.fetchAddresses(user.email);
        
        setProfile(prof);
        setOrders(ords);
        setAddresses(addrs);
      } catch (err) {
        console.error("Failed to load profile account data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Profile update handler
  const handleUpdateProfile = async (updatedData) => {
    if (!user?.email) return;
    const updated = await profileService.updateProfile(user.email, updatedData);
    setProfile(updated);
  };

  // Order actions
  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    setActiveTab("order-details");
  };

  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab("track-order");
  };

  const handleCancelOrder = async (orderId) => {
    if (!user?.email) return;
    const success = await orderService.cancelOrder(user.email, orderId);
    if (success) {
      const ords = await orderService.fetchOrders(user.email);
      setOrders(ords);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(ords.find((o) => o.id === orderId));
      }
    }
  };

  // Address actions
  const handleAddAddress = async (addrData) => {
    if (!user?.email) return;
    await addressService.addAddress(user.email, addrData);
    const addrs = await addressService.fetchAddresses(user.email);
    setAddresses(addrs);
  };

  const handleUpdateAddress = async (addrId, addrData) => {
    if (!user?.email) return;
    await addressService.updateAddress(user.email, addrId, addrData);
    const addrs = await addressService.fetchAddresses(user.email);
    setAddresses(addrs);
  };

  const handleDeleteAddress = async (addrId) => {
    if (!user?.email) return;
    await addressService.deleteAddress(user.email, addrId);
    const addrs = await addressService.fetchAddresses(user.email);
    setAddresses(addrs);
  };

  const handleSetDefaultAddress = async (addrId) => {
    if (!user?.email) return;
    await addressService.setDefaultAddress(user.email, addrId);
    const addrs = await addressService.fetchAddresses(user.email);
    setAddresses(addrs);
  };

  // Security actions
  const handleDeleteAccount = () => {
    // Delete profile and orders mock cache
    localStorage.removeItem(`moxie_profile_${user.email}`);
    localStorage.removeItem(`moxie_orders_${user.email}`);
    localStorage.removeItem(`moxie_addresses_${user.email}`);
    logout();
    navigate("/");
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate("/");
  };

  if (!user) return null;

  const renderActiveSection = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading account...</span>
          </div>
          <p className="mt-3 text-muted" style={{ fontSize: "14px" }}>Loading your account details...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "profile":
        return <ProfileDetails profile={profile} onUpdate={handleUpdateProfile} />;
      case "orders":
        return (
          <MyOrders
            orders={orders}
            onViewDetails={handleViewOrderDetails}
            onTrackOrder={handleTrackOrder}
            onCancelOrder={handleCancelOrder}
          />
        );
      case "order-details":
        return <OrderDetails order={selectedOrder} onBack={() => setActiveTab("orders")} />;
      case "track-order":
        return <TrackOrder order={selectedOrder} onBack={() => setActiveTab("orders")} />;
      case "addresses":
        return (
          <Addresses
            addresses={addresses}
            onAddAddress={handleAddAddress}
            onUpdateAddress={handleUpdateAddress}
            onDeleteAddress={handleDeleteAddress}
            onSetDefault={handleSetDefaultAddress}
          />
        );
      case "wishlist":
        return <Wishlist embedded={true} />;
      case "security":
        return <AccountSecurity profile={profile} onDeleteAccount={handleDeleteAccount} />;
      default:
        return <ProfileDetails profile={profile} onUpdate={handleUpdateProfile} />;
    }
  };

  return (
    <main className="profile-page-container container page-shell">
      {/* Mobile Select Tab Navigation */}
      <div className="profile-mobile-nav">
        <select
          className="profile-mobile-select"
          value={activeTab === "order-details" || activeTab === "track-order" ? "orders" : activeTab}
          onChange={(e) => {
            if (e.target.value === "wishlist") {
              navigate("/wishlist");
            } else {
              setActiveTab(e.target.value);
            }
          }}
        >
          <option value="profile">My Profile</option>
          <option value="orders">My Orders</option>
          <option value="wishlist">My Wishlist</option>
          <option value="addresses">My Addresses</option>
          <option value="security">Account & Security</option>
        </select>
      </div>

      <div className="profile-layout-grid">
        <ProfileSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          onLogout={handleLogoutClick}
        />
        <div className="profile-content-card">
          {renderActiveSection()}
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </main>
  );
}
