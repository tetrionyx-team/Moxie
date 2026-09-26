import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CustomerTestimonials, { ReviewCard } from "./CustomerTestimonials";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    Link: ({ children, to, ...props }) => React.createElement("a", { href: to, ...props }, children),
    useLocation: () => ({ pathname: "/" }),
    useNavigate: () => mockNavigate,
  };
});

const mockReviews1 = [
  {
    id: "1",
    name: "Aarav Sharma",
    rating: 5,
    text: "Superb quality and premium finish.",
    product_name: "Watches",
    is_verified: true,
    created_at: "2024-06-12T10:00:00Z",
  },
];

const mockReviews2 = [
  ...mockReviews1,
  {
    id: "2",
    name: "Priya S.",
    rating: 5,
    text: "The watch is stylish and very comfortable.",
    product_name: "Chronograph",
    is_verified: true,
    created_at: "2024-06-08T10:00:00Z",
  },
];

const mockReviews3 = [
  ...mockReviews2,
  {
    id: "3",
    name: "Vikram Mehta",
    rating: 4,
    text: "Exceeded my expectations on build quality.",
    product_name: "Gold Watch",
    is_verified: true,
    created_at: "2024-06-01T10:00:00Z",
  },
];

const mockReviews4 = [
  ...mockReviews3,
  {
    id: "4",
    name: "Rohan Kapoor",
    rating: 5,
    text: "Gets compliments wherever I go.",
    product_name: "Silver Watch",
    is_verified: true,
    images: ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
    created_at: "2024-05-20T10:00:00Z",
  },
];

describe("CustomerTestimonials - Compact Redesign & Multi-Image Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. Zero reviews state: returns null and hides entire review section", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    let container;
    await act(async () => {
      const rendered = render(<CustomerTestimonials />);
      container = rendered.container;
    });

    expect(container.firstChild).toBeNull();
  });

  it("2. Single review state: renders 1 compact card centered without carousel arrows or dots", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReviews1),
      })
    );

    let container;
    await act(async () => {
      const rendered = render(<CustomerTestimonials />);
      container = rendered.container;
    });

    expect(screen.getByText("What Our Customers Say")).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("“Superb quality and premium finish.”")).toBeInTheDocument();

    // Verify static container class for 1 review
    const staticContainer = container.querySelector(".moxie-reviews-count-1");
    expect(staticContainer).toBeInTheDocument();

    // Verify NO carousel arrows and NO pagination dots
    expect(container.querySelector(".moxie-carousel-arrow")).toBeNull();
    expect(container.querySelector(".moxie-reviews-pagination")).toBeNull();
  });

  it("3. Two reviews state: renders 2 centered cards without carousel arrows or dots", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReviews2),
      })
    );

    let container;
    await act(async () => {
      const rendered = render(<CustomerTestimonials />);
      container = rendered.container;
    });

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Priya S.")).toBeInTheDocument();

    const staticContainer = container.querySelector(".moxie-reviews-count-2");
    expect(staticContainer).toBeInTheDocument();

    expect(container.querySelector(".moxie-carousel-arrow")).toBeNull();
    expect(container.querySelector(".moxie-reviews-pagination")).toBeNull();
  });

  it("4. Three reviews state: renders 3 centered cards in static row without carousel arrows or dots", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReviews3),
      })
    );

    let container;
    await act(async () => {
      const rendered = render(<CustomerTestimonials />);
      container = rendered.container;
    });

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Priya S.")).toBeInTheDocument();
    expect(screen.getByText("Vikram Mehta")).toBeInTheDocument();

    const staticContainer = container.querySelector(".moxie-reviews-count-3");
    expect(staticContainer).toBeInTheDocument();

    expect(container.querySelector(".moxie-carousel-arrow")).toBeNull();
    expect(container.querySelector(".moxie-reviews-pagination")).toBeNull();
  });

  it("5. Four or more reviews state (>3): enables carousel with navigation arrows", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReviews4),
      })
    );

    let container;
    await act(async () => {
      const rendered = render(<CustomerTestimonials />);
      container = rendered.container;
    });

    // Carousel viewport should be rendered
    expect(container.querySelector(".moxie-carousel-viewport")).toBeInTheDocument();

    // Arrows should be present when count > cardsPerView
    const prevArrow = container.querySelector(".moxie-carousel-arrow.prev-arrow");
    const nextArrow = container.querySelector(".moxie-carousel-arrow.next-arrow");
    expect(prevArrow).toBeInTheDocument();
    expect(nextArrow).toBeInTheDocument();
  });

  it("6. Reusable ReviewCard component: renders complete card content and triggers product navigation", () => {
    const singleItem = {
      id: "rev-1",
      name: "Sam Wilson",
      rating: 5,
      text: "Wonderful timepiece with great craftsmanship.",
      productName: "Heritage Chronograph",
      productId: 42,
      isVerified: true,
      images: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
      date: "14 Jun 2024",
      initial: "S",
    };

    const mockProducts = [
      { id: 42, name: "Heritage Chronograph", image: "https://example.com/prod.jpg" },
    ];

    const mockImageClick = jest.fn();

    const { container } = render(
      <ReviewCard
        item={singleItem}
        products={mockProducts}
        onImageClick={mockImageClick}
      />
    );

    expect(screen.getByText("Sam Wilson")).toBeInTheDocument();
    expect(screen.getByText("Verified Purchase")).toBeInTheDocument();
    expect(screen.getByText("5.0")).toBeInTheDocument();
    expect(screen.getByText("14 Jun 2024")).toBeInTheDocument();
    expect(screen.getByText("“Wonderful timepiece with great craftsmanship.”")).toBeInTheDocument();
    expect(screen.getByText("Heritage Chronograph")).toBeInTheDocument();

    // Click product footer to navigate
    const productFooter = container.querySelector(".moxie-review-product-footer");
    expect(productFooter).toBeInTheDocument();
    fireEvent.click(productFooter);
    expect(mockNavigate).toHaveBeenCalledWith("/products/42");

    // Click customer uploaded image thumbnail
    const reviewThumbs = container.querySelectorAll(".moxie-review-thumbnail-wrap");
    expect(reviewThumbs.length).toBe(2);
    fireEvent.click(reviewThumbs[0]);
    expect(mockImageClick).toHaveBeenCalledWith(
      ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
      0
    );
  });
});
