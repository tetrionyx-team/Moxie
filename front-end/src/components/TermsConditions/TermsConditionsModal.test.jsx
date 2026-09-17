import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TermsConditionsModal from "./TermsConditionsModal";

describe("TermsConditionsModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onOpenPrivacyPolicy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render when isOpen is false", () => {
    render(<TermsConditionsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders all 15 sections when isOpen is true", () => {
    render(<TermsConditionsModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("TERMS & CONDITIONS")).toBeInTheDocument();
    expect(screen.getByText(/Last Updated: September 12, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();

    // Verify all 15 headings
    expect(screen.getByText("1. Website Use")).toBeInTheDocument();
    expect(screen.getByText("2. Products & Pricing")).toBeInTheDocument();
    expect(screen.getByText("3. Orders & Payments")).toBeInTheDocument();
    expect(screen.getByText("4. Cancellation")).toBeInTheDocument();
    expect(screen.getByText("5. Delivery & Shipping")).toBeInTheDocument();
    expect(screen.getByText("6. Returns & Refunds")).toBeInTheDocument();
    expect(screen.getByText("7. Damaged or Incorrect Products")).toBeInTheDocument();
    expect(screen.getByText("8. Promotions")).toBeInTheDocument();
    expect(screen.getByText("9. Intellectual Property")).toBeInTheDocument();
    expect(screen.getByText("10. Third-Party Services")).toBeInTheDocument();
    expect(screen.getByText("11. Website Availability")).toBeInTheDocument();
    expect(screen.getByText("12. Privacy")).toBeInTheDocument();
    expect(screen.getByText("13. Changes to These Terms")).toBeInTheDocument();
    expect(screen.getByText("14. Governing Law")).toBeInTheDocument();
    expect(screen.getByText("15. Contact Us")).toBeInTheDocument();
  });

  test("renders contact details correctly", () => {
    render(<TermsConditionsModal {...defaultProps} />);
    expect(screen.getByRole("link", { name: "moxiegadgets.ss@gmail.com" })).toHaveAttribute("href", "mailto:moxiegadgets.ss@gmail.com");
    expect(screen.getByRole("link", { name: "7871327802" })).toHaveAttribute("href", "tel:7871327802");
    expect(screen.getByRole("link", { name: "7448327802" })).toHaveAttribute("href", "tel:7448327802");
    expect(screen.getByText(/Kulasekaranpattinam/i)).toBeInTheDocument();
  });

  test("clicking Privacy Policy in Section 12 triggers onOpenPrivacyPolicy", () => {
    const onOpenPrivacyPolicy = jest.fn();
    render(<TermsConditionsModal {...defaultProps} onOpenPrivacyPolicy={onOpenPrivacyPolicy} />);
    const privacyLink = screen.getByRole("button", { name: "Open Privacy Policy" });
    expect(privacyLink).toBeInTheDocument();

    fireEvent.click(privacyLink);
    expect(onOpenPrivacyPolicy).toHaveBeenCalledTimes(1);
  });

  test("closes modal via header X button", () => {
    const onClose = jest.fn();
    render(<TermsConditionsModal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close Terms and Conditions");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes modal via bottom I Understand button", () => {
    const onClose = jest.fn();
    render(<TermsConditionsModal {...defaultProps} onClose={onClose} />);
    const understandBtn = screen.getByRole("button", { name: /I Understand/i });
    fireEvent.click(understandBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes modal on Escape key press", () => {
    const onClose = jest.fn();
    render(<TermsConditionsModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
