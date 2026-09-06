import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AccountDropdown from "./AccountDropdown";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, state, ...props }) => (
    <a href={to} data-state={JSON.stringify(state)} {...props}>
      {children}
    </a>
  ),
}));

describe("AccountDropdown component", () => {
  const mockUser = {
    name: "Harish Raja",
    email: "harish@example.com",
  };

  const mockOnLogout = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays user name and initials in avatar, but does NOT display email address", () => {
    render(
      <AccountDropdown
        user={mockUser}
        onLogout={mockOnLogout}
        onClose={mockOnClose}
      />
    );

    // 1. Check Name
    expect(screen.getByText("Harish Raja")).toBeInTheDocument();

    // 2. Check Initials
    expect(screen.getByText("HR")).toBeInTheDocument();

    // 3. Confirm Email is NOT in the document
    expect(screen.queryByText("harish@example.com")).not.toBeInTheDocument();
  });

  it("renders menu items in the exact required order with correct links", () => {
    render(
      <AccountDropdown
        user={mockUser}
        onLogout={mockOnLogout}
        onClose={mockOnClose}
      />
    );

    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(4);

    // 1. My Account
    expect(items[0]).toHaveTextContent("My Account");
    expect(items[0]).toHaveAttribute("href", "/profile");

    // 2. My Orders
    expect(items[1]).toHaveTextContent("My Orders");
    expect(items[1]).toHaveAttribute("href", "/profile");

    // 3. My Wishlist
    expect(items[2]).toHaveTextContent("My Wishlist");
    expect(items[2]).toHaveAttribute("href", "/wishlist");

    // 4. Logout
    expect(items[3]).toHaveTextContent("Logout");
  });

  it("triggers onLogout and onClose when clicking Logout button", () => {
    render(
      <AccountDropdown
        user={mockUser}
        onLogout={mockOnLogout}
        onClose={mockOnClose}
      />
    );

    const logoutBtn = screen.getByRole("menuitem", { name: /logout/i });
    fireEvent.click(logoutBtn);

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key press", () => {
    render(
      <AccountDropdown
        user={mockUser}
        onLogout={mockOnLogout}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
