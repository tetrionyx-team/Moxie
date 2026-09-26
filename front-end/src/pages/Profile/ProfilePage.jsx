import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { AuthContext } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useModal } from "../../context/ModalContext";

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
import AccountMobileNav from "../../components/Profile/AccountMobileNav";

import "../../components/Profile/Profile.css";

export default function ProfilePage({ defaultTab = "profile" }) {
  const { user, logout, updateUser } = useContext(AuthContext);
  const { storeSettings } = useData();
  const { openLogin } = useModal() || {};

  const navigate = useNavigate();
  const location = useLocation();

  // Tab State
  const [activeTab, setActiveTab] = useState(
    location.state?.tab || defaultTab
  );

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Support both navigation state and direct routes like /my-orders, /address, /security
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    } else {
      setActiveTab(defaultTab);
    }
  }, [location.state, defaultTab]);

  // Data States
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect to home and prompt login if no authenticated user exists
  useEffect(() => {
    if (!user) {
      if (openLogin) openLogin();
      navigate("/");
    }
  }, [user, navigate, openLogin]);

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
        console.error(
          "Failed to load profile account data:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Profile update handler
  const handleUpdateProfile = async (updatedData) => {
    if (!user?.email) return;

    const updated = await profileService.updateProfile(
      user.email,
      updatedData
    );

    setProfile(updated);
    if (updateUser) {
      updateUser(updated);
    }
    return updated;
  };

  // Order actions
  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    setActiveTab("order-details");
  };

  const handleTrackOrder = (order) => {
    const orderCode = order.order_number || order.orderId || (order.id ? `MOX-${String(order.id).padStart(4, "0")}` : "MOX-0001");
    navigate(`/track-order?order=${encodeURIComponent(orderCode)}`);
  };

  const handleCancelOrder = async (orderId) => {
    if (!user?.email) return;

    const success = await orderService.cancelOrder(
      user.email,
      orderId
    );

    if (success) {
      const ords = await orderService.fetchOrders(user.email);
      setOrders(ords);

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(
          ords.find((o) => o.id === orderId)
        );
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
    localStorage.removeItem(`moxie_profile_${user.email}`);
    localStorage.removeItem(`moxie_orders_${user.email}`);
    localStorage.removeItem(`moxie_addresses_${user.email}`);

    logout();
    navigate("/");
  };

  // Logout confirmation modal
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
        <div className="profile-loading-state">
          <div className="profile-spinner" role="status">
            <span className="sr-only">Loading account...</span>
          </div>
          <p className="profile-loading-text">Loading your account details...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "profile":
        return (
          <ProfileDetails
            profile={profile}
            onUpdate={handleUpdateProfile}
          />
        );

      case "orders":
        return (
          <MyOrders
            orders={orders}
            storeSettings={storeSettings}
            user={user}
            onViewDetails={handleViewOrderDetails}
            onTrackOrder={handleTrackOrder}
            onCancelOrder={handleCancelOrder}
          />
        );

      case "order-details":
        return (
          <OrderDetails
            order={selectedOrder}
            user={user}
            onBack={() => setActiveTab("orders")}
          />
        );

      case "track-order":
        return (
          <TrackOrder
            order={selectedOrder}
            onBack={() => setActiveTab("orders")}
          />
        );

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
        return (
          <AccountSecurity
            profile={profile}
            onDeleteAccount={handleDeleteAccount}
          />
        );

      default:
        return (
          <ProfileDetails
            profile={profile}
            onUpdate={handleUpdateProfile}
          />
        );
    }
  };

  return (
    <div className="account-page-wrapper">
      <main className="account-main-layout">
        {/* Mobile Tab Select Navigation */}
        <div className="profile-mobile-nav">
          <AccountMobileNav
            activeTab={activeTab}
            onSelectTab={(tab) => {
              if (tab === "wishlist") {
                navigate("/wishlist");
              } else {
                setActiveTab(tab);
              }
            }}
          />
        </div>

        {/* 2-Column Grid Layout */}
        <div className="account-layout-grid">
          <ProfileSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={profile}
            user={user}
            onLogout={handleLogoutClick}
          />

          <section className="account-content-panel">
            {renderActiveSection()}
          </section>
        </div>

        <LogoutConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      </main>
    </div>
  );
}
