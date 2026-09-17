import React from "react";
import { useData } from "../../context/DataContext";
import "./Offer.css";

function Offer() {
  const { currentOffer, activeOffers, offerLines } = useData();

  // Extract all active offer items (text + emoji) available from the backend
  let availableOffers = [];

  if (activeOffers && activeOffers.length > 0) {
    availableOffers = activeOffers
      .map((o) => ({
        text: (o.offer_text || o.title || o.name || "").trim(),
        emoji: (o.emoji || "").trim(),
      }))
      .filter((item) => Boolean(item.text));
  } else if (currentOffer) {
    const text = (currentOffer.offer_text || currentOffer.title || currentOffer.name || "").trim();
    if (text) {
      availableOffers = [{ text, emoji: (currentOffer.emoji || "").trim() }];
    }
  } else if (offerLines && offerLines.length > 0) {
    availableOffers = offerLines
      .filter((t) => Boolean(t && t.trim()))
      .map((t) => ({ text: t.trim(), emoji: "" }));
  }

  // If no available offers exist in the backend, do not display the strip
  if (availableOffers.length === 0) {
    return null;
  }

  // Ensure sufficient item repetitions for a smooth continuous infinite scrolling track
  let displayList = availableOffers;
  while (displayList.length < 4) {
    displayList = [...displayList, ...availableOffers];
  }

  return (
    <div className="benefits-marquee" aria-label="Available Offers">
      <div className="benefits-track">
        {/* Original items */}
        {displayList.map((item, index) => (
          <span key={`orig-${index}`} className="benefit-item">
            {item.emoji ? (
              <span className="benefit-icon" role="img" aria-label="Offer Emoji">
                {item.emoji}
              </span>
            ) : null}
            <span className="benefit-text">{item.text}</span>
          </span>
        ))}
        {/* Duplicated for seamless infinite loop */}
        {displayList.map((item, index) => (
          <span key={`dup-${index}`} className="benefit-item" aria-hidden="true">
            {item.emoji ? (
              <span className="benefit-icon" role="img" aria-label="Offer Emoji">
                {item.emoji}
              </span>
            ) : null}
            <span className="benefit-text">{item.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default Offer;

