"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { UserPlus, CheckCircle2, MapPin } from "lucide-react";
import { FollowButton } from "./FollowButton";
import { OnlineStatus } from "./OnlineStatus";
import { AvatarImage } from "./AvatarImage";
import { formatLocationByPrivacy, shouldShowLocation } from "@/lib/utils/locationPrivacy";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

export function PeopleYouMayKnow() {
  const { user, isLoaded } = useUser();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false);
      return;
    }

    const loadSuggestions = async () => {
      try {
        // Get user's location for location-based recommendations
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("latitude, longitude, city, state_region, country, location_privacy")
          .eq("clerk_id", user.id)
          .single();

        // Get who user is following
        const { data: followingList } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = new Set(followingList?.map((f: any) => f.following_id) || []);

        let suggested: any[] = [];

        // If user has location, prioritize nearby users
        if (userProfile?.latitude && userProfile?.longitude) {
          try {
            const { data: nearbyUsers } = await supabase.rpc("get_users_near_location", {
              p_user_id: user.id,
              p_latitude: userProfile.latitude,
              p_longitude: userProfile.longitude,
              p_radius_miles: 62, // ~62 miles radius (equivalent to 100km)
              p_limit: 20,
            });

            // Filter out already following and add location match reason
            suggested = (nearbyUsers || [])
              .filter((p: any) => !followingIds.has(p.clerk_id))
              .slice(0, 5)
              .map((p: any) => ({
                ...p,
                recommendation_reason: "Near your location",
              }));
          } catch (error) {
            console.error("Error loading nearby users:", error);
          }
        }

        // If we don't have enough suggestions, fill with general recommendations
        if (suggested.length < 5) {
          const { data: allProfiles } = await supabase
            .from("profiles")
            .select("clerk_id, username, display_name, bio, profile_type, is_verified, avatar_url, city, state_region, country, location_privacy")
            .eq("profile_status", "approved")
            .eq("is_suspended", false)
            .neq("clerk_id", user.id)
            .limit(50);

          // Filter out already following and already suggested
          const suggestedIds = new Set(suggested.map((s: any) => s.clerk_id));
          const additional = allProfiles
            ?.filter((p: any) => !followingIds.has(p.clerk_id) && !suggestedIds.has(p.clerk_id))
            .slice(0, 5 - suggested.length)
            .map((p: any) => ({
              ...p,
              recommendation_reason: userProfile?.city && p.city === userProfile.city 
                ? "Same city" 
                : userProfile?.country && p.country === userProfile.country
                ? "Same country"
                : "Recommended for you",
            })) || [];

          suggested = [...suggested, ...additional].slice(0, 5);
        }

        setSuggestions(suggested);
      } catch (error) {
        console.error("Error loading suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (!isLoaded || loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-lg p-6 border-2 border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
          <UserPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">People You May Know</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Expand your professional network</p>
        </div>
      </div>
      <div className="space-y-3">
        {suggestions.map((person: any) => (
          <div
            key={person.clerk_id}
            className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all card-hover"
          >
            <Link href={getProfileUrl({ username: person.username, clerk_id: person.clerk_id })} className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <AvatarImage
                  src={person.avatar_url}
                  alt={person.display_name}
                  fallbackText={person.display_name?.charAt(0).toUpperCase() || "U"}
                  className="border-2 border-indigo-500 shadow-lg hover:scale-110 transition-transform"
                  size="lg"
                  userId={person.clerk_id}
                />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatus userId={person.clerk_id} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-base text-gray-900 dark:text-white truncate">
                    {person.display_name}
                  </p>
                  {person.is_verified && (
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                {person.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {person.bio}
                  </p>
                )}
                {person.recommendation_reason && (
                  <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{person.recommendation_reason}</span>
                  </div>
                )}
                {shouldShowLocation(person.location_privacy) && (() => {
                  const formattedLocation = formatLocationByPrivacy(
                    person.city,
                    person.state_region,
                    person.country,
                    person.location_privacy
                  );
                  return formattedLocation ? (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{formattedLocation}</span>
                    </div>
                  ) : null;
                })()}
                {person.profile_type && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                    {person.profile_type === "individual" ? "Professional" : "Business"}
                  </p>
                )}
              </div>
            </Link>
            <div onMouseDown={(e) => e.stopPropagation()}>
              <FollowButton
                followerId={user?.id || ""}
                followingId={person.clerk_id}
                isFollowing={false}
                compact={false}
              />
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/explore"
        className="block text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800"
      >
        Discover More People →
      </Link>
    </div>
  );
}

