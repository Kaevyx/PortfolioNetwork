"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Trophy, UserPlus, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AvatarImage } from "./AvatarImage";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface ConnectionStats {
  userId: string;
  username?: string | null;
  displayName: string;
  isVerified: boolean;
  avatarUrl: string | null;
  connectionScore: number;
  totalInteractions: number;
}

export function TopConnectionCard() {
  const { user, isLoaded } = useUser();
  const [topConnection, setTopConnection] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false);
      return;
    }

    const loadTopConnection = async () => {
      try {
        setLoading(true);

        // Get user's connections (mutual follows)
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
        const connectionIds = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id));

        if (connectionIds.length === 0) {
          setTopConnection(null);
          setLoading(false);
          return;
        }

        // Get profiles for connections
        const { data: profiles } = await supabase
          .from("profiles")
          .select("clerk_id, username, display_name, is_verified, avatar_url")
          .in("clerk_id", connectionIds);

        if (!profiles || profiles.length === 0) {
          setTopConnection(null);
          setLoading(false);
          return;
        }

        // Get user's posts
        const { data: userPosts } = await supabase
          .from("posts")
          .select("id")
          .eq("profile_id", user.id);

        const userPostIds = userPosts?.map((p: any) => p.id) || [];

        // Get connection posts
        const { data: connectionPosts } = await supabase
          .from("posts")
          .select("id, profile_id")
          .in("profile_id", connectionIds);

        const connectionPostIds = connectionPosts?.map((p: any) => p.id) || [];
        const postsByConnection = new Map<string, string[]>();
        connectionPosts?.forEach((p: any) => {
          if (!postsByConnection.has(p.profile_id)) {
            postsByConnection.set(p.profile_id, []);
          }
          postsByConnection.get(p.profile_id)?.push(p.id);
        });

        // Calculate connection scores
        const connectionStats: ConnectionStats[] = await Promise.all(
          profiles.map(async (profile: any) => {
            const connectionPostIdsForUser = postsByConnection.get(profile.clerk_id) || [];

            // Reactions given and received
            let reactionsGiven = 0;
            let reactionsReceived = 0;
            try {
              const { count: given } = await supabase
                .from("post_reactions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .in("post_id", connectionPostIdsForUser);
              reactionsGiven = given || 0;

              const { count: received } = await supabase
                .from("post_reactions")
                .select("*", { count: "exact", head: true })
                .eq("user_id", profile.clerk_id)
                .in("post_id", userPostIds);
              reactionsReceived = received || 0;
            } catch (error) {
              // Fallback to post_likes if post_reactions doesn't exist
              const { count: given } = await supabase
                .from("post_likes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .in("post_id", connectionPostIdsForUser);
              reactionsGiven = given || 0;

              const { count: received } = await supabase
                .from("post_likes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", profile.clerk_id)
                .in("post_id", userPostIds);
              reactionsReceived = received || 0;
            }

            // Comments given and received
            const { count: commentsGivenCount } = await supabase
              .from("post_comments")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("post_id", connectionPostIdsForUser);
            const commentsGiven = commentsGivenCount || 0;

            const { count: commentsReceivedCount } = await supabase
              .from("post_comments")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.clerk_id)
              .in("post_id", userPostIds);
            const commentsReceived = commentsReceivedCount || 0;

            // Shares given and received
            let sharesGiven = 0;
            let sharesReceived = 0;
            try {
              const { count: given } = await supabase
                .from("reposts")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .in("original_post_id", connectionPostIdsForUser);
              sharesGiven = given || 0;

              const { count: received } = await supabase
                .from("reposts")
                .select("*", { count: "exact", head: true })
                .eq("user_id", profile.clerk_id)
                .in("original_post_id", userPostIds);
              sharesReceived = received || 0;
            } catch (error) {
              // Ignore if table doesn't exist
            }

            // Views given and received
            const { count: viewsGivenCount } = await supabase
              .from("post_views")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("post_id", connectionPostIdsForUser);
            const viewsGiven = viewsGivenCount || 0;

            const { count: viewsReceivedCount } = await supabase
              .from("post_views")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.clerk_id)
              .in("post_id", userPostIds);
            const viewsReceived = viewsReceivedCount || 0;

            const totalInteractions = 
              reactionsGiven + reactionsReceived +
              commentsGiven + commentsReceived +
              sharesGiven + sharesReceived +
              viewsGiven + viewsReceived;

            // Connection score: weighted sum of interactions
            const connectionScore = 
              (reactionsGiven + reactionsReceived) * 2 +
              (commentsGiven + commentsReceived) * 3 +
              (sharesGiven + sharesReceived) * 5 +
              (viewsGiven + viewsReceived) * 0.5;

            return {
              userId: profile.clerk_id,
              username: profile.username,
              displayName: profile.display_name,
              isVerified: profile.is_verified,
              avatarUrl: profile.avatar_url,
              connectionScore,
              totalInteractions,
            };
          })
        );

        // Sort by connection score and get top one
        connectionStats.sort((a, b) => b.connectionScore - a.connectionScore);
        setTopConnection(connectionStats[0] || null);
      } catch (error) {
        console.error("Error loading top connection:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTopConnection();

    // Listen for storage update events (when files are deleted/uploaded)
    const handleStorageUpdate = () => {
      loadTopConnection();
    };

    // Refresh data periodically and when window gains focus (to catch deleted files)
    const refreshInterval = setInterval(() => {
      loadTopConnection();
    }, 30000); // Refresh every 30 seconds

    const handleFocus = () => {
      loadTopConnection();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage-updated', handleStorageUpdate);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage-updated', handleStorageUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <div className="animate-pulse">
          <div className="h-4 bg-yellow-200 dark:bg-yellow-800 rounded w-24 mb-2"></div>
          <div className="h-6 bg-yellow-200 dark:bg-yellow-800 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!topConnection) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Connection</h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">No connections yet</p>
        <Link
          href="/connections"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
        >
          View Connections →
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={getProfileUrl({ username: topConnection.username, clerk_id: topConnection.userId })}
      className="block bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border-2 border-yellow-300 dark:border-yellow-700 hover:border-yellow-400 dark:hover:border-yellow-600 transition-all card-hover"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
          <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">🏆 Top Connection</h3>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <AvatarImage
          src={topConnection.avatarUrl}
          alt={topConnection.displayName}
          fallbackText={topConnection.displayName.charAt(0).toUpperCase()}
          className="border-2 border-indigo-500 flex-shrink-0"
          size="md"
          userId={topConnection.userId}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {topConnection.displayName}
            </p>
            {topConnection.isVerified && (
              <span className="text-blue-500 text-xs flex-shrink-0">✓</span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {topConnection.totalInteractions} interactions
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Connection Score</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {Math.round(topConnection.connectionScore)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
          <span>View Profile</span>
          <TrendingUp className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

