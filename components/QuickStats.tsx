"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TimePeriod = "24h" | "7d" | "30d" | "all";

export function QuickStats() {
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

    const loadStats = async () => {
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

        // Views in current period
        const { data: posts } = await supabase
          .from("posts")
          .select("id")
          .eq("profile_id", user.id);

        const postIds = posts?.map((p: any) => p.id) || [];
        
        let viewsThisWeek = 0;
        let viewsLastWeek = 0;

        if (postIds.length > 0) {
          const { count: viewsThis } = await supabase
            .from("post_views")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds)
            .gte("viewed_at", periodStart.toISOString());

          const { count: viewsLast } = await supabase
            .from("post_views")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds)
            .gte("viewed_at", previousPeriodStart.toISOString())
            .lt("viewed_at", previousPeriodEnd.toISOString());

          viewsThisWeek = viewsThis || 0;
          viewsLastWeek = viewsLast || 0;
        }

        const postsChange = postsLastWeek 
          ? ((postsThisWeek || 0) - postsLastWeek) / postsLastWeek * 100
          : 0;

        const viewsChange = viewsLastWeek
          ? ((viewsThisWeek - viewsLastWeek) / viewsLastWeek * 100)
          : 0;

        setStats({
          postsThisWeek: postsThisWeek || 0,
          postsChange,
          viewsThisWeek,
          viewsChange,
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("quick-stats-updates")
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
          table: "post_views",
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

  const StatItem = ({ label, value, change }: { label: string; value: number; change: number }) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const isNeutral = change === 0;

    return (
      <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex-1">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" />
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isPositive && <TrendingUp className="w-4 h-4 text-green-500" />}
          {isNegative && <TrendingDown className="w-4 h-4 text-red-500" />}
          {isNeutral && <Minus className="w-4 h-4 text-gray-400" />}
          <span className={`text-xs font-semibold ${
            isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
          }`}>
            {change > 0 ? "+" : ""}{change.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Stats</h2>
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
      <div className="space-y-2">
        <StatItem
          label={`Posts (${getTimePeriodLabel()})`}
          value={stats.postsThisWeek}
          change={stats.postsChange}
        />
        <StatItem
          label={`Views (${getTimePeriodLabel()})`}
          value={stats.viewsThisWeek}
          change={stats.viewsChange}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <RefreshCw className="w-3 h-3" />
        <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
      </div>
    </div>
  );
}

