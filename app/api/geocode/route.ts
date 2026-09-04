import { NextRequest, NextResponse } from "next/server";

// Geocoding using OpenStreetMap Nominatim (free, no API key required)
// For production, consider using Google Maps Geocoding API or Mapbox for better results
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Query must be at least 3 characters", results: [] },
        { status: 400 }
      );
    }

    // Use OpenStreetMap Nominatim API (free, rate-limited)
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout (increased from 5s)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Portfolio Network App", // Required by Nominatim
            "Accept": "application/json",
          },
          signal: controller.signal,
          // Add cache control to help with rate limiting
          cache: "no-cache",
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: "Geocoding service unavailable", results: [] },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Transform Nominatim response to our format
      const results = (Array.isArray(data) ? data : []).map((item: any) => {
        const country = item.address?.country || "";
        const countryCode = (item.address?.country_code || "").toUpperCase();
        
        // For UK addresses, prioritize county over state/region
        // Nominatim often puts "England", "Scotland", etc. in state field
        // but we want the actual county (e.g., "Essex", "Kent") in state_region
        let stateRegion = "";
        
        // For UK (United Kingdom or GB), always prioritize county field
        if (country === "United Kingdom" || country === "UK" || countryCode === "GB") {
          // UK country-level divisions that should NOT be used as county
          const countryLevelDivisions = ["England", "Scotland", "Wales", "Northern Ireland", "Great Britain"];
          
          // Always try county field first for UK
          const county = item.address?.county || "";
          const state = item.address?.state || "";
          const stateDistrict = item.address?.state_district || "";
          const region = item.address?.region || "";
          
          // If we have a county field and it's not a country-level division, use it
          if (county && !countryLevelDivisions.includes(county)) {
            stateRegion = county;
          } 
          // Otherwise, try state_district if it exists and isn't a country-level division
          else if (stateDistrict && !countryLevelDivisions.includes(stateDistrict)) {
            stateRegion = stateDistrict;
          }
          // If state is a country-level division, don't use it - try to find county elsewhere
          else if (countryLevelDivisions.includes(state)) {
            // Don't use state if it's England/Scotland/etc - leave empty or use region if available
            stateRegion = region && !countryLevelDivisions.includes(region) ? region : "";
          }
          // If state is not a country-level division, use it
          else if (state && !countryLevelDivisions.includes(state)) {
            stateRegion = state;
          }
          // Fallback to region if it's not a country-level division
          else if (region && !countryLevelDivisions.includes(region)) {
            stateRegion = region;
          }
        } else {
          // For non-UK, prefer county field if available, otherwise state/region
          stateRegion = item.address?.county || item.address?.state || item.address?.region || "";
        }
        
        return {
          display_name: item.display_name || "",
          city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || "",
          state_region: stateRegion,
          country: country,
          country_code: item.address?.country_code || "",
          latitude: item.lat ? parseFloat(item.lat) : null,
          longitude: item.lon ? parseFloat(item.lon) : null,
          type: item.type || "",
          importance: item.importance || 0,
        };
      });

      return NextResponse.json({ results });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timeout", results: [] },
          { status: 408 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to geocode location", results: [] },
      { status: 500 }
    );
  }
}

