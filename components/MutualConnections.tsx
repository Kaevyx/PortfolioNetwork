"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, UserPlus } from "lucide-react";

interface MutualConnectionsProps {
  userId: string;
  profileUserId: string;
  maxDisplay?: number;
}

export function MutualConnections({ userId, profileUserId, maxDisplay = 5 }: MutualConnectionsProps) {
  const { isLoaded } = useUser();
  const [mutualConnections, setMutualConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !userId || !profileUserId || userId === profileUserId) {
      setLoading(false);
      return;
    }

    const loadMutualConnections = async () => {
      try {
        // Get current user's connections (mutual follows)
        const { data: followingMe } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId);

        const { data: iAmFollowing } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);

        const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
        const iAmFollowingIds = new Set(iAmFollowing?.map((f: any) => f.following_id) || []);
        const myConnections = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id));

        // Get profile user's connections
        const { data: profileFollowingMe } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", profileUserId);

        const { data: profileFollowing } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", profileUserId);

        const profileFollowingMeIds = new Set(profileFollowingMe?.map((f: any) => f.follower_id) || []);
        const profileFollowingIds = new Set(profileFollowing?.map((f: any) => f.following_id) || []);
        const profileConnections = Array.from(profileFollowingMeIds).filter((id: string) => profileFollowingIds.has(id));

        // Find mutual connections
        const mutualIds = myConnections.filter((id: string) => profileConnections.includes(id));
        setTotalCount(mutualIds.length);

        if (mutualIds.length > 0) {
          // Get profile data for mutual connections
          const { data: profiles } = await supabase
            .from("profiles")
            .select("clerk_id, display_name, bio, is_verified")
            .in("clerk_id", mutualIds.slice(0, maxDisplay));

          setMutualConnections(profiles || []);
        }
      } catch (error) {
        console.error("Error loading mutual connections:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMutualConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, profileUserId]);

  if (loading || totalCount === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg shadow-sm p-4 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {totalCount} Mutual {totalCount === 1 ? "Connection" : "Connections"}
        </h3>
      </div>
      <div className="space-y-2">
        {mutualConnections.map((connection: any) => (
          <Link
            key={connection.clerk_id}
            href={`/profile/${connection.clerk_id}`}
            className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-200 dark:border-indigo-800"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {connection.display_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                  {connection.display_name}
                </p>
                {connection.is_verified && (
                  <span className="text-blue-500 text-xs">✓</span>
                )}
              </div>
              {connection.bio && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                  {connection.bio}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
      {totalCount > maxDisplay && (
        <Link
          href={`/connections?mutual=${profileUserId}`}
          className="block text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-3 font-semibold"
        >
          View all {totalCount} mutual connections →
        </Link>
      )}
    </div>
  );
}






