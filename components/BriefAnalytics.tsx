"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight, BarChart3, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TimePeriod = "24h" | "7d" | "30d" | "all";

export function BriefAnalytics() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
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

    const loadBriefStats = async () => {
      try {
        // Calculate date ranges based on selected time period
        const now = new Date();
        let periodStart: Date;
        let previousPeriodStart: Date;
        let previousPeriodEnd: Date;

        now.setHours(0, 0, 0, 0);

        if (timePeriod === "24h") {
          periodStart = new Date(now);
          periodStart.setHours(now.getHours() - 24);
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setHours(previousPeriodStart.getHours() - 24);
          previousPeriodEnd = new Date(periodStart);
        } else if (timePeriod === "7d") {
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
          previousPeriodEnd = new Date(periodStart);
        } else if (timePeriod === "30d") {
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 30);
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
          previousPeriodEnd = new Date(periodStart);
        } else {
          // All time - compare last 30 days vs previous 30 days
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 30);
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
          previousPeriodEnd = new Date(periodStart);
        }

        periodStart.setHours(0, 0, 0, 0);
        previousPeriodStart.setHours(0, 0, 0, 0);
        previousPeriodEnd.setHours(0, 0, 0, 0);

        // Helper function to count connections in a period
        const countConnectionsInPeriod = async (startDate: Date, endDate?: Date) => {
          let query1 = supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", user.id);
          
          let query2 = supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id);

          if (endDate) {
            query1 = query1.gte("created_at", startDate.toISOString()).lt("created_at", endDate.toISOString());
            query2 = query2.gte("created_at", startDate.toISOString()).lt("created_at", endDate.toISOString());
          } else {
            query1 = query1.gte("created_at", startDate.toISOString());
            query2 = query2.gte("created_at", startDate.toISOString());
          }

          const { data: followingMe } = await query1;
          const { data: iAmFollowing } = await query2;

          const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
          const iAmFollowingIds = new Set(iAmFollowing?.map((f: any) => f.following_id) || []);
          return Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id)).length;
        };

        // Connections in current period
        const connections = await countConnectionsInPeriod(periodStart);
        const previousConnections = await countConnectionsInPeriod(previousPeriodStart, previousPeriodEnd);

        // Posts in current period
        const { count: postsThisWeek } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .gte("created_at", periodStart.toISOString());

        // Posts in previous period
        const { count: postsLastWeek } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .gte("created_at", previousPeriodStart.toISOString())
          .lt("created_at", previousPeriodEnd.toISOString());

        // Engagement in current period
        const { data: posts } = await supabase
          .from("posts")
          .select("id")
          .eq("profile_id", user.id)
          .gte("created_at", periodStart.toISOString());

        const postIds = posts?.map((p: any) => p.id) || [];
        
        let engagementThisWeek = 0;
        if (postIds.length > 0) {
          // Try post_reactions first, fallback to post_likes
          let reactionsCount = 0;
          try {
            const { count } = await supabase
              .from("post_reactions")
              .select("*", { count: "exact", head: true })
              .in("post_id", postIds);
            reactionsCount = count || 0;
          } catch (error) {
            // Fallback to post_likes if post_reactions doesn't exist
            const { count } = await supabase
              .from("post_likes")
              .select("*", { count: "exact", head: true })
              .in("post_id", postIds);
            reactionsCount = count || 0;
          }

          const { count: comments } = await supabase
            .from("post_comments")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds);

          engagementThisWeek = reactionsCount + (comments || 0);
        }

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): string => {
          if (previous === 0) {
            return current > 0 ? "+100%" : "0%";
          }
          const change = Math.round(((current - previous) / previous) * 100);
          return change > 0 ? `+${change}%` : `${change}%`;
        };

        const connectionsChange = calculateChange(connections, previousConnections);
        const postsChange = calculateChange(postsThisWeek || 0, postsLastWeek || 0);

        setStats({
          connections,
          connectionsChange,
          posts: postsThisWeek || 0,
          postsChange,
          engagement: engagementThisWeek,
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading brief stats:", error);
      }
    };

    loadBriefStats();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("brief-analytics-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => loadBriefStats(), 500);
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
          setTimeout(() => loadBriefStats(), 500);
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
          setTimeout(() => loadBriefStats(), 500);
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
          setTimeout(() => loadBriefStats(), 500);
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
          setTimeout(() => loadBriefStats(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, timePeriod]);

  if (!stats) return null;

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "24h": return "Last 24h";
      case "7d": return "Last 7d";
      case "30d": return "Last 30d";
      case "all": return "All Time";
      default: return "Last 7d";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Analytics</h3>
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
          className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white font-medium"
        >
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="all">All</option>
        </select>
      </div>
      <Link
        href="/analytics"
        className="block bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-lg shadow-lg p-4 text-white hover:shadow-xl transition-all card-hover border border-indigo-400 hover:border-indigo-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-indigo-100 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })} • {getTimePeriodLabel()}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 opacity-90" />
        </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/15 rounded-lg p-2.5 backdrop-blur-sm border border-white/25 min-w-0">
          <p className="text-xs text-indigo-100 mb-1.5 font-medium truncate">Connections</p>
          <p className="text-2xl font-bold mb-1 leading-none">{stats.connections}</p>
          <p className="text-xs text-indigo-100 truncate">{stats.connectionsChange} • {getTimePeriodLabel()}</p>
        </div>
        <div className="bg-white/15 rounded-lg p-2.5 backdrop-blur-sm border border-white/25 min-w-0">
          <p className="text-xs text-indigo-100 mb-1.5 font-medium truncate">Posts</p>
          <p className="text-2xl font-bold mb-1 leading-none">{stats.posts}</p>
          <p className="text-xs text-indigo-100 truncate">{stats.postsChange} • vs prev {timePeriod === "24h" ? "24h" : timePeriod === "7d" ? "7d" : timePeriod === "30d" ? "30d" : "30d"}</p>
        </div>
        <div className="bg-white/15 rounded-lg p-2.5 backdrop-blur-sm border border-white/25 min-w-0">
          <p className="text-xs text-indigo-100 mb-1.5 font-medium truncate">Engagement</p>
          <p className="text-2xl font-bold mb-1 leading-none">{stats.engagement}</p>
          <p className="text-xs text-indigo-100 truncate">{getTimePeriodLabel()}</p>
        </div>
      </div>
      <p className="text-xs text-indigo-100 mt-3 pt-3 border-t border-white/25 text-center font-semibold">
        View detailed analytics →
      </p>
    </Link>
    </div>
  );
}

