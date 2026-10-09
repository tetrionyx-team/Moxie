import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import WatchCategoryGrid, { WATCH_COLLECTIONS } from "./WatchCategoryGrid";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, className, "aria-label": ariaLabel }) => (
    <a href={to} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

describe("WatchCategoryGrid Component - Clean Design with Animated Hover", () => {
  test("renders Section Title and Subtitle", () => {
    render(<WatchCategoryGrid />);

    expect(screen.getByText("SHOP BY")).toBeInTheDocument();
    expect(screen.getByText("CATEGORY")).toBeInTheDocument();
    expect(
      screen.getByText("Explore timepieces by collection and find your perfect style")
    ).toBeInTheDocument();
  });

  test("renders all 6 watch collection cards with correct names and links without explore text", () => {
    render(<WatchCategoryGrid />);

    WATCH_COLLECTIONS.forEach((col) => {
      expect(screen.getByText(col.name)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: new RegExp(`Shop ${col.name} Watches`, "i") });
      expect(link).toHaveAttribute("href", col.route);
    });

    // Ensure explore text is removed
    expect(screen.queryByText(/^Explore$/i)).not.toBeInTheDocument();
  });
});
