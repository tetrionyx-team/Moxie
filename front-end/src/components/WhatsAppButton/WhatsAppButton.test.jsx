import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import WhatsAppButton from "./WhatsAppButton";

describe("WhatsAppButton", () => {
  it("renders the floating WhatsApp button with proper accessibility attributes", () => {
    render(<WhatsAppButton />);
    const button = screen.getByRole("link", { name: /Chat with Moxie on WhatsApp/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("target", "_blank");
    expect(button).toHaveAttribute("rel", "noopener noreferrer");
    expect(button.getAttribute("href")).toContain("https://wa.me/");
  });

  it("displays the hover tooltip text", () => {
    render(<WhatsAppButton />);
    expect(screen.getByText(/Chat with us/i)).toBeInTheDocument();
    expect(screen.getByText(/on WhatsApp/i)).toBeInTheDocument();
  });
});
