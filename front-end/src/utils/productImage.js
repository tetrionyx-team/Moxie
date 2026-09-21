import { BACKEND_URL } from "../config";
import neutralPlaceholder from "../assets/images/placeholder-product.svg";

export const NEUTRAL_PLACEHOLDER = neutralPlaceholder;

/**
 * Normalizes any relative or environment-specific media URL to a valid absolute URL.
 */
export const resolveMediaUrl = (url) => {
  if (!url) return null;

  let cleanUrl = typeof url === "object" && url !== null ? (url.image || url.url || "") : url;
  if (typeof cleanUrl !== "string" || !cleanUrl.trim()) return null;

  cleanUrl = cleanUrl.trim();

  // If already neutral placeholder SVG or data URI, return directly
  if (cleanUrl.startsWith("data:") || cleanUrl.includes("placeholder-product")) {
    return cleanUrl;
  }

  // Replace localhost references in production environments
  cleanUrl = cleanUrl
    .replace(/^http:\/\/127\.0\.0\.1:8000/, BACKEND_URL)
    .replace(/^http:\/\/localhost:8000/, BACKEND_URL)
    .replace(/^http:\/\/localhost(?!:)/, BACKEND_URL);

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  // Ensure leading slash for relative media paths
  if (!cleanUrl.startsWith("/")) {
    cleanUrl = `/${cleanUrl}`;
  }

  try {
    return new URL(cleanUrl, BACKEND_URL).href;
  } catch {
    return cleanUrl;
  }
};

/**
 * Resolves the real backend product image strictly adhering to the safe priority:
 * 1. product.image / product.primary_image / product.main_image
 * 2. product.images (primary image or first entry)
 * 3. product.variants (primary image or first variant image)
 * 4. Neutral placeholder (if no valid backend image path exists)
 */
export const getProductImageUrl = (product) => {
  if (!product) return NEUTRAL_PLACEHOLDER;

  // 1. Direct product-level image fields
  const directImage = product.image || product.primary_image || product.main_image;
  if (directImage) {
    const resolved = resolveMediaUrl(directImage);
    if (resolved) return resolved;
  }

  // 2. Product images collection
  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find((img) => img?.is_primary) || product.images[0];
    const raw = typeof primary === "string" ? primary : (primary?.image || primary?.url);
    if (raw) {
      const resolved = resolveMediaUrl(raw);
      if (resolved) return resolved;
    }
  }

  // 3. Variant images collection
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    for (const v of product.variants) {
      if (Array.isArray(v.images) && v.images.length > 0) {
        const primary = v.images.find((img) => img?.is_primary) || v.images[0];
        const raw = typeof primary === "string" ? primary : (primary?.image || primary?.url);
        if (raw) {
          const resolved = resolveMediaUrl(raw);
          if (resolved) return resolved;
        }
      }
      if (v.image) {
        const raw = typeof v.image === "string" ? v.image : (v.image?.image || v.image?.url);
        if (raw) {
          const resolved = resolveMediaUrl(raw);
          if (resolved) return resolved;
        }
      }
    }
  }

  return NEUTRAL_PLACEHOLDER;
};
