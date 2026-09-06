import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Header from "./Header";
import { WishlistProvider } from "../../context/WishlistContext";
import { CartProvider } from "../../context/CartContext";
import { AuthProvider } from "../../context/AuthContext";
import { DataProvider } from "../../context/DataContext";
import { ModalProvider } from "../../context/ModalContext";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => jest.fn(),
}));

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <DataProvider>
        <WishlistProvider>
          <CartProvider>
            <ModalProvider>
              {ui}
            </ModalProvider>
          </CartProvider>
        </WishlistProvider>
      </DataProvider>
    </AuthProvider>
  );
}

describe("Header component", () => {
  it("does not render the removed yellow top announcement bar", () => {
    renderWithProviders(<Header searchQuery="" setSearchQuery={() => {}} />);
    // Verify top announcement texts are absent
    expect(screen.queryByText(/Free Shipping on orders above ₹999/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TRACK ORDER/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/HELP & SUPPORT/i)).not.toBeInTheDocument();
  });

  it("renders the main header logo, search bar, and action items with CART label", () => {
    renderWithProviders(<Header searchQuery="" setSearchQuery={() => {}} />);
    // Moxie logo
    expect(screen.getByAltText(/Moxie Logo/i)).toBeInTheDocument();
    // Search input
    expect(screen.getByPlaceholderText(/Search gadgets, lifestyle, tech.../i)).toBeInTheDocument();
    // Action items
    expect(screen.getByText("CATEGORIES")).toBeInTheDocument();
    expect(screen.getByText("WISHLIST")).toBeInTheDocument();
    expect(screen.getByText("CART")).toBeInTheDocument();
    expect(screen.queryByText("CARD")).not.toBeInTheDocument();
    expect(screen.getByText("PROFILE")).toBeInTheDocument();
  });

  it("renders the black category navigation with expected links", () => {
    renderWithProviders(<Header searchQuery="" setSearchQuery={() => {}} />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Watches" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shoes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Air Buds" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sliders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Caps" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accessories" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Deals" })).toBeInTheDocument();
  });
});
