import React, { createContext, useContext, useState, useEffect } from "react";
import { getCategories } from "../api/categoryApi";
import { API_URL, BACKEND_URL } from "../config";

import watchImg from "../assets/images/watch1.png";
import shoeImg from "../assets/images/shoe.svg";
import capImg from "../assets/images/cap.png";
import budsImg from "../assets/images/Buds.png";
import defaultImg from "../assets/images/offer.png";

const DataContext = createContext(null);
const API_ORIGIN = BACKEND_URL;

const getImageUrl = (image) => {
  if (!image) return null;
  try {
    return new URL(image, API_ORIGIN).href;
  } catch {
    return image;
  }
};

const getFallbackImage = (categorySlug) => {
  const slug = String(categorySlug || "").toLowerCase();
  if (slug.includes("watch")) return watchImg;
  if (slug.includes("footwear") || slug.includes("shoe") || slug.includes("slider")) return shoeImg;
  if (slug.includes("cap")) return capImg;
  if (slug.includes("gadget") || slug.includes("bud")) return budsImg;
  return defaultImg;
};

export const DataProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [activeOffers, setActiveOffers] = useState([]);
  const [offerLines, setOfferLines] = useState([]);
  const [storeSettings, setStoreSettings] = useState({
    maintenance_mode: false,
    store_name: "Moxie",
    allow_order_cancellation: true,
    enable_order_tracking: true,
    allow_registration: true,
    allow_guest_browsing: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch public store settings (including maintenance mode)
      try {
        const settingsRes = await fetch(`${API_URL}/public-settings/`);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setStoreSettings(settingsData);
        }
      } catch (settingsErr) {
        console.warn("Could not fetch store settings:", settingsErr);
      }

      // Fetch active offers
      try {
        const offersRes = await fetch(`${API_URL}/offers/current/`);
        if (offersRes.ok) {
          const offersData = await offersRes.json();
          setCurrentOffer(offersData.offer || null);
          setActiveOffers(offersData.active_offers || []);
          setOfferLines(offersData.offers || []);
        }
      } catch (offersErr) {
        console.warn("Could not fetch active offers:", offersErr);
      }

      // Fetch categories from backend API
      const catData = await getCategories();
      setCategories(catData || []);

      // Fetch products from backend API
      const response = await fetch(`${API_URL}/products/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch products: status ${response.status}`);
      }
      const prodData = await response.json();

      // Map API products to frontend shape
      const mappedProducts = (prodData || []).map((p, index) => {
        const backendImages = Array.isArray(p.images) ? p.images : [];
        const primaryImage = backendImages.find((img) => img.is_primary) || backendImages[0];
        const imageUrl = getImageUrl(primaryImage?.image);
        const imageUrls = backendImages
          .map((img) => getImageUrl(img.image))
          .filter(Boolean);

        const fallback = getFallbackImage(p.category_slug);
        const finalImage = imageUrl || fallback;
        const finalImages = imageUrls.length > 0 ? imageUrls : [finalImage];

        const originalPrice = Number(p.price);
        const salePrice = p.discount_price ? Number(p.discount_price) : originalPrice;
        const discount = p.discount_price ? Math.round((1 - (salePrice / originalPrice)) * 100) : 0;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category_slug,
          subcategory: p.subcategory_slug || "",
          price: salePrice,
          oldPrice: p.discount_price ? originalPrice : null,
          discount: discount,
          rating: parseFloat((4.2 + (p.id % 5) * 0.15).toFixed(1)), // simulated rating
          reviewCount: 30 + (p.id % 7) * 28, // simulated reviewCount
          image: finalImage,
          images: finalImages,
          stock: p.stock > 0,
          isNew: index % 4 === 0 || p.id > 20,
          specifications: {
            Brand: "Moxie",
            Category: p.category_name || "Accessories",
            Warranty: "6 months",
            "Country of origin": "India",
            ...(p.category_slug === "footwear" ? { "Sizes": "7, 8, 9, 10, 11, 12" } : {})
          }
        };
      });
      setProducts(mappedProducts);
    } catch (err) {
      console.error("Error loading frontend dynamic data:", err);
      setError(err.message || "Failed to load data from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ products, categories, currentOffer, activeOffers, offerLines, storeSettings, setStoreSettings, loading, error, refreshData: loadData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);

