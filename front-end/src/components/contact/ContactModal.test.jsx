import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContactModal from "./ContactModal";

describe("ContactModal Component", () => {
  const handleClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders modal when isOpen is true", () => {
    render(<ContactModal isOpen={true} onClose={handleClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Get in Touch")).toBeInTheDocument();
  });

  test("does not render when isOpen is false", () => {
    render(<ContactModal isOpen={false} onClose={handleClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("validates required fields on empty submit", () => {
    render(<ContactModal isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Please enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Please enter phone number.")).toBeInTheDocument();
    expect(screen.getByText("Please enter subject.")).toBeInTheDocument();
    expect(screen.getByText("Please enter message.")).toBeInTheDocument();
  });

  test("enforces character limit on message input", () => {
    render(<ContactModal isOpen={true} onClose={handleClose} />);
    const messageInput = screen.getByPlaceholderText(/your message/i);
    expect(screen.getByText("0/500")).toBeInTheDocument();

    fireEvent.change(messageInput, { target: { name: "message", value: "Hello Moxie" } });
    expect(screen.getByText("11/500")).toBeInTheDocument();
  });

  test("submits successfully when form is valid", () => {
    render(<ContactModal isOpen={true} onClose={handleClose} />);

    fireEvent.change(screen.getByPlaceholderText("Your Name"), {
      target: { name: "name", value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Email"), {
      target: { name: "email", value: "jane@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Phone Number"), {
      target: { name: "phone", value: "9876543210" },
    });
    fireEvent.change(screen.getByPlaceholderText("Subject"), {
      target: { name: "subject", value: "Order Inquiry" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Message"), {
      target: { name: "message", value: "I would like to know the status of my order." },
    });

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      screen.getByText(/Thank you! Your message has been received/i)
    ).toBeInTheDocument();
  });

  test("displays exact contact details and map", () => {
    render(<ContactModal isOpen={true} onClose={handleClose} />);

    expect(screen.getAllByText(/Kulasekaranpattinam/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/628206/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "7871327802" })).toHaveAttribute("href", "tel:7871327802");
    expect(screen.getByRole("link", { name: "7448327802" })).toHaveAttribute("href", "tel:7448327802");
    expect(screen.getByRole("link", { name: "moxiegadgets.ss@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:moxiegadgets.ss@gmail.com"
    );
    expect(screen.getAllByText("Open Daily").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/9:00 AM/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTitle("Moxie Store Location Map")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Follow Moxie on Instagram" })).toBeInTheDocument();
  });

  test("closes modal when X button or Escape key or backdrop is clicked", () => {
    render(<ContactModal isOpen={true} onClose={handleClose} />);

    // Click close X button
    fireEvent.click(screen.getByLabelText("Close contact form"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Click backdrop
    fireEvent.click(screen.getByTestId("contact-modal-backdrop"));
    expect(handleClose).toHaveBeenCalledTimes(3);
  });
});
