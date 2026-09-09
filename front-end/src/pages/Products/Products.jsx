import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiChevronRight, FiFilter, FiX, FiCheck, FiTrash2, FiShoppingBag, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useData } from "../../context/DataContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import { getSaleState } from "../../utils/inventory";
import "./Products.css";

import watchImg from "../../assets/images/watch1.png";
import shoeImg from "../../assets/images/shoe.svg";
import capImg from "../../assets/images/cap.png";
import budsImg from "../../assets/images/Buds.png";
import defaultImg from "../../assets/images/offer.png";

const ITEMS_PER_PAGE = 9;

const ALIAS_MAP = {
  watches: { categorySlug: "watches", keywords: ["watch", "watches", "chronograph", "analog", "digital", "smartwatch", "wrist-watch", "wristwatch"], title: "Watches" },
  watch: { categorySlug: "watches", keywords: ["watch", "watches", "chronograph", "analog", "digital", "smartwatch", "wrist-watch", "wristwatch"], title: "Watches" },
  shoes: { categorySlug: "footwear", keywords: ["shoe", "shoes", "sneaker", "sneakers", "footwear", "boot", "boots"], title: "Shoes" },
  shoe: { categorySlug: "footwear", keywords: ["shoe", "shoes", "sneaker", "sneakers", "footwear", "boot", "boots"], title: "Shoes" },
  footwear: { categorySlug: "footwear", keywords: ["footwear", "shoe", "shoes", "slider", "sliders", "slipper", "sneaker"], title: "Footwear" },
  sliders: { categorySlug: "footwear", keywords: ["slider", "sliders", "slipper", "slippers", "slide", "slides", "flip-flop", "sandal"], title: "Sliders" },
  slippers: { categorySlug: "footwear", keywords: ["slider", "sliders", "slipper", "slippers", "slide", "slides", "flip-flop"], title: "Slippers" },
  "air-buds": { categorySlug: "gadgets", keywords: ["airpod", "airpods", "bud", "buds", "earbud", "earbuds", "earphone", "headphone", "audio", "air-bud"], title: "Air Buds" },
  airbuds: { categorySlug: "gadgets", keywords: ["airpod", "airpods", "bud", "buds", "earbud", "earbuds", "earphone", "headphone", "audio", "air-bud"], title: "Air Buds" },
  gadgets: { categorySlug: "gadgets", keywords: ["gadget", "gadgets", "bud", "buds", "tech", "audio", "airpod"], title: "Gadgets" },
  caps: { categorySlug: "fashion-bags", keywords: ["cap", "caps", "hat", "hats", "beanie"], title: "Caps" },
  clothing: { categorySlug: "clothing", keywords: ["t-shirt", "shirt", "hoodie", "hoodies", "streetwear", "essentials", "sweatshirt"], title: "Clothing" },
  accessories: { categorySlug: "fashion-bags", keywords: ["accessory", "accessories", "bag", "bags", "cap", "caps", "belt", "wallet", "sunglass", "sunglasses"], title: "Accessories" },
  "fashion-bags": { categorySlug: "fashion-bags", keywords: ["fashion", "bag", "bags", "cap", "caps", "accessories"], title: "Fashion & Bags" },
  "style-essentials": { categorySlug: "style-essentials", keywords: ["clothing", "apparel", "shirt", "t-shirt", "tshirt", "oversized", "hoodie", "hoodies", "sweatshirt", "sweatshirts", "footwear", "shoe", "shoes", "sneaker", "sneakers", "slipper", "slippers", "slide", "slides", "slider", "sliders", "sandal", "sandals"], title: "Style Essentials" },
  deals: { categorySlug: "deals", keywords: [], title: "Hot Deals" },
};

const COLOR_MAP = {
  black: "#18181b",
  white: "#f4f4f5",
  silver: "#cbd5e1",
  grey: "#64748b",
  gray: "#64748b",
  red: "#ef4444",
  blue: "#3b82f6",
  navy: "#1e3a8a",
  brown: "#78350f",
  gold: "#eab308",
  green: "#10b981",
  yellow: "#f59e0b",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#8b5cf6",
  multicolor: "linear-gradient(135deg, #ef4444, #3b82f6, #10b981)",
  multicolour: "linear-gradient(135deg, #ef4444, #3b82f6, #10b981)",
};

const getFallbackImage = (categorySlug) => {
  const slug = String(categorySlug || "").toLowerCase();
  if (slug.includes("watch")) return watchImg;
  if (slug.includes("footwear") || slug.includes("shoe") || slug.includes("slider") || slug.includes("slipper")) return shoeImg;
  if (slug.includes("cap")) return capImg;
  if (slug.includes("gadget") || slug.includes("bud")) return budsImg;
  return defaultImg;
};

export default function Products() {
  const { category: paramCategory, subcategory: paramSubcategory } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const catalogTopRef = useRef(null);

  const { categories = [], products = [], loading } = useData() || {};
  const { cart = [], addToCart } = useCart() || {};
  const { toggleWishlist, isInWishlist } = useWishlist() || {};
  const toast = useToast();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    category: true,
    subcategory: true,
    color: true,
    size: true,
    price: true,
    availability: true,
  });

  // Extract URL parameters
  const currentCollection = (searchParams.get("collection") || "").toLowerCase();
  const currentCategorySlug = (paramCategory || searchParams.get("category") || (currentCollection === "style-essentials" ? "style-essentials" : "")).toLowerCase();
  const currentSubcategorySlug = (paramSubcategory || searchParams.get("subcategory") || "").toLowerCase();
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "recommended";
  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const currentMinPrice = searchParams.get("min_price") ? Number(searchParams.get("min_price")) : null;
  const currentMaxPrice = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : null;
  const currentAvailability = searchParams.get("availability") || "all";

  const selectedColors = useMemo(() => {
    const raw = searchParams.get("color") || "";
    return raw ? raw.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean) : [];
  }, [searchParams]);

  const selectedSizes = useMemo(() => {
    const raw = searchParams.get("size") || "";
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, [searchParams]);

  const isAllProductsSearch = useMemo(() => {
    const term = (currentSearch || "").trim().toLowerCase();
    return (
      term === "all product" ||
      term === "all products" ||
      term === "products" ||
      term === "product"
    );
  }, [currentSearch]);

  const isAllCategory = useMemo(() => {
    return (
      !currentCategorySlug ||
      currentCategorySlug === "all" ||
      currentCategorySlug === "all-products" ||
      currentCategorySlug === "all-product"
    );
  }, [currentCategorySlug]);

  const alias = ALIAS_MAP[currentCategorySlug];

  // Matched category object from API
  const activeCategoryObj = useMemo(() => {
    if (isAllCategory) return null;
    if (alias) {
      return categories.find((c) => (c.slug || "").toLowerCase() === alias.categorySlug.toLowerCase()) || null;
    }
    if (currentCategorySlug) {
      return categories.find((c) => (c.slug || "").toLowerCase() === currentCategorySlug) || null;
    }
    return null;
  }, [categories, currentCategorySlug, alias, isAllCategory]);

  // Determine dynamic price range across all products
  const { minAvailablePrice, maxAvailablePrice } = useMemo(() => {
    if (!products.length) return { minAvailablePrice: 0, maxAvailablePrice: 10000 };
    const prices = products.map((p) => Number(p.price || 0)).filter((p) => !isNaN(p) && p > 0);
    if (!prices.length) return { minAvailablePrice: 0, maxAvailablePrice: 10000 };
    const minVal = Math.floor(Math.min(...prices) / 100) * 100;
    const maxVal = Math.ceil(Math.max(...prices) / 100) * 100;
    return {
      minAvailablePrice: minVal,
      maxAvailablePrice: maxVal > minVal ? maxVal : minVal + 1000,
    };
  }, [products]);

  // Live state for price slider (immediate client-side filtering)
  const [sliderPrice, setSliderPrice] = useState(() => {
    if (currentMaxPrice !== null && !isNaN(currentMaxPrice)) return currentMaxPrice;
    return 10000;
  });

  // Sync if URL max_price changes externally
  useEffect(() => {
    if (currentMaxPrice !== null && !isNaN(currentMaxPrice)) {
      setSliderPrice(currentMaxPrice);
    } else {
      setSliderPrice(maxAvailablePrice);
    }
  }, [currentMaxPrice, maxAvailablePrice]);

  // Debounced URL sync for max_price to keep URL shareable without lagging drag
  useEffect(() => {
    if (sliderPrice === null || isNaN(sliderPrice) || maxAvailablePrice <= 0) return;
    const timer = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);
      if (sliderPrice < maxAvailablePrice) {
        if (nextParams.get("max_price") !== String(sliderPrice)) {
          nextParams.set("max_price", String(sliderPrice));
          nextParams.delete("page");
          navigate(
            { pathname: location.pathname, search: `?${nextParams.toString()}` },
            { replace: true }
          );
        }
      } else {
        if (nextParams.has("max_price")) {
          nextParams.delete("max_price");
          nextParams.delete("page");
          navigate(
            { pathname: location.pathname, search: nextParams.toString() ? `?${nextParams.toString()}` : "" },
            { replace: true }
          );
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [sliderPrice, maxAvailablePrice, searchParams, navigate, location.pathname]);

  // Collect all available subcategories, colors, and sizes across current active category or products
  const { availableSubcategories, availableColors, availableSizes } = useMemo(() => {
    let baseProducts = products;
    if (activeCategoryObj) {
      baseProducts = baseProducts.filter(
        (p) => (p.category || "").toLowerCase() === (activeCategoryObj.slug || "").toLowerCase()
      );
    } else if (alias) {
      baseProducts = baseProducts.filter(
        (p) => (p.category || "").toLowerCase() === alias.categorySlug.toLowerCase()
      );
    }

    // Subcategories from API category or active products
    const subs = [];
    if (activeCategoryObj && Array.isArray(activeCategoryObj.subcategories)) {
      activeCategoryObj.subcategories.forEach((s) => {
        if (s.is_active !== false) {
          subs.push({
            slug: s.slug || (s.name || "").toLowerCase().replace(/\s+/g, "-"),
            name: s.name,
          });
        }
      });
    } else {
      const subMap = new Map();
      baseProducts.forEach((p) => {
        if (p.subcategory) {
          const sSlug = String(p.subcategory_slug || p.subcategory).toLowerCase();
          const sName = p.subcategory_name || p.subcategory.charAt(0).toUpperCase() + p.subcategory.slice(1);
          if (!subMap.has(sSlug)) {
            subMap.set(sSlug, sName);
          }
        }
      });
      subMap.forEach((name, slug) => subs.push({ slug, name }));
    }

    // Colors from variants
    const colorSet = new Set();
    baseProducts.forEach((p) => {
      (p.colors || []).forEach((c) => colorSet.add(c));
      (p.variants || []).forEach((v) => {
        if (v.color_name) colorSet.add(v.color_name);
      });
    });

    // Sizes from variants / specs
    const sizeSet = new Set();
    baseProducts.forEach((p) => {
      (p.sizes || []).forEach((s) => sizeSet.add(String(s)));
      (p.variants || []).forEach((v) => {
        (v.sizes || []).forEach((s) => sizeSet.add(String(s)));
      });
    });

    return {
      availableSubcategories: subs,
      availableColors: Array.from(colorSet),
      availableSizes: Array.from(sizeSet).sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "FREE SIZE"];
        const idxA = sizeOrder.indexOf(a.toUpperCase());
        const idxB = sizeOrder.indexOf(b.toUpperCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b);
      }),
    };
  }, [products, activeCategoryObj, alias]);

  // Main Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by category / deals
    if (currentCategorySlug === "deals") {
      list = list.filter((p) => Number(p.discount || 0) > 0 || (Boolean(p.oldPrice) && Number(p.oldPrice) > Number(p.price)));
    } else if (isAllCategory) {
      // All products - no category filter applied
    } else if (alias) {
      const targetCat = alias.categorySlug.toLowerCase();
      const keywords = alias.keywords;
      list = list.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const sub = (p.subcategory || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        const catMatches = cat === targetCat || keywords.some((k) => cat.includes(k));
        const keywordMatches = keywords.length === 0 || keywords.some((k) => sub.includes(k) || name.includes(k));
        return catMatches || keywordMatches;
      });
    } else if (currentCategorySlug) {
      list = list.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const catSlug = (p.category_slug || "").toLowerCase();
        return cat === currentCategorySlug || catSlug === currentCategorySlug;
      });
    }

    // Filter by subcategory
    if (currentSubcategorySlug) {
      list = list.filter((p) => {
        const sub = (p.subcategory || "").toLowerCase();
        const subSlug = (p.subcategory_slug || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        return (
          sub === currentSubcategorySlug ||
          subSlug === currentSubcategorySlug ||
          sub.includes(currentSubcategorySlug) ||
          name.includes(currentSubcategorySlug)
        );
      });
    }

    // Search query filter
    if (currentSearch.trim() && !isAllProductsSearch) {
      const term = currentSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const cat = (p.category_name || p.category || "").toLowerCase();
        const sub = (p.subcategory_name || p.subcategory || "").toLowerCase();
        return name.includes(term) || desc.includes(term) || cat.includes(term) || sub.includes(term);
      });
    }

    // Color filter
    if (selectedColors.length > 0) {
      list = list.filter((p) => {
        const pColors = (p.colors || []).map((c) => c.toLowerCase());
        const variantColors = (p.variants || []).map((v) => (v.color_name || "").toLowerCase());
        const allPColors = [...pColors, ...variantColors];
        return selectedColors.some((sc) => allPColors.includes(sc));
      });
    }

    // Size filter
    if (selectedSizes.length > 0) {
      list = list.filter((p) => {
        const pSizes = (p.sizes || []).map((s) => String(s).toUpperCase());
        const variantSizes = (p.variants || []).flatMap((v) => (v.sizes || []).map((s) => String(s).toUpperCase()));
        const allPSizes = [...pSizes, ...variantSizes];
        return selectedSizes.some((ss) => allPSizes.includes(ss.toUpperCase()));
      });
    }

    // Price filter (live sliderPrice or query param)
    if (sliderPrice !== null && !isNaN(sliderPrice) && sliderPrice < maxAvailablePrice) {
      list = list.filter((p) => {
        const rawPrice = Number(p.price || 0);
        return !isNaN(rawPrice) && rawPrice <= sliderPrice;
      });
    } else if (currentMaxPrice !== null && !isNaN(currentMaxPrice)) {
      list = list.filter((p) => {
        const rawPrice = Number(p.price || 0);
        return !isNaN(rawPrice) && rawPrice <= currentMaxPrice;
      });
    }
    if (currentMinPrice !== null && !isNaN(currentMinPrice)) {
      list = list.filter((p) => {
        const rawPrice = Number(p.price || 0);
        return !isNaN(rawPrice) && rawPrice >= currentMinPrice;
      });
    }

    // Availability filter
    if (currentAvailability === "in_stock" || currentAvailability === "stock") {
      list = list.filter((p) => getSaleState(p) === "in_stock");
    } else if (currentAvailability === "out_of_stock" || currentAvailability === "out") {
      list = list.filter((p) => getSaleState(p) === "unstock" || getSaleState(p) === "unavailable");
    }

    // Sort order
    const sorters = {
      recommended: (a, b) => (Number(b.rating || 0) * (b.reviewCount || 1)) - (Number(a.rating || 0) * (a.reviewCount || 1)),
      popular: (a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || (b.rating || 0) - (a.rating || 0),
      newest: (a, b) => Number(b.isNew || false) - Number(a.isNew || false) || (b.id || 0) - (a.id || 0),
      "price-low": (a, b) => Number(a.price || 0) - Number(b.price || 0),
      "price-high": (a, b) => Number(b.price || 0) - Number(a.price || 0),
      rating: (a, b) => Number(b.rating || 0) - Number(a.rating || 0),
    };

    return list.sort(sorters[currentSort] || sorters.recommended);
  }, [
    products,
    currentCategorySlug,
    isAllCategory,
    isAllProductsSearch,
    currentSubcategorySlug,
    currentSearch,
    selectedColors,
    selectedSizes,
    currentMinPrice,
    currentMaxPrice,
    sliderPrice,
    maxAvailablePrice,
    currentAvailability,
    currentSort,
    alias,
  ]);

  // Total pages and Paginated subset
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, validPage]);

  // URL State Mutators
  const updateQueryParams = useCallback(
    (updates, resetPage = true) => {
      const nextParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
          nextParams.delete(key);
        } else if (Array.isArray(val)) {
          nextParams.set(key, val.join(","));
        } else {
          nextParams.set(key, String(val));
        }
      });

      if (resetPage) {
        nextParams.delete("page");
      }

      navigate({ pathname: "/products", search: nextParams.toString() ? `?${nextParams.toString()}` : "" }, { replace: false });
    },
    [searchParams, navigate]
  );

  const handleCategorySelect = useCallback((catSlug) => {
    const nextParams = new URLSearchParams();
    if (catSlug && catSlug !== "all") {
      nextParams.set("category", catSlug);
    }
    if (currentSort && currentSort !== "recommended") {
      nextParams.set("sort", currentSort);
    }
    navigate({ pathname: "/products", search: nextParams.toString() ? `?${nextParams.toString()}` : "" });
  }, [currentSort, navigate]);

  const handleSubcategoryToggle = useCallback((subSlug) => {
    const isCurrent = currentSubcategorySlug === subSlug.toLowerCase();
    updateQueryParams({ subcategory: isCurrent ? null : subSlug });
  }, [currentSubcategorySlug, updateQueryParams]);

  const handleColorToggle = useCallback((color) => {
    const colLower = color.toLowerCase();
    const newColors = selectedColors.includes(colLower)
      ? selectedColors.filter((c) => c !== colLower)
      : [...selectedColors, colLower];
    updateQueryParams({ color: newColors });
  }, [selectedColors, updateQueryParams]);

  const handleSizeToggle = useCallback((size) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    updateQueryParams({ size: newSizes });
  }, [selectedSizes, updateQueryParams]);

  const handleClearPrice = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSliderPrice(maxAvailablePrice);
    updateQueryParams({ max_price: null, min_price: null });
  }, [maxAvailablePrice, updateQueryParams]);

  const handleAvailabilityChange = (val) => {
    updateQueryParams({ availability: val === "all" ? null : val });
  };

  const handleSortChange = (e) => {
    updateQueryParams({ sort: e.target.value }, false);
  };

  const handlePageChange = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages || pageNum === validPage) return;
    const nextParams = new URLSearchParams(searchParams);
    if (pageNum === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(pageNum));
    }
    navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams.toString()}` : "" });

    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleClearAllFilters = () => {
    navigate("/products");
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Determine active chips
  const activeChips = useMemo(() => {
    const chips = [];

    if (currentCategorySlug && !isAllCategory) {
      const label = alias ? alias.title : activeCategoryObj ? activeCategoryObj.name : currentCategorySlug.toUpperCase();
      chips.push({
        id: "category",
        label: label,
        remove: () => handleCategorySelect("all"),
      });
    }

    if (currentSubcategorySlug) {
      const matched = availableSubcategories.find((s) => s.slug === currentSubcategorySlug);
      chips.push({
        id: "subcategory",
        label: matched ? matched.name : currentSubcategorySlug.charAt(0).toUpperCase() + currentSubcategorySlug.slice(1),
        remove: () => updateQueryParams({ subcategory: null }),
      });
    }

    selectedColors.forEach((color) => {
      chips.push({
        id: `color-${color}`,
        label: color.charAt(0).toUpperCase() + color.slice(1),
        remove: () => handleColorToggle(color),
      });
    });

    selectedSizes.forEach((size) => {
      chips.push({
        id: `size-${size}`,
        label: `Size: ${size}`,
        remove: () => handleSizeToggle(size),
      });
    });

    if ((sliderPrice < maxAvailablePrice && !isNaN(sliderPrice)) || currentMaxPrice !== null) {
      const activeMax = sliderPrice < maxAvailablePrice ? sliderPrice : currentMaxPrice;
      if (activeMax !== null && !isNaN(activeMax)) {
        chips.push({
          id: "price",
          label: `Up to ₹${activeMax.toLocaleString("en-IN")}`,
          remove: handleClearPrice,
        });
      }
    }

    if (currentAvailability && currentAvailability !== "all") {
      chips.push({
        id: "availability",
        label: currentAvailability === "in_stock" || currentAvailability === "stock" ? "In Stock" : "Out of Stock",
        remove: () => updateQueryParams({ availability: null }),
      });
    }

    if (currentSearch.trim() && !isAllProductsSearch) {
      chips.push({
        id: "search",
        label: `"${currentSearch}"`,
        remove: () => updateQueryParams({ search: null }),
      });
    }

    return chips;
  }, [
    currentCategorySlug,
    isAllCategory,
    isAllProductsSearch,
    alias,
    activeCategoryObj,
    currentSubcategorySlug,
    availableSubcategories,
    selectedColors,
    selectedSizes,
    currentMaxPrice,
    sliderPrice,
    maxAvailablePrice,
    handleClearPrice,
    currentAvailability,
    currentSearch,
    updateQueryParams,
    handleCategorySelect,
    handleColorToggle,
    handleSizeToggle,
  ]);

  // Page Header Titles & Breadcrumbs
  const headingTitle = useMemo(() => {
    if (currentCategorySlug === "deals") return "Hot Deals";
    if (isAllCategory) return "All Products";
    if (alias) return alias.title;
    if (activeCategoryObj && currentSubcategorySlug) {
      const sub = availableSubcategories.find((s) => s.slug === currentSubcategorySlug);
      return sub ? `${activeCategoryObj.name} - ${sub.name}` : activeCategoryObj.name;
    }
    if (activeCategoryObj) return activeCategoryObj.name;
    if (currentCategorySlug) {
      return currentCategorySlug.charAt(0).toUpperCase() + currentCategorySlug.slice(1).replace(/-/g, " ");
    }
    return "All Products";
  }, [currentCategorySlug, isAllCategory, alias, activeCategoryObj, currentSubcategorySlug, availableSubcategories]);

  // Wishlist & Cart Actions on Product Cards
  const handleWishlistClick = (e, productItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleWishlist) {
      toggleWishlist(productItem);
      const isWished = isInWishlist ? isInWishlist(productItem.id) : false;
      if (toast) {
        toast(isWished ? "Removed from wishlist" : "Saved to wishlist");
      }
    }
  };

  const handleAddToCart = (e, productItem) => {
    e.preventDefault();
    e.stopPropagation();

    const saleState = getSaleState(productItem);
    if (saleState !== "in_stock") {
      if (toast) toast("This item is currently not available for purchase");
      return;
    }

    // If product has multiple sizes or variants requiring choice, navigate to details
    const hasMultipleVariants = Array.isArray(productItem.variants) && productItem.variants.length > 1;
    const hasMultipleSizes = Array.isArray(productItem.sizes) && productItem.sizes.length > 1;

    if (hasMultipleVariants || hasMultipleSizes) {
      navigate(`/product/${productItem.id}`);
      return;
    }

    if (addToCart) {
      addToCart(productItem, 1);
      if (toast) {
        toast(`${productItem.name} added to cart`);
      }
    }
  };

  if (loading) {
    return (
      <div className="catalog-loading-screen">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading products...</span>
        </div>
        <p>Loading Moxie collection...</p>
      </div>
    );
  }

  // Sidebar Filter Component Content
  const renderSidebarContent = (isMobile = false) => (
    <div className="catalog-sidebar-inner">
      {/* Category Section */}
      <div className="filter-group category-group">
        <h3 className="filter-group-title">Category</h3>
        <ul className="category-link-list">
          <li className={isAllCategory ? "active" : ""}>
            <button
              type="button"
              className="category-link-btn"
              onClick={() => {
                handleCategorySelect("all");
                if (isMobile) setMobileDrawerOpen(false);
              }}
            >
              All Products
            </button>
          </li>
          {categories.map((c) => {
            const isCatActive =
              !isAllCategory &&
              (currentCategorySlug === (c.slug || "").toLowerCase() ||
                (alias && alias.categorySlug === (c.slug || "").toLowerCase()));
            return (
              <li key={c.id || c.slug} className={isCatActive ? "active" : ""}>
                <button
                  type="button"
                  className="category-link-btn"
                  onClick={() => {
                    handleCategorySelect(c.slug);
                    if (isMobile) setMobileDrawerOpen(false);
                  }}
                >
                  {c.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-divider" />

      {/* FILTER BY Heading */}
      <div className="filter-by-header">
        <span className="filter-by-label">Filter by :</span>
      </div>

      {/* Subcategory / Type (Tipe) */}
      {availableSubcategories.length > 0 && (
        <div className="filter-group">
          <button
            type="button"
            className="filter-accordion-head"
            onClick={() => toggleSection("subcategory")}
          >
            <span>Type / Subcategory</span>
            {openSections.subcategory ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {openSections.subcategory && (
            <div className="filter-options-list">
              {availableSubcategories.map((sub) => {
                const checked = currentSubcategorySlug === sub.slug.toLowerCase();
                return (
                  <label key={sub.slug} className="filter-checkbox-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleSubcategoryToggle(sub.slug)}
                    />
                    <span className="checkbox-custom">
                      {checked && <FiCheck className="check-icon" />}
                    </span>
                    <span className="filter-option-name">{sub.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Colour Filter */}
      {availableColors.length > 0 && (
        <div className="filter-group">
          <button
            type="button"
            className="filter-accordion-head"
            onClick={() => toggleSection("color")}
          >
            <span>Colour</span>
            {openSections.color ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {openSections.color && (
            <div className="filter-options-list color-options-list">
              {availableColors.map((color) => {
                const colLower = color.toLowerCase();
                const checked = selectedColors.includes(colLower);
                const colorBg = COLOR_MAP[colLower] || colLower;

                return (
                  <label key={color} className="filter-checkbox-item color-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleColorToggle(color)}
                    />
                    <span className="checkbox-custom">
                      {checked && <FiCheck className="check-icon" />}
                    </span>
                    <span
                      className="color-dot"
                      style={{ background: colorBg }}
                      aria-hidden="true"
                    />
                    <span className="filter-option-name">{color}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Size Filter */}
      {availableSizes.length > 0 && (
        <div className="filter-group">
          <button
            type="button"
            className="filter-accordion-head"
            onClick={() => toggleSection("size")}
          >
            <span>Size</span>
            {openSections.size ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {openSections.size && (
            <div className="filter-size-grid">
              {availableSizes.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={`filter-size-pill ${checked ? "selected" : ""}`}
                    onClick={() => handleSizeToggle(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Price Filter */}
      <div className="filter-group">
        <div className="filter-accordion-head-wrapper">
          <button
            type="button"
            className="filter-accordion-head"
            onClick={() => toggleSection("price")}
          >
            <span>Price</span>
            {openSections.price ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          {sliderPrice < maxAvailablePrice && (
            <button
              type="button"
              className="filter-price-clear-badge"
              onClick={handleClearPrice}
              title="Clear Price Filter"
              aria-label="Clear Price Filter"
            >
              Clear
            </button>
          )}
        </div>
        {openSections.price && (
          <div className="filter-price-box">
            <div className="price-display-row">
              <span>₹{minAvailablePrice.toLocaleString("en-IN")}</span>
              <strong className="price-current-value">
                ₹{sliderPrice.toLocaleString("en-IN")}
              </strong>
            </div>
            <input
              type="range"
              min={minAvailablePrice}
              max={maxAvailablePrice}
              step={maxAvailablePrice - minAvailablePrice > 5000 ? "100" : "50"}
              value={sliderPrice}
              onChange={(e) => setSliderPrice(Number(e.target.value))}
              className="price-range-slider"
              aria-label="Filter products by price"
            />
            {sliderPrice < maxAvailablePrice && (
              <div className="filter-price-clear-footer">
                <button
                  type="button"
                  className="filter-price-clear-link"
                  onClick={handleClearPrice}
                >
                  Clear Price
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Filter */}
      <div className="filter-group">
        <button
          type="button"
          className="filter-accordion-head"
          onClick={() => toggleSection("availability")}
        >
          <span>Availability</span>
          {openSections.availability ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {openSections.availability && (
          <div className="filter-options-list">
            {[
              { id: "all", label: "All Items" },
              { id: "in_stock", label: "In Stock" },
              { id: "out_of_stock", label: "Out of Stock" },
            ].map((opt) => (
              <label key={opt.id} className="filter-radio-item">
                <input
                  type="radio"
                  name="availability"
                  checked={currentAvailability === opt.id}
                  onChange={() => handleAvailabilityChange(opt.id)}
                />
                <span className="radio-custom" />
                <span className="filter-option-name">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Reset All Filters Button (when any filter is active) */}
      {activeChips.length > 0 && (
        <div className="sidebar-action-buttons">
          <button
            type="button"
            className="catalog-clear-all-btn"
            onClick={handleClearAllFilters}
          >
            <FiTrash2 />
            <span>Clear All Filters ({activeChips.length})</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="catalog-root-wrapper" ref={catalogTopRef}>
      <div className="catalog-container">
        {/* Main 2-Column Layout */}
        <div className="catalog-main-layout">
          {/* LEFT SIDEBAR (Desktop) */}
          <aside className="catalog-desktop-sidebar" aria-label="Product Filters">
            {renderSidebarContent(false)}
          </aside>

          {/* RIGHT CONTENT AREA */}
          <main className="catalog-content-area">
            {/* Breadcrumbs */}
            <nav className="catalog-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <FiChevronRight className="breadcrumb-sep" />
              <Link to="/products">Products</Link>
              {activeCategoryObj && (
                <>
                  <FiChevronRight className="breadcrumb-sep" />
                  <Link to={`/products?category=${activeCategoryObj.slug}`}>
                    {activeCategoryObj.name}
                  </Link>
                </>
              )}
              {currentSubcategorySlug && (
                <>
                  <FiChevronRight className="breadcrumb-sep" />
                  <span className="breadcrumb-current">
                    {availableSubcategories.find((s) => s.slug === currentSubcategorySlug)?.name ||
                      currentSubcategorySlug}
                  </span>
                </>
              )}
            </nav>

            {/* Header: Title + Mobile Filter Button + Sort Dropdown */}
            <div className="catalog-header-row">
              <div className="catalog-title-col">
                <h1 className="catalog-heading-title">{headingTitle}</h1>
                <span className="catalog-products-count">
                  {totalItems} {totalItems === 1 ? "product" : "products"}
                </span>
              </div>

              <div className="catalog-controls-col">
                {/* Mobile Filter Trigger Button */}
                <button
                  type="button"
                  className="mobile-filter-trigger-btn"
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label="Open filter menu"
                >
                  <FiFilter />
                  <span>Filters {activeChips.length > 0 ? `(${activeChips.length})` : ""}</span>
                </button>

                {/* Sort Dropdown */}
                <div className="catalog-sort-wrapper">
                  <span className="sort-prefix">Sort by :</span>
                  <select
                    value={currentSort}
                    onChange={handleSortChange}
                    className="catalog-sort-select"
                    aria-label="Sort products by"
                  >
                    <option value="recommended">Most Popular</option>
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Customer Rating</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
              <div className="active-chips-bar" aria-label="Active filters">
                <div className="chips-scroll-track">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className="filter-chip"
                      onClick={chip.remove}
                      aria-label={`Remove filter: ${chip.label}`}
                    >
                      <span>{chip.label}</span>
                      <FiX className="chip-close-icon" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="clear-all-chips-btn"
                    onClick={handleClearAllFilters}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Product Grid or Empty State */}
            {paginatedProducts.length > 0 ? (
              <div className="catalog-product-grid">
                {paginatedProducts.map((product) => {
                  const inCart = cart?.some((item) => item.id === product.id);
                  const isWished = isInWishlist ? isInWishlist(product.id) : false;
                  const fallback = getFallbackImage(product.category);
                  const cardImage = product.image || fallback;
                  const saleState = getSaleState(product);
                  const isAvailable = saleState === "in_stock" && product.stock !== false && (product.rawStock === undefined || product.rawStock > 0);

                  const brandLabel =
                    product.brand ||
                    product.specifications?.Brand ||
                    (product.category_name && !product.category_name.toLowerCase().includes("all")
                      ? product.category_name.toUpperCase()
                      : product.category
                      ? String(product.category).toUpperCase()
                      : "");

                  const hasDiscount =
                    Boolean(product.discount) &&
                    Number(product.discount) > 0 &&
                    Boolean(product.oldPrice) &&
                    Number(product.oldPrice) > Number(product.price);

                  const hasOldPrice =
                    Boolean(product.oldPrice) &&
                    Number(product.oldPrice) > Number(product.price);

                  const hasRating = Boolean(product.rating) && Number(product.rating) > 0;
                  const targetLink = `/product/${product.id}`;

                  return (
                    <article key={product.id} className="watch-card-item catalog-watch-card">
                      <Link
                        to={targetLink}
                        className="watch-card-link"
                        aria-label={product.name}
                      >
                        {/* Top Image Media Area */}
                        <div className="watch-card-media product-image-container">
                          {hasDiscount && (
                            <span className="watch-discount-badge">
                              {product.discount}% OFF
                            </span>
                          )}

                          <button
                            type="button"
                            className={`watch-heart-btn ${isWished ? "active" : ""}`}
                            onClick={(e) => handleWishlistClick(e, product)}
                            aria-label={
                              isWished ? "Remove from wishlist" : "Add to wishlist"
                            }
                          >
                            {isWished ? <FaHeart /> : <FaRegHeart />}
                          </button>

                          <img
                            src={cardImage}
                            alt={product.name}
                            className="watch-card-img"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = fallback;
                            }}
                          />
                        </div>

                        {/* Product Card Body */}
                        <div className="watch-card-body">
                          {brandLabel && <span className="watch-brand-name">{brandLabel}</span>}
                          <h3 className="watch-product-title" title={product.name}>
                            {product.name}
                          </h3>

                          {/* Price and Rating Row */}
                          <div className="watch-price-row">
                            <strong className="watch-current-price">
                              ₹{Number(product.price || 0).toLocaleString("en-IN")}
                            </strong>
                            {hasOldPrice && (
                              <span className="watch-old-price">
                                ₹{Number(product.oldPrice || 0).toLocaleString("en-IN")}
                              </span>
                            )}
                            {hasRating && (
                              <div className="watch-rating-row">
                                <span className="watch-star-icon">★</span>
                                <span className="watch-rating-val">{product.rating}</span>
                                {product.reviewCount ? (
                                  <>
                                    <span className="watch-rating-sep">|</span>
                                    <span className="watch-review-count">
                                      {product.reviewCount}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Add to Cart Button */}
                      <div className="watch-btn-wrapper">
                        <button
                          type="button"
                          className={`watch-add-to-cart-btn ${inCart ? "added" : ""}`}
                          onClick={(e) => handleAddToCart(e, product)}
                          aria-label={`Add ${product.name} to cart`}
                          disabled={!isAvailable}
                        >
                          <FiShoppingBag className="watch-cart-icon" />
                          {!isAvailable
                            ? "OUT OF STOCK"
                            : inCart
                            ? "IN CART (+)"
                            : "ADD TO CART"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="catalog-empty-state">
                <div className="empty-icon-circle">
                  <FiFilter />
                </div>
                <h2>No products found</h2>
                <p>We couldn't find any products matching your current filters.</p>
                <button
                  type="button"
                  className="empty-clear-btn"
                  onClick={handleClearAllFilters}
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="catalog-pagination-bar" aria-label="Catalog pages">
                <button
                  type="button"
                  className="pagination-arrow-btn"
                  disabled={validPage <= 1}
                  onClick={() => handlePageChange(validPage - 1)}
                  aria-label="Previous Page"
                >
                  Previous
                </button>

                <div className="pagination-numbers-list">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                    const isEdge = pNum === 1 || pNum === totalPages;
                    const isNear = Math.abs(pNum - validPage) <= 1;

                    if (!isEdge && !isNear) {
                      if (pNum === 2 || pNum === totalPages - 1) {
                        return (
                          <span key={pNum} className="pagination-ellipsis">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pNum}
                        type="button"
                        className={`pagination-number-btn ${pNum === validPage ? "active" : ""}`}
                        onClick={() => handlePageChange(pNum)}
                        aria-current={pNum === validPage ? "page" : undefined}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="pagination-arrow-btn"
                  disabled={validPage >= totalPages}
                  onClick={() => handlePageChange(validPage + 1)}
                  aria-label="Next Page"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div className="mobile-filter-drawer-wrapper">
          <div
            className="mobile-drawer-scrim"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="mobile-filter-drawer-body">
            <div className="mobile-drawer-header">
              <h3>Filters</h3>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close filters"
              >
                <FiX />
              </button>
            </div>
            <div className="mobile-drawer-scrollable">
              {renderSidebarContent(true)}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
