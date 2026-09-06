import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CustomerTestimonials from "./CustomerTestimonials";

describe("CustomerTestimonials Component - Continuous Marquee", () => {
  it("renders the heading and continuous marquee container", () => {
    render(<CustomerTestimonials />);

    expect(screen.getByText("Customers are saying us?")).toBeInTheDocument();
    expect(screen.getByLabelText("Customer Reviews Carousel")).toBeInTheDocument();
  });

  it("renders all customer reviews including the 2 additional reviews", () => {
    render(<CustomerTestimonials />);

    // Existing reviews
    expect(screen.getAllByText("Aarav Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rohan Kapoor").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Priya Nair").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Vikram Malhotra").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ananya Iyer").length).toBeGreaterThanOrEqual(1);

    // 2 newly added reviews
    expect(screen.getAllByText("Arjun Kumar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Priya S").length).toBeGreaterThanOrEqual(1);
  });

  it("contains both original and duplicated groups for seamless loop", () => {
    const { container } = render(<CustomerTestimonials />);

    const track = container.querySelector(".testimonial-track");
    const groups = container.querySelectorAll(".testimonial-group");

    expect(track).toBeInTheDocument();
    expect(groups).toHaveLength(2);
    expect(groups[1]).toHaveAttribute("aria-hidden", "true");
  });
});
