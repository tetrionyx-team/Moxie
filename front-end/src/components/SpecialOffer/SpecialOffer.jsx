import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { BsLightningChargeFill, BsMusicNoteBeamed } from "react-icons/bs";
import "./SpecialOffer.css";

import watchImg from "../../assets/images/offer_watch_stage.jpg";
import shoeImg from "../../assets/images/shoe.svg";
import budsImg from "../../assets/images/Buds.png";

function SpecialOffer() {
  return (
    <section className="offers-section" aria-label="Special Offers">
      <div className="offers-container">
        <div className="offers-grid">
          {/* Card 1: Watch (Deal of the Day) */}
          <div className="offer-card offer-card-watch">
            <div className="offer-info">
              <span className="offer-tag tag-gold">DEAL OF THE DAY</span>
              <h3 className="offer-title">
                Up to <span className="offer-highlight-gold">40% OFF</span>
              </h3>
              <p className="offer-subtitle">On Selected Items</p>
              <Link to="/products?category=watches" className="offer-btn btn-dark">
                Shop Now <FiArrowRight className="offer-btn-arrow" />
              </Link>
            </div>

            <div className="offer-stage-container stage-gold">
              <div className="offer-floating-badge badge-gold" aria-hidden="true">
                <BsLightningChargeFill />
              </div>
              <img
                src={watchImg}
                alt="Watches Deal of the Day"
                className="offer-img watch-stage-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* Card 2: Shoe (New Collection - Style Game) */}
          <div className="offer-card offer-card-shoe">
            <div className="offer-info">
              <span className="offer-tag tag-blue">NEW COLLECTION</span>
              <h3 className="offer-title">
                Setup Up Your <span className="offer-highlight-blue">Style Game</span>
              </h3>
              <div className="offer-title-underline-blue" aria-hidden="true" />
              <Link to="/products?category=shoes" className="offer-btn btn-blue">
                Explore Shop <FiArrowRight className="offer-btn-arrow" />
              </Link>
            </div>

            <div className="offer-stage-container stage-blue">
              <div className="offer-podium-3d podium-blue-3d">
                <div className="podium-top" />
                <div className="podium-base" />
              </div>
              <img
                src={shoeImg}
                alt="Shoes New Collection"
                className="offer-img shoe-stage-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* Card 3: Air Buds (Premium Quality - Built For Comfort) */}
          <div className="offer-card offer-card-buds">
            <div className="offer-info">
              <span className="offer-tag tag-purple">PREMIUM QUALITY</span>
              <h3 className="offer-title">
                Built For <span className="offer-highlight-purple">Comfort,</span>
              </h3>
              <p className="offer-subtitle">Designed for You</p>
              <Link to="/products?category=air-buds" className="offer-btn btn-purple">
                Explore Shop <FiArrowRight className="offer-btn-arrow" />
              </Link>
            </div>

            <div className="offer-stage-container stage-purple">
              <div className="offer-floating-badge badge-purple" aria-hidden="true">
                <BsMusicNoteBeamed />
              </div>
              <div className="offer-floating-sparkle" aria-hidden="true">✦</div>
              <div className="offer-podium-3d podium-purple-3d">
                <div className="podium-top" />
                <div className="podium-base" />
              </div>
              <img
                src={budsImg}
                alt="Air Buds Premium Quality"
                className="offer-img buds-stage-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SpecialOffer;
