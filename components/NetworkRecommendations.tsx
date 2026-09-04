"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, TrendingUp, Sparkles } from "lucide-react";
import { FollowButton } from "./FollowButton";
import { OnlineStatus } from "./OnlineStatus";
import { AvatarImage } from "./AvatarImage";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

export function NetworkRecommendations() {
  const { user, isLoaded } = useUser();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false);
      return;
    }

    const loadRecommendations = async () => {
      try {
        // Get user's connections
        const { data: followingMe } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);

        const { data: iAmFollowing } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
        const iAmFollowingIds = new Set(iAmFollowing?.map((f: any) => f.following_id) || []);
        const myConnections = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id));

        if (myConnections.length === 0) {
          setLoading(false);
          return;
        }

        // Get connections of user's connections (2nd degree)
        const { data: secondDegree } = await supabase
          .from("follows")
          .select("following_id")
          .in("follower_id", myConnections.slice(0, 10));

        const secondDegreeIds = new Set(secondDegree?.map((f: any) => f.following_id) || []);
        
        // Filter out: self, already following, and direct connections
        const recommendedIds = Array.from(secondDegreeIds).filter(
          (id: string) => 
            id !== user.id && 
            !iAmFollowingIds.has(id) && 
            !myConnections.includes(id)
        );

        // Count mutual connections for each recommendation
        const recommendationsWithCounts = await Promise.all(
          recommendedIds.slice(0, 5).map(async (id: string) => {
            // Get this person's connections
            const { data: theirFollowingMe } = await supabase
              .from("follows")
              .select("follower_id")
              .eq("following_id", id);

            const { data: theyAreFollowing } = await supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", id);

            const theirFollowingMeIds = new Set(theirFollowingMe?.map((f: any) => f.follower_id) || []);
            const theyAreFollowingIds = new Set(theyAreFollowing?.map((f: any) => f.following_id) || []);
            const theirConnections = Array.from(theirFollowingMeIds).filter((id2: string) => theyAreFollowingIds.has(id2));

            // Count mutual connections
            const mutualCount = theirConnections.filter((connId: string) => myConnections.includes(connId)).length;

            // Get profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("clerk_id, username, display_name, bio, profile_type, is_verified, avatar_url")
              .eq("clerk_id", id)
              .eq("profile_status", "approved") // Only show approved profiles
              .single();

            return {
              ...profile,
              mutualConnections: mutualCount,
            };
          })
        );

        // Sort by mutual connections count
        recommendationsWithCounts.sort((a, b) => b.mutualConnections - a.mutualConnections);
        setRecommendations(recommendationsWithCounts.filter((r: any) => r.clerk_id));
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recommended for You</h2>
      </div>
      <div className="space-y-3">
        {recommendations.map((person: any) => (
          <div
            key={person.clerk_id}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Link href={getProfileUrl({ username: person.username, clerk_id: person.clerk_id })} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <AvatarImage
                  src={person.avatar_url}
                  alt={person.display_name}
                  fallbackText={person.display_name?.charAt(0).toUpperCase() || "U"}
                  className="border-2 border-indigo-500"
                  size="md"
                  userId={person.clerk_id}
                />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatus userId={person.clerk_id} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {person.display_name}
                  </p>
                  {person.is_verified && (
                    <span className="text-blue-500 text-xs">✓</span>
                  )}
                </div>
                {person.mutualConnections > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {person.mutualConnections} mutual {person.mutualConnections === 1 ? "connection" : "connections"}
                    </span>
                  </div>
                )}
              </div>
            </Link>
            <div onMouseDown={(e) => e.stopPropagation()}>
              <FollowButton
                followerId={user?.id || ""}
                followingId={person.clerk_id}
                isFollowing={false}
                compact={true}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

