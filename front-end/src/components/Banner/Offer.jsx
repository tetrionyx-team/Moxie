import React from "react";
import { useData } from "../../context/DataContext";
import "./Offer.css";

function Offer() {
  const { currentOffer, activeOffers, offerLines } = useData();

  // Extract all active offer texts available from the backend
  let availableOffers = [];

  if (activeOffers && activeOffers.length > 0) {
    availableOffers = activeOffers
      .map((o) => o.offer_text || o.title || o.name || "")
      .filter((t) => Boolean(t && t.trim()));
  } else if (offerLines && offerLines.length > 0) {
    availableOffers = offerLines.filter((t) => Boolean(t && t.trim()));
  } else if (currentOffer) {
    const text = currentOffer.offer_text || currentOffer.title || currentOffer.name;
    if (text && text.trim()) {
      availableOffers = [text.trim()];
    }
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
        {displayList.map((offerText, index) => (
          <span key={`orig-${index}`} className="benefit-item">
            <span className="benefit-icon" role="img" aria-label="Offer">🎉</span>
            <span>{offerText}</span>
          </span>
        ))}
        {/* Duplicated for seamless infinite loop */}
        {displayList.map((offerText, index) => (
          <span key={`dup-${index}`} className="benefit-item" aria-hidden="true">
            <span className="benefit-icon" role="img" aria-label="Offer">🎉</span>
            <span>{offerText}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default Offer;

