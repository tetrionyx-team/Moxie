/**
 * Moxie Inventory & Sale State Resolver
 *
 * EXACT PRIORITY RULE:
 * 1. UNAVAILABLE: active / is_active === false (Manually disabled by Admin)
 * 2. UNSTOCK: active === true && stock <= 0 (Automatically produced when stock reaches 0)
 * 3. IN STOCK: active === true && stock > 0 (Purchasable)
 */

export function getSaleState(product, variant = null) {
  if (!product && !variant) return "unavailable";

  // Target variant if explicitly supplied or attached to product
  const targetVar = variant || product?.selectedVariant || null;

  // Priority 1: Check Product-level manual disable
  if (product) {
    const prodActive = product.is_active !== undefined
      ? product.is_active
      : (product.isActive !== undefined ? product.isActive : (product.active !== undefined ? product.active : true));

    if (prodActive === false || prodActive === "false" || prodActive === 0) {
      return "unavailable";
    }
  }

  // If a specific variant is selected/provided:
  if (targetVar) {
    const varActive = targetVar.is_active !== undefined
      ? targetVar.is_active
      : (targetVar.isActive !== undefined ? targetVar.isActive : (targetVar.active !== undefined ? targetVar.active : true));

    if (varActive === false || varActive === "false" || varActive === 0) {
      return "unavailable";
    }

    const varStock = Number(targetVar.stock !== undefined ? targetVar.stock : 0);
    if (varStock <= 0) {
      return "unstock";
    }

    return "in_stock";
  }

  // If product has a list of variants but no specific variant is selected (e.g. ProductCard):
  const variantsList = Array.isArray(product?.variants) && product.variants.length > 0
    ? product.variants
    : (Array.isArray(product?.colors) && product.colors.length > 0 ? product.colors : null);

  if (variantsList && variantsList.length > 0) {
    // Check if at least one variant is active
    const activeVariants = variantsList.filter((v) => {
      const vAct = v.is_active !== undefined ? v.is_active : (v.isActive !== undefined ? v.isActive : (v.active !== undefined ? v.active : true));
      return vAct !== false && vAct !== "false" && vAct !== 0;
    });

    if (activeVariants.length === 0) {
      return "unavailable";
    }

    // Check total stock of active variants
    const totalActiveStock = activeVariants.reduce((sum, v) => sum + Number(v.stock !== undefined ? v.stock : 0), 0);
    if (totalActiveStock <= 0) {
      return "unstock";
    }

    return "in_stock";
  }

  // Product without variants
  const stockVal = Number(
    product?.rawStock !== undefined
      ? product.rawStock
      : (typeof product?.stock === "number" ? product.stock : (product?.stock ? 1 : 0))
  );

  if (stockVal <= 0) {
    return "unstock";
  }

  return "in_stock";
}

export function getSaleStateLabel(state) {
  switch (state) {
    case "unavailable":
      return "Unavailable";
    case "unstock":
      return "Unstock";
    case "in_stock":
    default:
      return "In Stock";
  }
}
