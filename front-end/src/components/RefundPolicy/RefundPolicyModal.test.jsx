import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RefundPolicyModal from "./RefundPolicyModal";

describe("RefundPolicyModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render when isOpen is false", () => {
    render(<RefundPolicyModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders all 5 sections and highlights when isOpen is true", () => {
    render(<RefundPolicyModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("RETURN & REFUND POLICY")).toBeInTheDocument();
    expect(screen.getByText(/Last Updated: September 12, 2026/i)).toBeInTheDocument();

    // Verify all 5 headings
    expect(screen.getByText("1. Return & Replacement")).toBeInTheDocument();
    expect(screen.getByText("2. Mandatory Unboxing Video")).toBeInTheDocument();
    expect(screen.getByText("3. Product Condition")).toBeInTheDocument();
    expect(screen.getByText("4. Replacement Process")).toBeInTheDocument();
    expect(screen.getByText("5. Contact Us")).toBeInTheDocument();

    // Verify key highlights
    const dayMatches = screen.getAllByText(/1–3 days/i);
    expect(dayMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/100% replacement with the same product/i)).toBeInTheDocument();
    const videoMatches = screen.getAllByText(/1-minute continuous, unedited unboxing video/i);
    expect(videoMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Moxie — Your satisfaction matters./i)).toBeInTheDocument();
  });


  test("renders contact details accurately", () => {
    render(<RefundPolicyModal {...defaultProps} />);
    expect(screen.getByRole("link", { name: "moxiegadgets.ss@gmail.com" })).toHaveAttribute("href", "mailto:moxiegadgets.ss@gmail.com");
    expect(screen.getByRole("link", { name: "7871327802" })).toHaveAttribute("href", "tel:7871327802");
    expect(screen.getByRole("link", { name: "7448327802" })).toHaveAttribute("href", "tel:7448327802");
    expect(screen.getByText(/Kulasekaranpattinam/i)).toBeInTheDocument();
  });

  test("closes modal via header X button", () => {
    const onClose = jest.fn();
    render(<RefundPolicyModal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close Return and Refund Policy");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes modal via bottom I Understand button", () => {
    const onClose = jest.fn();
    render(<RefundPolicyModal {...defaultProps} onClose={onClose} />);
    const understandBtn = screen.getByRole("button", { name: /I Understand/i });
    fireEvent.click(understandBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes modal on Escape key press", () => {
    const onClose = jest.fn();
    render(<RefundPolicyModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
