import React, { useState, useEffect, useRef } from "react";
import { LuChevronDown, LuCheck } from "react-icons/lu";
import "./AccountMobileNav.css";

const NAV_OPTIONS = [
  { key: "profile", label: "My Profile" },
  { key: "orders", label: "My Orders" },
  { key: "wishlist", label: "My Wishlist" },
  { key: "addresses", label: "My Address" },
  { key: "security", label: "Account & Security" },
];

export default function AccountMobileNav({ activeTab = "orders", onSelectTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize sub-tabs like order-details or track-order to 'orders'
  const normalizedKey =
    activeTab === "order-details" || activeTab === "track-order"
      ? "orders"
      : activeTab || "orders";

  const currentOption =
    NAV_OPTIONS.find((opt) => opt.key === normalizedKey) || NAV_OPTIONS[1];

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick, { passive: true });
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (key) => {
    setIsOpen(false);
    if (onSelectTab) {
      onSelectTab(key);
    }
  };

  return (
    <div className="account-mobile-nav-wrapper" ref={dropdownRef}>
      {/* Closed State Trigger Button */}
      <button
        type="button"
        className={`account-mobile-nav-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Account Page Section"
      >
        <span className="trigger-label">{currentOption.label}</span>
        <LuChevronDown
          className={`trigger-chevron ${isOpen ? "chevron-rotated" : ""}`}
          size={18}
          aria-hidden="true"
        />
      </button>

      {/* Custom Dropdown Panel */}
      {isOpen && (
        <div
          className="account-mobile-nav-panel"
          role="listbox"
          aria-label="Account navigation options"
        >
          {NAV_OPTIONS.map((opt) => {
            const isSelected = opt.key === normalizedKey;
            return (
              <button
                key={opt.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`nav-panel-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(opt.key)}
              >
                <span className="item-text">{opt.label}</span>
                {isSelected && (
                  <LuCheck size={16} className="item-check-icon" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
