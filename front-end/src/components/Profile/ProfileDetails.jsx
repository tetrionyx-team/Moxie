import React, { useState, useRef, useEffect } from "react";
import {
  LuMail,
  LuPhone,
  LuCalendar,
  LuPencil,
  LuCheck,
  LuX,
  LuUpload,
} from "react-icons/lu";

export default function ProfileDetails({ profile, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    mobile: profile?.mobile || "",
    avatar: profile?.avatar || "",
  });

  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedBase64, setSelectedBase64] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Sync formData when profile prop changes
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        name: profile.name || "",
        mobile: profile.mobile || "",
        avatar: profile.avatar || "",
      });
    }
  }, [profile, isEditing]);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value to allow selecting same file again if desired
    e.target.value = "";

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Please select a JPG, PNG or WEBP image.",
      }));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Profile photo must be smaller than 5 MB.",
      }));
      return;
    }

    // Clear previous avatar errors
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.avatar;
      return updated;
    });

    // Revoke old object URL if any
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    // Read Base64 for persistence
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Full Name is required.";
    }

    if (formData.mobile.trim()) {
      const cleanPhone = formData.mobile.replace(/[^0-9]/g, "");
      if (cleanPhone.length < 10) {
        newErrors.mobile = "Please enter a valid 10-digit phone number.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSuccessMsg("");

    const updatedAvatar = selectedBase64 !== null ? selectedBase64 : (formData.avatar || profile?.avatar || "");
    const payload = {
      ...formData,
      avatar: updatedAvatar,
    };

    try {
      await onUpdate(payload);
      setIsEditing(false);
      setPreviewUrl(null);
      setSelectedBase64(null);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrors({ form: "Failed to update profile. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedBase64(null);
    setFormData({
      name: profile?.name || "",
      mobile: profile?.mobile || "",
      avatar: profile?.avatar || "",
    });
    setErrors({});
    setIsEditing(false);
  };

  const userName = profile?.name || "User";
  const userEmail = profile?.email || "Not Provided";
  const userPhone = profile?.mobile || "Not Provided";
  const userJoined = profile?.joinedDate || "Member";

  const currentAvatarDisplay = previewUrl || (selectedBase64 !== null ? selectedBase64 : (formData.avatar || profile?.avatar || ""));

  return (
    <div className="profile-details-container">
      {/* 1. Header */}
      <div className="profile-header-wrap">
        <h2 className="profile-page-title">My Profile</h2>
        <p className="profile-page-subtitle">Manage your personal information.</p>
      </div>

      {successMsg && (
        <div className="profile-alert-success" role="alert">
          <LuCheck className="alert-icon" />
          <span>{successMsg}</span>
        </div>
      )}

      {errors.form && (
        <div className="profile-alert-error" role="alert">
          <LuX className="alert-icon" />
          <span>{errors.form}</span>
        </div>
      )}

      {isEditing ? (
        /* Edit Form Card */
        <div className="profile-edit-card">
          <div className="personal-info-header">
            <h3 className="personal-info-title">Edit Profile</h3>
          </div>

          <form onSubmit={handleSubmit} noValidate className="profile-edit-form">
            <div className="profile-edit-avatar-row">
              <div className="profile-edit-avatar-preview">
                {currentAvatarDisplay ? (
                  <img
                    src={currentAvatarDisplay}
                    alt="Avatar Preview"
                    className="avatar-preview-img"
                  />
                ) : (
                  <div className="avatar-preview-initials">
                    {getInitials(formData.name || userName)}
                  </div>
                )}
              </div>
              <div className="profile-edit-avatar-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  hidden
                  data-testid="profile-photo-file-input"
                />
                <button
                  type="button"
                  className="profile-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload profile photo"
                >
                  <LuUpload className="upload-icon" aria-hidden="true" />
                  <span>Upload Photo</span>
                </button>
                {errors.avatar && (
                  <span className="profile-form-error">{errors.avatar}</span>
                )}
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="name-input">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="name-input"
                  type="text"
                  name="name"
                  className={`profile-form-input ${errors.name ? "has-error" : ""}`}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  required
                />
                {errors.name && <span className="profile-form-error">{errors.name}</span>}
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="mobile-input">
                  Phone Number
                </label>
                <input
                  id="mobile-input"
                  type="tel"
                  name="mobile"
                  className={`profile-form-input ${errors.mobile ? "has-error" : ""}`}
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                />
                {errors.mobile && (
                  <span className="profile-form-error">{errors.mobile}</span>
                )}
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="email-input-readonly">
                  Email Address (Read-only)
                </label>
                <input
                  id="email-input-readonly"
                  type="email"
                  className="profile-form-input readonly-input"
                  value={userEmail}
                  disabled
                  readOnly
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="joined-input-readonly">
                  Account Joined (Read-only)
                </label>
                <input
                  id="joined-input-readonly"
                  type="text"
                  className="profile-form-input readonly-input"
                  value={userJoined}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                className="profile-save-btn"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* 2. Main Profile Summary Card */}
          <div className="profile-summary-main-card">
            {/* Left side */}
            <div className="profile-summary-left">
              <div className="profile-avatar-wrapper">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={userName}
                    className="profile-main-avatar"
                  />
                ) : (
                  <div className="profile-main-avatar-initials">
                    {getInitials(userName)}
                  </div>
                )}
              </div>
              <h3 className="profile-main-name">{userName}</h3>
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedBase64(null);
                  setFormData({
                    name: profile?.name || "",
                    mobile: profile?.mobile || "",
                    avatar: profile?.avatar || "",
                  });
                  setErrors({});
                  setIsEditing(true);
                }}
              >
                <LuPencil className="btn-icon" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Right side */}
            <div className="profile-summary-right">
              <div className="profile-summary-row">
                <div className="profile-summary-icon-box" aria-hidden="true">
                  <LuMail />
                </div>
                <div className="profile-summary-text">
                  <span className="profile-summary-label">Email Address</span>
                  <span className="profile-summary-value">{userEmail}</span>
                </div>
              </div>

              <div className="profile-summary-row">
                <div className="profile-summary-icon-box" aria-hidden="true">
                  <LuPhone />
                </div>
                <div className="profile-summary-text">
                  <span className="profile-summary-label">Mobile Number</span>
                  <span className="profile-summary-value">{userPhone}</span>
                </div>
              </div>

              <div className="profile-summary-row">
                <div className="profile-summary-icon-box" aria-hidden="true">
                  <LuCalendar />
                </div>
                <div className="profile-summary-text">
                  <span className="profile-summary-label">Account Joined</span>
                  <span className="profile-summary-value">{userJoined}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Personal Information Section Card */}
          <div className="personal-info-section">
            <div className="personal-info-header">
              <h3 className="personal-info-title">Personal Information</h3>
            </div>

            <div className="personal-info-grid">
              {/* Field 1: Full Name */}
              <div className="personal-info-field-card">
                <div className="personal-info-field-label">Full Name</div>
                <div className="personal-info-field-value">{userName}</div>
              </div>

              {/* Field 2: Email Address */}
              <div className="personal-info-field-card">
                <div className="personal-info-field-label">Email Address</div>
                <div className="personal-info-field-value">{userEmail}</div>
              </div>

              {/* Field 3: Phone Number */}
              <div className="personal-info-field-card">
                <div className="personal-info-field-label">Phone Number</div>
                <div className="personal-info-field-value">{userPhone}</div>
              </div>

              {/* Field 4: Account Joined */}
              <div className="personal-info-field-card">
                <div className="personal-info-field-label">Account Joined</div>
                <div className="personal-info-field-value">{userJoined}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
