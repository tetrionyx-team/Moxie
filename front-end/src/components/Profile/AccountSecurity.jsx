import React, { useState } from "react";
import {
  LuMail,
  LuPhone,
  LuKeyRound,
  LuEye,
  LuEyeOff,
  LuTrash2,
  LuTriangleAlert,
  LuCheck,
} from "react-icons/lu";

export default function AccountSecurity({ profile, onDeleteAccount }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Compute password strength purely visually for UI feedback
  const getPasswordStrength = (pass) => {
    if (!pass) return null;
    if (pass.length < 6) return { label: "Weak", score: 1, color: "#dc2626" };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

    const score = (hasLetters ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSpecial ? 1 : 0) + (pass.length >= 8 ? 1 : 0);
    if (score <= 2) return { label: "Weak", score: 1, color: "#eab308" };
    if (score === 3) return { label: "Medium", score: 2, color: "#3b82f6" };
    return { label: "Strong", score: 3, color: "#16a34a" };
  };

  const strength = getPasswordStrength(newPassword);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!oldPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      setError("New password cannot be empty.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (oldPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      // Simulate API change delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSuccess("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Failed to update password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteModal = () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteModalOpen(false);
    if (onDeleteAccount) {
      onDeleteAccount();
    }
  };

  const userEmail = profile?.email || "";
  const userPhone = profile?.mobile || profile?.phone || "";
  const isEmailVerified = Boolean(userEmail);
  const isPhoneLinked = Boolean(userPhone);

  return (
    <div className="security-page-wrap">
      {/* Page Header */}
      <div className="security-header-wrap">
        <div className="security-header-left">
          <h2 className="security-title">Account & Security</h2>
          <p className="security-subtitle">
            Manage your account verification, password and security settings.
          </p>
        </div>
      </div>

      <div className="security-cards-stack">
        {/* SECTION 1 — ACCOUNT VERIFICATION */}
        <section className="security-card" aria-labelledby="verification-heading">
          <div className="security-card-header">
            <h3 id="verification-heading" className="security-card-title">
              Account Verification
            </h3>
            <p className="security-card-desc">Review your verified account details.</p>
          </div>

          <div className="security-rows-container">
            {/* Email Row */}
            <div className="security-item-row">
              <div className="security-item-left">
                <div className="security-item-icon-wrap" aria-hidden="true">
                  <LuMail className="security-row-icon" />
                </div>
                <div className="security-item-info">
                  <span className="security-item-name">Email Authentication</span>
                  <p className="security-item-value">
                    {userEmail || "No email registered"}
                  </p>
                </div>
              </div>
              <div className="security-item-right">
                {isEmailVerified ? (
                  <span className="security-badge badge-verified">
                    <LuCheck className="badge-icon" aria-hidden="true" />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <span className="security-badge badge-pending">
                    <span>NOT LINKED</span>
                  </span>
                )}
              </div>
            </div>

            <div className="security-row-divider" />

            {/* Mobile Number Row */}
            <div className="security-item-row">
              <div className="security-item-left">
                <div className="security-item-icon-wrap" aria-hidden="true">
                  <LuPhone className="security-row-icon" />
                </div>
                <div className="security-item-info">
                  <span className="security-item-name">Mobile Number Link</span>
                  <p className="security-item-value">
                    {userPhone || "Not linked yet"}
                  </p>
                </div>
              </div>
              <div className="security-item-right">
                {isPhoneLinked ? (
                  <span className="security-badge badge-verified">
                    <LuCheck className="badge-icon" aria-hidden="true" />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <span className="security-badge badge-pending">
                    <span>PENDING LINK</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — CHANGE PASSWORD */}
        <section className="security-card" aria-labelledby="change-password-heading">
          <div className="security-card-header">
            <h3 id="change-password-heading" className="security-card-title">
              Change Password
            </h3>
            <p className="security-card-desc">
              Update your password to keep your account secure.
            </p>
          </div>

          {error && (
            <div className="security-alert alert-error" role="alert">
              <LuTriangleAlert className="alert-icon" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="security-alert alert-success" role="status">
              <LuCheck className="alert-icon" aria-hidden="true" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="security-password-form" noValidate>
            <div className="security-password-grid">
              {/* Current Password */}
              <div className="security-form-group">
                <label htmlFor="sec-current-password" className="security-label">
                  Current Password <span className="text-danger">*</span>
                </label>
                <div className="security-input-wrap">
                  <input
                    id="sec-current-password"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="security-input"
                    required
                  />
                  <button
                    type="button"
                    className="security-eye-btn"
                    onClick={() => setShowOldPassword((prev) => !prev)}
                    aria-label={showOldPassword ? "Hide current password" : "Show current password"}
                  >
                    {showOldPassword ? <LuEyeOff /> : <LuEye />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="security-form-group">
                <label htmlFor="sec-new-password" className="security-label">
                  New Password <span className="text-danger">*</span>
                </label>
                <div className="security-input-wrap">
                  <input
                    id="sec-new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="security-input"
                    required
                  />
                  <button
                    type="button"
                    className="security-eye-btn"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    {showNewPassword ? <LuEyeOff /> : <LuEye />}
                  </button>
                </div>

                {/* Optional visual strength meter */}
                {strength && (
                  <div className="security-strength-bar-wrap" aria-live="polite">
                    <div className="security-strength-bars">
                      <span className={`strength-bar ${strength.score >= 1 ? "active-1" : ""}`} />
                      <span className={`strength-bar ${strength.score >= 2 ? "active-2" : ""}`} />
                      <span className={`strength-bar ${strength.score >= 3 ? "active-3" : ""}`} />
                    </div>
                    <span className="strength-text" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="security-form-group security-form-group-full">
                <label htmlFor="sec-confirm-password" className="security-label">
                  Confirm New Password <span className="text-danger">*</span>
                </label>
                <div className="security-input-wrap">
                  <input
                    id="sec-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="security-input"
                    required
                  />
                  <button
                    type="button"
                    className="security-eye-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <LuEyeOff /> : <LuEye />}
                  </button>
                </div>
              </div>
            </div>

            <div className="security-form-actions">
              <button
                type="submit"
                className="security-submit-btn"
                disabled={loading}
              >
                <LuKeyRound className="btn-icon" aria-hidden="true" />
                <span>{loading ? "Updating..." : "Change Password"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 3 — DANGER ZONE */}
        <section className="security-card danger-zone-card" aria-labelledby="danger-heading">
          <div className="security-card-header">
            <h3 id="danger-heading" className="danger-zone-title">
              Danger Zone
            </h3>
            <p className="danger-zone-desc">
              Deleting your account is permanent and cannot be undone. All your profile data, addresses, and order history will be removed.
            </p>
          </div>

          <div className="danger-zone-body">
            <div className="danger-zone-controls">
              <div className="danger-input-wrap">
                <input
                  id="delete-confirm-input"
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="danger-input"
                  aria-label="Type DELETE to confirm account deletion"
                />
              </div>

              <button
                type="button"
                className="danger-delete-btn"
                onClick={handleOpenDeleteModal}
                disabled={deleteConfirmText !== "DELETE"}
              >
                <LuTrash2 className="btn-icon" aria-hidden="true" />
                <span>Permanently Delete Account</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="address-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="address-modal-container address-delete-modal-container">
            <div className="address-delete-icon-wrap" aria-hidden="true">
              <LuTriangleAlert />
            </div>
            <h3 id="delete-account-title" className="address-delete-title">
              Delete your account?
            </h3>
            <p className="address-delete-desc">
              This action cannot be undone. All your saved profile details, order records, and addresses will be permanently deleted.
            </p>
            <div className="address-delete-actions">
              <button
                type="button"
                className="profile-cancel-btn"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="address-delete-confirm-btn"
                onClick={handleConfirmDelete}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
