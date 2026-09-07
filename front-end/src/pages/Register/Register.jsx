import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  SquareLock02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { useToast } from "../../context/ToastContext";
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
  const { register, googleLogin } = useAuth();
  const { openLogin } = useModal();
  const showToast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  /* ── Handle Google ID token response ── */
  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        setGlobalError("Google sign-up was cancelled or failed.");
        return;
      }
      setIsGoogleLoading(true);
      setGlobalError("");
      try {
        await googleLogin(response.credential);
        showToast("✓ Signed in with Google! Welcome to Moxie.");
        navigate("/");
      } catch (err) {
        setGlobalError(err.message || "Google sign-up failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [googleLogin, navigate, showToast]
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

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
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
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      showToast("✓ Account created! Welcome to Moxie.");
      navigate("/");
    } catch (err) {
      setGlobalError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = () => {
    setGlobalError("");
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch {
        setGlobalError("Google Sign-In is loading. Please try again.");
      }
    } else {
      setGlobalError("Google Identity Services is loading. Please try again.");
    }
  };

  const handleSignInClick = () => {
    openLogin();
    navigate("/");
  };

  return (
    <main className="register-section">
      <div className="register-card">
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
          {/* Name */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
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

          {/* Divider */}
          <div className="register-divider">
            <span>OR CONTINUE WITH</span>
          </div>

          {/* Google Button */}
          <button
            id="register-google-btn"
            type="button"
            className="register-google-btn"
            onClick={handleGoogleClick}
            disabled={isSubmitting || isGoogleLoading}
          >
            <GoogleIcon />
            <span>Sign up with Google</span>
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

