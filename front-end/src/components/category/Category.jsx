import React from "react";
import { Link } from "react-router-dom";
import "./Category.css";

import watchImg from "../../assets/images/watch.svg";
import shoeImg from "../../assets/images/shoe.svg";
import budsImg from "../../assets/images/Buds.png";
import capImg from "../../assets/images/cap.png";

const STATIC_CATEGORIES = [
  {
    id: "watch",
    title: "Watch",
    linkText: "Explore Now",
    route: "/products/watches",
    image: watchImg,
    cardClass: "watch-card",
  },
  {
    id: "shoes",
    title: "Shoes",
    linkText: "Explore Now",
    route: "/products/shoes",
    image: shoeImg,
    cardClass: "shoes-card",
  },
  {
    id: "air-buds",
    title: "Air Buds",
    linkText: "Explore Now",
    route: "/products/air-buds",
    image: budsImg,
    cardClass: "buds-card",
  },
  {
    id: "caps",
    title: "Caps",
    linkText: "Explore Now",
    route: "/products/caps",
    image: capImg,
    cardClass: "cap-card",
  },
];

export default function Category() {
  return (
    <section className="category-section" aria-label="Explore Categories">
      <div className="container">
        <div className="category-grid">
          {STATIC_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              to={category.route}
              className={`category-card ${category.cardClass}`}
              aria-label={`Explore ${category.title}`}
            >
              <div className="category-info">
                <h3 className="category-card-title">{category.title}</h3>
                <span className="explore-btn">
                  {category.linkText}
                </span>
              </div>

              <div className="category-img-container">
                <img
                  src={category.image}
                  alt={category.title}
                  className="category-img"
                  loading="lazy"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}