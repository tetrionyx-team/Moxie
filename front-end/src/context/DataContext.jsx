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
  let cleanImage = image;
  if (typeof cleanImage === "string") {
    cleanImage = cleanImage
      .replace(/^http:\/\/127\.0\.0\.1:8000/, API_ORIGIN)
      .replace(/^http:\/\/localhost:8000/, API_ORIGIN);

    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }
  }
  try {
    return new URL(cleanImage, API_ORIGIN).href;
  } catch {
    return cleanImage;
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
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredServerTime, setFeaturedServerTime] = useState(null);
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

      // Fetch Featured Products (Hot Sale / Trending / Offer)
      try {
        const featRes = await fetch(`${API_URL}/featured-products/`);
        if (featRes.ok) {
          const featData = await featRes.json();
          const featList = Array.isArray(featData) ? featData : (featData?.results || []);
          setFeaturedProducts(featList);
          if (featData?.server_time) {
            setFeaturedServerTime(featData.server_time);
          }
        }
      } catch (featErr) {
        console.warn("Could not fetch featured products:", featErr);
      }

      // Fetch categories from backend API
      const catData = await getCategories();
      const catList = Array.isArray(catData) ? catData : (catData?.results || []);
      setCategories(catList);

      // Fetch products from backend API
      const response = await fetch(`${API_URL}/products/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch products: status ${response.status}`);
      }
      const prodData = await response.json();
      const prodList = Array.isArray(prodData) ? prodData : (prodData?.results || []);

      // Map API products to frontend shape strictly from backend
      const mappedProducts = prodList.map((p, index) => {
        let backendImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
        if (backendImages.length === 0 && Array.isArray(p.variants)) {
          p.variants.forEach((v) => {
            if (Array.isArray(v.images)) {
              backendImages.push(...v.images);
            }
          });
        }
        const primaryImage = backendImages.find((img) => img.is_primary) || backendImages[0];
        const imageUrl = getImageUrl(p.image || primaryImage?.image);
        const imageUrls = backendImages
          .map((img) => getImageUrl(img.image))
          .filter(Boolean);

        const fallback = getFallbackImage(p.category_slug);
        const finalImage = imageUrl || fallback;
        const finalImages = imageUrls.length > 0 ? imageUrls : [finalImage];

        const rawPPrice = Number(p.price || 0);
        const rawPDisc = p.discount_price !== undefined && p.discount_price !== null && p.discount_price !== "" && Number(p.discount_price) > 0
          ? Number(p.discount_price)
          : null;
        const rawPOrig = p.original_price !== undefined && p.original_price !== null && p.original_price !== "" && Number(p.original_price) > 0
          ? Number(p.original_price)
          : null;

        let sellingPrice = rawPPrice;
        let originalPrice = null;

        if (rawPDisc && rawPDisc > 0 && rawPDisc < rawPPrice) {
          sellingPrice = rawPDisc;
          originalPrice = rawPPrice;
        } else if (rawPOrig && rawPOrig > rawPPrice) {
          sellingPrice = rawPPrice;
          originalPrice = rawPOrig;
        } else if (rawPDisc && rawPDisc > rawPPrice) {
          sellingPrice = rawPPrice;
          originalPrice = rawPDisc;
        }

        const discountVal = originalPrice;

        const variants = (p.variants || []).map((v) => {
          const varImages = Array.isArray(v.images)
            ? v.images.map((img) => getImageUrl(img.image)).filter(Boolean)
            : [];
          const vPrice = Number(v.price || rawPPrice);
          const vDisc = v.discount_price !== undefined && v.discount_price !== null && v.discount_price !== "" && Number(v.discount_price) > 0
            ? Number(v.discount_price)
            : null;

          let vSelling = vPrice;
          let vOrig = null;

          if (vDisc && vDisc > 0 && vDisc < vPrice) {
            vSelling = vDisc;
            vOrig = vPrice;
          } else if (vDisc && vDisc > vPrice) {
            vSelling = vPrice;
            vOrig = vDisc;
          } else if (originalPrice) {
            vSelling = sellingPrice;
            vOrig = originalPrice;
          }

          return {
            ...v,
            images: varImages,
            stock: Number(v.stock || 0),
            price: vSelling,
            original_price: vOrig,
            discount_price: vDisc,
            sizes: Array.isArray(v.sizes)
              ? v.sizes
              : typeof v.sizes === "string"
              ? v.sizes.split(",").map((s) => s.trim()).filter(Boolean)
              : [],
          };
        });

        const colors = Array.from(new Set(variants.map((v) => v.color_name).filter(Boolean)));
        const colorCodes = variants.reduce((acc, v) => {
          if (v.color_name && v.color_code) {
            acc[v.color_name] = v.color_code;
          }
          return acc;
        }, {});

        const sizes = Array.from(
          new Set(
            variants.flatMap((v) => v.sizes).filter(Boolean)
          )
        );

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category_slug || "",
          category_name: p.category_name || (p.category ? (typeof p.category === "object" ? p.category.name : p.category) : ""),
          category_slug: p.category_slug || (p.category ? (typeof p.category === "object" ? p.category.slug : p.category) : ""),
          subcategory: p.subcategory_slug || "",
          subcategory_name: p.subcategory_name || (p.subcategory ? (typeof p.subcategory === "object" ? p.subcategory.name : p.subcategory) : ""),
          subcategory_slug: p.subcategory_slug || (p.subcategory ? (typeof p.subcategory === "object" ? p.subcategory.slug : p.subcategory) : ""),
          price: sellingPrice,
          original_price: originalPrice,
          discount_price: originalPrice,
          oldPrice: originalPrice,
          discount: discountVal,
          shipping_charge: Number(p.shipping_charge || 0),
          rating: p.rating !== undefined && p.rating !== null ? Number(p.rating) : null,
          average_rating: p.average_rating !== undefined && p.average_rating !== null ? Number(p.average_rating) : null,
          reviewCount: Number(p.review_count || 0),
          image: finalImage,
          images: finalImages,
          stock: p.stock > 0,
          rawStock: Number(p.stock || 0),
          is_active: p.is_active !== false,
          variants: variants,
          colors: colors,
          colorCodes: colorCodes,
          sizes: sizes,
          isNew: index % 4 === 0 || p.id > 20,
          specifications: {
            Brand: "Moxie",
            Category: p.category_name || "Accessories",
            Warranty: "6 months",
            "Country of origin": "India",
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
    <DataContext.Provider value={{ products, categories, featuredProducts, featuredServerTime, currentOffer, activeOffers, offerLines, storeSettings, setStoreSettings, loading, error, refreshData: loadData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);

