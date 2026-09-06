import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import ProductShelf from "../../components/Product/ProductShelf";
import "./Deals.css";

function Countdown() {
  const [s, setS] = useState(31338);

  useEffect(() => {
    const t = setInterval(() => setS((v) => (v > 0 ? v - 1 : 86400)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="countdown">
      <span>{String(Math.floor(s / 3600)).padStart(2, "0")}</span>:
      <span>{String(Math.floor((s % 3600) / 60)).padStart(2, "0")}</span>:
      <span>{String(s % 60).padStart(2, "0")}</span>
    </div>
  );
}

export default function Deals() {
  const { products, loading, currentOffer } = useData();

  if (loading) {
    return (
      <div className="container text-center py-5" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading deals...</span>
        </div>
      </div>
    );
  }

  const deals = products
    .filter((p) => p.discount >= 28)
    .sort((a, b) => b.discount - a.discount);

  return (
    <main>
      <section className="deals-hero">
        <div className="page-shell">
          <div>
            <span className="eyebrow">{currentOffer ? "Active Promotion" : "Moxie mega sale"}</span>
            <h1>
              Big style.
              <br />
              <em>Smaller prices.</em>
            </h1>
            <p>{currentOffer?.offer_text || "Limited-time savings on everyday essentials."}</p>
            <Link to="/products">Shop every deal →</Link>
          </div>
          <div className="flash-card">
            <span>FLASH DEAL ENDS IN</span>
            <Countdown />
            <strong>{currentOffer ? (currentOffer.discount_type === 'Percentage' ? 'Special % Savings' : 'Special Discounts') : 'Up to 37% off'}</strong>
          </div>
        </div>
      </section>
      <ProductShelf
        eyebrow="Hurry, selling fast"
        title="Flash Deals"
        products={deals}
      />
    </main>
  );
}
