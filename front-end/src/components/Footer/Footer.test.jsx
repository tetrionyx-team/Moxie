import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Footer from "./Footer";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => jest.fn(),
}));

describe("Footer Component", () => {
  test("renders Moxie brand info and tagline", () => {
    render(<Footer />);
    expect(screen.getByAltText("Moxie Logo")).toBeInTheDocument();
    const taglines = screen.getAllByText(/SMARTER CHOICES, BETTER LIFE/i);
    expect(taglines.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Elevate your daily style with Moxie/i)).toBeInTheDocument();
  });

  test("renders all 4 column headings", () => {
    render(<Footer />);
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Service")).toBeInTheDocument();
    expect(screen.getByText("Contact Us")).toBeInTheDocument();
  });

  test("renders required categories links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Watches" })).toHaveAttribute("href", "/products/watches");
    expect(screen.getByRole("link", { name: "Shoes" })).toHaveAttribute("href", "/products/shoes");
    expect(screen.getByRole("link", { name: "Air Buds" })).toHaveAttribute("href", "/products/air-buds");
    expect(screen.getByRole("link", { name: "Sliders" })).toHaveAttribute("href", "/products/sliders");
    expect(screen.getByRole("link", { name: "Caps" })).toHaveAttribute("href", "/products/caps");
    expect(screen.getByRole("link", { name: "Accessories" })).toHaveAttribute("href", "/products/accessories");
    expect(screen.getByRole("link", { name: "Deals" })).toHaveAttribute("href", "/deals");
  });

  test("opens Contact Us modal when clicking Contact in Services", () => {
    render(<Footer />);
    const contactBtn = screen.getByRole("button", { name: /open contact us modal/i });
    expect(contactBtn).toBeInTheDocument();

    // Modal is initially not in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click to open modal
    fireEvent.click(contactBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Get in Touch")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByLabelText("Close contact form"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders exact store address and operating hours in footer column", () => {
    render(<Footer />);
    expect(screen.getByText(/Savariyar Temple South Street/i)).toBeInTheDocument();
    expect(screen.getByText(/Kulasekaranpattinam/i)).toBeInTheDocument();
    expect(screen.getByText(/628206/i)).toBeInTheDocument();
    expect(screen.getByText("Open Daily")).toBeInTheDocument();
    expect(screen.getByText(/9:00 AM - 9:00 PM/i)).toBeInTheDocument();
  });

  test("renders clickable phone numbers and email address", () => {
    render(<Footer />);
    const phone1 = screen.getByRole("link", { name: "7871327802" });
    const phone2 = screen.getByRole("link", { name: "7448327802" });
    const email = screen.getByRole("link", { name: "moxiegadgets.ss@gmail.com" });

    expect(phone1).toHaveAttribute("href", "tel:7871327802");
    expect(phone2).toHaveAttribute("href", "tel:7448327802");
    expect(email).toHaveAttribute("href", "mailto:moxiegadgets.ss@gmail.com");
  });

  test("opens Privacy Policy modal when clicking Privacy Policy in Services", () => {
    render(<Footer />);
    const privacyBtn = screen.getByRole("button", { name: /open privacy policy modal/i });
    expect(privacyBtn).toBeInTheDocument();

    // Modal is initially not in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click to open modal
    fireEvent.click(privacyBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("PRIVACY POLICY")).toBeInTheDocument();
    expect(screen.getByText(/we respect your privacy/i)).toBeInTheDocument();
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument();
    expect(screen.getByText("13. Contact Us")).toBeInTheDocument();

    // Close via close button
    fireEvent.click(screen.getByLabelText("Close Privacy Policy"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("opens Terms & Conditions modal when clicking Terms in Services", () => {
    render(<Footer />);
    const termsBtn = screen.getByRole("button", { name: /open terms and conditions modal/i });
    expect(termsBtn).toBeInTheDocument();

    // Modal is initially not in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click to open modal
    fireEvent.click(termsBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("TERMS & CONDITIONS")).toBeInTheDocument();
    expect(screen.getByText("1. Website Use")).toBeInTheDocument();
    expect(screen.getByText("15. Contact Us")).toBeInTheDocument();

    // Close via close button
    fireEvent.click(screen.getByLabelText("Close Terms and Conditions"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("can switch from Terms & Conditions modal to Privacy Policy modal", () => {
    render(<Footer />);
    const termsBtn = screen.getByRole("button", { name: /open terms and conditions modal/i });
    fireEvent.click(termsBtn);

    expect(screen.getByText("TERMS & CONDITIONS")).toBeInTheDocument();

    // Click inline Privacy Policy link
    const inlinePrivacyBtn = screen.getByRole("button", { name: "Open Privacy Policy" });
    fireEvent.click(inlinePrivacyBtn);

    // Terms modal closed and Privacy Policy modal opened
    expect(screen.queryByText("TERMS & CONDITIONS")).not.toBeInTheDocument();
    expect(screen.getByText("PRIVACY POLICY")).toBeInTheDocument();
  });

  test("opens Return & Refund Policy modal when clicking Return & Refund Policy in Services", () => {
    render(<Footer />);
    const refundBtn = screen.getByRole("button", { name: /open return and refund policy modal/i });
    expect(refundBtn).toBeInTheDocument();

    // Modal is initially not in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click to open modal
    fireEvent.click(refundBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("RETURN & REFUND POLICY")).toBeInTheDocument();
    expect(screen.getByText("1. Return & Replacement")).toBeInTheDocument();
    expect(screen.getByText("2. Mandatory Unboxing Video")).toBeInTheDocument();
    expect(screen.getByText("5. Contact Us")).toBeInTheDocument();

    // Close via close button
    fireEvent.click(screen.getByLabelText("Close Return and Refund Policy"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("opens Shipping Policy modal when clicking Shipping Policy in Services", () => {
    render(<Footer />);
    const shippingBtn = screen.getByRole("button", { name: /open shipping policy modal/i });
    expect(shippingBtn).toBeInTheDocument();

    // Modal is initially not in document
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click to open modal
    fireEvent.click(shippingBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("SHIPPING POLICY")).toBeInTheDocument();
    expect(screen.getByText("1. Order Processing & Dispatch")).toBeInTheDocument();
    expect(screen.getByText("3. Shipping Charges")).toBeInTheDocument();
    expect(screen.getByText("6. Damaged or Incorrect Products")).toBeInTheDocument();
    expect(screen.getByText("8. Contact Us")).toBeInTheDocument();

    // Close via close button
    fireEvent.click(screen.getByLabelText("Close Shipping Policy"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders social links and back to top button", () => {
    render(<Footer />);
    expect(screen.getByLabelText("Facebook")).toBeInTheDocument();
    expect(screen.getByLabelText("Instagram")).toBeInTheDocument();
    expect(screen.getByLabelText("X / Twitter")).toBeInTheDocument();
    expect(screen.getByLabelText("Back to Top")).toBeInTheDocument();
  });

  test("handles mobile accordion toggling with mutual exclusivity", () => {
    render(<Footer />);
    const categoriesBtn = screen.getByRole("button", { name: /categories/i });
    const serviceBtn = screen.getByRole("button", { name: /service/i });

    // Initially both are collapsed
    expect(categoriesBtn).toHaveAttribute("aria-expanded", "false");
    expect(serviceBtn).toHaveAttribute("aria-expanded", "false");

    // Click Categories -> expands
    fireEvent.click(categoriesBtn);
    expect(categoriesBtn).toHaveAttribute("aria-expanded", "true");
    expect(serviceBtn).toHaveAttribute("aria-expanded", "false");

    // Click Service -> Categories closes and Service opens (only one open at a time)
    fireEvent.click(serviceBtn);
    expect(categoriesBtn).toHaveAttribute("aria-expanded", "false");
    expect(serviceBtn).toHaveAttribute("aria-expanded", "true");

    // Click Service again -> collapses
    fireEvent.click(serviceBtn);
    expect(categoriesBtn).toHaveAttribute("aria-expanded", "false");
    expect(serviceBtn).toHaveAttribute("aria-expanded", "false");
  });
});



