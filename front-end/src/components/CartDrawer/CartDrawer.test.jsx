import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CartDrawer from "./CartDrawer";
import { CartContext } from "../../context/CartContext";
import { DataProvider } from "../../context/DataContext";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  Link: ({ children, to, onClick, ...props }) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

describe("CartDrawer Component", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders empty state when cart is empty and open", () => {
    render(
      <DataProvider>
        <CartContext.Provider
          value={{
            cart: [],
            cartCount: 0,
            subtotal: 0,
            isCartOpen: true,
            closeCart: jest.fn(),
            updateQuantity: jest.fn(),
            removeFromCart: jest.fn(),
          }}
        >
          <CartDrawer />
        </CartContext.Provider>
      </DataProvider>
    );

    expect(screen.getByText(/Your Cart \(0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue shopping/i })).toBeInTheDocument();
  });

  it("renders real cart items with details, subtotal and action buttons", () => {
    const mockCart = [
      {
        id: 1,
        cartItemId: "1-Black-One Size",
        name: "Edifice Men Quartz Black Watch",
        brand: "CASIO",
        price: 7995,
        quantity: 1,
        selectedColor: "Black",
        selectedSize: "One Size",
        image: "https://example.com/watch.jpg",
      },
    ];

    render(
      <DataProvider>
        <CartContext.Provider
          value={{
            cart: mockCart,
            cartCount: 1,
            subtotal: 7995,
            isCartOpen: true,
            closeCart: jest.fn(),
            updateQuantity: jest.fn(),
            removeFromCart: jest.fn(),
          }}
        >
          <CartDrawer />
        </CartContext.Provider>
      </DataProvider>
    );

    expect(screen.getByText("Your Cart (1)")).toBeInTheDocument();
    expect(screen.getByText("Edifice Men Quartz Black Watch")).toBeInTheDocument();
    expect(screen.getByText("CASIO")).toBeInTheDocument();
    expect(screen.getByText("Black | One Size")).toBeInTheDocument();
    expect(screen.getAllByText("₹7,995")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /proceed to checkout/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view full cart/i })).toBeInTheDocument();
  });

  it("navigates to checkout and closes cart on Proceed to Checkout click", () => {
    const mockCloseCart = jest.fn();
    const mockCart = [
      {
        id: 1,
        cartItemId: "1",
        name: "Cap",
        price: 1799,
        quantity: 1,
      },
    ];

    render(
      <DataProvider>
        <CartContext.Provider
          value={{
            cart: mockCart,
            cartCount: 1,
            subtotal: 1799,
            isCartOpen: true,
            closeCart: mockCloseCart,
            updateQuantity: jest.fn(),
            removeFromCart: jest.fn(),
          }}
        >
          <CartDrawer />
        </CartContext.Provider>
      </DataProvider>
    );

    const checkoutBtn = screen.getByRole("button", { name: /proceed to checkout/i });
    fireEvent.click(checkoutBtn);

    expect(mockCloseCart).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/checkout");
  });

  it("navigates to full cart and closes drawer on View Full Cart click", () => {
    const mockCloseCart = jest.fn();
    const mockCart = [
      {
        id: 1,
        cartItemId: "1",
        name: "Cap",
        price: 1799,
        quantity: 1,
      },
    ];

    render(
      <DataProvider>
        <CartContext.Provider
          value={{
            cart: mockCart,
            cartCount: 1,
            subtotal: 1799,
            isCartOpen: true,
            closeCart: mockCloseCart,
            updateQuantity: jest.fn(),
            removeFromCart: jest.fn(),
          }}
        >
          <CartDrawer />
        </CartContext.Provider>
      </DataProvider>
    );

    const viewFullBtn = screen.getByRole("button", { name: /view full cart/i });
    fireEvent.click(viewFullBtn);

    expect(mockCloseCart).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/cart");
  });
});
