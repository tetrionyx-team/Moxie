import React, { createContext, useState, useEffect, useContext, useMemo } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const getItemKey = (product) => {
    if (!product) return "";
    return (
      product.cartItemId ||
      (product.selectedVariant?.id
        ? `${product.id}-v${product.selectedVariant.id}`
        : product.selectedColor || product.selectedSize
        ? `${product.id}-${product.selectedColor || ""}-${product.selectedSize || ""}`
        : String(product.id))
    );
  };

  const addToCart = (product, quantity = 1, autoOpen = true) => {
    if (!product || !product.id) return;

    const itemKey = getItemKey(product);
    const addQty = Math.max(1, Number(quantity) || 1);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => getItemKey(item) === itemKey);

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: (Number(item.quantity) || 0) + addQty }
            : item
        );
      }

      return [...prev, { ...product, cartItemId: itemKey, quantity: addQty }];
    });

    if (autoOpen) {
      setIsCartOpen(true);
    }
  };

  const removeFromCart = (cartItemIdOrId) => {
    if (!cartItemIdOrId) return;
    setCart((prev) =>
      prev.filter((item) => {
        const key = getItemKey(item);
        return key !== cartItemIdOrId && String(item.id) !== String(cartItemIdOrId);
      })
    );
  };

  const updateQuantity = (cartItemIdOrId, quantity) => {
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      removeFromCart(cartItemIdOrId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        const key = getItemKey(item);
        if (key === cartItemIdOrId || String(item.id) === String(cartItemIdOrId)) {
          const maxStock =
            item.selectedVariant?.stock ??
            item.rawStock ??
            item.stock_quantity ??
            (typeof item.stock === "number" ? item.stock : 999);
          const validStock = typeof maxStock === "number" && maxStock > 0 ? maxStock : 999;
          const safeQty = Math.min(numQty, validStock);
          return { ...item, quantity: safeQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Derive total item count (sum of all quantities)
  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Math.max(0, Number(item.quantity || 0)),
      0
    );
  }, [cart]);

  // Derive subtotal (sum of price * quantity)
  const subtotal = useMemo(() => {
    return cart.reduce(
      (acc, item) =>
        acc + (Number(item.price) || 0) * Math.max(0, Number(item.quantity || 0)),
      0
    );
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount: cartItemCount,
        cartItemCount,
        count: cartItemCount,
        subtotal,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
