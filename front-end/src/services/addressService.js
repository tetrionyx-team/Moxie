import { apiFetch } from "../api/apiConfig";

/**
 * Normalizes an address object from the API to guarantee consistent UI properties
 */
export const normalizeAddress = (addr) => {
  if (!addr) return null;
  const fullName = addr.full_name || addr.name || "";
  const phone = addr.mobile_number || addr.phone || "";
  const flat = addr.address_line_1 || addr.flat || "";
  const area = addr.address_line_2 || addr.area || "";
  const landmark = addr.landmark || "";
  const city = addr.city || "";
  const district = addr.district || addr.city || "";
  const state = addr.state || "";
  const pincode = String(addr.pincode || "").trim();
  const type = addr.address_type || addr.type || "Home";
  const isDefault = Boolean(addr.is_default !== undefined ? addr.is_default : addr.isDefault);

  return {
    id: addr.id,
    full_name: fullName,
    name: fullName,
    mobile_number: phone,
    phone: phone,
    alternate_mobile_number: addr.alternate_mobile_number || "",
    address_line_1: flat,
    flat: flat,
    address_line_2: area,
    area: area,
    landmark: landmark,
    city: city,
    district: district,
    state: state,
    pincode: pincode,
    address_type: type,
    type: type,
    is_default: isDefault,
    isDefault: isDefault,
    created_at: addr.created_at,
    updated_at: addr.updated_at,
  };
};

export const addressService = {
  /**
   * Fetch current customer's saved addresses from the Django database
   */
  fetchAddresses: async (email) => {
    try {
      const queryParam = email ? `?email=${encodeURIComponent(email)}` : "";
      const res = await apiFetch(`/addresses/${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map(normalizeAddress);
        }
      }
    } catch (err) {
      console.error("Error fetching addresses from backend:", err);
    }
    return [];
  },

  /**
   * Create a new delivery address in the Django database
   */
  addAddress: async (email, addressData) => {
    const payload = {
      full_name: addressData.full_name || addressData.name,
      mobile_number: addressData.mobile_number || addressData.phone,
      alternate_mobile_number: addressData.alternate_mobile_number || "",
      address_line_1: addressData.address_line_1 || addressData.flat,
      address_line_2: addressData.address_line_2 || addressData.area || "",
      landmark: addressData.landmark || "",
      city: addressData.city,
      district: addressData.district || addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      address_type: addressData.address_type || addressData.type || "Home",
      is_default: Boolean(addressData.is_default !== undefined ? addressData.is_default : addressData.isDefault),
      email: email || undefined,
    };

    const res = await apiFetch("/addresses/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      let errMsg = errData.error || errData.detail;
      if (!errMsg && typeof errData === "object" && Object.keys(errData).length > 0) {
        const firstKey = Object.keys(errData)[0];
        const firstVal = errData[firstKey];
        errMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      throw new Error(errMsg || "Failed to save address.");
    }

    const created = await res.json();
    return normalizeAddress(created);
  },

  /**
   * Update an existing address in the Django database
   */
  updateAddress: async (email, addressId, addressData) => {
    if (!addressId) return null;

    const payload = {
      full_name: addressData.full_name || addressData.name,
      mobile_number: addressData.mobile_number || addressData.phone,
      alternate_mobile_number: addressData.alternate_mobile_number || "",
      address_line_1: addressData.address_line_1 || addressData.flat,
      address_line_2: addressData.address_line_2 || addressData.area || "",
      landmark: addressData.landmark || "",
      city: addressData.city,
      district: addressData.district || addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      address_type: addressData.address_type || addressData.type || "Home",
      is_default: Boolean(addressData.is_default !== undefined ? addressData.is_default : addressData.isDefault),
      email: email || undefined,
    };

    const res = await apiFetch(`/addresses/${addressId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      let errMsg = errData.error || errData.detail;
      if (!errMsg && typeof errData === "object" && Object.keys(errData).length > 0) {
        const firstKey = Object.keys(errData)[0];
        const firstVal = errData[firstKey];
        errMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      throw new Error(errMsg || "Failed to update address.");
    }

    const updated = await res.json();
    return normalizeAddress(updated);
  },

  /**
   * Delete an address from the Django database
   */
  deleteAddress: async (email, addressId) => {
    if (!addressId) return false;

    const queryParam = email ? `?email=${encodeURIComponent(email)}` : "";
    const res = await apiFetch(`/addresses/${addressId}/${queryParam}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.detail || "Failed to delete address.");
    }

    return true;
  },

  /**
   * Set an address as the default address
   */
  setDefaultAddress: async (email, addressId) => {
    if (!addressId) return false;

    const queryParam = email ? `?email=${encodeURIComponent(email)}` : "";
    const res = await apiFetch(`/addresses/${addressId}/set-default/${queryParam}`, {
      method: "POST",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.detail || "Failed to set default address.");
    }

    const updated = await res.json();
    return normalizeAddress(updated);
  },
};
