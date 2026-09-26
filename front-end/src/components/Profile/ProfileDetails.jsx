import React, { useState, useRef, useEffect } from "react";
import {
  LuMail,
  LuPhone,
  LuCalendar,
  LuPencil,
  LuCheck,
  LuX,
  LuUpload,
  LuCamera,
} from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";

export default function ProfileDetails({ profile, onUpdate }) {
  const { user } = useAuth() || {};
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || user?.name || "",
    mobile: profile?.mobile || user?.mobile || "",
    avatar: profile?.avatar || "",
  });

  const fileInputRef = useRef(null);
  const heroFileInputRef = useRef(null);
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

  // Sync formData when profile or user prop changes
  useEffect(() => {
    if ((profile || user) && !isEditing) {
      setFormData({
        name: profile?.name || user?.name || "",
        mobile: profile?.mobile || user?.mobile || "",
        avatar: profile?.avatar || "",
      });
    }
  }, [profile, user, isEditing]);

  const [heroImgError, setHeroImgError] = useState(false);
  const [editImgError, setEditImgError] = useState(false);

  // Reset img error if avatar source changes
  useEffect(() => {
    setHeroImgError(false);
    setEditImgError(false);
  }, [previewUrl, selectedBase64, formData.avatar, profile?.avatar, user?.avatar]);

  const getInitials = (name) => {
    const raw =
      name?.trim() ||
      profile?.name?.trim() ||
      user?.name?.trim() ||
      (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
      user?.username?.trim() ||
      profile?.email?.trim() ||
      user?.email?.trim() ||
      "U";
    return raw.charAt(0).toUpperCase() || "U";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const processFile = (file) => {
    if (!file) return;

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

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    // Read Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    processFile(file);
  };

  // Direct avatar change from hero camera button
  const handleHeroAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrors({ form: "Please select a JPG, PNG or WEBP image." });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors({ form: "Profile photo must be smaller than 5 MB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        setLoading(true);
        setErrors({});
        setFormData((prev) => ({ ...prev, avatar: base64Data }));
        await onUpdate({
          name: profile?.name || user?.name || "User",
          mobile: profile?.mobile || user?.mobile || "",
          avatar: base64Data,
        });
        setSuccessMsg("Profile photo updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } catch (err) {
        setErrors({ form: err.message || "Failed to update profile photo. Please try again." });
      } finally {
        setLoading(false);
      }
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

    const updatedAvatar =
      selectedBase64 !== null
        ? selectedBase64
        : (formData.avatar || profile?.avatar || "");

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
      name: profile?.name || user?.name || "",
      mobile: profile?.mobile || user?.mobile || "",
      avatar: profile?.avatar || "",
    });
    setErrors({});
    setIsEditing(false);
  };

  const userName = profile?.name || user?.name || "User";
  const userEmail = profile?.email || user?.email || "Not Provided";
  const userPhone = profile?.mobile || user?.mobile || "Not Provided";
  const userJoined = profile?.joinedDate || user?.joinedDate || "Member";
  const isVerified = Boolean(
    user?.emailVerified ||
    profile?.isVerified ||
    profile?.verified ||
    (user?.providerData && user.providerData.length > 0)
  );

  const currentAvatarDisplay =
    previewUrl ||
    (selectedBase64 !== null
      ? selectedBase64
      : (formData.avatar || profile?.avatar || user?.avatar || ""));

  return (
    <div className="profile-details-container">
      {/* 1. Header & Breadcrumb */}
      <div className="profile-header-bar">
        <div className="profile-header-titles">
          <h1 className="profile-page-title">My Profile</h1>
          <p className="profile-page-subtitle">
            Manage your personal information and account settings.
          </p>
        </div>

        <nav className="profile-breadcrumb-nav" aria-label="Breadcrumb">
          <ol className="profile-breadcrumb-list">
            <li className="profile-breadcrumb-item">
              <a href="/" className="profile-breadcrumb-link">
                Home
              </a>
            </li>
            <li className="profile-breadcrumb-separator" aria-hidden="true">
              &gt;
            </li>
            <li className="profile-breadcrumb-item active" aria-current="page">
              My Profile
            </li>
          </ol>
        </nav>
      </div>

      {/* Status Alerts */}
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
        /* Edit Profile Form Card */
        <div className="profile-edit-card">
          <div className="personal-info-header">
            <h2 className="personal-info-title">Edit Profile</h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="profile-edit-form">
            <div className="profile-edit-avatar-row">
              <div className="profile-edit-avatar-preview">
                {currentAvatarDisplay && !editImgError ? (
                  <img
                    src={currentAvatarDisplay}
                    alt="Avatar Preview"
                    className="avatar-preview-img"
                    onError={() => setEditImgError(true)}
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
        /* 2. Main Luxury Profile Hero Card */
        <section className="profile-hero-card" aria-labelledby="profile-heading-personal">
          {/* Accessible section header */}
          <h2 id="profile-heading-personal" className="sr-only">
            Personal Information
          </h2>

          <div className="profile-hero-content">
            {/* Left: Avatar & Direct Camera Upload */}
            <div className="profile-hero-avatar-col">
              <div className="profile-hero-avatar-wrap">
                {currentAvatarDisplay && !heroImgError ? (
                  <img
                    src={currentAvatarDisplay}
                    alt={userName}
                    className="profile-hero-avatar-img"
                    onError={() => setHeroImgError(true)}
                  />
                ) : (
                  <div className="profile-hero-avatar-initials">
                    {getInitials(userName)}
                  </div>
                )}

                {/* Overlapping Camera button */}
                <input
                  type="file"
                  ref={heroFileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleHeroAvatarChange}
                  hidden
                />
                <button
                  type="button"
                  className="profile-avatar-camera-btn"
                  title="Change profile photo"
                  aria-label="Change profile photo"
                  onClick={() => heroFileInputRef.current?.click()}
                  disabled={loading}
                >
                  <LuCamera className="camera-icon" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Middle: Name, Verified Badge, Details */}
            <div className="profile-hero-info-col">
              <div className="profile-hero-name-row">
                <h2 className="profile-hero-name">{userName}</h2>
                {isVerified && (
                  <span className="profile-verified-badge" title="Verified Account">
                    <LuCheck className="verified-icon" aria-hidden="true" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <div className="profile-hero-details-list">
                <div className="profile-detail-item">
                  <LuMail className="detail-icon" aria-hidden="true" />
                  <span className="detail-text">{userEmail}</span>
                </div>

                <div className="profile-detail-item">
                  <LuPhone className="detail-icon" aria-hidden="true" />
                  <span className="detail-text">{userPhone}</span>
                </div>

                <div className="profile-detail-item">
                  <LuCalendar className="detail-icon" aria-hidden="true" />
                  <span className="detail-text">
                    {!userJoined.toLowerCase().startsWith("joined") && "Joined on "}
                    <span>{userJoined}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quote & Edit Profile Button */}
            <div className="profile-hero-action-col">
              <div className="profile-hero-quote-wrap">
                <span className="quote-mark start">“</span>
                <p className="profile-hero-quote">
                  Good style always tells a story.
                </p>
                <span className="quote-mark end">”</span>
                <div className="quote-divider" aria-hidden="true" />
              </div>

              <button
                type="button"
                className="profile-hero-edit-btn"
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedBase64(null);
                  setFormData({
                    name: profile?.name || user?.name || "",
                    mobile: profile?.mobile || user?.mobile || "",
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
          </div>
        </section>
      )}
    </div>
  );
}
