import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProductDetails from "./ProductDetails";
import { CartProvider, useCart } from "../../context/CartContext";
import { ToastProvider } from "../../context/ToastContext";
import { WishlistProvider } from "../../context/WishlistContext";

const mockProduct = {
  id: 15,
  name: "Signature Chronograph Watch",
  price: 4999,
  oldPrice: 7999,
  discount: 38,
  description: "Luxury timepiece crafted with precision.",
  category: "Watches",
  category_slug: "watches",
  stock: 10,
  images: [{ id: 1, image: "https://example.com/watch1.jpg", is_primary: true }],
  variants: [],
};

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => jest.fn(),
  useParams: () => ({ productId: "15", id: "15" }),
  useLocation: () => ({ pathname: "/product/15" }),
}));

describe("Cart Badge Live Update & Product Share Button", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProduct,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Cart item count derives total quantity correctly across add/update/remove", () => {
    const TestComponent = () => {
      const { cartCount, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
      return (
        <div>
          <span data-testid="cart-count">{cartCount}</span>
          <button onClick={() => addToCart({ id: 1, name: "Item 1", price: 100 }, 2)}>Add 2 of Item 1</button>
          <button onClick={() => addToCart({ id: 2, name: "Item 2", price: 200 }, 1)}>Add 1 of Item 2</button>
          <button onClick={() => updateQuantity("1", 5)}>Set Item 1 Qty to 5</button>
          <button onClick={() => removeFromCart("2")}>Remove Item 2</button>
          <button onClick={() => clearCart()}>Clear</button>
        </div>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const countEl = screen.getByTestId("cart-count");
    expect(countEl.textContent).toBe("0");

    // Add 2 of Item 1
    fireEvent.click(screen.getByText("Add 2 of Item 1"));
    expect(countEl.textContent).toBe("2");

    // Add 1 of Item 2
    fireEvent.click(screen.getByText("Add 1 of Item 2"));
    expect(countEl.textContent).toBe("3");

    // Update Item 1 to 5 -> total should be 5 + 1 = 6
    fireEvent.click(screen.getByText("Set Item 1 Qty to 5"));
    expect(countEl.textContent).toBe("6");

    // Remove Item 2 -> total should be 5
    fireEvent.click(screen.getByText("Remove Item 2"));
    expect(countEl.textContent).toBe("5");

    // Clear cart -> total should be 0
    fireEvent.click(screen.getByText("Clear"));
    expect(countEl.textContent).toBe("0");
  });

  test("Product Details renders Share button directly below Wishlist button", async () => {
    render(
      <ToastProvider>
        <WishlistProvider>
          <CartProvider>
            <ProductDetails />
          </CartProvider>
        </WishlistProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Signature Chronograph Watch" })).toBeInTheDocument();
    });

    const wishlistBtns = screen.getAllByLabelText(/save to wishlist/i);
    const shareBtn = screen.getByLabelText(/share this product/i);

    expect(wishlistBtns.length).toBeGreaterThanOrEqual(1);
    expect(shareBtn).toBeInTheDocument();
  });

  test("Share button uses navigator.share when available", async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    render(
      <ToastProvider>
        <WishlistProvider>
          <CartProvider>
            <ProductDetails />
          </CartProvider>
        </WishlistProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Signature Chronograph Watch" })).toBeInTheDocument();
    });

    const shareBtn = screen.getByLabelText(/share this product/i);
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Signature Chronograph Watch"),
        text: expect.stringContaining("Signature Chronograph Watch"),
      })
    );
  });

  test("Share button falls back to clipboard when navigator.share is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      configurable: true,
      writable: true,
    });

    render(
      <ToastProvider>
        <WishlistProvider>
          <CartProvider>
            <ProductDetails />
          </CartProvider>
        </WishlistProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Signature Chronograph Watch" })).toBeInTheDocument();
    });

    const shareBtn = screen.getByLabelText(/share this product/i);
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(mockWriteText).toHaveBeenCalled();
  });
});
