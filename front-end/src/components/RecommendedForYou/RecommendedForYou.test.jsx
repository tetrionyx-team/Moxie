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

// Mock DataContext
jest.mock("../../context/DataContext", () => ({
  useData: () => ({
    products: [],
    loading: false,
  }),
}));

describe("RecommendedForYou Component", () => {
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
  });

  it("renders the section heading, subtitle, and View All link", () => {
    renderComponent();
    expect(screen.getByText("RECOMMENDED FOR YOU")).toBeInTheDocument();
    expect(screen.getByText("MOXIE GADGETS & STYLE")).toBeInTheDocument();
    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute("href", "/products/watches");
  });

  it("renders exactly 8 watch cards with prices, ratings and brands", () => {
    renderComponent();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(8);

    // Verify presence of required brands
    expect(screen.getAllByText("CASIO").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("JACOB & CO")).toBeInTheDocument();
    expect(screen.getByText("OBLIK")).toBeInTheDocument();
    expect(screen.getByText("GARMIN")).toBeInTheDocument();
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
      })
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
