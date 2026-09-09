import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  SquareLock02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { LuPhone, LuCheck } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import "./Register.css";

const GoogleIcon = () => (
  <svg className="google-icon-svg" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.39 7.35 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.29 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export default function Register() {
  const { register, signInWithGoogle } = useAuth();
  const { openLogin } = useModal();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  /* ── Handle Shared Firebase Google Sign-In / Sign-Up ── */
  const handleGoogleClick = async () => {
    setGlobalError("");
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Google registration creates customer directly & triggers Welcome to Moxie popup
      setTimeout(() => {
        navigate("/");
      }, 1800);
    } catch (err) {
      setGlobalError(err.message || "Google sign-in was cancelled or failed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const update = (field) => (e) => {
    let value = e.target.value;
    if (field === "mobile") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    const cleanMobile = form.mobile.trim().replace(/\D/g, "");
    if (!form.mobile.trim()) {
      errs.mobile = "Mobile number is required.";
    } else if (cleanMobile.length !== 10 || !/^\d{10}$/.test(form.mobile.trim())) {
      errs.mobile = "Please enter a valid 10-digit mobile number.";
    }

    if (!form.password) {
      errs.password = "Password is required.";
    } else if (form.password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = "Confirm password is required.";
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      // Show animated success popup ("Welcome to Moxie: Your account has been created successfully.")
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        openLogin(); // First create, then login!
        navigate("/");
      }, 1900);
    } catch (err) {
      setGlobalError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInClick = () => {
    openLogin();
    navigate("/");
  };

  return (
    <main className="register-section">
      <div className="register-card">
        {/* Animated MOXIE Gold Success Popup */}
        {showSuccessPopup && (
          <div className="register-success-popup-overlay">
            <div className="register-success-popup-card">
              <div className="register-success-popup-brand">MOXIE</div>
              <div className="register-success-popup-icon-wrap">
                <LuCheck className="register-success-popup-check-icon" />
              </div>
              <h3 className="register-success-popup-title">Welcome to Moxie</h3>
              <p className="register-success-popup-desc">
                Your account has been created successfully.
              </p>
              <p className="register-success-popup-sub">
                Your style journey starts here.
              </p>
              <div className="register-success-popup-loader">
                <span className="register-gold-progress-bar"></span>
              </div>
            </div>
          </div>
        )}

        <div className="register-header">
          <div className="register-brand-title">MOXIE</div>
          <h1 className="register-title">Create Your Account</h1>
          <p className="register-subtext">Join Moxie and start shopping.</p>
        </div>

        {globalError && (
          <div className="register-alert register-alert--error" role="alert">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="register-form">
          {/* 1. Name */}
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              Name<span className="form-required">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <HugeiconsIcon icon={UserIcon} size={19} strokeWidth={1.8} />
              </span>
              <input
                id="reg-name"
                type="text"
                name="name"
                placeholder="Enter your name"
                value={form.name}
                onChange={update("name")}
                className={`register-input${errors.name ? " register-input--error" : ""}`}
                autoComplete="name"
                disabled={isSubmitting}
              />
            </div>
            {errors.name && <p className="register-field-error">{errors.name}</p>}
          </div>

          {/* 2. Email */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address<span className="form-required">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <HugeiconsIcon icon={Mail01Icon} size={19} strokeWidth={1.8} />
              </span>
              <input
                id="reg-email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={update("email")}
                className={`register-input${errors.email ? " register-input--error" : ""}`}
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="register-field-error">{errors.email}</p>}
          </div>

          {/* 3. Mobile Number */}
          <div className="form-group">
            <label htmlFor="reg-mobile" className="form-label">
              Mobile Number<span className="form-required">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <LuPhone size={19} strokeWidth={1.8} />
              </span>
              <input
                id="reg-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                name="mobile"
                placeholder="Enter your 10-digit mobile number"
                value={form.mobile}
                onChange={update("mobile")}
                className={`register-input${errors.mobile ? " register-input--error" : ""}`}
                autoComplete="tel"
                disabled={isSubmitting}
              />
            </div>
            {errors.mobile && <p className="register-field-error">{errors.mobile}</p>}
          </div>

          {/* 4. Password */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              Password<span className="form-required">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} />
              </span>
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={form.password}
                onChange={update("password")}
                className={`register-input${errors.password ? " register-input--error" : ""}`}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="register-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <HugeiconsIcon
                  icon={showPassword ? ViewIcon : ViewOffSlashIcon}
                  size={19}
                  strokeWidth={1.8}
                />
              </button>
            </div>
            {errors.password && <p className="register-field-error">{errors.password}</p>}
          </div>

          {/* 5. Confirm Password */}
          <div className="form-group">
            <label htmlFor="reg-confirm-password" className="form-label">
              Confirm Password<span className="form-required">*</span>
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">
                <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} />
              </span>
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                className={`register-input${errors.confirmPassword ? " register-input--error" : ""}`}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="register-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <HugeiconsIcon
                  icon={showConfirmPassword ? ViewIcon : ViewOffSlashIcon}
                  size={19}
                  strokeWidth={1.8}
                />
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="register-field-error">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Create Account Button */}
          <button
            id="register-submit-btn"
            type="submit"
            className="register-submit-btn"
            disabled={isSubmitting || isGoogleLoading}
          >
            {isSubmitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>

          {/* Divider & Google Button */}
          <div className="register-divider">
            <span>OR</span>
          </div>

          <button
            id="register-google-btn"
            type="button"
            className="register-google-btn"
            onClick={handleGoogleClick}
            disabled={isSubmitting || isGoogleLoading}
          >
            <GoogleIcon />
            <span>
              {isGoogleLoading ? "Connecting..." : "Continue with Google"}
            </span>
          </button>

          {/* Switch to Sign In */}
          <div className="register-switch-footer">
            <span>
              Already have an account?
              <button
                type="button"
                className="register-switch-btn"
                onClick={handleSignInClick}
              >
                Sign In
              </button>
            </span>
          </div>
        </form>
      </div>
    </main>
  );
}

