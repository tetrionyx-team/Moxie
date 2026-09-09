import React, { useEffect, useState } from "react";
import { LuSparkles } from "react-icons/lu";
import "./LoginSuccessPopup.css";

/**
 * LoginSuccessPopup
 * Global MOXIE luxury login success popup that renders reliably upon successful authentication.
 * Remains visible for 1800ms with smooth animations.
 */
export default function LoginSuccessPopup({ user, onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  const firstName = user?.name ? String(user.name).trim().split(/\s+/)[0] : "";
  const isNew = Boolean(user?.isNewAccount || user?.isNewUser);
  const title = isNew ? "Welcome to Moxie" : "Welcome Back";
  const greetingText = isNew
    ? firstName
      ? `Welcome to Moxie, ${firstName}! Your account has been created successfully.`
      : "Your account has been created successfully."
    : firstName
    ? `Good to have you back, ${firstName}.`
    : "Good to have you back.";

  useEffect(() => {
    // Start fade-out at 1500ms
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1500);

    // Complete & unmount at 1800ms
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`moxie-login-success-overlay ${isFadingOut ? "fade-out" : ""}`}
      role="alertdialog"
      aria-live="assertive"
      aria-label={isNew ? "Registration successful" : "Login successful"}
    >
      <div className={`moxie-login-success-card ${isFadingOut ? "card-fade-out" : ""}`}>
        {/* MOXIE Signature Gold Brand Title */}
        <div className="moxie-success-brand">MOXIE</div>

        {/* Animated Gold Icon with Ambient Glow */}
        <div className="moxie-success-icon-wrap">
          <LuSparkles className="moxie-success-sparkle-icon" aria-hidden="true" />
        </div>

        {/* Title: Welcome to Moxie or Welcome Back */}
        <h2 className="moxie-success-title">{title}</h2>

        {/* Personalized Message */}
        <p className="moxie-success-message">{greetingText}</p>

        {/* Progress Bar (1.8s) */}
        <div className="moxie-success-progress-track">
          <div className="moxie-success-progress-fill" />
        </div>
      </div>
    </div>
  );
}
