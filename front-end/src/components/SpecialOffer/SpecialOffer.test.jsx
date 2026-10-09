import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SpecialOffer from "./SpecialOffer";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, className }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("SpecialOffer Component - Light Luxury 3D Redesign", () => {
  test("renders all 3 offer cards with correct titles and links", () => {
    render(<SpecialOffer />);

    // Card 1: Watch
    expect(screen.getByText("DEAL OF THE DAY")).toBeInTheDocument();
    expect(screen.getByText("40% OFF")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop Now/i })).toHaveAttribute(
      "href",
      "/products?category=watches"
    );

    // Card 2: Shoe
    expect(screen.getByText("NEW COLLECTION")).toBeInTheDocument();
    expect(screen.getByText("Style Game")).toBeInTheDocument();

    // Card 3: Air Buds
    expect(screen.getByText("PREMIUM QUALITY")).toBeInTheDocument();
    expect(screen.getByText("Comfort,")).toBeInTheDocument();

    const exploreLinks = screen.getAllByRole("link", { name: /Explore Shop/i });
    expect(exploreLinks.length).toBe(2);
    expect(exploreLinks[0]).toHaveAttribute("href", "/products?category=shoes");
    expect(exploreLinks[1]).toHaveAttribute("href", "/products?category=air-buds");
  });
});
