import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Category from "./Category";

// Mock react-router-dom Link for Jest testing
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("Category Static Explore Component", () => {
  it("renders all 4 static categories with correct titles", () => {
    render(<Category />);
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("Shoes")).toBeInTheDocument();
    expect(screen.getByText("Air Buds")).toBeInTheDocument();
    expect(screen.getByText("Caps")).toBeInTheDocument();
  });

  it("renders 4 Explore Now links with proper target routes", () => {
    render(<Category />);
    const exploreButtons = screen.getAllByText("Explore Now");
    expect(exploreButtons).toHaveLength(4);

    expect(screen.getByRole("link", { name: /explore watch/i })).toHaveAttribute(
      "href",
      "/products/watches"
    );
    expect(screen.getByRole("link", { name: /explore shoes/i })).toHaveAttribute(
      "href",
      "/products/shoes"
    );
    expect(screen.getByRole("link", { name: /explore air buds/i })).toHaveAttribute(
      "href",
      "/products/air-buds"
    );
    expect(screen.getByRole("link", { name: /explore caps/i })).toHaveAttribute(
      "href",
      "/products/caps"
    );
  });

  it("renders static images for all 4 categories", () => {
    render(<Category />);
    expect(screen.getByAltText("Watch")).toBeInTheDocument();
    expect(screen.getByAltText("Shoes")).toBeInTheDocument();
    expect(screen.getByAltText("Air Buds")).toBeInTheDocument();
    expect(screen.getByAltText("Caps")).toBeInTheDocument();
  });
});
