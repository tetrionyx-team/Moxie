import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProductCard, { isWatchCategory, isShirtCategory } from "./ProductCard";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";

const mockAddToCart = jest.fn();
const mockToggleWishlist = jest.fn();
const mockIsInWishlist = jest.fn().mockReturnValue(false);
const mockToast = jest.fn();

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, className }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("../../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

const renderWithProviders = (ui, { cart = [], wishlistState = false } = {}) => {
  mockIsInWishlist.mockReturnValue(wishlistState);
  return render(
    <CartContext.Provider value={{ cart, addToCart: mockAddToCart }}>
      <WishlistContext.Provider
        value={{
          wishlist: [],
          toggleWishlist: mockToggleWishlist,
          isInWishlist: mockIsInWishlist,
        }}
      >
        {ui}
      </WishlistContext.Provider>
    </CartContext.Provider>
  );
};

describe("ProductCard Component - Clean MOXIE Card Rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const watchProduct = {
    id: 101,
    name: "Test Sync Luxury Watch",
    description: "Premium everyday luxury watch.",
    category: "watches",
    category_slug: "watches",
    category_name: "Watches",
    price: 2499,
    discount: 4999,
    stock: true,
    image: "/images/watch.png",
  };

  const shirtProduct = {
    id: 102,
    name: "Men T-Shirt",
    description: "Premium cotton casual T-shirt.",
    category: "shirts",
    category_slug: "shirts",
    category_name: "Shirts",
    price: 700,
    discount: 1000,
    sizes: ["M", "S"],
    stock: true,
    image: "/images/shirt.png",
  };

  const shoeProduct = {
    id: 103,
    name: "Classic White Sneakers",
    description: "High-grade leather sneakers for daily wear.",
    category: "shoes",
    category_slug: "shoes",
    category_name: "Shoes",
    price: 1299,
    discount: 1999,
    stock: true,
    image: "/images/shoe.png",
  };

  const plainProductNoDiscount = {
    id: 104,
    name: "Plain Casual Cap",
    description: "Breathable cotton cap.",
    category: "caps",
    price: 700,
    discount: null,
    stock: true,
    image: "/images/cap.png",
  };

  test("TEST CASE 1 & 5: price=1000, discount=2000 displays current price ₹1,000 and struck ₹2,000", () => {
    const testProd = {
      id: 201,
      name: "Altra Super Premium",
      description: "Elegant minimalist design.",
      price: 1000,
      discount: 2000,
      stock: true,
    };

    renderWithProviders(<ProductCard product={testProd} />);

    expect(screen.getByText("₹1,000")).toBeInTheDocument();
    expect(screen.getByText("₹2,000")).toBeInTheDocument();
    expect(screen.getByText("Altra Super Premium")).toBeInTheDocument();
    expect(screen.getByText("Elegant minimalist design.")).toBeInTheDocument();
  });

  test("TEST CASE 2: price=700, discount=null displays only ₹700 with no strike-through", () => {
    renderWithProviders(<ProductCard product={plainProductNoDiscount} />);

    expect(screen.getByText("₹700")).toBeInTheDocument();
    expect(screen.queryByText("₹0")).not.toBeInTheDocument();
    expect(screen.queryByText("₹null")).not.toBeInTheDocument();
    expect(screen.queryByText("₹undefined")).not.toBeInTheDocument();
  });

  test("TEST CASE 3: Shirt with sizes=['M', 'S'] displays size buttons and requires size selection", () => {
    renderWithProviders(<ProductCard product={shirtProduct} />);

    expect(screen.getByText("Men T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("Premium cotton casual T-shirt.")).toBeInTheDocument();

    // Size buttons present for shirt
    expect(screen.getByRole("radio", { name: "M" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "S" })).toBeInTheDocument();

    // Prices: selling ₹700 and struck ₹1,000
    expect(screen.getByText("₹700")).toBeInTheDocument();
    expect(screen.getByText("₹1,000")).toBeInTheDocument();

    // Clicking Add to Cart without selecting size warns user
    const addBtn = screen.getByRole("button", { name: /Add Men T-Shirt to cart/i });
    fireEvent.click(addBtn);
    expect(mockAddToCart).not.toHaveBeenCalled();

    // Select size M and click Add to Cart
    fireEvent.click(screen.getByRole("radio", { name: "M" }));
    fireEvent.click(addBtn);
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 102,
        selectedSize: "M",
      }),
      1
    );
  });

  test("TEST CASE 4: Watch displays ₹2,499 and ₹4,999 with NO size section", () => {
    renderWithProviders(<ProductCard product={watchProduct} />);

    expect(screen.getByText("Test Sync Luxury Watch")).toBeInTheDocument();
    expect(screen.getByText("Premium everyday luxury watch.")).toBeInTheDocument();
    expect(screen.getByText("₹2,499")).toBeInTheDocument();
    expect(screen.getByText("₹4,999")).toBeInTheDocument();

    // Ensure NO size selector exists on Watch card
    expect(screen.queryByRole("radiogroup", { name: /Size options/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // Adds directly to cart without requiring size selection
    const addBtn = screen.getByRole("button", { name: /Add Test Sync Luxury Watch to cart/i });
    fireEvent.click(addBtn);
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 101,
        name: "Test Sync Luxury Watch",
      }),
      1
    );
  });

  test("Shoe and non-shirt products do not render size buttons on compact card", () => {
    renderWithProviders(<ProductCard product={shoeProduct} />);

    expect(screen.getByText("Classic White Sneakers")).toBeInTheDocument();
    expect(screen.getByText("₹1,299")).toBeInTheDocument();
    expect(screen.getByText("₹1,999")).toBeInTheDocument();

    // No size buttons for shoes on card
    expect(screen.queryByRole("radiogroup", { name: /Size options/i })).not.toBeInTheDocument();
  });

  test("Clean card does NOT show ratings, review counts, category headers, or savings badges", () => {
    const productWithExtraFields = {
      id: 301,
      name: "Sample Product",
      description: "Sample description text",
      price: 500,
      discount: 1000,
      rating: 4.5,
      reviewCount: 99,
      category_name: "WATCHES",
      stock: true,
    };

    renderWithProviders(<ProductCard product={productWithExtraFields} />);

    // No rating, review count, category header, or YOU SAVE badge
    expect(screen.queryByText("4.5")).not.toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
    expect(screen.queryByText(/No reviews yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText("WATCHES")).not.toBeInTheDocument();
    expect(screen.queryByText(/YOU SAVE/i)).not.toBeInTheDocument();
  });

  test("Wishlist button toggles wishlist on click", () => {
    renderWithProviders(<ProductCard product={watchProduct} />);

    const heartBtn = screen.getByRole("button", { name: /Add to wishlist/i });
    fireEvent.click(heartBtn);

    expect(mockToggleWishlist).toHaveBeenCalledWith(watchProduct);
  });
});
