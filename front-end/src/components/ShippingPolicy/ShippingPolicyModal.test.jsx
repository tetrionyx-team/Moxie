import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShippingPolicyModal from "./ShippingPolicyModal";

describe("ShippingPolicyModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render when isOpen is false", () => {
    render(<ShippingPolicyModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders all 8 sections and key highlights when isOpen is true", () => {
    render(<ShippingPolicyModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("SHIPPING POLICY")).toBeInTheDocument();
    expect(screen.getByText(/Last Updated: September 12, 2026/i)).toBeInTheDocument();

    // Verify all 8 headings
    expect(screen.getByText("1. Order Processing & Dispatch")).toBeInTheDocument();
    expect(screen.getByText("2. Delivery Time")).toBeInTheDocument();
    expect(screen.getByText("3. Shipping Charges")).toBeInTheDocument();
    expect(screen.getByText("4. Delivery Locations")).toBeInTheDocument();
    expect(screen.getByText("5. Delivery Delays")).toBeInTheDocument();
    expect(screen.getByText("6. Damaged or Incorrect Products")).toBeInTheDocument();
    expect(screen.getByText("7. Incorrect Delivery Address")).toBeInTheDocument();
    expect(screen.getByText("8. Contact Us")).toBeInTheDocument();

    // Verify key highlights
    expect(screen.getByText(/2–3 business days/i)).toBeInTheDocument();
    expect(screen.getByText(/3–7 business days/i)).toBeInTheDocument();
    const videoMatches = screen.getAllByText(/1-minute continuous, unedited unboxing video/i);
    expect(videoMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Thank You for Choosing Moxie/i)).toBeInTheDocument();
  });

  test("renders shipping charges details clearly", () => {
    render(<ShippingPolicyModal {...defaultProps} />);
    const tnMatches = screen.getAllByText(/Tamil Nadu/i);
    expect(tnMatches.length).toBeGreaterThanOrEqual(1);
    const otherStatesMatches = screen.getAllByText(/Other States in India/i);
    expect(otherStatesMatches.length).toBeGreaterThanOrEqual(1);
  });

  test("renders contact details accurately", () => {
    render(<ShippingPolicyModal {...defaultProps} />);
    expect(screen.getByRole("link", { name: "moxiegadgets.ss@gmail.com" })).toHaveAttribute("href", "mailto:moxiegadgets.ss@gmail.com");
    expect(screen.getByRole("link", { name: "7871327802" })).toHaveAttribute("href", "tel:7871327802");
    expect(screen.getByRole("link", { name: "7448327802" })).toHaveAttribute("href", "tel:7448327802");
    expect(screen.getByText(/Kulasekaranpattinam/i)).toBeInTheDocument();
  });

  test("closes modal via header X button", () => {
    const onClose = jest.fn();
    render(<ShippingPolicyModal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close Shipping Policy");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes modal via bottom I Understand button", () => {
    const onClose = jest.fn();
    render(<ShippingPolicyModal {...defaultProps} onClose={onClose} />);
    const understandBtn = screen.getByRole("button", { name: /I Understand/i });
    fireEvent.click(understandBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes modal on Escape key press", () => {
    const onClose = jest.fn();
    render(<ShippingPolicyModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
