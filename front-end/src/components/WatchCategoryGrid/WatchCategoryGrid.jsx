import React from "react";
import { Link } from "react-router-dom";
import "./WatchCategoryGrid.css";

import luxuryImg from "../../assets/images/collections/luxury.jpg";
import automaticImg from "../../assets/images/collections/automatic.jpg";
import chronographImg from "../../assets/images/collections/chronograph.jpg";
import vintageImg from "../../assets/images/collections/vintage.jpg";
import womenImg from "../../assets/images/collections/women.jpg";
import comboImg from "../../assets/images/collections/combo.jpg";

export const WATCH_COLLECTIONS = [
  {
    id: "luxury",
    name: "Luxury",
    bgColor: "#E6F5EE",
    image: luxuryImg,
    route: "/products?category=watches&subcategory=luxury",
  },
  {
    id: "automatic",
    name: "Automatic",
    bgColor: "#FDECEF",
    image: automaticImg,
    route: "/products?category=watches&subcategory=automatic",
  },
  {
    id: "chronograph",
    name: "Chronograph",
    bgColor: "#FEF4DB",
    image: chronographImg,
    route: "/products?category=watches&subcategory=chronograph",
  },
  {
    id: "vintage",
    name: "Vintage",
    bgColor: "#E3F2FD",
    image: vintageImg,
    route: "/products?category=watches&subcategory=vintage",
  },
  {
    id: "women",
    name: "Women",
    bgColor: "#F5EDFD",
    image: womenImg,
    route: "/products?category=watches&subcategory=women",
  },
  {
    id: "combo",
    name: "Combo",
    bgColor: "#E6F8F8",
    image: comboImg,
    route: "/products?category=watches&subcategory=combo",
  },
];

export default function WatchCategoryGrid() {
  return (
    <section className="watch-cat-section" aria-label="Shop by Watch Category">
      <div className="watch-cat-container">
        {/* Section Title & Subtitle */}
        <div className="watch-cat-header">
          <h2 className="watch-cat-title">
            SHOP BY <span className="watch-cat-gradient-text">CATEGORY</span>
          </h2>
          <p className="watch-cat-subtitle">
            Explore timepieces by collection and find your perfect style
          </p>
        </div>

        {/* Categories Grid (6 Cards with Animated Rotating Glowing Border on Hover) */}
        <div className="watch-cat-grid">
          {WATCH_COLLECTIONS.map((col) => {
            return (
              <Link
                key={col.id}
                to={col.route}
                className="watch-cat-card"
                aria-label={`Shop ${col.name} Watches`}
              >
                {/* Inner Card wrapper for crisp rotating border reveal */}
                <div className="watch-cat-card-inner">
                  {/* Upper Image Box (Fitted edge-to-edge in container) */}
                  <div
                    className="watch-cat-thumb-box"
                    style={{ backgroundColor: col.bgColor }}
                  >
                    {/* Fitted Watch Image */}
                    <img
                      src={col.image}
                      alt={`${col.name} Watch Collection`}
                      className="watch-cat-img"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  {/* Bottom Row: Centered Name */}
                  <div className="watch-cat-info-row">
                    <h3 className="watch-cat-name">{col.name}</h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

