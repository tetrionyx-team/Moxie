import React, { useState } from "react";
import {
  LuMapPin,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuCheck,
  LuX,
  LuTriangleAlert,
  LuUser,
  LuSmartphone,
  LuHouse,
  LuBuilding2,
  LuMap,
  LuTag,
} from "react-icons/lu";

// Custom Road icon for Street / Area / Locality field matching the design
const RoadIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19L8 5" />
    <path d="M20 19L16 5" />
    <line x1="12" y1="7" x2="12" y2="9" />
    <line x1="12" y1="13" x2="12" y2="15" />
  </svg>
);

export default function Addresses({
  addresses = [],
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onSetDefault,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    flat: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    type: "Home",
    isDefault: false,
  });

  const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal",
  ];

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setFormData({
      name: "",
      phone: "",
      flat: "",
      area: "",
      city: "",
      state: "",
      pincode: "",
      type: "Home",
      isDefault: addresses.length === 0,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddress(addr);
    setFormData({
      name: addr.name || "",
      phone: addr.phone || "",
      flat: addr.flat || "",
      area: addr.area || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      type: addr.type || "Home",
      isDefault: Boolean(addr.isDefault),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Full Name is required.";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Mobile Number is required.";
    } else {
      const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length < 10) {
        errors.phone = "Please enter a valid 10-digit mobile number.";
      }
    }
    if (!formData.flat.trim()) {
      errors.flat = "House / Flat / Building is required.";
    }
    if (!formData.city.trim()) {
      errors.city = "City is required.";
    }
    if (!formData.state.trim()) {
      errors.state = "State is required.";
    }
    if (!formData.pincode.trim()) {
      errors.pincode = "Pincode is required.";
    } else {
      const cleanPin = formData.pincode.replace(/[^0-9]/g, "");
      if (cleanPin.length !== 6) {
        errors.pincode = "Pincode must be a 6-digit number.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingAddress) {
      if (onUpdateAddress) {
        await onUpdateAddress(editingAddress.id, formData);
      }
    } else {
      if (onAddAddress) {
        await onAddAddress(formData);
      }
    }

    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deleteTargetId && onDeleteAddress) {
      await onDeleteAddress(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="addresses-container">
      {/* 1. Header */}
      <div className="addresses-header-wrap">
        <div>
          <h2 className="addresses-page-title">My Addresses</h2>
          <p className="addresses-page-subtitle">
            Manage your saved delivery addresses.
          </p>
        </div>
        <button
          type="button"
          className="address-add-btn"
          onClick={handleOpenAddModal}
        >
          <LuPlus className="btn-icon" aria-hidden="true" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* 2. Content */}
      {addresses.length === 0 ? (
        /* Empty State */
        <div className="addresses-empty-state">
          <div className="addresses-empty-icon-wrap" aria-hidden="true">
            <LuMapPin />
          </div>
          <h3 className="addresses-empty-title">No saved addresses</h3>
          <p className="addresses-empty-subtitle">
            Add a delivery address to make checkout faster.
          </p>
          <button
            type="button"
            className="address-add-btn addresses-empty-add-btn"
            onClick={handleOpenAddModal}
          >
            <LuPlus className="btn-icon" aria-hidden="true" />
            <span>Add New Address</span>
          </button>
        </div>
      ) : (
        /* Address Grid */
        <div className="addresses-grid">
          {addresses.map((addr) => {
            const labelType = (addr.type || "HOME").toUpperCase();
            const locationLine2 = [addr.city, addr.state]
              .filter(Boolean)
              .join(", ");
            const fullLocation = locationLine2
              ? `${locationLine2}${addr.pincode ? ` - ${addr.pincode}` : ""}`
              : addr.pincode || "";

            return (
              <article
                key={addr.id}
                className={`address-item-card ${addr.isDefault ? "is-default" : ""}`}
                aria-label={`Address for ${addr.name}`}
              >
                {/* Card Header: Label & Default Badge */}
                <div className="address-card-header">
                  <span className="address-type-pill">
                    <LuMapPin className="address-type-icon" aria-hidden="true" />
                    <span>{labelType === "WORK" ? "Work" : labelType === "OTHER" ? "Other" : "Home"}</span>
                  </span>

                  {addr.isDefault && (
                    <span className="address-default-badge">
                      <LuCheck className="badge-check-icon" aria-hidden="true" />
                      <span>DEFAULT</span>
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="address-card-body">
                  <h3 className="address-user-name">{addr.name}</h3>
                  {addr.phone && <p className="address-user-phone">{addr.phone}</p>}

                  <p className="address-location-text">
                    {addr.flat && (
                      <>
                        {addr.flat}
                        <br />
                      </>
                    )}
                    {addr.area && (
                      <>
                        {addr.area}
                        <br />
                      </>
                    )}
                    {fullLocation}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="address-actions-row">
                  {!addr.isDefault && onSetDefault && (
                    <button
                      type="button"
                      className="address-action-btn address-btn-default"
                      onClick={() => onSetDefault(addr.id)}
                    >
                      <span>Set as Default</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="address-action-btn address-btn-edit"
                    onClick={() => handleOpenEditModal(addr)}
                  >
                    <LuPencil className="order-btn-icon" aria-hidden="true" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    className="address-action-btn address-btn-delete"
                    onClick={() => setDeleteTargetId(addr.id)}
                  >
                    <LuTrash2 className="order-btn-icon" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="address-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="address-modal-container address-modal-card-premium">
            {/* Modal Header */}
            <div className="address-modal-header-premium">
              <div className="address-modal-header-left">
                <div className="address-modal-badge-icon" aria-hidden="true">
                  <LuMapPin />
                </div>
                <div>
                  <h3 id="address-modal-title" className="address-modal-title-premium">
                    {editingAddress ? "Edit Delivery Address" : "Add Delivery Address"}
                  </h3>
                  <p className="address-modal-subtitle-premium">
                    {editingAddress
                      ? "Update your delivery address details."
                      : "Add your delivery address details."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="address-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <LuX />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="address-fields-grid">
                {/* 1. Full Name */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuUser />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressName">
                      FULL NAME <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressName"
                      type="text"
                      name="name"
                      className={`address-field-input ${formErrors.name ? "has-error" : ""}`}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Amit Kumar"
                      required
                    />
                    {formErrors.name && (
                      <span className="profile-form-error">{formErrors.name}</span>
                    )}
                  </div>
                </div>

                {/* 2. Mobile Number */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuSmartphone />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressPhone">
                      MOBILE NUMBER <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressPhone"
                      type="tel"
                      name="phone"
                      className={`address-field-input ${formErrors.phone ? "has-error" : ""}`}
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      required
                    />
                    {formErrors.phone && (
                      <span className="profile-form-error">{formErrors.phone}</span>
                    )}
                  </div>
                </div>

                {/* 3. House / Flat / Building */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuHouse />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressFlat">
                      HOUSE / FLAT / BUILDING <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressFlat"
                      type="text"
                      name="flat"
                      className={`address-field-input ${formErrors.flat ? "has-error" : ""}`}
                      value={formData.flat}
                      onChange={handleChange}
                      placeholder="e.g. Flat 402, Building C"
                      required
                    />
                    {formErrors.flat && (
                      <span className="profile-form-error">{formErrors.flat}</span>
                    )}
                  </div>
                </div>

                {/* 4. Street / Area / Locality */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <RoadIcon />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressArea">
                      STREET / AREA / LOCALITY <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressArea"
                      type="text"
                      name="area"
                      className={`address-field-input ${formErrors.area ? "has-error" : ""}`}
                      value={formData.area}
                      onChange={handleChange}
                      placeholder="e.g. Opposite Town Park"
                    />
                    {formErrors.area && (
                      <span className="profile-form-error">{formErrors.area}</span>
                    )}
                  </div>
                </div>

                {/* 5. City */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuBuilding2 />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressCity">
                      CITY <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressCity"
                      type="text"
                      name="city"
                      className={`address-field-input ${formErrors.city ? "has-error" : ""}`}
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Chandigarh"
                      required
                    />
                    {formErrors.city && (
                      <span className="profile-form-error">{formErrors.city}</span>
                    )}
                  </div>
                </div>

                {/* 6. State */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuMap />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressState">
                      STATE <span className="text-danger">*</span>
                    </label>
                    <div className="address-select-wrap">
                      <select
                        id="addressState"
                        name="state"
                        className={`address-field-select ${formErrors.state ? "has-error" : ""}`}
                        value={formData.state}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formErrors.state && (
                      <span className="profile-form-error">{formErrors.state}</span>
                    )}
                  </div>
                </div>

                {/* 7. Pincode */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuMapPin />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressPincode">
                      PINCODE <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressPincode"
                      type="text"
                      name="pincode"
                      className={`address-field-input ${formErrors.pincode ? "has-error" : ""}`}
                      value={formData.pincode}
                      onChange={handleChange}
                      maxLength="6"
                      placeholder="160017"
                      required
                    />
                    {formErrors.pincode && (
                      <span className="profile-form-error">{formErrors.pincode}</span>
                    )}
                  </div>
                </div>

                {/* 8. Address Type */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuTag />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressType">
                      ADDRESS TYPE
                    </label>
                    <div className="address-select-wrap">
                      <select
                        id="addressType"
                        name="type"
                        className="address-field-select"
                        value={formData.type}
                        onChange={handleChange}
                      >
                        <option value="Home">Home (All-day delivery)</option>
                        <option value="Work">Work (Delivery 9 AM - 5 PM)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Address Checkbox Card */}
              <label className="address-default-card" htmlFor="isDefaultAddr">
                <input
                  type="checkbox"
                  id="isDefaultAddr"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                  disabled={editingAddress?.isDefault && addresses.length > 1}
                  className="address-default-input-hidden"
                />
                <div className={`address-custom-checkbox ${formData.isDefault ? "is-checked" : ""}`} aria-hidden="true">
                  {formData.isDefault && <LuCheck />}
                </div>
                <div className="address-default-card-text">
                  <span className="address-default-card-title">
                    Set as my default delivery address
                  </span>
                  <span className="address-default-card-desc">
                    This address will be used by default at checkout.
                  </span>
                </div>
              </label>

              {/* Modal Footer Actions */}
              <div className="address-modal-footer">
                <button
                  type="button"
                  className="address-modal-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="address-modal-btn-submit">
                  {editingAddress ? (
                    <>
                      <LuPencil className="btn-icon" aria-hidden="true" />
                      <span>Update Address</span>
                    </>
                  ) : (
                    <>
                      <LuPlus className="btn-icon" aria-hidden="true" />
                      <span>Save Address</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="address-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-address-title">
          <div className="address-modal-container address-delete-modal-container">
            <div className="address-delete-icon-wrap" aria-hidden="true">
              <LuTriangleAlert />
            </div>
            <h3 id="delete-address-title" className="address-delete-title">
              Delete this address?
            </h3>
            <p className="address-delete-desc">
              This action cannot be undone.
            </p>
            <div className="address-delete-actions">
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="address-delete-confirm-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
