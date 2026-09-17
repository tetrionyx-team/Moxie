import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

import Home from "./Home/Home";
import Products from "./Products/Products";
import Deals from "./Deals/Deals";
import Wishlist from "./Wishlist/Wishlist";
import Cart from "./Cart/Cart";
import Checkout from "./Checkout/Checkout";
import ProfilePage from "./Profile/ProfilePage";
import TrackOrderPage from "./TrackOrder/TrackOrderPage";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import MobileBottomNav from "../components/MobileBottomNav/MobileBottomNav";
import WhatsAppButton from "../components/WhatsAppButton/WhatsAppButton";
import PrivacyPolicyModal from "../components/PrivacyPolicy/PrivacyPolicyModal";
import TermsConditionsModal from "../components/TermsConditions/TermsConditionsModal";
import ShippingPolicyModal from "../components/ShippingPolicy/ShippingPolicyModal";
import RefundPolicyModal from "../components/RefundPolicy/RefundPolicyModal";
import ContactModal from "../components/contact/ContactModal";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/", search: "", state: {} }),
  useParams: () => ({ category: "watches", productId: "1" }),
  useSearchParams: () => [new URLSearchParams(""), jest.fn()],
}));

// Mock Contexts
jest.mock("../context/DataContext", () => ({
  useData: () => ({
    products: [
      {
        id: 1,
        name: "Moxie Luxury Watch",
        price: 4999,
        original_price: 7999,
        image: "watch1.jpg",
        category: "watches",
        in_stock: true,
      },
      {
        id: 2,
        name: "Moxie Sport Shoes",
        price: 2999,
        original_price: 4999,
        image: "shoes1.jpg",
        category: "shoes",
        in_stock: true,
      },
    ],
    categories: [
      { id: 1, name: "Watches", slug: "watches" },
      { id: 2, name: "Shoes", slug: "shoes" },
    ],
    storeSettings: {
      store_name: "MOXIE",
      support_phone: "+91 9876543210",
      support_email: "support@moxiestore.com",
    },
    loading: false,
    addToCart: jest.fn(),
  }),
}));

const mockAuthValue = {
  user: { id: "1", name: "Alex Moxie", email: "alex@moxie.com" },
  isLoggedIn: true,
  logout: jest.fn(),
  updateUser: jest.fn(),
};

jest.mock("../context/AuthContext", () => {
  const React = require("react");
  const AuthContext = React.createContext({
    user: { id: "1", name: "Alex Moxie", email: "alex@moxie.com" },
    isLoggedIn: true,
    logout: jest.fn(),
    updateUser: jest.fn(),
  });
  return {
    AuthContext,
    useAuth: () => ({
      user: { id: "1", name: "Alex Moxie", email: "alex@moxie.com" },
      isLoggedIn: true,
      logout: jest.fn(),
      updateUser: jest.fn(),
    }),
  };
});

jest.mock("../context/WishlistContext", () => ({
  WishlistContext: {
    Consumer: ({ children }) =>
      children({
        wishlist: [],
        wishlistCount: 0,
        addToWishlist: jest.fn(),
        removeFromWishlist: jest.fn(),
        isInWishlist: jest.fn(() => false),
      }),
  },
  useWishlist: () => ({
    wishlist: [],
    wishlistCount: 0,
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    isInWishlist: jest.fn(() => false),
  }),
}));

jest.mock("../context/CartContext", () => ({
  useCart: () => ({
    cart: [
      {
        id: 1,
        name: "Moxie Luxury Watch",
        price: 4999,
        quantity: 1,
        image: "watch1.jpg",
      },
    ],
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    totalAmount: 4999,
    itemCount: 1,
  }),
  CartContext: {
    Consumer: ({ children }) =>
      children({
        cart: [],
        addToCart: jest.fn(),
      }),
  },
}));

jest.mock("../context/ModalContext", () => ({
  useModal: () => ({
    isLoginOpen: false,
    openLogin: jest.fn(),
    closeLogin: jest.fn(),
    isCartOpen: false,
    openCart: jest.fn(),
    closeCart: jest.fn(),
  }),
}));

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE (320px)", width: 320, height: 568 },
  { name: "Galaxy S8/S9 (360px)", width: 360, height: 800 },
  { name: "iPhone 12/13/14 (390px)", width: 390, height: 844 },
  { name: "Pixel 7 / S20 (412px)", width: 412, height: 915 },
  { name: "iPhone 14/15 Pro Max (430px)", width: 430, height: 932 },
];

describe("Mobile Responsive Page Snapshot & Layout Verification", () => {
  const setMobileViewport = (width, height) => {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatchEvent(new Event("resize"));
  };

  MOBILE_VIEWPORTS.forEach(({ name, width, height }) => {
    describe(`Viewport: ${name}`, () => {
      beforeEach(() => {
        setMobileViewport(width, height);
      });

      test("renders Home page cleanly on mobile without crash", () => {
        const { asFragment } = render(<Home />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Products catalog page on mobile", () => {
        const { asFragment } = render(<Products />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Deals page on mobile", () => {
        const { asFragment } = render(<Deals />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Wishlist page on mobile", () => {
        const { asFragment } = render(<Wishlist />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Cart page on mobile", () => {
        const { asFragment } = render(<Cart />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Checkout page on mobile", () => {
        const { asFragment } = render(<Checkout />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Profile / Orders page on mobile", () => {
        const { asFragment } = render(<ProfilePage defaultTab="orders" />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Track Order page on mobile", () => {
        const { asFragment } = render(<TrackOrderPage />);
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Header, Footer, BottomNav & WhatsApp on mobile", () => {
        const { asFragment } = render(
          <>
            <Header searchQuery="" setSearchQuery={jest.fn()} />
            <MobileBottomNav />
            <WhatsAppButton />
            <Footer />
          </>
        );
        expect(asFragment()).toMatchSnapshot();
      });

      test("renders Policy Modals and Contact Modal on mobile", () => {
        const { asFragment } = render(
          <>
            <PrivacyPolicyModal isOpen={true} onClose={jest.fn()} />
            <TermsConditionsModal isOpen={true} onClose={jest.fn()} />
            <ShippingPolicyModal isOpen={true} onClose={jest.fn()} />
            <RefundPolicyModal isOpen={true} onClose={jest.fn()} />
            <ContactModal isOpen={true} onClose={jest.fn()} />
          </>
        );
        expect(asFragment()).toMatchSnapshot();
      });
    });
  });
});
