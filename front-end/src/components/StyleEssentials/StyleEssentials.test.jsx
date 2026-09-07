import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StyleEssentials from "./StyleEssentials";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { ToastProvider } from "../../context/ToastContext";

// Mock react-router-dom Link
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const mockProducts = [
  {
    id: 1,
    name: "Classic Heavyweight Cotton Oversized T-Shirt",
    category: "clothing",
    category_name: "Clothing",
    subcategory: "t-shirt",
    subcategory_name: "T-Shirt",
    price: 1299,
    oldPrice: 1599,
    discount: 19,
    stock: true,
    rawStock: 10,
    is_active: true,
    sizes: ["M", "L", "XL"],
    variants: [
      { id: 11, color_name: "Black", sizes: ["M", "L", "XL"], stock: 5, price: 1299, is_active: true },
    ],
  },
  {
    id: 2,
    name: "Street Foam Cushioned Daily Slides",
    category: "footwear",
    category_name: "Footwear",
    subcategory: "slides",
    subcategory_name: "Slides",
    price: 1899,
    oldPrice: null,
    discount: 0,
    stock: true,
    rawStock: 15,
    is_active: true,
    sizes: ["8", "9", "10"],
    variants: [
      { id: 21, color_name: "Grey", sizes: ["8", "9", "10"], stock: 15, price: 1899, is_active: true },
    ],
  },
  {
    id: 3,
    name: "Edifice Premium Gold Watch",
    category: "watches",
    category_name: "Watches",
    subcategory: "chronograph",
    price: 9999,
    stock: true,
    rawStock: 5,
    is_active: true,
  },
];

let mockCurrentProducts = mockProducts;

jest.mock("../../context/DataContext", () => ({
  useData: () => ({
    products: mockCurrentProducts,
    loading: false,
  }),
}));

describe("StyleEssentials Dynamic Component", () => {
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
            <StyleEssentials />
          </WishlistContext.Provider>
        </CartContext.Provider>
      </ToastProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentProducts = mockProducts;
  });

  it("returns null when no matching Style Essentials products exist", () => {
    mockCurrentProducts = [
      {
        id: 3,
        name: "Edifice Premium Gold Watch",
        category: "watches",
        price: 9999,
        stock: true,
      },
    ];
    const { container } = renderComponent();
    expect(container.querySelector(".style-essentials-section")).toBeNull();
  });

  it("renders only clothing and footwear products, excluding unrelated categories like watches", () => {
    renderComponent();
    expect(screen.getByText("STYLE ESSENTIALS")).toBeInTheDocument();
    expect(screen.getByText("Complete Your Look")).toBeInTheDocument();

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2); // Only T-Shirt & Slides, Watch is filtered out

    expect(screen.getByText("Classic Heavyweight Cotton Oversized T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("Street Foam Cushioned Daily Slides")).toBeInTheDocument();
    expect(screen.queryByText("Edifice Premium Gold Watch")).toBeNull();
  });

  it("renders exact backend sizes for clothing (M, L, XL) and footwear (8, 9, 10)", () => {
    renderComponent();
    expect(screen.getByRole("radio", { name: "M" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "L" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "XL" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "XXL" })).toBeNull();

    expect(screen.getByRole("radio", { name: "8" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "9" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "10" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "11" })).toBeNull();
  });

  it("renders View All link pointing to style-essentials catalog", () => {
    renderComponent();
    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute("href", "/products?collection=style-essentials");
  });

  it("shows real discount badge only when discount > 0 and oldPrice > price", () => {
    renderComponent();
    expect(screen.getByText("19% OFF")).toBeInTheDocument();
  });

  it("requires size selection before adding to cart when sizes exist", () => {
    renderComponent();
    const addButtons = screen.getAllByRole("button", { name: /add .* to cart/i });
    fireEvent.click(addButtons[0]);
    expect(mockAddToCart).not.toHaveBeenCalled();

    // Select size 'M' and click add to cart
    const sizeMBtn = screen.getByRole("radio", { name: "M" });
    fireEvent.click(sizeMBtn);
    fireEvent.click(addButtons[0]);

    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        selectedSize: "M",
        variant_id: 11,
      }),
      1
    );
  });
});
