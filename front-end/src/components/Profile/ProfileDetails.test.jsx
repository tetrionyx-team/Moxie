import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileDetails from "./ProfileDetails";

describe("ProfileDetails component (Simplified Profile Page with Photo Upload)", () => {
  const mockProfile = {
    name: "Harish Raja",
    email: "harish@example.com",
    mobile: "+91 98765 43210",
    avatar: "",
    joinedDate: "January 15, 2024",
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.URL.createObjectURL = jest.fn(() => "blob:http://localhost/mock-avatar");
    window.URL.revokeObjectURL = jest.fn();
  });

  it("renders the 4 required profile fields: Full Name, Email Address, Phone Number, and Account Joined", () => {
    render(<ProfileDetails profile={mockProfile} onUpdate={mockOnUpdate} />);

    // Page title and subtitle
    expect(screen.getByRole("heading", { name: "My Profile" })).toBeInTheDocument();
    expect(screen.getByText("Manage your personal information.")).toBeInTheDocument();

    // Section title
    expect(screen.getByRole("heading", { name: "Personal Information" })).toBeInTheDocument();

    // Check displayed values
    expect(screen.getAllByText("Harish Raja").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("harish@example.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("+91 98765 43210").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("January 15, 2024").length).toBeGreaterThanOrEqual(1);

    // Check avatar initials
    expect(screen.getByText("HR")).toBeInTheDocument();
  });

  it("does NOT render removed dashboard statistics or extra badges", () => {
    render(<ProfileDetails profile={mockProfile} onUpdate={mockOnUpdate} />);

    expect(screen.queryByText(/Total Orders/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wishlist count/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved Addresses stat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Account Status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recent Orders/i)).not.toBeInTheDocument();
  });

  it("renders Upload Photo button and NO URL text input in Edit mode", () => {
    render(<ProfileDetails profile={mockProfile} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    expect(screen.getByRole("button", { name: /upload profile photo/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/profile image url/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https:\/\/example.com\/avatar.jpg/i)).not.toBeInTheDocument();
  });

  it("validates file type and file size on photo upload", () => {
    render(<ProfileDetails profile={mockProfile} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    const fileInput = screen.getByTestId("profile-photo-file-input");

    // Invalid file type (e.g. PDF/GIF)
    const invalidFile = new File(["dummy content"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(screen.getByText("Please select a JPG, PNG or WEBP image.")).toBeInTheDocument();

    // Oversized file (> 5 MB)
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "large.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    expect(screen.getByText("Profile photo must be smaller than 5 MB.")).toBeInTheDocument();
  });

  it("opens the edit form, handles valid photo upload and updates profile on save", async () => {
    mockOnUpdate.mockResolvedValueOnce({
      ...mockProfile,
      name: "Harish Kumar",
      mobile: "+91 99999 88888",
    });

    render(<ProfileDetails profile={mockProfile} onUpdate={mockOnUpdate} />);

    const editBtn = screen.getByRole("button", { name: /edit profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole("heading", { name: "Edit Profile" })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    const mobileInput = screen.getByLabelText(/phone number/i);
    const fileInput = screen.getByTestId("profile-photo-file-input");

    // Clear name and test required validation
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByText("Full Name is required.")).toBeInTheDocument();
    expect(mockOnUpdate).not.toHaveBeenCalled();

    // Select valid image file
    const validFile = new File(["dummy image data"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Enter valid details and submit
    fireEvent.change(nameInput, { target: { value: "Harish Kumar" } });
    fireEvent.change(mobileInput, { target: { value: "+91 99999 88888" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Harish Kumar",
          mobile: "+91 99999 88888",
        })
      );
    });

    expect(await screen.findByText("Profile updated successfully!")).toBeInTheDocument();
  });

  it("cancels edit mode without updating when Cancel is clicked", () => {
    render(<ProfileDetails profile={mockProfile} onUpdate={mockOnUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    expect(screen.getByRole("heading", { name: "Edit Profile" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("heading", { name: "Personal Information" })).toBeInTheDocument();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });
});
