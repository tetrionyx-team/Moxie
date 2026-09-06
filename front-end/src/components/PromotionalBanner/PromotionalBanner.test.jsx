import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PromotionalBanner from "./PromotionalBanner";

// Mock react-router-dom Link for Jest environment
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("PromotionalBanner Component - Pure CSS Sticky Stack", () => {
  it("renders all 3 promotional banners with correct alt text and CTA links", () => {
    render(<PromotionalBanner />);

    // Check banner images are present
    expect(screen.getByAltText(/Tonino Lamborghini Luxury Chronograph Watch/i)).toBeInTheDocument();
    expect(screen.getByAltText("Casio G-SHOCK GA-2100 Series Watch")).toBeInTheDocument();
    expect(screen.getByAltText("Mahindra Thar Die-Cast Metal Model 1:18 Scale")).toBeInTheDocument();

    // Check 3 Shop Now CTA buttons with exact destination routes
    const shopButtons = screen.getAllByRole("link", { name: /shop now/i });
    expect(shopButtons).toHaveLength(3);
    expect(shopButtons[0]).toHaveAttribute("href", "/products/watches");
    expect(shopButtons[1]).toHaveAttribute("href", "/products/watches");
    expect(shopButtons[2]).toHaveAttribute("href", "/products");
  });

  it("does not render any carousel UI (arrows, slider tabs, or dots)", () => {
    render(<PromotionalBanner />);

    // Verify absence of slider navigation
    expect(screen.queryByRole("button", { name: /previous banner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next banner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("renders the 3 sequential sticky banner articles in normal document flow", () => {
    const { container } = render(<PromotionalBanner />);
    const stack = container.querySelector(".moxie-banner-stack");
    const banners = container.querySelectorAll(".moxie-sticky-banner");

    expect(stack).toBeInTheDocument();
    expect(banners).toHaveLength(3);
    expect(banners[0]).toHaveClass("banner-one");
    expect(banners[1]).toHaveClass("banner-two");
    expect(banners[2]).toHaveClass("banner-three");
  });
});






