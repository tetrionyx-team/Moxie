import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation, Link, useParams } from "react-router-dom";
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
import ProfilePage from "./pages/Profile/ProfilePage";
import SignInModal from "./components/auth/SignInModal";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton";
import { useModal } from "./context/ModalContext";
import { BACKEND_URL } from "./config";

const ProductsSelector = () => {
  const { category } = useParams();
  const isNumeric = /^\d+$/.test(category || "");
  return isNumeric ? <ProductDetails /> : <Products />;
};


const AdminRedirect = ({ target }) => {
  useEffect(() => {
    const dest = target === "login" ? `${BACKEND_URL}/admin/login/` : `${BACKEND_URL}/admin/`;
    window.location.href = dest;
  }, [target]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
      fontFamily: "'Outfit', sans-serif",
      color: "#111"
    }}>
      <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "10px" }}>
        Redirecting to Moxie Admin Portal...
      </div>
      <p style={{ color: "#8c8c8c", fontSize: "14px" }}>
        Please wait while we redirect you to the admin interface.
      </p>
    </div>
  );
};


function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const { pathname } = useLocation();
  const { isLoginOpen, closeLogin } = useModal();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isAdminRoute = pathname.startsWith("/admin");


  const appContent = (
    <>
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:category" element={<ProductsSelector />} />
        <Route path="/products/:category/:subcategory" element={<Products />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminRedirect target="dashboard" />} />
        <Route path="/admin/dashboard" element={<AdminRedirect target="dashboard" />} />
        <Route path="/admin/login" element={<AdminRedirect target="login" />} />
        <Route path="*" element={<div className="empty-state"><div className="empty-icon">404</div><h1>Page not found</h1><Link to="/" className="primary-btn">Back to home</Link></div>} />
      </Routes>

      <Footer />

      {/* Sign In Modal */}
      {isLoginOpen && <SignInModal onClose={closeLogin} />}
    </>
  );

  return (
    <>
      {appContent}

      {/* Global Fixed WhatsApp Button rendered at top level outside any transformed container */}
      {!isAdminRoute && <WhatsAppButton />}
    </>
  );
}


export default App;
