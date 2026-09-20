import { BACKEND_URL } from "../config";
import watchImg from "../assets/images/watch1.png";
import shoeImg from "../assets/images/shoe.svg";
import capImg from "../assets/images/cap.png";
import budsImg from "../assets/images/Buds.png";
import defaultImg from "../assets/images/offer.png";

/**
 * Resolves appropriate static fallback image based on product name or category
 */
export const getFallbackImage = (name, category) => {
  const str = (String(name || "") + " " + String(category || "")).toLowerCase();
  if (str.includes("watch")) return watchImg;
  if (
    str.includes("footwear") ||
    str.includes("shoe") ||
    str.includes("slider") ||
    str.includes("slipper")
  ) {
    return shoeImg;
  }
  if (str.includes("cap")) return capImg;
  if (
    str.includes("gadget") ||
    str.includes("bud") ||
    str.includes("earphone") ||
    str.includes("speaker") ||
    str.includes("audio")
  ) {
    return budsImg;
  }
  return defaultImg;
};

/**
 * Resolves an order item image into a full, production/environment-aware URL with robust fallback
 */
export const getOrderImageUrl = (image, name, category) => {
  const fallback = getFallbackImage(name, category);
  if (!image) return fallback;

  let cleanImage = typeof image === "object" && image !== null ? (image.image || image.url || "") : image;
  if (typeof cleanImage !== "string" || !cleanImage.trim()) return fallback;

  cleanImage = cleanImage.trim();

  cleanImage = cleanImage
    .replace(/^http:\/\/127\.0\.0\.1:8000/, BACKEND_URL)
    .replace(/^http:\/\/localhost:8000/, BACKEND_URL)
    .replace(/^http:\/\/localhost(?!:)/, BACKEND_URL);

  if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
    return cleanImage;
  }

  try {
    return new URL(cleanImage, BACKEND_URL).href;
  } catch {
    return cleanImage;
  }
};
