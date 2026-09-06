import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Addresses from "./Addresses";

describe("Addresses Component", () => {
  const sampleAddresses = [
    {
      id: "1",
      name: "Harish Raja",
      phone: "+91 98765 43210",
      flat: "3/185, Temple South Street",
      area: "Kulasekaranpattinam",
      city: "Thoothukudi",
      state: "Tamil Nadu",
      pincode: "628206",
      type: "Home",
      isDefault: true,
    },
    {
      id: "2",
      name: "Harish Raja",
      phone: "+91 98765 43210",
      flat: "Tower 3, Office 101",
      area: "Tech Park",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600001",
      type: "Work",
      isDefault: false,
    },
  ];

  test("renders address cards, labels, and badges properly", () => {
    render(<Addresses addresses={sampleAddresses} onSetDefault={jest.fn()} />);

    expect(screen.getByText("My Addresses")).toBeInTheDocument();
    expect(screen.getByText("Manage your saved delivery addresses.")).toBeInTheDocument();

    // Check address 1
    expect(screen.getByText("DEFAULT")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText(/3\/185, Temple South Street/)).toBeInTheDocument();
    expect(screen.getByText(/Kulasekaranpattinam/)).toBeInTheDocument();
    expect(screen.getByText(/Thoothukudi, Tamil Nadu - 628206/)).toBeInTheDocument();

    // Check address 2
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText(/Tower 3, Office 101/)).toBeInTheDocument();

    // Set Default button should appear on non-default address
    expect(screen.getByRole("button", { name: /Set as Default/i })).toBeInTheDocument();
  });

  test("handles setting an address as default", () => {
    const handleSetDefault = jest.fn();
    render(<Addresses addresses={sampleAddresses} onSetDefault={handleSetDefault} />);

    const setDefaultBtn = screen.getByRole("button", { name: /Set as Default/i });
    fireEvent.click(setDefaultBtn);

    expect(handleSetDefault).toHaveBeenCalledWith("2");
  });

  test("opens delete confirmation modal and confirms deletion", async () => {
    const handleDelete = jest.fn();
    render(<Addresses addresses={sampleAddresses} onDeleteAddress={handleDelete} />);

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[1]);

    // Modal appears
    expect(screen.getByText("Delete this address?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();

    // Click confirm Delete inside modal
    const modalDialog = screen.getByRole("dialog");
    const confirmBtn = within(modalDialog).getByRole("button", { name: /Delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith("2");
    });
  });

  test("opens edit modal and submits updated data", async () => {
    const handleUpdate = jest.fn();
    render(<Addresses addresses={sampleAddresses} onUpdateAddress={handleUpdate} />);

    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    // Edit Modal opens
    expect(screen.getByText("Edit Delivery Address")).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Full Name/i);
    expect(nameInput).toHaveValue("Harish Raja");

    fireEvent.change(nameInput, { target: { value: "Harish R." } });

    const updateBtn = screen.getByRole("button", { name: /Update Address/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          name: "Harish R.",
        })
      );
    });
  });

  test("validates and adds a new address", async () => {
    const handleAdd = jest.fn();
    render(<Addresses addresses={[]} onAddAddress={handleAdd} />);

    // Empty state rendered
    expect(screen.getByText("No saved addresses")).toBeInTheDocument();

    const addBtn = screen.getAllByRole("button", { name: /Add New Address/i })[0];
    fireEvent.click(addBtn);

    expect(screen.getByText("Add Delivery Address")).toBeInTheDocument();

    // Try submit without filling (validation error)
    const saveBtn = screen.getByRole("button", { name: /Save Address/i });
    fireEvent.click(saveBtn);
    expect(handleAdd).not.toHaveBeenCalled();

    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Sundar Raj" },
    });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByLabelText(/House \/ Flat/i), {
      target: { value: "Flat 101" },
    });
    fireEvent.change(screen.getByLabelText(/Street \/ Area/i), {
      target: { value: "Park Avenue" },
    });
    fireEvent.change(screen.getByLabelText(/City/i), {
      target: { value: "Madurai" },
    });
    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: "Tamil Nadu" },
    });
    fireEvent.change(screen.getByLabelText(/Pincode/i), {
      target: { value: "625001" },
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Sundar Raj",
          city: "Madurai",
          pincode: "625001",
        })
      );
    });
  });
});
