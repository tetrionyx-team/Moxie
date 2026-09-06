import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MyOrders from "./MyOrders";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
}));

describe("MyOrders Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  const sampleOrders = [
    {
      id: "ORD10245",
      date: "21 Aug 2026",
      name: "Classic Black Watch",
      image: "watch.png",
      variant: "Color: Midnight Gold",
      quantity: 1,
      price: 4999,
      total: 5049,
      status: "Shipped",
    },
    {
      id: "ORD10246",
      date: "15 Aug 2026",
      name: "Wireless Sport Earbuds",
      image: "buds.png",
      variant: "Color: Matte Black",
      quantity: 2,
      price: 1999,
      total: 3998,
      status: "Delivered",
    },
    {
      id: "ORD10247",
      date: "10 Aug 2026",
      name: "Running Shoes",
      image: "shoes.png",
      variant: "Size: 9 UK",
      quantity: 1,
      price: 3499,
      total: 3499,
      status: "Placed",
    },
  ];

  test("renders empty state correctly when there are no orders", () => {
    render(<MyOrders orders={[]} />);

    expect(screen.getByText("My Orders")).toBeInTheDocument();
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByText("You haven't placed any orders yet.")).toBeInTheDocument();

    const startShoppingBtn = screen.getByRole("button", { name: /Start Shopping/i });
    expect(startShoppingBtn).toBeInTheDocument();

    fireEvent.click(startShoppingBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/products");
  });

  test("renders order cards with correct data and badges", () => {
    const handleViewDetails = jest.fn();
    const handleTrackOrder = jest.fn();
    const handleCancelOrder = jest.fn();

    render(
      <MyOrders
        orders={sampleOrders}
        onViewDetails={handleViewDetails}
        onTrackOrder={handleTrackOrder}
        onCancelOrder={handleCancelOrder}
      />
    );

    expect(screen.getByText("3 Orders")).toBeInTheDocument();
    expect(screen.getByText("Order #ORD10245")).toBeInTheDocument();
    expect(screen.getByText("Placed on: 21 Aug 2026")).toBeInTheDocument();
    expect(screen.getByText("Classic Black Watch")).toBeInTheDocument();
    expect(screen.getByText("Color: Midnight Gold")).toBeInTheDocument();
    expect(screen.getAllByText(/Qty: 1/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Price: ₹4,999/)).toBeInTheDocument();
    expect(screen.getByText("₹5,049")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
  });

  test("handles action button clicks: View Details, Track Order, Reorder", () => {
    const handleViewDetails = jest.fn();
    const handleTrackOrder = jest.fn();
    const handleCancelOrder = jest.fn();

    render(
      <MyOrders
        orders={sampleOrders}
        onViewDetails={handleViewDetails}
        onTrackOrder={handleTrackOrder}
        onCancelOrder={handleCancelOrder}
      />
    );

    const viewDetailsButtons = screen.getAllByRole("button", { name: /View Details/i });
    fireEvent.click(viewDetailsButtons[0]);
    expect(handleViewDetails).toHaveBeenCalledWith(sampleOrders[0]);

    const trackOrderButtons = screen.getAllByRole("button", { name: /Track Order/i });
    fireEvent.click(trackOrderButtons[0]);
    expect(handleTrackOrder).toHaveBeenCalledWith(sampleOrders[0]);

    const reorderButtons = screen.getAllByRole("button", { name: /Reorder/i });
    fireEvent.click(reorderButtons[0]);
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('Reordered "Classic Black Watch"')
    );
  });

  test("handles Return / Exchange on delivered orders", () => {
    render(<MyOrders orders={sampleOrders} />);

    const returnBtn = screen.getByRole("button", { name: /Return \/ Exchange/i });
    fireEvent.click(returnBtn);
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Return request submitted for Order #ORD10246")
    );
  });

  test("handles Cancel Order on cancellable orders (Placed)", () => {
    const handleCancelOrder = jest.fn();

    render(
      <MyOrders
        orders={sampleOrders}
        onCancelOrder={handleCancelOrder}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel Order/i });
    fireEvent.click(cancelBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Are you sure you want to cancel Order #ORD10247?")
    );
    expect(handleCancelOrder).toHaveBeenCalledWith("ORD10247");
  });
});
