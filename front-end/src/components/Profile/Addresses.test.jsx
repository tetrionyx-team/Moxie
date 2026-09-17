import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Addresses from "./Addresses";

describe("Addresses Component", () => {
  const sampleAddresses = [
    {
      id: "1",
      full_name: "Harish Raja",
      mobile_number: "9876543210",
      address_line_1: "3/185, Temple South Street",
      address_line_2: "Kulasekaranpattinam",
      landmark: "Near Temple",
      city: "Thoothukudi",
      district: "Thoothukudi",
      state: "Tamil Nadu",
      pincode: "628206",
      address_type: "Home",
      is_default: true,
    },
    {
      id: "2",
      full_name: "Harish Raja",
      mobile_number: "9876543210",
      address_line_1: "Tower 3, Office 101",
      address_line_2: "Tech Park",
      landmark: "",
      city: "Chennai",
      district: "Chennai",
      state: "Tamil Nadu",
      pincode: "600001",
      address_type: "Work",
      is_default: false,
    },
  ];

  test("renders address cards, labels, summary cards and badges properly", () => {
    render(<Addresses addresses={sampleAddresses} onSetDefault={jest.fn()} />);

    expect(screen.getByText("My Addresses")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your saved delivery addresses for a faster, smoother checkout experience.")
    ).toBeInTheDocument();

    // Summary cards
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Saved Addresses")).toBeInTheDocument();
    expect(screen.getAllByText("Default Address").length).toBeGreaterThanOrEqual(1);

    // Address 1
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText(/3\/185, Temple South Street/)).toBeInTheDocument();
    expect(screen.getByText(/Kulasekaranpattinam/)).toBeInTheDocument();

    // Address 2
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
    expect(
      screen.getByText(/This address will be removed from your saved addresses/i)
    ).toBeInTheDocument();

    // Click confirm Delete inside modal
    const modalDialog = screen.getByRole("dialog");
    const confirmBtn = within(modalDialog).getByRole("button", { name: /^Delete$/i });
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
    const nameInput = screen.getByLabelText(/FULL NAME/i);
    expect(nameInput).toHaveValue("Harish Raja");

    fireEvent.change(nameInput, { target: { value: "Harish R." } });

    const updateBtn = screen.getByRole("button", { name: /Update Address/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          full_name: "Harish R.",
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
    fireEvent.change(screen.getByLabelText(/FULL NAME/i), {
      target: { value: "Sundar Raj" },
    });
    fireEvent.change(screen.getByLabelText(/MOBILE NUMBER/i), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByLabelText(/HOUSE \/ FLAT/i), {
      target: { value: "Flat 101, Park Avenue" },
    });
    fireEvent.change(screen.getByLabelText(/CITY/i), {
      target: { value: "Madurai" },
    });
    fireEvent.change(screen.getByLabelText(/DISTRICT/i), {
      target: { value: "Madurai" },
    });
    fireEvent.change(screen.getByLabelText(/STATE/i), {
      target: { value: "Tamil Nadu" },
    });
    fireEvent.change(screen.getByLabelText(/PIN CODE/i), {
      target: { value: "625001" },
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Sundar Raj",
          city: "Madurai",
          district: "Madurai",
          pincode: "625001",
        })
      );
    });
  });
});
