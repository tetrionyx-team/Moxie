import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Deals from "./Deals";
import { useData } from "../../context/DataContext";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("../../context/DataContext", () => ({
  useData: jest.fn(),
}));

describe("Deals Component (renders Limited Time Picks)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("TEST CASE 1: Zero active featured products returns null and renders nothing", () => {
    useData.mockReturnValue({
      featuredProducts: [],
      products: [
        { id: 1, name: "Normal Shirt", discount: 50, price: 1000 },
        { id: 2, name: "Normal Shoe", discount: 40, price: 2000 },
      ],
      loading: false,
    });

    const { container } = render(<Deals />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Limited Time Picks/i)).not.toBeInTheDocument();
  });

  test("TEST CASE 2: Active featured product renders Limited Time Picks and exact product card", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    useData.mockReturnValue({
      featuredProducts: [
        {
          id: 10,
          feature_type: "HOT_SALE",
          is_active: true,
          end_date: futureDate,
          badge_text: "HOT DEAL",
          product: {
            id: 101,
            name: "Moxie-Watch",
            price: 5000,
            discount_price: 3500,
            image: "moxie_watch.jpg",
            is_active: true,
          },
        },
      ],
      loading: false,
    });

    render(<Deals />);

    expect(screen.getByText("LIMITED MOXIE EDIT")).toBeInTheDocument();
    expect(screen.getByText("Limited Time Picks")).toBeInTheDocument();
    expect(screen.getByText("Moxie-Watch")).toBeInTheDocument();
  });

  test("TEST CASE 3: Deactivated featured product is excluded and returns null", () => {
    useData.mockReturnValue({
      featuredProducts: [
        {
          id: 10,
          feature_type: "HOT_SALE",
          is_active: false,
          product: {
            id: 101,
            name: "Moxie-Watch",
            price: 5000,
            discount_price: 3500,
            is_active: true,
          },
        },
      ],
      loading: false,
    });

    const { container } = render(<Deals />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Moxie-Watch")).not.toBeInTheDocument();
  });

  test("TEST CASE 4: Expired product is excluded and returns null", () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    useData.mockReturnValue({
      featuredProducts: [
        {
          id: 10,
          feature_type: "HOT_SALE",
          is_active: true,
          end_date: pastDate,
          product: {
            id: 101,
            name: "Expired Deal Watch",
            price: 5000,
            discount_price: 3500,
            is_active: true,
          },
        },
      ],
      loading: false,
    });

    const { container } = render(<Deals />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Expired Deal Watch")).not.toBeInTheDocument();
  });

  test("TEST CASE 5: Future scheduled start_date is excluded", () => {
    const futureStartDate = new Date(Date.now() + 3600000).toISOString();
    useData.mockReturnValue({
      featuredProducts: [
        {
          id: 10,
          feature_type: "HOT_SALE",
          is_active: true,
          start_date: futureStartDate,
          product: {
            id: 101,
            name: "Future Deal Watch",
            price: 5000,
            discount_price: 3500,
            is_active: true,
          },
        },
      ],
      loading: false,
    });

    const { container } = render(<Deals />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Future Deal Watch")).not.toBeInTheDocument();
  });
});
