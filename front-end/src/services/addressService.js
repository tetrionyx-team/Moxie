/**
 * Address Service API Client
 * Manages user shipping addresses.
 * Prepared for future integration with Python + Django REST API /api/addresses/.
 */

export const addressService = {
  fetchAddresses: async (email) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!email) return [];

    try {
      const stored = localStorage.getItem(`moxie_addresses_${email}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading addresses:", e);
    }

    return [];
  },

  addAddress: async (email, addressData) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (!email) return null;

    const addresses = await addressService.fetchAddresses(email);
    const newAddress = {
      ...addressData,
      id: String(Date.now()),
      isDefault: addresses.length === 0 ? true : !!addressData.isDefault,
    };

    if (newAddress.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    addresses.push(newAddress);
    localStorage.setItem(`moxie_addresses_${email}`, JSON.stringify(addresses));
    return newAddress;
  },

  updateAddress: async (email, addressId, addressData) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (!email || !addressId) return null;

    const addresses = await addressService.fetchAddresses(email);
    
    if (addressData.isDefault) {
      addresses.forEach((a) => {
        if (a.id !== addressId) a.isDefault = false;
      });
    }

    const updated = addresses.map((a) => {
      if (a.id === addressId) {
        return { ...a, ...addressData };
      }
      return a;
    });

    localStorage.setItem(`moxie_addresses_${email}`, JSON.stringify(updated));
    return updated.find((a) => a.id === addressId);
  },

  deleteAddress: async (email, addressId) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!email || !addressId) return false;

    const addresses = await addressService.fetchAddresses(email);
    const filtered = addresses.filter((a) => a.id !== addressId);
    
    // If we deleted the default address, make another one default
    if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
      filtered[0].isDefault = true;
    }

    localStorage.setItem(`moxie_addresses_${email}`, JSON.stringify(filtered));
    return true;
  },

  setDefaultAddress: async (email, addressId) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!email || !addressId) return false;

    const addresses = await addressService.fetchAddresses(email);
    addresses.forEach((a) => {
      a.isDefault = a.id === addressId;
    });

    localStorage.setItem(`moxie_addresses_${email}`, JSON.stringify(addresses));
    return true;
  }
};
