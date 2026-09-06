import React from "react";
import { Link } from "react-router-dom";
import "./SpecialOffer.css";
import watchImg from "../../assets/images/offer_watch.png";
import shoeImg from "../../assets/images/shoe.svg";
import budsImg from "../../assets/images/Buds.png";

function SpecialOffer() {
    return (
        <div className="container offers-section">
            <div className="offers-grid">

                {/* Card 1: Watch */}
                <div className="offer-card">
                    <div className="offer-info">
                        <span className="offer-tag">DEAL OF THE DAY</span>
                        <h3 className="offer-title">Up to 40% OFF</h3>
                        <p className="offer-subtitle">On Selected Items</p>
                        <Link to="/products/watches" className="offer-btn">Shop Now</Link>
                    </div>
                    <div className="offer-img-container">
                        <img src={watchImg} alt="Watches Deal" className="offer-img" />
                    </div>
                </div>

                {/* Card 2: Shoe */}
                <div className="offer-card">
                    <div className="offer-info">
                        <span className="offer-tag">NEW COLLECTION</span>
                        <h3 className="offer-title">Setup Up Your</h3>
                        <p className="offer-subtitle">Style Game</p>
                        <Link to="/products/shoes" className="offer-btn">Explore Shop</Link>
                    </div>
                    <div className="offer-img-container">
                        <img src={shoeImg} alt="Shoes New Collection" className="offer-img shoe-offer-img" />
                    </div>
                </div>

                {/* Card 3: Air Buds */}
                <div className="offer-card">
                    <div className="offer-info">
                        <span className="offer-tag">PREMIUM QUALITY</span>
                        <h3 className="offer-title">Built For Comfort,</h3>
                        <p className="offer-subtitle">Designed for You</p>
                        <Link to="/products/air-buds" className="offer-btn">Explore Shop</Link>
                    </div>
                    <div className="offer-img-container">
                        <img src={budsImg} alt="Air Buds Premium Quality" className="offer-img" />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default SpecialOffer;
