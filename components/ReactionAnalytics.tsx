"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { ThumbsUp, Heart, Laugh, AlertCircle, Frown, Angry, TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReactionStats {
  like: number;
  love: number;
  laugh: number;
  wow: number;
  sad: number;
  angry: number;
  total: number;
}

export function ReactionAnalytics({ timeRange = '7d' }: { timeRange?: '7d' | '30d' | '90d' | 'all' }) {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<ReactionStats | null>(null);
  const [loading, setLoading] = useState(true);
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

    const loadStats = async () => {
      setLoading(true);
      try {
        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
          case 'all':
            startDate = new Date(0); // Beginning of time
            break;
        }

        // Get user's posts in time range
        let postsQuery = supabase
          .from("posts")
          .select("id")
          .eq("profile_id", user.id);
        
        if (timeRange !== 'all') {
          postsQuery = postsQuery.gte("created_at", startDate.toISOString());
        }

        const { data: posts } = await postsQuery;
        const postIds = posts?.map((p: any) => p.id) || [];

        if (postIds.length === 0) {
          setStats({ like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0, total: 0 });
          setLoading(false);
          return;
        }

        // Get reactions for these posts
        let reactionsQuery = supabase
          .from("post_reactions")
          .select("reaction_type")
          .in("post_id", postIds);

        // If post_reactions doesn't exist, try post_likes
        const { data: reactions, error } = await reactionsQuery;
        
        if (error && error.code === 'PGRST116') {
          // Fallback to post_likes
          const { data: likes } = await supabase
            .from("post_likes")
            .select("id")
            .in("post_id", postIds);
          
          const likesCount = likes?.length || 0;
          setStats({ like: likesCount, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0, total: likesCount });
          setLoading(false);
          return;
        }

        // Count reactions by type
        const reactionCounts: ReactionStats = {
          like: 0,
          love: 0,
          laugh: 0,
          wow: 0,
          sad: 0,
          angry: 0,
          total: 0,
        };

        reactions?.forEach((reaction: any) => {
          const type = reaction.reaction_type as keyof ReactionStats;
          if (type in reactionCounts) {
            reactionCounts[type]++;
            reactionCounts.total++;
          }
        });

        setStats(reactionCounts);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading reaction stats:", error);
        setStats({ like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("reaction-analytics-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => loadStats(), 500);
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
          setTimeout(() => loadStats(), 500);
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
          setTimeout(() => loadStats(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, timeRange]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const reactions = [
    { type: 'like' as const, emoji: '👍', label: 'Like', icon: ThumbsUp, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { type: 'love' as const, emoji: '❤️', label: 'Love', icon: Heart, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
    { type: 'laugh' as const, emoji: '😂', label: 'Haha', icon: Laugh, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { type: 'wow' as const, emoji: '😮', label: 'Wow', icon: AlertCircle, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
    { type: 'sad' as const, emoji: '😢', label: 'Sad', icon: Frown, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-700/50' },
    { type: 'angry' as const, emoji: '😠', label: 'Angry', icon: Angry, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  const maxCount = Math.max(...reactions.map(r => stats[r.type]), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reaction Analytics</h2>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'All time'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <RefreshCw className="w-3 h-3" />
            <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {reactions.map((reaction) => {
          const count = stats[reaction.type];
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const Icon = reaction.icon;

          return (
            <div key={reaction.type} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{reaction.emoji}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{reaction.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${reaction.bgColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Reactions</span>
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</span>
        </div>
      </div>
    </div>
  );
}

