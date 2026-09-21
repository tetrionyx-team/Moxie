import { NEUTRAL_PLACEHOLDER, resolveMediaUrl } from "./productImage";

/**
 * Returns the neutral placeholder image (never hardcoded demo product images)
 */
export const getFallbackImage = () => {
  return NEUTRAL_PLACEHOLDER;
};

/**
 * Resolves an order item image into a full, production/environment-aware URL with neutral fallback
 */
export const getOrderImageUrl = (image) => {
  if (!image) return NEUTRAL_PLACEHOLDER;

  const resolved = resolveMediaUrl(image);
  return resolved || NEUTRAL_PLACEHOLDER;
};

