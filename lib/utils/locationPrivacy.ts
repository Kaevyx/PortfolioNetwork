/**
 * Formats location based on privacy settings
 * @param city - User's city
 * @param stateRegion - User's state/region/county
 * @param country - User's country
 * @param locationPrivacy - Privacy setting: 'exact' | 'city' | 'city_country' | 'county' | 'county_country' | 'city_county' | 'country' | 'hidden'
 * @returns Formatted location string or null if hidden
 */
export function formatLocationByPrivacy(
  city: string | null | undefined,
  stateRegion: string | null | undefined,
  country: string | null | undefined,
  locationPrivacy: string | null | undefined
): string | null {
  // If privacy is not set, default to showing city and county for safety
  const privacy = locationPrivacy || "city_county";

  switch (privacy) {
    case "exact":
      // Show Town/City + County + Country
      const parts = [city, stateRegion, country].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;

    case "city_county":
      // Show Town/City + County (no Country)
      const cityCountyParts = [city, stateRegion].filter(Boolean);
      return cityCountyParts.length > 0 ? cityCountyParts.join(", ") : null;

    case "city_country":
      // Show Town/City + Country (no County)
      const cityCountryParts = [city, country].filter(Boolean);
      return cityCountryParts.length > 0 ? cityCountryParts.join(", ") : null;

    case "county_country":
      // Show County + Country (no Town/City)
      const countyCountryParts = [stateRegion, country].filter(Boolean);
      return countyCountryParts.length > 0 ? countyCountryParts.join(", ") : null;

    case "city":
      // Show Town/City only (no County, no Country)
      return city || null;

    case "county":
      // Show County only (no Town/City, no Country)
      return stateRegion || null;

    case "country":
      // Show Country only
      return country || null;

    case "hidden":
      // Hide location completely
      return null;

    default:
      // Default to city and county for safety
      const defaultParts = [city, stateRegion].filter(Boolean);
      return defaultParts.length > 0 ? defaultParts.join(", ") : null;
  }
}

/**
 * Checks if location should be shown at all
 * @param locationPrivacy - Privacy setting
 * @returns true if location should be shown
 */
export function shouldShowLocation(locationPrivacy: string | null | undefined): boolean {
  return locationPrivacy !== "hidden";
}

