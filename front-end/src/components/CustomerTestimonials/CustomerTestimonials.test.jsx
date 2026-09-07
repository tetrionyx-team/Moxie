import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import CustomerTestimonials from "./CustomerTestimonials";

const mockReviews = [
  { id: "1", name: "Aarav Sharma", rating: 5, message: "Great luxury watch collection!" },
  { id: "2", name: "Rohan Kapoor", rating: 5, message: "Found the exact series I was looking for." },
];

describe("CustomerTestimonials Component - Dynamic Marquee", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no reviews are returned by API", async () => {
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

  it("renders the heading and customer reviews when API returns data", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockReviews),
      })
    );

    await act(async () => {
      render(<CustomerTestimonials />);
    });

    expect(screen.getByText("Customers are saying us?")).toBeInTheDocument();
    expect(screen.getByLabelText("Customer Reviews Carousel")).toBeInTheDocument();
    expect(screen.getAllByText("Aarav Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rohan Kapoor").length).toBeGreaterThanOrEqual(1);
  });
});
