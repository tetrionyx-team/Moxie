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

  test("renders social links and back to top button", () => {
    render(<Footer />);
    expect(screen.getByLabelText("Facebook")).toBeInTheDocument();
    expect(screen.getByLabelText("Instagram")).toBeInTheDocument();
    expect(screen.getByLabelText("X / Twitter")).toBeInTheDocument();
    expect(screen.getByLabelText("Back to Top")).toBeInTheDocument();
  });
});
