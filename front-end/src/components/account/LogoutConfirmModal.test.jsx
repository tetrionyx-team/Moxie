import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import LogoutConfirmModal from "./LogoutConfirmModal";

describe("LogoutConfirmModal Component", () => {
  test("does not render when isOpen is false", () => {
    render(<LogoutConfirmModal isOpen={false} onClose={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders modal content and buttons when isOpen is true", () => {
    render(<LogoutConfirmModal isOpen={true} onClose={jest.fn()} onConfirm={jest.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm Logout" })).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to logout from this account?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No, Stay Logged In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yes, Logout/i })).toBeInTheDocument();
  });

  test("clicking No triggers onClose and not onConfirm", () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(<LogoutConfirmModal isOpen={true} onClose={handleClose} onConfirm={handleConfirm} />);

    const noBtn = screen.getByRole("button", { name: /No, Stay Logged In/i });
    fireEvent.click(noBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  test("clicking Yes triggers onConfirm", () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(<LogoutConfirmModal isOpen={true} onClose={handleClose} onConfirm={handleConfirm} />);

    const yesBtn = screen.getByRole("button", { name: /Yes, Logout/i });
    fireEvent.click(yesBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  test("clicking the close X button triggers onClose", () => {
    const handleClose = jest.fn();
    render(<LogoutConfirmModal isOpen={true} onClose={handleClose} onConfirm={jest.fn()} />);

    const closeBtn = screen.getByRole("button", { name: "Close modal" });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test("clicking the backdrop triggers onClose", () => {
    const handleClose = jest.fn();
    render(<LogoutConfirmModal isOpen={true} onClose={handleClose} onConfirm={jest.fn()} />);

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test("pressing Escape key triggers onClose", () => {
    const handleClose = jest.fn();
    render(<LogoutConfirmModal isOpen={true} onClose={handleClose} onConfirm={jest.fn()} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
