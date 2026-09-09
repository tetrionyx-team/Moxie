import React, { useEffect, useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Mail01Icon,
  SquareLock02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { LuPhone, LuCheck } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import "./SignInModal.css";

/**
 * Google Icon SVG
 */
const GoogleIcon = () => (
  <svg className="google-icon-svg" viewBox="0 0 24 24">
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

/**
 * SignInModal
 * Premium Customer Authentication Modal for Moxie.
 */
function SignInModal({ onClose, initialMode = "login" }) {
  const {
    login,
    register,
    verifyEmail,
    resetPassword,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Success Popups
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  const googleBtnRef = useRef(null);

  /* ── Lock body scroll cleanly ── */
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  /* ── Close on Escape key ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  /* ── Handle Shared Firebase Google Sign-In ── */
  const handleGoogleClick = async () => {
    setGlobalError("");
    setGlobalSuccess("");
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      // LoginSuccessPopup (Welcome to Moxie / Welcome Back) is handled globally via AuthContext
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setGlobalError(err.message || "Google sign-in was cancelled or failed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /* ── Form Validation ── */
  const validate = () => {
    const errs = {};

    if (mode === "register") {
      if (!name.trim()) {
        errs.name = "Name is required.";
      }
    }

    if (mode === "login" || mode === "register" || mode === "forgot") {
      if (!email.trim()) {
        errs.email = "Email address is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = "Please enter a valid email address.";
      }
    }

    if (mode === "register" || mode === "google-complete") {
      const cleanMobile = mobile.trim().replace(/\D/g, "");
      if (!mobile.trim()) {
        errs.mobile = "Mobile number is required.";
      } else if (cleanMobile.length !== 10 || !/^\d{10}$/.test(mobile.trim())) {
        errs.mobile = "Please enter a valid 10-digit mobile number.";
      }
    }

    if (mode === "login" || mode === "register") {
      if (!password) {
        errs.password = "Password is required.";
      } else if (password.length < 6) {
        errs.password = "Password must be at least 6 characters.";
      }
    }

    if (mode === "register") {
      if (!confirmPassword) {
        errs.confirmPassword = "Confirm password is required.";
      } else if (password !== confirmPassword) {
        errs.confirmPassword = "Passwords do not match.";
      }
    }

    if (mode === "reset") {
      if (!newPassword) {
        errs.newPassword = "New password is required.";
      } else if (newPassword.length < 6) {
        errs.newPassword = "Password must be at least 6 characters.";
      }
      if (!confirmNewPassword) {
        errs.confirmNewPassword = "Confirm password is required.";
      } else if (newPassword !== confirmNewPassword) {
        errs.confirmNewPassword = "Passwords do not match.";
      }
    }

    return errs;
  };

  /* ── Submit Form ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setGlobalSuccess("");

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (mode === "login") {
        const res = await login(email.trim(), password);
        if (res?.success) {
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } else if (mode === "register") {
        await register({
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          password,
          confirmPassword,
        });

        // Show animated success popup
        setShowRegisterSuccess(true);
        setTimeout(() => {
          setShowRegisterSuccess(false);
          setPassword("");
          setConfirmPassword("");
          setMode("login");
        }, 1900);
      } else if (mode === "forgot") {
        await verifyEmail(email.trim());
        setGlobalSuccess("Email verified.");
        setTimeout(() => {
          setGlobalSuccess("");
          setMode("reset");
        }, 600);
      } else if (mode === "reset") {
        await resetPassword(email.trim(), newPassword, confirmNewPassword);
        setShowResetSuccess(true);
        setTimeout(() => {
          setShowResetSuccess(false);
          setNewPassword("");
          setConfirmNewPassword("");
          setPassword("");
          setMode("login");
        }, 1900);
      }
    } catch (err) {
      const errMsg = err.message || "Authentication failed. Please check your credentials.";
      setGlobalError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Switch between modes ── */
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrors({});
    setGlobalError("");
    setGlobalSuccess("");
    if (newMode === "login" || newMode === "register") {
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  return (
    <div
      className="login-overlay auth-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === "register"
          ? "Create Account dialog"
          : mode === "forgot" || mode === "reset"
          ? "Reset Password dialog"
          : "Sign in dialog"
      }
    >
      <div
        className="login-modal auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button
          type="button"
          id="auth-modal-close"
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
        </button>

        {/* ── 1. ACCOUNT CREATED SUCCESS POPUP OVERLAY ── */}
        {showRegisterSuccess && (
          <div className="auth-success-popup-overlay">
            <div className="auth-success-popup-card">
              <div className="auth-success-popup-brand">MOXIE</div>
              <div className="auth-success-popup-icon-wrap">
                <LuCheck className="auth-success-popup-check-icon" />
              </div>
              <h3 className="auth-success-popup-title">Welcome to Moxie</h3>
              <p className="auth-success-popup-desc">
                Your account has been created successfully.
              </p>
              <p className="auth-success-popup-sub">
                Your style journey starts here.
              </p>
              <div className="auth-success-popup-loader">
                <span className="auth-gold-progress-bar"></span>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. PASSWORD CHANGED SUCCESS POPUP OVERLAY ── */}
        {showResetSuccess && (
          <div className="auth-success-popup-overlay">
            <div className="auth-success-popup-card">
              <div className="auth-success-popup-brand">MOXIE</div>
              <div className="auth-success-popup-icon-wrap">
                <LuCheck className="auth-success-popup-check-icon" />
              </div>
              <h3 className="auth-success-popup-title">Password Changed Successfully</h3>
              <p className="auth-success-popup-desc">
                Your password has been updated. Please sign in with your new password.
              </p>
              <div className="auth-success-popup-loader">
                <span className="auth-gold-progress-bar"></span>
              </div>
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="auth-modal-header">
          <div className="auth-brand-title">MOXIE</div>

          <h2 className="auth-modal-heading">
            {mode === "login" && "Welcome Back"}
            {mode === "register" && "Create Your Account"}
            {mode === "google-complete" && "Complete Your Profile"}
            {mode === "forgot" && "Forgot Password"}
            {mode === "reset" && "Set New Password"}
          </h2>

          <p className="auth-modal-subtext">
            {mode === "login" && "Sign in to continue to your Moxie account."}
            {mode === "register" && "Join Moxie and start shopping."}
            {mode === "google-complete" && "Please enter your 10-digit mobile number to complete your registration."}
            {mode === "forgot" && "Enter your registered email address to verify your account."}
            {mode === "reset" && "Create a new password for your account."}
          </p>
        </div>

        {/* Global Error / Success Alert */}
        {globalError && (
          <div className="auth-global-alert auth-global-alert--error" role="alert">
            <span>{globalError}</span>
          </div>
        )}
        {globalSuccess && (
          <div className="auth-global-alert auth-global-alert--success" role="status">
            <span>{globalSuccess}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} noValidate className="auth-form">

          {/* 1. Name Field (Register Mode & Google Complete) */}
          {(mode === "register" || mode === "google-complete") && (
            <div className="auth-field-group">
              <label htmlFor="auth-name" className="auth-label">
                Name<span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <HugeiconsIcon icon={UserIcon} size={19} strokeWidth={1.8} />
                </span>
                <input
                  id="auth-name"
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={`auth-input${errors.name ? " auth-input--error" : ""}`}
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              </div>
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
          )}

          {/* 2. Email Address Field (Login, Register, Forgot, Google Complete) */}
          {mode !== "reset" && (
            <div className="auth-field-group">
              <label htmlFor="auth-email" className="auth-label">
                Email Address<span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <HugeiconsIcon icon={Mail01Icon} size={19} strokeWidth={1.8} />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  name="email"
                  placeholder={
                    mode === "forgot"
                      ? "Enter your registered email"
                      : "Enter your email address"
                  }
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  className={`auth-input${errors.email ? " auth-input--error" : ""}`}
                  autoComplete="email"
                  disabled={isSubmitting || mode === "google-complete"}
                />
              </div>
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
          )}

          {/* 3. Mobile Number Field (Register Mode & Google Complete) */}
          {(mode === "register" || mode === "google-complete") && (
            <div className="auth-field-group">
              <label htmlFor="auth-mobile" className="auth-label">
                Mobile Number<span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <LuPhone size={19} strokeWidth={1.8} />
                </span>
                <input
                  id="auth-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  name="mobile"
                  placeholder="Enter your 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setMobile(val);
                    if (errors.mobile) setErrors({ ...errors, mobile: "" });
                  }}
                  className={`auth-input${errors.mobile ? " auth-input--error" : ""}`}
                  autoComplete="tel"
                  disabled={isSubmitting}
                />
              </div>
              {errors.mobile && <p className="field-error">{errors.mobile}</p>}
            </div>
          )}

          {/* 4. Password Field (Login & Register Mode) */}
          {(mode === "login" || mode === "register") && (
            <div className="auth-field-group">
              <div className="auth-label-row">
                <label htmlFor="auth-password" className="auth-label">
                  Password<span className="auth-required">*</span>
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} />
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={mode === "register" ? "Create a password" : "Enter your password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  className={`auth-input${errors.password ? " auth-input--error" : ""}`}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
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
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>
          )}

          {/* 5. Confirm Password Field (Register Mode Only) */}
          {mode === "register" && (
            <div className="auth-field-group">
              <label htmlFor="auth-confirm-password" className="auth-label">
                Confirm Password<span className="auth-required">*</span>
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} />
                </span>
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                  }}
                  className={`auth-input${errors.confirmPassword ? " auth-input--error" : ""}`}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
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
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* 6. Step 2: New Password & Confirm New Password (Reset Mode) */}
          {mode === "reset" && (
            <>
              <div className="auth-field-group">
                <label htmlFor="auth-new-password" className="auth-label">
                  New Password<span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} />
                  </span>
                  <input
                    id="auth-new-password"
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors({ ...errors, newPassword: "" });
                    }}
                    className={`auth-input${errors.newPassword ? " auth-input--error" : ""}`}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    <HugeiconsIcon
                      icon={showNewPassword ? ViewIcon : ViewOffSlashIcon}
                      size={19}
                      strokeWidth={1.8}
                    />
                  </button>
                </div>
                {errors.newPassword && <p className="field-error">{errors.newPassword}</p>}
              </div>

              <div className="auth-field-group">
                <label htmlFor="auth-confirm-new-password" className="auth-label">
                  Confirm New Password<span className="auth-required">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <HugeiconsIcon icon={SquareLock02Icon} size={19} strokeWidth={1.8} />
                  </span>
                  <input
                    id="auth-confirm-new-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    name="confirmNewPassword"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (errors.confirmNewPassword) setErrors({ ...errors, confirmNewPassword: "" });
                    }}
                    className={`auth-input${errors.confirmNewPassword ? " auth-input--error" : ""}`}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    <HugeiconsIcon
                      icon={showConfirmNewPassword ? ViewIcon : ViewOffSlashIcon}
                      size={19}
                      strokeWidth={1.8}
                    />
                  </button>
                </div>
                {errors.confirmNewPassword && <p className="field-error">{errors.confirmNewPassword}</p>}
              </div>
            </>
          )}

          {/* Primary Action Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting || isGoogleLoading}
          >
            {isSubmitting ? (
              <span>PLEASE WAIT...</span>
            ) : mode === "login" ? (
              <span>SIGN IN</span>
            ) : mode === "register" ? (
              <span>CREATE ACCOUNT</span>
            ) : mode === "google-complete" ? (
              <span>COMPLETE ACCOUNT</span>
            ) : mode === "forgot" ? (
              <span>VERIFY EMAIL</span>
            ) : (
              <span>UPDATE PASSWORD</span>
            )}
          </button>

          {/* Divider & Google Sign-In */}
          {(mode === "login" || mode === "register") && (
            <>
              <div className="auth-divider">
                <span>OR</span>
              </div>

              <button
                ref={googleBtnRef}
                id="auth-google-btn"
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleClick}
                disabled={isSubmitting || isGoogleLoading}
              >
                <GoogleIcon />
                <span>
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </span>
              </button>
            </>
          )}

          {/* Switch Mode Footer */}
          <div className="auth-switch-footer">
            {mode === "login" && (
              <span>
                Don't have an account?
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => switchMode("register")}
                >
                  Create Account
                </button>
              </span>
            )}

            {mode === "register" && (
              <span>
                Already have an account?
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => switchMode("login")}
                >
                  Sign In
                </button>
              </span>
            )}

            {mode === "google-complete" && (
              <span>
                Want to use another account?
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => switchMode("login")}
                >
                  Back to Sign In
                </button>
              </span>
            )}

            {(mode === "forgot" || mode === "reset") && (
              <span>
                Remembered your password?
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => switchMode("login")}
                >
                  Back to Sign In
                </button>
              </span>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}

export default SignInModal;
