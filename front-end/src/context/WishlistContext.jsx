import React, { createContext, useState, useEffect } from "react";
import { useData } from "./DataContext";

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { products = [] } = useData() || {};

  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem("wishlist");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => {
        if (typeof item === "object" && item !== null && item.id != null) {
          return item;
        }
        return { id: item };
      });
    } catch {
      return [];
    }
  });

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
    } catch (err) {
      console.error("Failed to save wishlist to localStorage:", err);
    }
  }, [wishlist]);

  // Enrich items with full DataContext product details if available
  useEffect(() => {
    if (!products || products.length === 0) return;
    setWishlist((prevWishlist) => {
      let changed = false;
      const updated = prevWishlist.map((item) => {
        const fullProd = products.find((p) => String(p.id) === String(item.id));
        if (fullProd && (!item.name || !item.image || !item.price)) {
          changed = true;
          return { ...fullProd, ...item };
        }
        return item;
      });
      return changed ? updated : prevWishlist;
    });
  }, [products]);

  const isInWishlist = (productId) => {
    if (productId == null) return false;
    const targetId = typeof productId === "object" ? productId.id : productId;
    return wishlist.some((item) => String(item.id) === String(targetId));
  };

  const addToWishlist = (product) => {
    if (!product) return;
    const targetId = typeof product === "object" ? product.id : product;
    if (targetId == null) return;

    setWishlist((prev) => {
      if (prev.some((item) => String(item.id) === String(targetId))) {
        return prev;
      }
      let fullProduct = typeof product === "object" ? product : null;
      if (!fullProduct || !fullProduct.name) {
        const found = products.find((p) => String(p.id) === String(targetId));
        fullProduct = found || { id: targetId };
      }
      return [...prev, fullProduct];
    });
  };

  const removeFromWishlist = (productId) => {
    if (productId == null) return;
    const targetId = typeof productId === "object" ? productId.id : productId;
    setWishlist((prev) => prev.filter((item) => String(item.id) !== String(targetId)));
  };

  const toggleWishlist = (product) => {
    if (!product) return;
    const targetId = typeof product === "object" ? product.id : product;
    if (targetId == null) return;

    if (isInWishlist(targetId)) {
      removeFromWishlist(targetId);
    } else {
      addToWishlist(product);
    }
  };

  const wishlistCount = wishlist.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
