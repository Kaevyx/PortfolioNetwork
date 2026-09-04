"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { MapPin, User, Sparkles, Crown, Star, Navigation } from "lucide-react";
import { AvatarImage } from "./AvatarImage";
import { formatLocationByPrivacy, shouldShowLocation } from "@/lib/utils/locationPrivacy";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface NearbyUser {
  clerk_id: string;
  username?: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  state_region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number;
  is_verified: boolean;
  subscription_plan: string;
  featured_priority: number;
  profile_type: string;
  location_privacy?: string | null;
}

interface UsersNearYouProps {
  radiusMiles?: number;
  limit?: number;
  showTitle?: boolean;
}

export function UsersNearYou({ radiusMiles = 31, limit = 6, showTitle = true }: UsersNearYouProps) {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState(radiusMiles);

  // Get user's location from their profile
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadUserLocation = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("latitude, longitude, city, state_region, country, location")
          .eq("clerk_id", user.id)
          .single();

        if (error) {
          console.error("Error loading user location:", error);
          setLocationError("Unable to load your location");
          return;
        }

        if (profile?.latitude && profile?.longitude) {
          setUserLocation({
            lat: profile.latitude,
            lon: profile.longitude,
          });
        } else if (profile?.city || profile?.location) {
          // User has location text but no coordinates - try to geocode it
          const locationText = profile.city || profile.location || "";
          if (locationText) {
            try {
              const response = await fetch(`/api/geocode?q=${encodeURIComponent(locationText)}`);
              if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                  const firstResult = data.results[0];
                  if (firstResult.latitude && firstResult.longitude) {
                    // Update profile with coordinates
                    await supabase
                      .from("profiles")
                      .update({
                        latitude: firstResult.latitude,
                        longitude: firstResult.longitude,
                        city: firstResult.city || profile.city,
                        state_region: firstResult.state_region || profile.state_region,
                        country: firstResult.country || profile.country,
                      })
                      .eq("clerk_id", user.id);
                    
                    setUserLocation({
                      lat: firstResult.latitude,
                      lon: firstResult.longitude,
                    });
                    return;
                  }
                }
              }
            } catch (error) {
              console.error("Error geocoding user location:", error);
            }
          }
          setLocationError("Please update your location in profile settings to enable location-based features. Your location will be automatically geocoded.");
        } else {
          setLocationError("Please set your location in profile settings to see nearby users");
        }
      } catch (error) {
        console.error("Error loading user location:", error);
        setLocationError("Unable to load your location");
      }
    };

    loadUserLocation();
  }, [user, isLoaded, supabase]);

  // Load nearby users
  useEffect(() => {
    if (!userLocation || !user?.id) {
      setLoading(false);
      return;
    }

    const loadNearbyUsers = async () => {
      setLoading(true);
      setLocationError(null); // Clear any previous errors
      try {
        // Log the parameters being sent
        console.log("Calling get_users_near_location with params:", {
          p_user_id: user.id,
          p_latitude: userLocation.lat,
          p_longitude: userLocation.lon,
          p_radius_miles: radius,
          p_limit: limit,
        });
        
        const { data, error } = await supabase.rpc("get_users_near_location", {
          p_user_id: user.id,
          p_latitude: userLocation.lat,
          p_longitude: userLocation.lon,
          p_radius_miles: radius,
          p_limit: limit,
        });
        
        console.log("RPC response:", { data, error, hasData: !!data, dataLength: data?.length });

        if (error) {
          // Log the full error object to see what we're dealing with
          console.error("RPC error:", error);
          console.error("RPC error type:", typeof error);
          console.error("RPC error keys:", Object.keys(error || {}));
          console.error("RPC error stringified:", JSON.stringify(error, null, 2));
          
          // Extract error information safely
          const errorCode = (error as any)?.code;
          const errorMessage = (error as any)?.message || String(error);
          const errorDetails = (error as any)?.details;
          const errorHint = (error as any)?.hint;
          
          console.error("Extracted error details:", {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            hint: errorHint,
          });
          
          // Only show migration error for specific "function doesn't exist" errors
          const functionNotFoundCodes = ['PGRST202', '42883', '42P01'];
          const isFunctionNotFound = 
            (errorCode && functionNotFoundCodes.includes(errorCode)) ||
            (errorMessage && (
              errorMessage.toLowerCase().includes('function') && 
              errorMessage.toLowerCase().includes('does not exist')
            ));
          
          if (isFunctionNotFound) {
            console.warn("Location-based features not available. Please run the database migration:", error);
            setLocationError("Location features are not yet configured. Please run the database migration: supabase/enhanced-location-features.sql");
            setNearbyUsers([]);
            setLoading(false);
            return;
          }
          
          // For other errors (like no users found, permission issues, etc.), don't show error
          // Just log it and show empty results - this is normal if no users are nearby
          console.warn("Could not load nearby users:", errorMessage || "Unknown error");
          setNearbyUsers([]);
          // Don't set locationError for these - they're not blocking issues
          return;
        }
        
        // Success - clear any errors and set data
        setLocationError(null);
        setNearbyUsers(data || []);
        
        // If no users found, that's okay - just log it
        if (!data || data.length === 0) {
          console.log("No nearby users found within radius");
        }
      } catch (error: any) {
        console.error("Error loading nearby users:", error);
        // Only show migration error if it's specifically a function not found error
        const isFunctionNotFound = 
          error?.code === 'PGRST202' || 
          error?.code === '42883' ||
          error?.code === '42P01' ||
          (error?.message && error.message.toLowerCase().includes('function') && error.message.toLowerCase().includes('does not exist'));
        
        if (isFunctionNotFound) {
          setLocationError("Location features are not yet configured. Please run the database migration: supabase/enhanced-location-features.sql");
        } else {
          // Don't set locationError for other errors - they might be temporary
          console.warn("Temporary error loading nearby users:", error?.message || error);
        }
        setNearbyUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadNearbyUsers();
  }, [userLocation, user?.id, radius, limit, supabase]);

  if (!isLoaded) {
    return null;
  }

  if (locationError) {
    const isMigrationError = locationError.includes("database migration") || locationError.includes("not yet configured");
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Users Near You
            </h2>
          </div>
        )}
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{locationError}</p>
          {!isMigrationError && (
            <Link
              href="/profile/edit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Update Location
            </Link>
          )}
          {isMigrationError && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Admin Note:</strong> Run the migration file <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">supabase/enhanced-location-features.sql</code> to enable location features.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Users Near You
            </h2>
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (nearbyUsers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {showTitle && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Users Near You
              </h2>
            </div>
            <select
              value={radius}
              onChange={(e) => {
                const newRadius = Number(e.target.value);
                console.log("Radius changed from", radius, "to", newRadius);
                setRadius(newRadius);
              }}
              className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
              <option value={250}>250 miles</option>
            </select>
          </div>
        )}
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No users found within {radius} miles. Try increasing the radius.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Users Near You
            </h2>
          </div>
          <select
            value={radius}
            onChange={(e) => {
              const newRadius = Number(e.target.value);
              console.log("Radius changed from", radius, "to", newRadius);
              setRadius(newRadius);
            }}
            className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
            <option value={100}>100 miles</option>
            <option value={250}>250 miles</option>
          </select>
        </div>
      )}

      {/* Sort users by featured priority for dashboard view */}
      {nearbyUsers.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {nearbyUsers.length} {nearbyUsers.length === 1 ? 'user' : 'users'} within {radius} mile{radius !== 1 ? 's' : ''}
          </p>
          <Link
            href="/users-near-you"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            View All →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...nearbyUsers]
          .sort((a, b) => {
            // Sort by featured priority first, then distance
            if (b.featured_priority !== a.featured_priority) {
              return (b.featured_priority || 0) - (a.featured_priority || 0);
            }
            return a.distance_miles - b.distance_miles;
          })
          .slice(0, limit)
          .map((nearbyUser) => (
          <Link
            key={nearbyUser.clerk_id}
            href={getProfileUrl({ username: nearbyUser.username, clerk_id: nearbyUser.clerk_id })}
            className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <AvatarImage
                src={nearbyUser.avatar_url}
                alt={nearbyUser.display_name}
                fallbackText={nearbyUser.display_name?.charAt(0).toUpperCase() || "U"}
                className="w-12 h-12 rounded-full flex-shrink-0"
                size="md"
                userId={nearbyUser.clerk_id}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {nearbyUser.display_name}
                  </h3>
                  {nearbyUser.is_verified && (
                    <span className="flex-shrink-0">
                      <Star className="w-4 h-4 text-blue-500 fill-current" />
                    </span>
                  )}
                  {nearbyUser.subscription_plan === "ultimate" && (
                    <span className="flex-shrink-0">
                      <Crown className="w-4 h-4 text-purple-500" />
                    </span>
                  )}
                  {nearbyUser.subscription_plan === "pro" && (
                    <span className="flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                    </span>
                  )}
                </div>
                {nearbyUser.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {nearbyUser.bio}
                  </p>
                )}
                {shouldShowLocation(nearbyUser.location_privacy) && (() => {
                  const formattedLocation = formatLocationByPrivacy(
                    nearbyUser.city,
                    nearbyUser.state_region,
                    nearbyUser.country,
                    nearbyUser.location_privacy
                  );
                  return formattedLocation ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formattedLocation}</span>
                    </div>
                  ) : null;
                })()}
                <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {nearbyUser.distance_miles.toFixed(1)} miles away
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

