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
  LuCrown,
  LuZap,
  LuChevronRight,
  LuPackage,
} from "react-icons/lu";

// Custom Road icon for Street / Area / Locality field matching the MOXIE luxury design
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
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    alternate_mobile_number: "",
    flat: "",
    area: "",
    landmark: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    type: "Home",
    isDefault: false,
  });

  const states = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
  ];

  // Dynamic statistics
  const savedCount = addresses.length;
  const defaultAddress = addresses.find((a) => a.isDefault || a.is_default);
  const defaultCount = defaultAddress ? 1 : 0;

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setFormData({
      name: "",
      phone: "",
      alternate_mobile_number: "",
      flat: "",
      area: "",
      landmark: "",
      city: "",
      district: "",
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
      name: addr.name || addr.full_name || "",
      phone: addr.phone || addr.mobile_number || "",
      alternate_mobile_number: addr.alternate_mobile_number || "",
      flat: addr.flat || addr.address_line_1 || "",
      area: addr.area || addr.address_line_2 || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      district: addr.district || addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      type: addr.type || addr.address_type || "Home",
      isDefault: Boolean(addr.isDefault || addr.is_default),
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
      if (cleanPhone.length !== 10) {
        errors.phone = "Please enter a valid 10-digit mobile number.";
      }
    }
    if (formData.alternate_mobile_number && formData.alternate_mobile_number.trim()) {
      const cleanAlt = formData.alternate_mobile_number.replace(/[^0-9]/g, "");
      if (cleanAlt.length !== 10) {
        errors.alternate_mobile_number = "Alternate number must be 10 digits.";
      }
    }
    if (!formData.flat.trim()) {
      errors.flat = "House / Flat / Building / Address Line 1 is required.";
    }
    if (!formData.city.trim()) {
      errors.city = "City is required.";
    }
    if (!formData.district.trim() && !formData.city.trim()) {
      errors.district = "District is required.";
    }
    if (!formData.state.trim()) {
      errors.state = "State is required.";
    }
    if (!formData.pincode.trim()) {
      errors.pincode = "PIN Code is required.";
    } else {
      const cleanPin = formData.pincode.replace(/[^0-9]/g, "");
      if (cleanPin.length !== 6) {
        errors.pincode = "PIN Code must be a 6-digit number.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        full_name: formData.name.trim(),
        phone: formData.phone.trim(),
        mobile_number: formData.phone.trim(),
        alternate_mobile_number: formData.alternate_mobile_number?.trim() || "",
        flat: formData.flat.trim(),
        address_line_1: formData.flat.trim(),
        area: formData.area.trim(),
        address_line_2: formData.area.trim(),
        landmark: formData.landmark.trim(),
        city: formData.city.trim(),
        district: (formData.district.trim() || formData.city.trim()),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        type: formData.type || "Home",
        address_type: formData.type || "Home",
        isDefault: Boolean(formData.isDefault),
        is_default: Boolean(formData.isDefault),
      };

      if (editingAddress) {
        if (onUpdateAddress) {
          await onUpdateAddress(editingAddress.id, payload);
        }
        showToast("Address updated successfully.");
      } else {
        if (onAddAddress) {
          await onAddAddress(payload);
        }
        showToast("Address saved successfully.");
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.message || "Failed to save address.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefaultClick = async (addrId) => {
    if (onSetDefault) {
      try {
        await onSetDefault(addrId);
        showToast("Default address updated.");
      } catch (err) {
        showToast(err.message || "Failed to update default address.", "error");
      }
    }
  };

  const confirmDelete = async () => {
    if (deleteTargetId && onDeleteAddress) {
      try {
        await onDeleteAddress(deleteTargetId);
        setDeleteTargetId(null);
        showToast("Address deleted successfully.");
      } catch (err) {
        showToast(err.message || "Failed to delete address.", "error");
      }
    }
  };

  return (
    <div className="addresses-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`address-toast ${toastMessage.type === "error" ? "toast-error" : "toast-success"}`}
          role="status"
        >
          <span>{toastMessage.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header */}
      <div className="addresses-header-wrap">
        <div className="addresses-title-block">
          <span className="addresses-eyebrow">MY ACCOUNT</span>
          <h1 className="addresses-page-title">My Addresses</h1>
          <p className="addresses-page-subtitle">
            Manage your saved delivery addresses for a faster, smoother checkout experience.
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

      {/* 2. Dynamic Summary Cards (Values from real API data) */}
      <div className="addresses-summary-grid">
        {/* Card 1: Saved Addresses Count */}
        <div className="summary-stat-card">
          <div className="stat-icon-circle gold">
            <LuMapPin />
          </div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-number">{savedCount}</span>
            </div>
            <span className="stat-label">Saved Addresses</span>
            <span className="stat-desc">Keep track of your delivery locations</span>
          </div>
        </div>

        {/* Card 2: Default Address Status */}
        <div className="summary-stat-card">
          <div className="stat-icon-circle gold">
            <LuCrown />
          </div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-number">{defaultCount}</span>
            </div>
            <span className="stat-label">Default Address</span>
            <span className="stat-desc">
              {defaultAddress ? "Used for faster checkout" : "No default address"}
            </span>
          </div>
        </div>

        {/* Card 3: Faster Checkout Info */}
        <div className="summary-stat-card informational">
          <div className="stat-icon-circle gold">
            <LuZap />
          </div>
          <div className="stat-content">
            <span className="stat-label prominent">Faster Checkout</span>
            <span className="stat-desc">Save time on every order</span>
          </div>
          <div className="stat-arrow-circle" aria-hidden="true">
            <LuChevronRight />
          </div>
        </div>
      </div>

      {/* 3. Address Content Grid / Empty State */}
      {addresses.length === 0 ? (
        /* Empty State */
        <div className="addresses-empty-state">
          <div className="addresses-empty-icon-wrap" aria-hidden="true">
            <LuMapPin />
          </div>
          <h3 className="addresses-empty-title">No saved addresses</h3>
          <p className="addresses-empty-subtitle">
            Add your first delivery address for a faster checkout experience.
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
        /* Dynamic Address Grid */
        <div className="addresses-grid">
          {addresses.map((addr) => {
            const labelType = (addr.type || addr.address_type || "Home").toUpperCase();
            const displayName = addr.name || addr.full_name || "Customer";
            const displayPhone = addr.phone || addr.mobile_number || "";
            const line1 = addr.flat || addr.address_line_1 || "";
            const line2 = addr.area || addr.address_line_2 || "";
            const landmark = addr.landmark || "";
            const isDefault = Boolean(addr.isDefault || addr.is_default);

            const cityPart = addr.city || "";
            const statePart = addr.state || "";
            const pinPart = addr.pincode || "";

            const locationLine2 = [cityPart, statePart].filter(Boolean).join(", ");
            const fullLocation = locationLine2
              ? `${locationLine2}${pinPart ? ` ${pinPart}` : ""}`
              : pinPart;

            return (
              <article
                key={addr.id}
                className={`address-item-card ${isDefault ? "is-default" : ""}`}
                aria-label={`Address for ${displayName}`}
              >
                {/* Card Header: Type Badge & Default Badge */}
                <div className="address-card-header">
                  <span className={`address-type-pill ${labelType.toLowerCase()}`}>
                    <LuMapPin className="address-type-icon" aria-hidden="true" />
                    <span>
                      {labelType === "WORK" ? "Work" : labelType === "OTHER" ? "Other" : "Home"}
                    </span>
                  </span>

                  {isDefault && (
                    <span className="address-default-badge">
                      <LuCrown className="badge-crown-icon" aria-hidden="true" />
                      <span>Default</span>
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="address-card-body">
                  <h3 className="address-user-name">{displayName}</h3>
                  {displayPhone && (
                    <p className="address-user-phone">
                      {displayPhone.startsWith("+91") ? displayPhone : `+91 ${displayPhone}`}
                    </p>
                  )}

                  <div className="address-location-box">
                    <div className="address-loc-pin-icon" aria-hidden="true">
                      <LuMapPin />
                    </div>
                    <div className="address-location-text">
                      {line1 && (
                        <span>
                          {line1}
                          {line2 ? `, ${line2}` : ""}
                        </span>
                      )}
                      {!line1 && line2 && <span>{line2}</span>}
                      {landmark && <span className="address-landmark-text">Landmark: {landmark}</span>}
                      <span>{fullLocation}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Row */}
                <div className="address-actions-row">
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

                  {isDefault ? (
                    <div className="address-default-indicator-pill">
                      <LuCheck className="order-btn-icon" aria-hidden="true" />
                      <span>Default Address</span>
                    </div>
                  ) : (
                    onSetDefault && (
                      <button
                        type="button"
                        className="address-action-btn address-btn-default"
                        onClick={() => handleSetDefaultClick(addr.id)}
                      >
                        <span>Set as Default</span>
                      </button>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 4. Bottom Promo / Value Banner */}
      <div className="addresses-bottom-banner">
        <div className="banner-left-visual">
          <div className="banner-package-icon-wrap" aria-hidden="true">
            <LuPackage />
          </div>
          <div className="banner-text-block">
            <span className="banner-eyebrow">
              A SMALL STEP FOR A SMOOTHER SHOPPING EXPERIENCE
            </span>
            <h3 className="banner-heading">Add and manage your addresses</h3>
            <p className="banner-desc">
              Save your delivery addresses to enjoy a faster, more seamless checkout experience
              across all your favorite styles on MOXIE.
            </p>
          </div>
        </div>
        <div className="banner-right-action">
          <button
            type="button"
            className="banner-add-btn"
            onClick={handleOpenAddModal}
          >
            <LuPlus className="btn-icon" aria-hidden="true" />
            <span>Add New Address</span>
          </button>
          <div className="banner-script-quote">
            <span className="script-text">Good Style Travels Far ♡</span>
            <span className="script-sub">SHOP MORE. WORRY LESS.</span>
          </div>
        </div>
      </div>

      {/* 5. Add / Edit Address Modal */}
      {isModalOpen && (
        <div
          className="address-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
        >
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
                      : "Save your delivery address for a faster checkout."}
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
                      placeholder="e.g. Harish Raja"
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
                      maxLength={10}
                      className={`address-field-input ${formErrors.phone ? "has-error" : ""}`}
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      required
                    />
                    {formErrors.phone && (
                      <span className="profile-form-error">{formErrors.phone}</span>
                    )}
                  </div>
                </div>

                {/* 3. House / Flat / Building / Address Line 1 */}
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
                      placeholder="e.g. 12, Sunshine Apartments"
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
                      STREET / AREA / LOCALITY
                    </label>
                    <input
                      id="addressArea"
                      type="text"
                      name="area"
                      className="address-field-input"
                      value={formData.area}
                      onChange={handleChange}
                      placeholder="e.g. MG Road, Near Central Mall"
                    />
                  </div>
                </div>

                {/* 5. Landmark */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuMapPin />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressLandmark">
                      LANDMARK
                    </label>
                    <input
                      id="addressLandmark"
                      type="text"
                      name="landmark"
                      className="address-field-input"
                      value={formData.landmark}
                      onChange={handleChange}
                      placeholder="e.g. Opposite Town Hall"
                    />
                  </div>
                </div>

                {/* 6. City */}
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
                      placeholder="e.g. Chennai"
                      required
                    />
                    {formErrors.city && (
                      <span className="profile-form-error">{formErrors.city}</span>
                    )}
                  </div>
                </div>

                {/* 7. District */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuBuilding2 />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressDistrict">
                      DISTRICT <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressDistrict"
                      type="text"
                      name="district"
                      className={`address-field-input ${formErrors.district ? "has-error" : ""}`}
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="e.g. Chennai District"
                      required
                    />
                    {formErrors.district && (
                      <span className="profile-form-error">{formErrors.district}</span>
                    )}
                  </div>
                </div>

                {/* 8. State */}
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

                {/* 9. PIN Code */}
                <div className="address-field-card">
                  <div className="address-field-icon-box" aria-hidden="true">
                    <LuMapPin />
                  </div>
                  <div className="address-field-content">
                    <label className="address-field-label" htmlFor="addressPincode">
                      PIN CODE <span className="text-danger">*</span>
                    </label>
                    <input
                      id="addressPincode"
                      type="text"
                      name="pincode"
                      className={`address-field-input ${formErrors.pincode ? "has-error" : ""}`}
                      value={formData.pincode}
                      onChange={handleChange}
                      maxLength="6"
                      placeholder="6-digit PIN"
                      required
                    />
                    {formErrors.pincode && (
                      <span className="profile-form-error">{formErrors.pincode}</span>
                    )}
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
                <div
                  className={`address-custom-checkbox ${formData.isDefault ? "is-checked" : ""}`}
                  aria-hidden="true"
                >
                  {formData.isDefault && <LuCheck />}
                </div>
                <div className="address-default-card-text">
                  <span className="address-default-card-title">
                    Set as my default delivery address
                  </span>
                  <span className="address-default-card-desc">
                    This address will be automatically selected during checkout.
                  </span>
                </div>
              </label>

              {/* Modal Footer Actions */}
              <div className="address-modal-footer">
                <button
                  type="button"
                  className="address-modal-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="address-modal-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : editingAddress ? (
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

      {/* 6. Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="address-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-address-title"
        >
          <div className="address-modal-container address-delete-modal-container">
            <div className="address-delete-icon-wrap" aria-hidden="true">
              <LuTriangleAlert />
            </div>
            <h3 id="delete-address-title" className="address-delete-title">
              Delete this address?
            </h3>
            <p className="address-delete-desc">
              This address will be removed from your saved addresses. This action cannot be undone.
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
