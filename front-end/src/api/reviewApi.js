import { API_BASE_URL } from "./apiConfig";

/**
 * Fetch approved reviews for a specific product from Django backend
 */
export async function getProductReviews(productId) {
  if (!productId) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/reviews/?product_id=${productId}`);
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
  const response = await fetch(`${API_BASE_URL}/reviews/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(reviewData),
  });

  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = resData.error || resData.detail || (typeof resData === "object" ? Object.values(resData).flat().join(" ") : "Failed to submit review");
    throw new Error(errMsg);
  }

  return resData;
}
