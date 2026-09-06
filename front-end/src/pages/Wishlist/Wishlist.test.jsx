import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Wishlist from "./Wishlist";
import { WishlistContext } from "../../context/WishlistContext";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

describe("Wishlist Component", () => {
  const mockRemoveFromWishlist = jest.fn();
  const mockAddToCart = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleProducts = [
    {
      id: 1,
      name: "Classic Chronograph Watch",
      category: "watches",
      price: 4999,
      oldPrice: 5999,
      discount: 17,
      image: "watch1.png",
      specifications: { Brand: "Moxie Signature" },
    },
    {
      id: 2,
      name: "Pro Performance Sneakers",
      category: "footwear",
      price: 2999,
      oldPrice: null,
      discount: 0,
      image: "shoe.svg",
      specifications: { Brand: "Moxie Sport" },
    },
  ];

  const renderWishlist = (wishlistItems = sampleProducts, cartItems = []) => {
    return render(
      <AuthContext.Provider value={{ user: { email: "test@moxie.com", name: "Harish" }, logout: mockLogout }}>
        <WishlistContext.Provider
          value={{
            wishlist: wishlistItems,
            removeFromWishlist: mockRemoveFromWishlist,
          }}
        >
          <CartContext.Provider
            value={{
              cart: cartItems,
              addToCart: mockAddToCart,
            }}
          >
            <Wishlist />
          </CartContext.Provider>
        </WishlistContext.Provider>
      </AuthContext.Provider>
    );
  };

  test("renders Wishlist page with products, badges, and sidebar active", () => {
    renderWishlist();

    expect(screen.getByRole("heading", { name: "My Wishlist" })).toBeInTheDocument();
    expect(screen.getByText("Your saved favourites, all in one place.")).toBeInTheDocument();
    expect(screen.getByText("2 Saved Items")).toBeInTheDocument();

    // Check product 1
    expect(screen.getByText("Classic Chronograph Watch")).toBeInTheDocument();
    expect(screen.getByText("Moxie Signature")).toBeInTheDocument();
    expect(screen.getByText("₹4,999")).toBeInTheDocument();
    expect(screen.getByText("₹5,999")).toBeInTheDocument();
    expect(screen.getByText("17% OFF")).toBeInTheDocument();

    // Check product 2
    expect(screen.getByText("Pro Performance Sneakers")).toBeInTheDocument();
    expect(screen.getByText("₹2,999")).toBeInTheDocument();

    // Verify My Wishlist is active in sidebar
    const wishlistSidebarBtn = screen.getByRole("button", { name: /My Wishlist/i });
    expect(wishlistSidebarBtn).toHaveClass("active");
  });

  test("triggers Add to Cart on button click", () => {
    renderWishlist();

    const addToCartButtons = screen.getAllByRole("button", { name: /Add to Cart/i });
    fireEvent.click(addToCartButtons[0]);

    expect(mockAddToCart).toHaveBeenCalledWith(sampleProducts[0]);
  });

  test("triggers Remove from Wishlist via Remove button and Heart button", () => {
    renderWishlist();

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    // Click remove button for product 1
    fireEvent.click(removeButtons[0]);
    expect(mockRemoveFromWishlist).toHaveBeenCalledWith(1);

    // Click heart removal button for product 2
    const heartBtn = screen.getByRole("button", {
      name: `Remove ${sampleProducts[1].name} from wishlist`,
    });
    fireEvent.click(heartBtn);
    expect(mockRemoveFromWishlist).toHaveBeenCalledWith(2);
  });

  test("renders empty state correctly when wishlist is empty", () => {
    renderWishlist([]);

    expect(screen.getByText("Your wishlist is empty")).toBeInTheDocument();
    expect(screen.getByText("Save products you love and find them here anytime.")).toBeInTheDocument();

    const exploreBtn = screen.getByRole("button", { name: /Explore Products/i });
    expect(exploreBtn).toBeInTheDocument();

    fireEvent.click(exploreBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });
});
