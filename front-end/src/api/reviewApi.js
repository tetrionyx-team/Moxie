import { apiFetch } from "./apiConfig";

/**
 * Fetch approved reviews for a specific product from Django backend
 */
export async function getProductReviews(productId) {
  if (!productId) return [];
  try {
    const response = await apiFetch(`/reviews/?product_id=${productId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : (data.results || []);
  } catch (err) {
    console.warn("Could not fetch product reviews:", err);
    return [];
  }
}

/**
 * Submit a customer review for an eligible delivered product
 */
export async function submitProductReview(reviewData) {
  const isFormData = typeof FormData !== "undefined" && reviewData instanceof FormData;
  const options = {
    method: "POST",
    body: isFormData ? reviewData : JSON.stringify(reviewData),
  };
  if (!isFormData) {
    options.headers = { "Content-Type": "application/json" };
  }

  const response = await apiFetch("/reviews/", options);

  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg =
      resData.error ||
      resData.detail ||
      (typeof resData === "object" ? Object.values(resData).flat().join(" ") : "Failed to submit review");
    throw new Error(errMsg);
  }

  return resData;
}
