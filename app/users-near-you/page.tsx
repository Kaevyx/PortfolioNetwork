"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import { MapPin, User, Sparkles, Crown, Star, Navigation, ArrowLeft, Filter } from "lucide-react";
import { AvatarImage } from "@/components/AvatarImage";
import { PremiumBadge } from "@/components/PremiumBadge";
import { formatLocationByPrivacy, shouldShowLocation } from "@/lib/utils/locationPrivacy";

interface NearbyUser {
  clerk_id: string;
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

export default function UsersNearYouPage() {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState(31);
  const [sortBy, setSortBy] = useState<"distance" | "featured">("featured");

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
      setLocationError(null);
      try {
        const { data, error } = await supabase.rpc("get_users_near_location", {
          p_user_id: user.id,
          p_latitude: userLocation.lat,
          p_longitude: userLocation.lon,
          p_radius_miles: radius,
          p_limit: 100, // Show more users on dedicated page
        });

        if (error) {
          console.error("RPC error:", error);
          
          const errorCode = (error as any)?.code;
          const errorMessage = (error as any)?.message || String(error);
          
          const functionNotFoundCodes = ['PGRST202', '42883', '42P01'];
          const isFunctionNotFound = 
            (errorCode && functionNotFoundCodes.includes(errorCode)) ||
            (errorMessage && (
              errorMessage.toLowerCase().includes('function') && 
              errorMessage.toLowerCase().includes('does not exist')
            ));
          
          if (isFunctionNotFound) {
            setLocationError("Location features are not yet configured. Please run the database migration: supabase/enhanced-location-features.sql");
            setNearbyUsers([]);
            setLoading(false);
            return;
          }
          
          console.warn("Could not load nearby users:", errorMessage || "Unknown error");
          setNearbyUsers([]);
          return;
        }
        
        setLocationError(null);
        setNearbyUsers(data || []);
      } catch (error: any) {
        console.error("Error loading nearby users:", error);
        setNearbyUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadNearbyUsers();
  }, [userLocation, user?.id, radius, supabase]);

  // Sort users based on selected option
  const sortedUsers = [...nearbyUsers].sort((a, b) => {
    if (sortBy === "featured") {
      // Sort by featured priority first, then distance
      if (b.featured_priority !== a.featured_priority) {
        return (b.featured_priority || 0) - (a.featured_priority || 0);
      }
      return a.distance_miles - b.distance_miles;
    } else {
      // Sort by distance first, then featured priority
      if (Math.abs(a.distance_miles - b.distance_miles) > 0.1) {
        return a.distance_miles - b.distance_miles;
      }
      return (b.featured_priority || 0) - (a.featured_priority || 0);
    }
  });

  if (!isLoaded) {
    return null;
  }

  if (locationError) {
    const isMigrationError = locationError.includes("database migration") || locationError.includes("not yet configured");
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Users Near You
            </h2>
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Users Near You</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Discover professionals and businesses in your area
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Radius</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
                <option value={100}>100 miles</option>
                <option value={250}>250 miles</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "distance" | "featured")}
                className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="featured">Featured First</option>
                <option value="distance">Distance First</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {loading ? (
                <span>Loading...</span>
              ) : (
                <span>{sortedUsers.length} {sortedUsers.length === 1 ? 'user' : 'users'} found</span>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              No users found within {radius} miles
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Try increasing the radius or updating your location
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedUsers.map((nearbyUser) => (
              <Link
                key={nearbyUser.clerk_id}
                href={getProfileUrl({ username: nearbyUser.username, clerk_id: nearbyUser.clerk_id })}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <AvatarImage
                      src={nearbyUser.avatar_url}
                      alt={nearbyUser.display_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                    />
                    {nearbyUser.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                        <Star className="w-4 h-4 text-white fill-current" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {nearbyUser.display_name}
                      </h3>
                      {nearbyUser.featured_priority != null && nearbyUser.featured_priority > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          nearbyUser.featured_priority >= 100 
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                        }`}>
                          <Star className="w-3 h-3 fill-current" />
                          {nearbyUser.featured_priority >= 100 ? "Featured" : "Pro"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {nearbyUser.profile_type}
                    </p>
                  </div>
                </div>

                {nearbyUser.bio && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                    {nearbyUser.bio}
                  </p>
                )}

                <div className="space-y-2">
                  {shouldShowLocation(nearbyUser.location_privacy) && (() => {
                    const formattedLocation = formatLocationByPrivacy(
                      nearbyUser.city,
                      nearbyUser.state_region,
                      nearbyUser.country,
                      nearbyUser.location_privacy
                    );
                    return formattedLocation ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{formattedLocation}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {nearbyUser.distance_miles.toFixed(1)} miles away
                    </span>
                    {nearbyUser.subscription_plan && nearbyUser.subscription_plan !== "free" && (
                      <PremiumBadge plan={nearbyUser.subscription_plan as "pro" | "ultimate"} />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

