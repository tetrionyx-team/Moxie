import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import WatchShowcase from "./WatchShowcase";

// Mock react-router-dom Link for Jest testing environment
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// Mock DataContext hook to allow custom products payload in tests
jest.mock("../../context/DataContext", () => {
  const original = jest.requireActual("../../context/DataContext");
  return {
    ...original,
    useData: jest.fn(),
  };
});

const { useData } = require("../../context/DataContext");

describe("WatchShowcase (Limited-Time Picks) Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("hides entire section (returns null) when no active featured products exist", () => {
    useData.mockReturnValue({ featuredProducts: [], loading: false });

    const { container } = render(<WatchShowcase />);
    expect(container.firstChild).toBeNull();
  });

  test("renders skeleton loading state when loading is true and featuredProducts is empty", () => {
    useData.mockReturnValue({ featuredProducts: [], loading: true });

    render(<WatchShowcase />);
    expect(screen.getByText("LIMITED MOXIE EDIT")).toBeInTheDocument();
    expect(screen.getByText("Limited Time Picks")).toBeInTheDocument();
    expect(screen.getByLabelText("Limited Time Picks Loading")).toBeInTheDocument();
  });

  test("renders dynamic featured products from backend with badges, prices, and direct links", () => {
    const mockFeatured = [
      {
        id: 1,
        feature_type: "HOT_SALE",
        badge_text: "HOT SALE",
        sort_order: 1,
        is_active: true,
        showcase_image: "https://example.com/arabic_promo.png",
        product: {
          id: 15,
          slug: "arabic-aura",
          name: "Arabic Aura",
          price: "1000.00",
          discount_price: "600.00",
          image: "https://example.com/arabic_main.png",
          is_active: true,
        },
      },
      {
        id: 2,
        feature_type: "OFFER",
        badge_text: "LIMITED OFFER",
        sort_order: 2,
        is_active: true,
        showcase_image: null,
        end_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
        product: {
          id: 18,
          slug: "fossil-automatic",
          name: "Fossil Automatic",
          price: "1500.00",
          discount_price: "1200.00",
          image: "https://example.com/fossil_main.png",
          is_active: true,
        },
      },
      {
        id: 3,
        feature_type: "TRENDING",
        badge_text: "TRENDING",
        sort_order: 3,
        is_active: true,
        showcase_image: "https://example.com/casio_custom.png",
        product: {
          id: 22,
          slug: "casio-vintage",
          name: "Casio Vintage",
          price: "850.00",
          discount_price: null,
          image: "https://example.com/casio_main.png",
          is_active: true,
        },
      },
    ];

    useData.mockReturnValue({ featuredProducts: mockFeatured, loading: false });

    render(<WatchShowcase />);

    // Header elements
    expect(screen.getByText("LIMITED MOXIE EDIT")).toBeInTheDocument();
    expect(screen.getByText("Limited Time Picks")).toBeInTheDocument();
    expect(
      screen.getByText(/Exclusive prices\. Available for a limited time\./i)
    ).toBeInTheDocument();

    // Product names
    expect(screen.getByText("Arabic Aura")).toBeInTheDocument();
    expect(screen.getByText("Fossil Automatic")).toBeInTheDocument();
    expect(screen.getByText("Casio Vintage")).toBeInTheDocument();

    // Badges
    expect(screen.getByText(/HOT SALE/i)).toBeInTheDocument();
    expect(screen.getByText(/LIMITED OFFER/i)).toBeInTheDocument();
    expect(screen.getByText(/TRENDING/i)).toBeInTheDocument();

    // Calculated discount badge: (1000 - 600) / 1000 = 40%
    expect(screen.getByText("40% OFF")).toBeInTheDocument();
    // (1500 - 1200) / 1500 = 20%
    expect(screen.getByText("20% OFF")).toBeInTheDocument();

    // Pricing
    expect(screen.getByText("₹600")).toBeInTheDocument();
    expect(screen.getByText("₹1,000")).toBeInTheDocument();
    expect(screen.getByText("₹1,200")).toBeInTheDocument();
    expect(screen.getByText("₹1,500")).toBeInTheDocument();
    expect(screen.getByText("₹850")).toBeInTheDocument();

    // Timer on offer product with end_date
    expect(screen.getByText(/ENDS IN/i)).toBeInTheDocument();

    // Exact direct Product links
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/product/arabic-aura");
    expect(links[1]).toHaveAttribute("href", "/product/fossil-automatic");
    expect(links[2]).toHaveAttribute("href", "/product/casio-vintage");
  });

  test("automatically filters out expired offers and future scheduled campaigns", () => {
    const mockFeatured = [
      {
        id: 10,
        feature_type: "OFFER",
        is_active: true,
        end_date: new Date(Date.now() - 10000).toISOString(), // Expired 10s ago
        product: {
          id: 31,
          name: "Expired Watch",
          price: "500.00",
          is_active: true,
        },
      },
      {
        id: 11,
        feature_type: "OFFER",
        is_active: true,
        start_date: new Date(Date.now() + 600000).toISOString(), // Future scheduled (in 10 min)
        product: {
          id: 32,
          name: "Future Watch",
          price: "700.00",
          is_active: true,
        },
      },
      {
        id: 12,
        feature_type: "OFFER",
        is_active: true,
        start_date: new Date(Date.now() - 60000).toISOString(),
        end_date: new Date(Date.now() + 600000).toISOString(), // Currently active
        product: {
          id: 33,
          slug: "live-watch",
          name: "Live Watch",
          price: "900.00",
          discount_price: "450.00",
          is_active: true,
        },
      },
    ];

    useData.mockReturnValue({ featuredProducts: mockFeatured, loading: false });

    render(<WatchShowcase />);

    expect(screen.queryByText("Expired Watch")).not.toBeInTheDocument();
    expect(screen.queryByText("Future Watch")).not.toBeInTheDocument();
    expect(screen.getByText("Live Watch")).toBeInTheDocument();
  });
});
