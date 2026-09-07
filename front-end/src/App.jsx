import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";

import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import Products from "./pages/Products/Products";
import ProductDetails from "./pages/ProductDetails/ProductDetails";
import Wishlist from "./pages/Wishlist/Wishlist";
import Cart from "./pages/Cart/Cart";
import Footer from "./components/Footer/Footer";
import Register from "./pages/Register/Register";
import Checkout from "./pages/Checkout/Checkout";
import Deals from "./pages/Deals/Deals";
import BrandIntro from "./components/BrandIntro/BrandIntro";
import ProfilePage from "./pages/Profile/ProfilePage";
import SignInModal from "./components/auth/SignInModal";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton";
import CartDrawer from "./components/CartDrawer/CartDrawer";

import MaintenancePage from "./pages/Maintenance/MaintenancePage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";

import { useModal } from "./context/ModalContext";
import { useData } from "./context/DataContext";
import { BACKEND_URL } from "./config";

const ProductsSelector = () => {
  const { category } = useParams();
  const isNumeric = /^\d+$/.test(category || "");

  return isNumeric ? <ProductDetails /> : <Products />;
};

const AdminRedirect = ({ target }) => {
  useEffect(() => {
    const dest =
      target === "login"
        ? `${BACKEND_URL}/admin/login/`
        : `${BACKEND_URL}/admin/`;

    window.location.href = dest;
  }, [target]);

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
        }}
      >
        Please wait while we redirect you to the admin interface.
      </p>
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
  // Admin routes must remain directly accessible.
  if (storeSettings?.maintenance_mode && !isAdminRoute) {
    return <MaintenancePage settings={storeSettings} />;
  }

  const appContent = (
    <>
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/products" element={<Products />} />

        <Route
          path="/products/:category"
          element={<ProductsSelector />}
        />

        <Route
          path="/products/:category/:subcategory"
          element={<Products />}
        />

        {/* Additional product-detail routes from Siva functionality */}
        <Route
          path="/product/:productId"
          element={<ProductDetails />}
        />

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

        {/* Existing sign-in modal opened through URL */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signin" element={<LoginRoute />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/deals" element={<Deals />} />

        <Route path="/profile" element={<ProfilePage />} />

        {/* Direct order-history routes */}
        <Route
          path="/orders"
          element={<ProfilePage defaultTab="orders" />}
        />

        <Route
          path="/my-orders"
          element={<ProfilePage defaultTab="orders" />}
        />

        {/* Admin redirect routes */}
        <Route
          path="/admin"
          element={<AdminRedirect target="dashboard" />}
        />

        <Route
          path="/admin/dashboard"
          element={<AdminRedirect target="dashboard" />}
        />

        <Route
          path="/admin/login"
          element={<AdminRedirect target="login" />}
        />

        {/* Standalone maintenance route */}
        <Route path="/maintenance" element={<MaintenancePage settings={storeSettings} />} />

        {/* Final custom 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer />

      {/* Mini Cart Drawer */}
      {!isAdminRoute && <CartDrawer />}

      {/* Global WhatsApp button (hidden during Brand Intro as part of appContent) */}
      {!isAdminRoute && <WhatsAppButton />}

      {/* Sign In Modal */}
      {isLoginOpen && <SignInModal onClose={closeLogin} />}
    </>
  );

  return (
    <BrandIntro>
      {appContent}
    </BrandIntro>
  );
}

export default App;