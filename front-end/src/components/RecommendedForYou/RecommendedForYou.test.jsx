import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RecommendedForYou from "./RecommendedForYou";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { ToastProvider } from "../../context/ToastContext";

// Mock react-router-dom Link for Jest environment
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// Mock sample dynamic products from DataContext
const mockDynamicProducts = [
  { id: 101, brand: "CASIO", name: "Edifice Men Chronograph Black Gold Watch", price: 9999, oldPrice: 11999, discount: 16, category: "watches", category_name: "Watches", stock: true, rawStock: 10 },
  { id: 102, brand: "CASIO", name: "Edifice Men Chronograph Two Tone Watch", price: 10999, category: "watches", category_name: "Watches", stock: true, rawStock: 8 },
  { id: 103, brand: "CASIO", name: "Edifice Men Chronograph Classic Black Watch", price: 9499, category: "watches", category_name: "Watches", stock: true, rawStock: 5 },
  { id: 104, brand: "CASIO", name: "Edifice Men Chronograph Blue Dial Watch", price: 9999, category: "watches", category_name: "Watches", stock: true, rawStock: 12 },
  { id: 105, brand: "JACOB & CO", name: "Jacob & Co Inspired Skeleton Orange Watch", price: 12999, category: "watches", category_name: "Watches", stock: true, rawStock: 4 },
  { id: 106, brand: "OBLIK", name: "Vertu Men Quartz Blue Dial Chronograph Leather Watch", price: 9600, category: "watches", category_name: "Watches", stock: true, rawStock: 6 },
  { id: 107, brand: "GARMIN", name: "FORERUNNER Unisex Quartz Black Dial Digital Silicone Watch", price: 25990, category: "watches", category_name: "Watches", stock: true, rawStock: 3 },
  { id: 108, brand: "CASIO", name: "Edifice Men Quartz Beige Dial Chronograph Leather Watch EX303", price: 7795, category: "watches", category_name: "Watches", stock: true, rawStock: 7 },
  { id: 109, brand: "FOSSIL", name: "Fossil Men Minimalist Watch", price: 8999, category: "watches", category_name: "Watches", stock: true, rawStock: 5 },
  { id: 201, brand: "MOXIE", name: "Urban Street T-Shirt", price: 1299, category: "clothing", category_name: "Clothing", stock: true, rawStock: 10 },
];

let mockCurrentProducts = mockDynamicProducts;

jest.mock("../../context/DataContext", () => ({
  useData: () => ({
    products: mockCurrentProducts,
    loading: false,
  }),
}));

describe("RecommendedForYou Watch Component", () => {
  const mockAddToCart = jest.fn();
  const mockToggleWishlist = jest.fn();
  const mockIsInWishlist = jest.fn(() => false);

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <CartContext.Provider
          value={{
            cart: [],
            addToCart: mockAddToCart,
            cartCount: 0,
          }}
        >
          <WishlistContext.Provider
            value={{
              wishlist: [],
              wishlistCount: 0,
              toggleWishlist: mockToggleWishlist,
              isInWishlist: mockIsInWishlist,
            }}
          >
            <RecommendedForYou />
          </WishlistContext.Provider>
        </CartContext.Provider>
      </ToastProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentProducts = mockDynamicProducts;
  });

  it("returns null when there are zero watch products", () => {
    mockCurrentProducts = [
      { id: 201, brand: "MOXIE", name: "Urban Street T-Shirt", price: 1299, category: "clothing", stock: true },
    ];
    const { container } = renderComponent();
    expect(container.querySelector(".recommended-section")).toBeNull();
  });

  it("renders the section heading, subtitle, and View All link pointing to watches catalog", () => {
    renderComponent();
    expect(screen.getByText("RECOMMENDED FOR YOU")).toBeInTheDocument();
    expect(screen.getByText("MOXIE GADGETS & STYLE")).toBeInTheDocument();
    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute("href", "/products?category=watches");
  });

  it("renders maximum 8 watch cards (two rows preview) and filters out non-watches like T-Shirts", () => {
    renderComponent();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(8); // Sliced to max 8 even though there are 9 watches

    expect(screen.getAllByText("CASIO").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("JACOB & CO")).toBeInTheDocument();
    expect(screen.getByText("OBLIK")).toBeInTheDocument();
    expect(screen.getByText("GARMIN")).toBeInTheDocument();
    expect(screen.queryByText("Urban Street T-Shirt")).toBeNull(); // Clothing excluded
  });

  it("handles Add to Cart interaction for a watch card", () => {
    renderComponent();
    const addToCartButtons = screen.getAllByRole("button", {
      name: /add .* to cart/i,
    });
    expect(addToCartButtons).toHaveLength(8);

    fireEvent.click(addToCartButtons[0]);
    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 101,
        brand: "CASIO",
      }),
      1
    );
  });

  it("handles Wishlist toggle interaction", () => {
    renderComponent();
    const wishlistButtons = screen.getAllByRole("button", {
      name: /add to wishlist/i,
    });
    expect(wishlistButtons).toHaveLength(8);

    fireEvent.click(wishlistButtons[0]);
    expect(mockToggleWishlist).toHaveBeenCalledTimes(1);
    expect(mockToggleWishlist).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 101,
      })
    );
  });
});
