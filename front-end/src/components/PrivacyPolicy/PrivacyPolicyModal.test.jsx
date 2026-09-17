import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PrivacyPolicyModal from "./PrivacyPolicyModal";

describe("PrivacyPolicyModal Component", () => {
  const handleClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render when isOpen is false", () => {
    render(<PrivacyPolicyModal isOpen={false} onClose={handleClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders all 13 sections with exact titles and contact details when open", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);
    
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("PRIVACY POLICY")).toBeInTheDocument();
    expect(screen.getByText("Last Updated: September 12, 2026")).toBeInTheDocument();

    // Verify all 13 sections
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
    expect(screen.getByText("2. How We Use Your Information")).toBeInTheDocument();
    expect(screen.getByText("3. Cookies")).toBeInTheDocument();
    expect(screen.getByText("4. How We Protect Your Information")).toBeInTheDocument();
    expect(screen.getByText("5. Sharing Your Information")).toBeInTheDocument();
    expect(screen.getByText("6. Payment Security")).toBeInTheDocument();
    expect(screen.getByText("7. Your Rights")).toBeInTheDocument();
    expect(screen.getByText("8. Account Information")).toBeInTheDocument();
    expect(screen.getByText("9. Third-Party Links")).toBeInTheDocument();
    expect(screen.getByText("10. Children's Privacy")).toBeInTheDocument();
    expect(screen.getByText("11. Data Retention")).toBeInTheDocument();
    expect(screen.getByText("12. Changes to This Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("13. Contact Us")).toBeInTheDocument();

    // Contact details
    expect(screen.getByRole("link", { name: "moxiegadgets.ss@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:moxiegadgets.ss@gmail.com"
    );
    expect(screen.getByRole("link", { name: "7871327802" })).toHaveAttribute("href", "tel:7871327802");
    expect(screen.getByRole("link", { name: "7448327802" })).toHaveAttribute("href", "tel:7448327802");
    expect(screen.getByText(/Kulasekaranpattinam/i)).toBeInTheDocument();
    expect(screen.getByText(/628206/i)).toBeInTheDocument();
    expect(screen.getByText("Your Privacy Matters")).toBeInTheDocument();
  });

  test("triggers onClose when clicking close button or I Understand button", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);
    
    // Close button
    fireEvent.click(screen.getByLabelText("Close Privacy Policy"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // I Understand button
    fireEvent.click(screen.getByRole("button", { name: "I Understand" }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  test("triggers onClose on Escape key press", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
