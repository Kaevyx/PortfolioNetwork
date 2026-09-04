"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function PostPerformanceChart() {
  const { user, isLoaded } = useUser();
  const [performance, setPerformance] = useState<any[]>([]);
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

    const loadPerformance = async () => {
      try {
        // Get posts from last 30 days, grouped by week
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: posts } = await supabase
          .from("posts")
          .select("id, created_at")
          .eq("profile_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        if (!posts || posts.length === 0) {
          setPerformance([]);
          return;
        }

        // Group by week and calculate engagement
        const weeks: { [key: string]: { posts: number; likes: number; comments: number; views: number } } = {};

        for (const post of posts) {
          const date = new Date(post.created_at);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeks[weekKey]) {
            weeks[weekKey] = { posts: 0, likes: 0, comments: 0, views: 0 };
          }
          weeks[weekKey].posts += 1;

          // Get engagement for this post (try post_reactions first, fallback to post_likes)
          let reactionsCount = 0;
          try {
            const { count } = await supabase
              .from("post_reactions")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id);
            reactionsCount = count || 0;
          } catch (error) {
            const { count } = await supabase
              .from("post_likes")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id);
            reactionsCount = count || 0;
          }

          const [comments, views] = await Promise.all([
            supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
            supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", post.id),
          ]);

          weeks[weekKey].likes += reactionsCount;
          weeks[weekKey].comments += comments.count || 0;
          weeks[weekKey].views += views.count || 0;
        }

        // Convert to array and format
        const performanceData = Object.entries(weeks)
          .map(([date, data]) => ({
            week: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ...data,
          }))
          .slice(-4); // Last 4 weeks

        setPerformance(performanceData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading performance:", error);
      }
    };

    loadPerformance();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("post-performance-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => loadPerformance(), 500);
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
          setTimeout(() => loadPerformance(), 500);
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
          setTimeout(() => loadPerformance(), 500);
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
          setTimeout(() => loadPerformance(), 500);
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
          setTimeout(() => loadPerformance(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (performance.length === 0) return null;

  const maxEngagement = Math.max(...performance.map((p: any) => p.likes + p.comments + p.views), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Post Performance (Last 4 Weeks)</h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
        </div>
      </div>
      <div className="space-y-4">
        {performance.map((week: any, index: number) => {
          const totalEngagement = week.likes + week.comments + week.views;
          const percentage = (totalEngagement / maxEngagement) * 100;

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{week.week}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {week.posts} {week.posts === 1 ? "post" : "posts"} • {totalEngagement} engagement
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{totalEngagement}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>❤️ {week.likes}</span>
                <span>💬 {week.comments}</span>
                <span>👁️ {week.views}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

