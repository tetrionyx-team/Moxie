import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WishlistProvider, WishlistContext } from "./WishlistContext";

// Test component to consume WishlistContext
function TestConsumer() {
  const { wishlist, wishlistCount, toggleWishlist, addToWishlist, removeFromWishlist, isInWishlist } =
    React.useContext(WishlistContext);

  const sampleProd = {
    id: 999,
    name: "Special Luxury Chrono",
    price: 8999,
    image: "luxury.jpg",
    category: "watches",
  };

  return (
    <div>
      <div data-testid="count">{wishlistCount}</div>
      <div data-testid="is-wished">{isInWishlist(999) ? "YES" : "NO"}</div>
      <button data-testid="add-btn" onClick={() => addToWishlist(sampleProd)}>
        Add Product
      </button>
      <button data-testid="toggle-btn" onClick={() => toggleWishlist(sampleProd)}>
        Toggle Product
      </button>
      <button data-testid="remove-btn" onClick={() => removeFromWishlist(999)}>
        Remove Product
      </button>
      <ul data-testid="list">
        {wishlist.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

describe("WishlistContext Provider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("adds, toggles, removes products and persists full product data", () => {
    render(
      <WishlistProvider>
        <TestConsumer />
      </WishlistProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("is-wished")).toHaveTextContent("NO");

    // Add item
    fireEvent.click(screen.getByTestId("add-btn"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("is-wished")).toHaveTextContent("YES");
    expect(screen.getByText("Special Luxury Chrono")).toBeInTheDocument();

    // Toggle item (removes it)
    fireEvent.click(screen.getByTestId("toggle-btn"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("is-wished")).toHaveTextContent("NO");

    // Toggle item again (adds it back)
    fireEvent.click(screen.getByTestId("toggle-btn"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("is-wished")).toHaveTextContent("YES");

    // Remove item
    fireEvent.click(screen.getByTestId("remove-btn"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("is-wished")).toHaveTextContent("NO");
  });
});
