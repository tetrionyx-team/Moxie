import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EditorialWatches from "./EditorialWatches";

// Mock react-router-dom Link for Jest testing
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("EditorialWatches Component", () => {
  it("renders the centered editorial heading with JUST IN TIME and MOXIE", () => {
    render(<EditorialWatches />);
    expect(screen.getByText("JUST IN TIME")).toBeInTheDocument();
    expect(screen.getByText("MOXIE")).toBeInTheDocument();
  });

  it("renders exactly 3 collection cards with correct titles and links", () => {
    render(<EditorialWatches />);
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);

    expect(screen.getByText("THE WORLD OF CASIO")).toBeInTheDocument();
    expect(screen.getByText("EDIFICE COLLECTION")).toBeInTheDocument();
    expect(screen.getByText("MOXIE SIGNATURE")).toBeInTheDocument();

    const viewLinks = screen.getAllByText("View Collection");
    expect(viewLinks).toHaveLength(3);
    viewLinks.forEach((link) => {
      expect(link.closest("a")).toHaveAttribute("href", "/products/watches");
    });
  });

  it("renders accessible circular arrow buttons for each collection", () => {
    render(<EditorialWatches />);
    expect(
      screen.getByRole("link", { name: /view the world of casio collection/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view edifice collection collection/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view moxie signature collection/i })
    ).toBeInTheDocument();
  });

  it("renders images with meaningful alt text", () => {
    render(<EditorialWatches />);
    expect(
      screen.getByAltText("The World of Casio Luxury Watch Collection")
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("Edifice Premium Chronograph Collection")
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("Moxie Signature Luxury Watch Series")
    ).toBeInTheDocument();
  });
});
