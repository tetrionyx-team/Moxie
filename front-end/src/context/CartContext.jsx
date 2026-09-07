import React, { createContext, useState, useEffect, useContext } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
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

  const addToCart = (product, quantity = 1, autoOpen = true) => {
    if (!product || !product.id) return;

    // Resolve unique key based on variant or selection
    const itemKey = product.selectedVariant?.id
      ? `${product.id}-v${product.selectedVariant.id}`
      : product.selectedColor || product.selectedSize
      ? `${product.id}-${product.selectedColor || ""}-${product.selectedSize || ""}`
      : String(product.id);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        const key = item.cartItemId || (item.selectedVariant?.id
          ? `${item.id}-v${item.selectedVariant.id}`
          : item.selectedColor || item.selectedSize
          ? `${item.id}-${item.selectedColor || ""}-${item.selectedSize || ""}`
          : String(item.id));
        return key === itemKey;
      });

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { ...product, cartItemId: itemKey, quantity }];
    });

    if (autoOpen) {
      setIsCartOpen(true);
    }
  };

  const removeFromCart = (cartItemIdOrId) => {
    setCart((prev) =>
      prev.filter(
        (item) => (item.cartItemId || item.id) !== cartItemIdOrId && item.id !== cartItemIdOrId
      )
    );
  };

  const updateQuantity = (cartItemIdOrId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartItemIdOrId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        const key = item.cartItemId || item.id;
        if (key === cartItemIdOrId || item.id === cartItemIdOrId) {
          const maxStock = item.selectedVariant?.stock ?? item.rawStock ?? item.stock_quantity ?? (typeof item.stock === "number" ? item.stock : 999);
          const validStock = typeof maxStock === "number" && maxStock > 0 ? maxStock : 999;
          const safeQty = Math.min(quantity, validStock);
          return { ...item, quantity: safeQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Resolve total item count (sum of quantities)
  const cartCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  // Resolve subtotal (sum of price * quantity)
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
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


