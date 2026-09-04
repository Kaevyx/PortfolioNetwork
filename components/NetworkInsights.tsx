"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Users, MessageSquare, Eye, Zap, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NetworkInsights() {
  const { user, isLoaded } = useUser();
  const [insights, setInsights] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();

  // Update "last updated" display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadInsights = async () => {
      try {
        // Get user's posts
        const { data: posts } = await supabase
          .from("posts")
          .select("id")
          .eq("profile_id", user.id);

        const postIds = posts?.map((p: any) => p.id) || [];

        // Calculate engagement metrics
        let totalLikes = 0;
        let totalComments = 0;
        let totalViews = 0;

        if (postIds.length > 0) {
          const { count: likes } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds);

          const { count: comments } = await supabase
            .from("post_comments")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds);

          const { count: views } = await supabase
            .from("post_views")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds);

          totalLikes = likes || 0;
          totalComments = comments || 0;
          totalViews = views || 0;
        }

        // Get network growth (connections in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
        const connections = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id));

        const engagementRate = totalViews > 0 
          ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1)
          : "0";

        setInsights({
          totalLikes,
          totalComments,
          totalViews,
          connections: connections.length,
          engagementRate,
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading insights:", error);
      }
    };

    loadInsights();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("network-insights-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => loadInsights(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
        },
        () => {
          setTimeout(() => loadInsights(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_reactions",
        },
        () => {
          setTimeout(() => loadInsights(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
        },
        () => {
          setTimeout(() => loadInsights(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_views",
        },
        () => {
          setTimeout(() => loadInsights(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
        },
        () => {
          setTimeout(() => loadInsights(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (!insights) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Network Insights</h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Views</span>
          </div>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{insights.totalViews}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">Comments</span>
          </div>
          <p className="text-lg font-bold text-red-900 dark:text-red-100">{insights.totalComments}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connections</span>
          </div>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">{insights.connections}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Engagement</span>
          </div>
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{insights.engagementRate}%</p>
        </div>
      </div>
    </div>
  );
}

