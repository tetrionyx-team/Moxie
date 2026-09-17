import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProductDetails from "./ProductDetails";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { ToastProvider } from "../../context/ToastContext";

const mockAddToCart = jest.fn();
const mockToggleWishlist = jest.fn();
const mockIsInWishlist = jest.fn().mockReturnValue(false);
const mockNavigate = jest.fn();
let mockParams = { productId: "1" };

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useLocation: () => ({ pathname: "/product/1" }),
}));

const renderProductDetails = () => {
  return render(
    <ToastProvider>
      <CartContext.Provider value={{ cart: [], addToCart: mockAddToCart }}>
        <WishlistContext.Provider
          value={{
            wishlist: [],
            toggleWishlist: mockToggleWishlist,
            isInWishlist: mockIsInWishlist,
          }}
        >
          <ProductDetails />
        </WishlistContext.Provider>
      </CartContext.Provider>
    </ToastProvider>
  );
};

describe("ProductDetails Dynamic Variant-Aware Gallery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("TEST CASE 1 & 4: 1 image variant renders exactly 1 thumbnail and 1 main image", async () => {
    mockParams = { productId: "1" };
    const singleImgProduct = {
      id: 1,
      name: "Single Image Tee",
      price: "1000.00",
      discount_price: "600.00",
      category: "shirts",
      category_name: "Shirts",
      variants: [
        {
          id: 101,
          color_name: "Red",
          color_code: "#ff0000",
          price: "1000.00",
          discount_price: "600.00",
          sizes: ["S", "M"],
          images: [
            { id: 1, image: "http://127.0.0.1:8000/media/red1.jpg", is_primary: true }
          ]
        }
      ]
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => singleImgProduct,
    });

    renderProductDetails();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Single Image Tee" })).toBeInTheDocument();
    });

    // Check 1 thumbnail exists (in desktop vertical rail)
    const thumbnails = screen.getAllByRole("button", { name: /View product image/i });
    expect(thumbnails).toHaveLength(1);

    // Check main image has correct URL
    const mainImg = screen.getByAltText("Single Image Tee");
    expect(mainImg).toHaveAttribute("src", "http://127.0.0.1:8000/media/red1.jpg");

    // Check pricing: selling price ₹600, struck original price ₹1,000, and 40% OFF
    expect(screen.getByText("₹600")).toBeInTheDocument();
    expect(screen.getByText("₹1,000")).toBeInTheDocument();
    expect(screen.getByText("40% OFF")).toBeInTheDocument();
  });

  test("TEST CASE 2: 3 images variant renders 3 thumbnails and clicking thumbnail updates main image", async () => {
    mockParams = { productId: "2" };
    const multiImgProduct = {
      id: 2,
      name: "Triple Image Hoodie",
      price: "1500.00",
      discount_price: "1200.00",
      category: "clothing",
      category_name: "Clothing",
      variants: [
        {
          id: 201,
          color_name: "Blue",
          color_code: "#0000ff",
          price: "1500.00",
          discount_price: "1200.00",
          sizes: ["M", "L"],
          images: [
            { id: 11, image: "http://127.0.0.1:8000/media/blue_front.jpg", is_primary: true },
            { id: 12, image: "http://127.0.0.1:8000/media/blue_back.jpg", is_primary: false },
            { id: 13, image: "http://127.0.0.1:8000/media/blue_side.jpg", is_primary: false }
          ]
        }
      ]
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => multiImgProduct,
    });

    renderProductDetails();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Triple Image Hoodie" })).toBeInTheDocument();
    });

    const thumbnails = screen.getAllByRole("button", { name: /View product image/i });
    expect(thumbnails).toHaveLength(3);

    // Initially first image is main
    const mainImg = screen.getByAltText("Triple Image Hoodie");
    expect(mainImg).toHaveAttribute("src", "http://127.0.0.1:8000/media/blue_front.jpg");

    // Click 2nd thumbnail
    fireEvent.click(thumbnails[1]);
    expect(mainImg).toHaveAttribute("src", "http://127.0.0.1:8000/media/blue_back.jpg");

    // Click 3rd thumbnail
    fireEvent.click(thumbnails[2]);
    expect(mainImg).toHaveAttribute("src", "http://127.0.0.1:8000/media/blue_side.jpg");
  });

  test("TEST CASE 3: Color change switches gallery images and resets main image to first color image", async () => {
    mockParams = { productId: "3" };
    const multiColorProduct = {
      id: 3,
      name: "Dual Color Polo",
      price: "1000.00",
      discount_price: "800.00",
      category: "shirts",
      category_name: "Shirts",
      variants: [
        {
          id: 301,
          color_name: "Red",
          color_code: "#ff0000",
          price: "1000.00",
          discount_price: "800.00",
          sizes: ["S", "M"],
          images: [
            { id: 21, image: "http://127.0.0.1:8000/media/red_front.jpg", is_primary: true },
            { id: 22, image: "http://127.0.0.1:8000/media/red_back.jpg", is_primary: false },
            { id: 23, image: "http://127.0.0.1:8000/media/red_detail.jpg", is_primary: false }
          ]
        },
        {
          id: 302,
          color_name: "Black",
          color_code: "#000000",
          price: "1000.00",
          discount_price: "800.00",
          sizes: ["M", "L"],
          images: [
            { id: 24, image: "http://127.0.0.1:8000/media/black_front.jpg", is_primary: true },
            { id: 25, image: "http://127.0.0.1:8000/media/black_back.jpg", is_primary: false }
          ]
        }
      ]
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => multiColorProduct,
    });

    renderProductDetails();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Dual Color Polo" })).toBeInTheDocument();
    });

    // Initially Red is selected -> 3 thumbnails
    expect(screen.getAllByRole("button", { name: /View product image/i })).toHaveLength(3);
    const mainImg = screen.getByAltText("Dual Color Polo");
    expect(mainImg).toHaveAttribute("src", "http://127.0.0.1:8000/media/red_front.jpg");

    // Switch to Black color swatch
    const blackSwatch = screen.getByRole("button", { name: /Select color Black/i });
    fireEvent.click(blackSwatch);

    // Now gallery should have 2 Black thumbnails
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /View product image/i })).toHaveLength(2);
      expect(mainImg).toHaveAttribute("src", "http://127.0.0.1:8000/media/black_front.jpg");
    });
  });

  test("TEST CASE 4: Product with NO discount displays ONLY Original Price without strikethrough", async () => {
    mockParams = { productId: "4" };
    const noDiscProduct = {
      id: 4,
      name: "Plain Classic Cap",
      price: "1000.00",
      discount_price: null,
      category: "caps",
      category_name: "Caps",
      variants: []
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => noDiscProduct,
    });

    renderProductDetails();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Plain Classic Cap" })).toBeInTheDocument();
    });

    expect(screen.getByText("₹1,000")).toBeInTheDocument();
    expect(screen.queryByText(/% OFF/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SAVE/i)).not.toBeInTheDocument();
  });

  test("TEST CASE 5: 5 images variant renders all 5 thumbnails", async () => {
    mockParams = { productId: "5" };
    const fiveImgProduct = {
      id: 5,
      name: "Luxury Jacket",
      price: "5000.00",
      discount_price: "3500.00",
      category: "jackets",
      category_name: "Jackets",
      variants: [
        {
          id: 501,
          color_name: "Olive",
          color_code: "#556b2f",
          price: "5000.00",
          discount_price: "3500.00",
          sizes: ["L", "XL"],
          images: [
            { id: 51, image: "http://127.0.0.1:8000/media/j1.jpg" },
            { id: 52, image: "http://localhost/media/j2.jpg" },
            { id: 53, image: "http://localhost/media/j3.jpg" },
            { id: 54, image: "http://localhost/media/j4.jpg" },
            { id: 55, image: "http://localhost/media/j5.jpg" },
          ]
        }
      ]
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fiveImgProduct,
    });

    renderProductDetails();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Luxury Jacket" })).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: /View product image/i })).toHaveLength(5);
  });
});
