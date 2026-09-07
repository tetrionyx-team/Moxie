import React, { useEffect, useState, useRef, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Mail01Icon,
  SquareLock02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
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
 * Premium Customer Authentication Modal for Moxie (Login & Register).
 */
function SignInModal({ onClose, initialMode = "login" }) {
  const { login, register, googleLogin } = useAuth();
  const showToast = useToast();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  /* ── Handle Google ID token response ── */
  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        setGlobalError("Google sign-in was cancelled or failed.");
        return;
      }
      setIsGoogleLoading(true);
      setGlobalError("");
      try {
        await googleLogin(response.credential);
        showToast("✓ Signed in with Google! Welcome to Moxie.");
        onClose();
      } catch (err) {
        setGlobalError(err.message || "Google sign-in failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [googleLogin, onClose, showToast]
  );

  /* ── Initialize Google Identity Services ── */
  useEffect(() => {
    const clientId =
      process.env.REACT_APP_GOOGLE_CLIENT_ID ||
      "916379236525-sample.apps.googleusercontent.com";

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });
      } catch {
        // Safe fallback
      }
    }
  }, [handleGoogleCredentialResponse]);

  /* ── Trigger Google prompt or popup ── */
  const handleGoogleClick = () => {
    setGlobalError("");
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If one-tap is suppressed or not supported, try standard prompt
          }
        });
      } catch {
        setGlobalError("Google Identity Services not ready. Please use email sign-in.");
      }
    } else {
      setGlobalError("Google Identity Services is loading. Please try again in a moment.");
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

    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (mode !== "forgot") {
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
        await login(email.trim(), password);
        showToast("✓ Signed in successfully! Welcome back.");
        onClose();
      } else if (mode === "register") {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        });
        showToast("✓ Account created! Welcome to Moxie.");
        onClose();
      } else if (mode === "forgot") {
        setGlobalSuccess("If an account exists with this email, password reset instructions have been sent.");
      }
    } catch (err) {
      setGlobalError(err.message || "Authentication failed. Please check your credentials.");
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
  };

  return (
    <div
      className="login-overlay auth-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "register" ? "Create Account dialog" : "Sign in dialog"}
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

        {/* Brand Header */}
        <div className="auth-modal-header">
          <div className="auth-brand-title">
            MOXIE
          </div>

          <h2 className="auth-modal-heading">
            {mode === "login" && "Welcome Back"}
            {mode === "register" && "Create Your Account"}
            {mode === "forgot" && "Reset Password"}
          </h2>

          <p className="auth-modal-subtext">
            {mode === "login" && "Sign in to continue to your Moxie account."}
            {mode === "register" && "Join Moxie and start shopping."}
            {mode === "forgot" && "Enter your email to receive password reset instructions."}
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

          {/* Name Field (Register Mode Only) */}
          {mode === "register" && (
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

          {/* Email Address Field */}
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
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                className={`auth-input${errors.email ? " auth-input--error" : ""}`}
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          {/* Password Field (Login & Register Mode) */}
          {mode !== "forgot" && (
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

          {/* Confirm Password Field (Register Mode Only) */}
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
            ) : (
              <span>SEND RESET LINK</span>
            )}
          </button>

          {/* Divider & Google Sign-In */}
          {mode !== "forgot" && (
            <>
              <div className="auth-divider">
                <span>OR CONTINUE WITH</span>
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
                  {isGoogleLoading
                    ? "Connecting to Google..."
                    : mode === "login"
                    ? "Sign in with Google"
                    : "Sign up with Google"}
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

            {mode === "forgot" && (
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

