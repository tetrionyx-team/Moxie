import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import AccountSecurity from "./AccountSecurity";

describe("AccountSecurity Component", () => {
  const sampleProfile = {
    email: "harish@moxie.com",
    mobile: "+91 98765 43210",
  };

  test("renders Account & Security page headers and verification cards", () => {
    render(<AccountSecurity profile={sampleProfile} />);

    expect(screen.getByRole("heading", { name: "Account & Security" })).toBeInTheDocument();
    expect(screen.getByText("Manage your account verification, password and security settings.")).toBeInTheDocument();

    expect(screen.getByText("Account Verification")).toBeInTheDocument();
    expect(screen.getByText("Email Authentication")).toBeInTheDocument();
    expect(screen.getByText("harish@moxie.com")).toBeInTheDocument();

    expect(screen.getByText("Mobile Number Link")).toBeInTheDocument();
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();

    // Badges
    const verifiedBadges = screen.getAllByText("VERIFIED");
    expect(verifiedBadges.length).toBe(2);
  });

  test("shows pending status if mobile number is not linked", () => {
    const unlinkedProfile = { email: "harish@moxie.com", mobile: "" };
    render(<AccountSecurity profile={unlinkedProfile} />);

    expect(screen.getByText("Not linked yet")).toBeInTheDocument();
    expect(screen.getByText("PENDING LINK")).toBeInTheDocument();
  });

  test("toggles password visibility with eye buttons", () => {
    render(<AccountSecurity profile={sampleProfile} />);

    const currentPassInput = screen.getByPlaceholderText("Enter current password");
    expect(currentPassInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByLabelText("Show current password");
    fireEvent.click(toggleBtn);
    expect(currentPassInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByLabelText("Hide current password"));
    expect(currentPassInput).toHaveAttribute("type", "password");
  });

  test("validates password matching and length", () => {
    render(<AccountSecurity profile={sampleProfile} />);

    const currentPass = screen.getByPlaceholderText("Enter current password");
    const newPass = screen.getByPlaceholderText("At least 6 characters");
    const confirmPass = screen.getByPlaceholderText("Re-enter new password");
    const submitBtn = screen.getByRole("button", { name: /Change Password/i });

    // Missing current password
    fireEvent.click(submitBtn);
    expect(screen.getByText("Please enter your current password.")).toBeInTheDocument();

    // Short password (< 6 chars)
    fireEvent.change(currentPass, { target: { value: "oldSecret123" } });
    fireEvent.change(newPass, { target: { value: "123" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText("New password must be at least 6 characters long.")).toBeInTheDocument();

    // Mismatched confirmation
    fireEvent.change(newPass, { target: { value: "NewSecret123" } });
    fireEvent.change(confirmPass, { target: { value: "DifferentSecret123" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText("New password and confirm password do not match.")).toBeInTheDocument();

    // Same as current password
    fireEvent.change(confirmPass, { target: { value: "oldSecret123" } });
    fireEvent.change(newPass, { target: { value: "oldSecret123" } });
    fireEvent.click(submitBtn);
    expect(screen.getByText("New password must be different from current password.")).toBeInTheDocument();
  });

  test("handles successful password update", async () => {
    render(<AccountSecurity profile={sampleProfile} />);

    fireEvent.change(screen.getByPlaceholderText("Enter current password"), {
      target: { value: "oldSecret123" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
      target: { value: "superBrandNew123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter new password"), {
      target: { value: "superBrandNew123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Change Password/i }));

    await waitFor(() => {
      expect(screen.getByText("Password updated successfully.")).toBeInTheDocument();
    });
  });

  test("danger zone: delete button is disabled until DELETE is typed", () => {
    render(<AccountSecurity profile={sampleProfile} />);

    const deleteBtn = screen.getByRole("button", { name: /Permanently Delete Account/i });
    expect(deleteBtn).toBeDisabled();

    const input = screen.getByPlaceholderText("Type DELETE to confirm");
    fireEvent.change(input, { target: { value: "delete" } }); // lowercase
    expect(deleteBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(deleteBtn).not.toBeDisabled();
  });

  test("danger zone: opens confirmation modal and confirms deletion", async () => {
    const handleDeleteAccount = jest.fn();
    render(<AccountSecurity profile={sampleProfile} onDeleteAccount={handleDeleteAccount} />);

    const input = screen.getByPlaceholderText("Type DELETE to confirm");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const deleteBtn = screen.getByRole("button", { name: /Permanently Delete Account/i });
    fireEvent.click(deleteBtn);

    // Modal appears
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText("Delete your account?")).toBeInTheDocument();
    expect(within(modal).getByText("This action cannot be undone. All your saved profile details, order records, and addresses will be permanently deleted.")).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = within(modal).getByRole("button", { name: /Delete Account/i });
    fireEvent.click(confirmBtn);

    expect(handleDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
