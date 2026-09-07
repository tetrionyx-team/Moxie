import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { WHATSAPP_NUMBER } from "../../config";
import "./WhatsAppButton.css";

function WhatsAppButton() {
  const envNumber = process.env.REACT_APP_WHATSAPP_NUMBER || process.env.VITE_WHATSAPP_NUMBER || WHATSAPP_NUMBER || "916379236525";
  const cleanNumber = (envNumber || "").toString().replace(/[^0-9]/g, "") || "916379236525";
  const whatsappUrl = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-button"
      aria-label="Chat with Moxie on WhatsApp"
    >
      <span className="whatsapp-icon" aria-hidden="true">
        <FaWhatsapp />
      </span>
      <span className="whatsapp-tooltip" role="tooltip">
        Chat with us on WhatsApp
      </span>
    </a>
  );
}

export default WhatsAppButton;

