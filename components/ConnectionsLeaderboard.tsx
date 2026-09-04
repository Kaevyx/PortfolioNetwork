"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Trophy, MessageCircle, ThumbsUp, Share2, Eye, TrendingUp, UserPlus, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AvatarImage } from "./AvatarImage";
import { OnlineStatus } from "./OnlineStatus";

interface ConnectionStats {
  userId: string;
  displayName: string;
  isVerified: boolean;
  avatarUrl?: string;
  totalInteractions: number;
  reactionsGiven: number;
  reactionsReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  sharesGiven: number;
  sharesReceived: number;
  viewsGiven: number;
  viewsReceived: number;
  postsShared: number;
  lastInteraction?: Date;
  connectionScore: number;
}

export function ConnectionsLeaderboard() {
  const { user, isLoaded } = useUser();
  const [connections, setConnections] = useState<ConnectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestConnection, setBestConnection] = useState<ConnectionStats | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false);
      return;
    }

    const loadConnections = async () => {
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
          setConnections([]);
          setLoading(false);
          return;
        }

        // Get profiles for connections
        const { data: profiles } = await supabase
          .from("profiles")
          .select("clerk_id, display_name, is_verified, avatar_url")
          .in("clerk_id", connectionIds);

        if (!profiles) {
          setConnections([]);
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

        // Calculate interactions for each connection
        const connectionStats: ConnectionStats[] = await Promise.all(
          profiles.map(async (profile: any) => {
            const connectionPostIdsForUser = postsByConnection.get(profile.clerk_id) || [];

            // Reactions given (user reacted to connection's posts)
            const { count: reactionsGiven } = await supabase
              .from("post_reactions")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("post_id", connectionPostIdsForUser);

            // Reactions received (connection reacted to user's posts)
            const { count: reactionsReceived } = await supabase
              .from("post_reactions")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.clerk_id)
              .in("post_id", userPostIds);

            // Comments given
            const { count: commentsGiven } = await supabase
              .from("post_comments")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("post_id", connectionPostIdsForUser);

            // Comments received
            const { count: commentsReceived } = await supabase
              .from("post_comments")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.clerk_id)
              .in("post_id", userPostIds);

            // Shares given (user shared connection's posts)
            const { count: sharesGiven } = await supabase
              .from("reposts")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("original_post_id", connectionPostIdsForUser);

            // Shares received (connection shared user's posts)
            const { count: sharesReceived } = await supabase
              .from("reposts")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.clerk_id)
              .in("original_post_id", userPostIds);

            // Views given
            const { count: viewsGiven } = await supabase
              .from("post_views")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("post_id", connectionPostIdsForUser);

            // Views received
            const { count: viewsReceived } = await supabase
              .from("post_views")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.clerk_id)
              .in("post_id", userPostIds);

            // Posts shared (connection shared user's posts)
            const { data: sharedPosts } = await supabase
              .from("posts")
              .select("id")
              .eq("profile_id", profile.clerk_id)
              .eq("is_repost", true)
              .in("original_post_id", userPostIds);

            const totalInteractions = 
              (reactionsGiven || 0) + (reactionsReceived || 0) +
              (commentsGiven || 0) + (commentsReceived || 0) +
              (sharesGiven || 0) + (sharesReceived || 0) +
              (viewsGiven || 0) + (viewsReceived || 0);

            // Connection score: weighted sum of interactions
            const connectionScore = 
              ((reactionsGiven || 0) + (reactionsReceived || 0)) * 2 +
              ((commentsGiven || 0) + (commentsReceived || 0)) * 3 +
              ((sharesGiven || 0) + (sharesReceived || 0)) * 5 +
              ((viewsGiven || 0) + (viewsReceived || 0)) * 0.5;

            // Get last interaction
            const { data: lastReaction } = await supabase
              .from("post_reactions")
              .select("created_at")
              .or(`and(user_id.eq.${user.id},post_id.in.(${connectionPostIdsForUser.join(',')})),and(user_id.eq.${profile.clerk_id},post_id.in.(${userPostIds.join(',')}))`)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            const { data: lastComment } = await supabase
              .from("post_comments")
              .select("created_at")
              .or(`and(user_id.eq.${user.id},post_id.in.(${connectionPostIdsForUser.join(',')})),and(user_id.eq.${profile.clerk_id},post_id.in.(${userPostIds.join(',')}))`)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            let lastInteraction: Date | undefined;
            if (lastReaction || lastComment) {
              const dates = [
                lastReaction?.created_at ? new Date(lastReaction.created_at) : null,
                lastComment?.created_at ? new Date(lastComment.created_at) : null,
              ].filter(Boolean) as Date[];
              if (dates.length > 0) {
                lastInteraction = new Date(Math.max(...dates.map(d => d.getTime())));
              }
            }

            return {
              userId: profile.clerk_id,
              displayName: profile.display_name,
              isVerified: profile.is_verified,
              avatarUrl: profile.avatar_url,
              totalInteractions,
              reactionsGiven: reactionsGiven || 0,
              reactionsReceived: reactionsReceived || 0,
              commentsGiven: commentsGiven || 0,
              commentsReceived: commentsReceived || 0,
              sharesGiven: sharesGiven || 0,
              sharesReceived: sharesReceived || 0,
              viewsGiven: viewsGiven || 0,
              viewsReceived: viewsReceived || 0,
              postsShared: sharedPosts?.length || 0,
              lastInteraction,
              connectionScore,
            };
          })
        );

        // Sort by connection score
        connectionStats.sort((a, b) => b.connectionScore - a.connectionScore);

        setConnections(connectionStats);
        setBestConnection(connectionStats[0] || null);
      } catch (error) {
        console.error("Error loading connections:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-8">
        <UserPlus className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No connections yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Start connecting with people to see your best connections here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Connection Highlight - Enhanced */}
      {bestConnection && (
        <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-amber-900/30 rounded-xl p-6 border-2 border-yellow-400 dark:border-yellow-600 shadow-lg">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-xl shadow-md">
              <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  🏆 Best Connection
                  <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </h3>
              </div>
              <Link
                href={`/profile/${bestConnection.userId}`}
                className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {bestConnection.displayName}
                {bestConnection.isVerified && (
                  <span className="text-blue-500 ml-2 text-xl">✓</span>
                )}
              </Link>
              {bestConnection.lastInteraction && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Last active {formatDistanceToNow(bestConnection.lastInteraction, { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Connection Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(bestConnection.connectionScore)}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Interactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {bestConnection.totalInteractions}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                Reactions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {bestConnection.reactionsGiven + bestConnection.reactionsReceived}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                Comments
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {bestConnection.commentsGiven + bestConnection.commentsReceived}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                Shares
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {bestConnection.sharesGiven + bestConnection.sharesReceived}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connections List - Enhanced Table View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            All Connections
          </h4>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
          </span>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Connection</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reactions</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Comments</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Shares</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Views</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Score</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((connection, index) => (
                <tr
                  key={connection.userId}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-500' : 
                        index === 1 ? 'text-gray-400' : 
                        index === 2 ? 'text-amber-600' : 
                        'text-gray-500'
                      }`}>
                        #{index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Link
                      href={`/profile/${connection.userId}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="relative flex-shrink-0">
                        <AvatarImage
                          src={connection.avatarUrl}
                          alt={connection.displayName}
                          fallbackText={connection.displayName.charAt(0).toUpperCase()}
                          className="border-2 border-indigo-500 shadow-md"
                          size="md"
                          userId={connection.userId}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <OnlineStatus userId={connection.userId} size="sm" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {connection.displayName}
                          </p>
                          {connection.isVerified && (
                            <span className="text-blue-500 text-sm">✓</span>
                          )}
                        </div>
                        {connection.lastInteraction && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Active {formatDistanceToNow(connection.lastInteraction, { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-700 dark:text-gray-300">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="font-medium">{connection.reactionsGiven + connection.reactionsReceived}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-700 dark:text-gray-300">
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-medium">{connection.commentsGiven + connection.commentsReceived}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-700 dark:text-gray-300">
                      <Share2 className="w-4 h-4" />
                      <span className="font-medium">{connection.sharesGiven + connection.sharesReceived}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-700 dark:text-gray-300">
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">{connection.viewsGiven + connection.viewsReceived}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-16 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-sm">
                      {Math.round(connection.connectionScore)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {connections.map((connection, index) => (
            <Link
              key={connection.userId}
              href={`/profile/${connection.userId}`}
              className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-3">
              <div className="relative flex-shrink-0">
                <AvatarImage
                  src={connection.avatarUrl}
                  alt={connection.displayName}
                  fallbackText={connection.displayName.charAt(0).toUpperCase()}
                  className="border-2 border-indigo-500 shadow-md"
                  size="lg"
                  userId={connection.userId}
                />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatus userId={connection.userId} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${
                    index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-gray-400' : 
                    index === 2 ? 'text-amber-600' : 
                    'text-gray-500'
                  }`}>
                    #{index + 1}
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {connection.displayName}
                  </p>
                  {connection.isVerified && (
                    <span className="text-blue-500 text-sm flex-shrink-0">✓</span>
                  )}
                </div>
                {connection.lastInteraction && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Active {formatDistanceToNow(connection.lastInteraction, { addSuffix: true })}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center w-16 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-bold text-sm">
                  {Math.round(connection.connectionScore)}
                </span>
              </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {connection.reactionsGiven + connection.reactionsReceived}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {connection.commentsGiven + connection.commentsReceived}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  {connection.sharesGiven + connection.sharesReceived}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

