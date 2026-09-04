"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, TrendingUp, Heart, MessageCircle, Eye, RefreshCw, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function EngagementMetrics() {
  const { user, isLoaded } = useUser();
  const [metrics, setMetrics] = useState<any>(null);
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

    const loadMetrics = async () => {
      try {
        // Get user's posts from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentPosts } = await supabase
          .from("posts")
          .select("id, created_at")
          .eq("profile_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const postIds = recentPosts?.map((p: any) => p.id) || [];

        if (postIds.length === 0) {
          setMetrics({ posts: 0, avgLikes: 0, avgComments: 0, avgViews: 0, avgShares: 0 });
          return;
        }

        // Get engagement data (try post_reactions first, fallback to post_likes)
        let reactions: any[] = [];
        try {
          const { data } = await supabase
            .from("post_reactions")
            .select("post_id")
            .in("post_id", postIds);
          reactions = data || [];
        } catch (error) {
          // Fallback to post_likes
          const { data } = await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds);
          reactions = data || [];
        }

        const { data: comments } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);

        const { data: views } = await supabase
          .from("post_views")
          .select("post_id")
          .in("post_id", postIds);

        // Get shares
        let shares: any[] = [];
        try {
          const { data } = await supabase
            .from("reposts")
            .select("original_post_id")
            .in("original_post_id", postIds);
          shares = data || [];
        } catch (error) {
          // Ignore if table doesn't exist
        }

        const likesByPost = new Map<string, number>();
        const commentsByPost = new Map<string, number>();
        const viewsByPost = new Map<string, number>();
        const sharesByPost = new Map<string, number>();

        reactions.forEach((reaction: any) => {
          likesByPost.set(reaction.post_id, (likesByPost.get(reaction.post_id) || 0) + 1);
        });

        comments?.forEach((comment: any) => {
          commentsByPost.set(comment.post_id, (commentsByPost.get(comment.post_id) || 0) + 1);
        });

        views?.forEach((view: any) => {
          viewsByPost.set(view.post_id, (viewsByPost.get(view.post_id) || 0) + 1);
        });

        shares.forEach((share: any) => {
          sharesByPost.set(share.original_post_id, (sharesByPost.get(share.original_post_id) || 0) + 1);
        });

        const totalLikes = Array.from(likesByPost.values()).reduce((a, b) => a + b, 0);
        const totalComments = Array.from(commentsByPost.values()).reduce((a, b) => a + b, 0);
        const totalViews = Array.from(viewsByPost.values()).reduce((a, b) => a + b, 0);
        const totalShares = Array.from(sharesByPost.values()).reduce((a, b) => a + b, 0);

        setMetrics({
          posts: postIds.length,
          avgLikes: postIds.length > 0 ? (totalLikes / postIds.length).toFixed(1) : 0,
          avgComments: postIds.length > 0 ? (totalComments / postIds.length).toFixed(1) : 0,
          avgViews: postIds.length > 0 ? (totalViews / postIds.length).toFixed(1) : 0,
          avgShares: postIds.length > 0 ? (totalShares / postIds.length).toFixed(1) : 0,
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading metrics:", error);
      }
    };

    loadMetrics();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("engagement-metrics-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => loadMetrics(), 500);
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
          setTimeout(() => loadMetrics(), 500);
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
          setTimeout(() => loadMetrics(), 500);
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
          setTimeout(() => loadMetrics(), 500);
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
          setTimeout(() => loadMetrics(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (!metrics) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Engagement Metrics</h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Avg Likes</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.avgLikes}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Avg Comments</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.avgComments}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Avg Views</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.avgViews}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-pink-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Avg Shares</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{metrics.avgShares}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Posts (30d)</span>
          </div>
          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{metrics.posts}</span>
        </div>
      </div>
    </div>
  );
}

