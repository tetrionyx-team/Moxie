import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";

import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import Footer from "./components/Footer/Footer";
import BrandIntro from "./components/BrandIntro/BrandIntro";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton";
import CartDrawer from "./components/CartDrawer/CartDrawer";
import MobileBottomNav from "./components/MobileBottomNav/MobileBottomNav";
import SignInModal from "./components/auth/SignInModal";

import { useModal } from "./context/ModalContext";
import { useData } from "./context/DataContext";
import { BACKEND_URL } from "./config";

// Route-based Code Splitting (React.lazy)
const Products = lazy(() => import("./pages/Products/Products"));
const ProductDetails = lazy(() => import("./pages/ProductDetails/ProductDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist/Wishlist"));
const Cart = lazy(() => import("./pages/Cart/Cart"));
const Register = lazy(() => import("./pages/Register/Register"));
const Checkout = lazy(() => import("./pages/Checkout/Checkout"));
const Deals = lazy(() => import("./pages/Deals/Deals"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrder/TrackOrderPage"));
const LiveTrackingPage = lazy(() => import("./pages/TrackOrder/LiveTrackingPage"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const MaintenancePage = lazy(() => import("./pages/Maintenance/MaintenancePage"));
const NotFoundPage = lazy(() => import("./pages/NotFound/NotFoundPage"));

// Lightweight branded route transition fallback
const RouteFallback = () => (
  <div
    style={{
      minHeight: "45vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
    }}
  >
    <div
      style={{
        width: "32px",
        height: "32px",
        border: "3px solid #EBE6DE",
        borderTop: "3px solid #C5A059",
        borderRadius: "50%",
        animation: "moxieSpin 0.7s linear infinite",
      }}
    />
    <style>
      {`@keyframes moxieSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
    </style>
  </div>
);

const ProductsSelector = () => {
  const { category } = useParams();
  const isNumeric = /^\d+$/.test(category || "");

  return isNumeric ? <ProductDetails /> : <Products />;
};

const AdminRedirect = ({ target }) => {
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]");

  const rawBackend = (
    BACKEND_URL ||
    (isLocal
      ? "http://127.0.0.1:8000"
      : "https://moxie-backend-hexm.onrender.com")
  )
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "");

  const dest =
    target === "login" ? `${rawBackend}/admin/login/` : `${rawBackend}/admin/`;

  useEffect(() => {
    try {
      window.location.replace(dest);
    } catch {
      window.location.href = dest;
    }
  }, [dest]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        fontFamily: "'Outfit', sans-serif",
        color: "#111",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "10px",
        }}
      >
        Redirecting to Moxie Admin Portal...
      </div>

      <p
        style={{
          color: "#8c8c8c",
          fontSize: "14px",
          marginBottom: "16px",
        }}
      >
        Please wait while we redirect you to the admin interface.
      </p>

      <a
        href={dest}
        style={{
          padding: "10px 20px",
          backgroundColor: "#111",
          color: "#fff",
          borderRadius: "6px",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        Click here if not redirected automatically
      </a>
    </div>
  );
};

const LoginRoute = () => {
  const { openLogin } = useModal();

  useEffect(() => {
    openLogin();
  }, [openLogin]);

  return <Home />;
};

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const { pathname } = useLocation();
  const { isLoginOpen, closeLogin } = useModal();
  const { storeSettings } = useData();

  // Scroll to top whenever route changes
  useEffect(() => {
    window.scrollTo(0, 0);

    // Leaving the Admin route ends the current Admin visit marker.
    if (!pathname.startsWith("/admin")) {
      try {
        sessionStorage.removeItem("adminVisitActive");
      } catch (error) {
        // Ignore storage access errors.
      }
    }
  }, [pathname]);

  const isAdminRoute = pathname.startsWith("/admin");

  // Maintenance Mode affects only the public storefront.
  if (storeSettings?.maintenance_mode && !isAdminRoute) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <MaintenancePage settings={storeSettings} />
      </Suspense>
    );
  }

  const appContent = (
    <>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/products" element={<Products />} />

          <Route path="/products/:category" element={<ProductsSelector />} />

          <Route
            path="/products/:category/:subcategory"
            element={<Products />}
          />

          {/* Product detail routes */}
          <Route path="/product/:productId" element={<ProductDetails />} />

          <Route
            path="/product/:category/:productId"
            element={<ProductDetails />}
          />

          <Route
            path="/products/product/:productId"
            element={<ProductDetails />}
          />

          <Route path="/wishlist" element={<Wishlist />} />

          <Route path="/cart" element={<Cart />} />

          <Route path="/register" element={<Register />} />

          {/* Sign-in modal opened through URL */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signin" element={<LoginRoute />} />

          <Route path="/checkout" element={<Checkout />} />

          <Route path="/deals" element={<Deals />} />

          {/* Tracking Routes */}
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/order-tracking" element={<TrackOrderPage />} />
          <Route path="/track-order/live/:orderId" element={<LiveTrackingPage />} />
          <Route path="/track/live/:orderId" element={<LiveTrackingPage />} />
          <Route path="/track-order/:orderId" element={<LiveTrackingPage />} />
          <Route path="/track/:orderId" element={<LiveTrackingPage />} />

          <Route path="/profile" element={<ProfilePage />} />

          {/* Direct account routes */}
          <Route path="/orders" element={<ProfilePage defaultTab="orders" />} />

          <Route
            path="/my-orders"
            element={<ProfilePage defaultTab="orders" />}
          />

          <Route
            path="/address"
            element={<ProfilePage defaultTab="addresses" />}
          />

          <Route
            path="/my-address"
            element={<ProfilePage defaultTab="addresses" />}
          />

          <Route
            path="/addresses"
            element={<ProfilePage defaultTab="addresses" />}
          />

          <Route
            path="/security"
            element={<ProfilePage defaultTab="security" />}
          />

          <Route
            path="/account-security"
            element={<ProfilePage defaultTab="security" />}
          />

          {/* Admin redirect routes */}
          <Route path="/admin" element={<AdminRedirect target="dashboard" />} />

          <Route path="/admin/login" element={<AdminRedirect target="login" />} />

          <Route
            path="/admin/dashboard"
            element={<AdminRedirect target="dashboard" />}
          />

          <Route
            path="/admin/*"
            element={<AdminRedirect target="dashboard" />}
          />

          {/* Standalone maintenance route */}
          <Route
            path="/maintenance"
            element={<MaintenancePage settings={storeSettings} />}
          />

          {/* Final custom 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <Footer />

      {/* Mini Cart Drawer */}
      {!isAdminRoute && <CartDrawer />}

      {/* Mobile Bottom Tab Navigation */}
      {!isAdminRoute && <MobileBottomNav />}

      {/* Global WhatsApp button */}
      {!isAdminRoute && <WhatsAppButton />}

      {/* Sign In Modal */}
      {isLoginOpen && <SignInModal onClose={closeLogin} />}
    </>
  );

  return <BrandIntro>{appContent}</BrandIntro>;
}

export default App;