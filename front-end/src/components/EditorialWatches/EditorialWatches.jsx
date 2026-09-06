import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import "./EditorialWatches.css";

// Premium Watch Images from existing project assets
import casioWorldImg from "../../assets/images/recommended/watch_1_black_gold.jpeg";
import edificeImg from "../../assets/images/recommended/watch_4_silver_blue.jpeg";
import moxieSignatureImg from "../../assets/images/recommended/watch_2_two_tone.jpeg";

const EDITORIAL_COLLECTIONS = [
  {
    id: "world-of-casio",
    title: "THE WORLD OF CASIO",
    linkText: "View Collection",
    path: "/products/watches",
    image: casioWorldImg,
    alt: "The World of Casio Luxury Watch Collection",
  },
  {
    id: "edifice-collection",
    title: "EDIFICE COLLECTION",
    linkText: "View Collection",
    path: "/products/watches",
    image: edificeImg,
    alt: "Edifice Premium Chronograph Collection",
  },
  {
    id: "moxie-signature",
    title: "MOXIE SIGNATURE",
    linkText: "View Collection",
    path: "/products/watches",
    image: moxieSignatureImg,
    alt: "Moxie Signature Luxury Watch Series",
  },
];

export default function EditorialWatches() {
  return (
    <section className="editorial-section" aria-label="Just In Time Moxie Collections">
      <div className="editorial-container">
        {/* Editorial Centered Header with Decorative Subtle Lines */}
        <header className="editorial-header">
          <div className="editorial-header-top">
            <span className="editorial-line" aria-hidden="true" />
            <h2 className="editorial-title-main">JUST IN TIME</h2>
            <span className="editorial-line right" aria-hidden="true" />
          </div>
          <h3 className="editorial-title-moxie">MOXIE</h3>
        </header>

        {/* 3 Editorial Collection Cards */}
        <div className="editorial-grid">
          {EDITORIAL_COLLECTIONS.map((card) => (
            <article key={card.id} className="editorial-card">
              {/* Image Container with subtle hover zoom */}
              <Link
                to={card.path}
                className="editorial-img-container"
                tabIndex={-1}
                aria-hidden="true"
              >
                <img
                  src={card.image}
                  alt={card.alt}
                  className="editorial-img"
                  loading="lazy"
                />
                <div className="editorial-img-overlay" />
              </Link>

              {/* Content Row: Title + View Collection link on Left, Circular Arrow on Right */}
              <div className="editorial-card-content">
                <div className="editorial-card-info">
                  <h4 className="editorial-card-title">{card.title}</h4>
                  <Link
                    to={card.path}
                    className="editorial-card-link"
                  >
                    {card.linkText}
                  </Link>
                </div>

                <Link
                  to={card.path}
                  className="editorial-arrow-btn"
                  aria-label={`View ${card.title} Collection`}
                >
                  <FiArrowRight />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
