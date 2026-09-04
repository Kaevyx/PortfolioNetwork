"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  TrendingUp,
  Clock,
  BarChart3,
  Eye,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Filter,
  Activity,
  FileText,
  MousePointerClick,
  XCircle,
  CheckCircle2,
  Info,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface VisitorStats {
  total_visits: number;
  unique_visitors: number;
  unique_sessions: number;
  logged_in_visits: number;
  anonymous_visits: number;
  avg_time_on_site: number;
  bounce_rate: number;
  avg_pages_per_session: number;
}

interface ActiveUser {
  user_id: string;
  user_email: string;
  user_display_name: string;
  current_page: string;
  time_on_page: number;
  visited_at: string;
  device_type: string;
  browser_name: string;
  country: string;
}

interface TopPage {
  page_path: string;
  page_title: string;
  visit_count: number;
  unique_visitors: number;
  avg_time_on_page: number;
  bounce_count: number;
  entry_count: number;
  exit_count: number;
}

interface DeviceBreakdown {
  device_type: string;
  browser_name: string;
  os_name: string;
  visit_count: number;
  unique_visitors: number;
}

interface LocationBreakdown {
  country: string;
  country_code: string;
  city: string;
  visit_count: number;
  unique_visitors: number;
}

interface EntryExitPage {
  page_path: string;
  page_title: string;
  entry_count: number;
  exit_count: number;
  drop_off_rate: number;
}

type TimeRange = "1h" | "24h" | "7d" | "30d" | "all";
type ViewType = "overview" | "active" | "pages" | "devices" | "locations" | "journeys";

export function AdminVisitorAnalytics() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [viewType, setViewType] = useState<ViewType>("overview");
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<LocationBreakdown[]>([]);
  const [entryExitPages, setEntryExitPages] = useState<EntryExitPage[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, { name: string; username?: string | null }>>({});

  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    switch (range) {
      case "1h":
        return { start: subDays(now, 0), end: now };
      case "24h":
        return { start: subDays(now, 1), end: now };
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "all":
        return { start: new Date(0), end: now };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(timeRange);
      const startDate = startOfDay(start).toISOString();
      const endDate = endOfDay(end).toISOString();

      // Load visitor stats
      const { data: statsData, error: statsError } = await supabase.rpc("get_visitor_stats", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (statsError) {
        console.error("Error loading visitor stats:", statsError);
        // If RPC doesn't exist, set default stats
        if (statsError.code === "42883" || statsError.message?.includes("does not exist")) {
          setStats({
            total_visits: 0,
            unique_visitors: 0,
            unique_sessions: 0,
            logged_in_visits: 0,
            anonymous_visits: 0,
            avg_time_on_site: 0,
            bounce_rate: 0,
            avg_pages_per_session: 0,
          });
        }
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0] as VisitorStats);
      }

      // Load active users (last 5 minutes)
      const { data: activeData, error: activeError } = await supabase.rpc("get_active_users", {
        p_minutes: 5,
      });

      if (activeError) {
        console.error("Error loading active users:", activeError);
        // If RPC doesn't exist, set empty array
        if (activeError.code === "42883" || activeError.message?.includes("does not exist")) {
          setActiveUsers([]);
        }
      } else {
        const users = (activeData as ActiveUser[]) || [];
        setActiveUsers(users);

        // Extract profile user IDs from current_page URLs and fetch their names
        const profileUserIds = new Set<string>();
        users.forEach((user) => {
          if (user.current_page?.startsWith("/profile/")) {
            const userId = user.current_page.replace("/profile/", "").split("?")[0];
            if (userId && userId !== "user") {
              profileUserIds.add(userId);
            }
          }
        });
      }

      // Load top pages
      const { data: pagesData, error: pagesError } = await supabase.rpc("get_top_pages", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: 20,
      });

      if (pagesError) {
        console.error("Error loading top pages:", pagesError);
        if (pagesError.code === "42883" || pagesError.message?.includes("does not exist")) {
          setTopPages([]);
        }
      } else {
        setTopPages((pagesData as TopPage[]) || []);
      }

      // Load device breakdown
      const { data: deviceData, error: deviceError } = await supabase.rpc("get_device_breakdown", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (deviceError) {
        console.error("Error loading device breakdown:", deviceError);
        if (deviceError.code === "42883" || deviceError.message?.includes("does not exist")) {
          setDeviceBreakdown([]);
        }
      } else {
        setDeviceBreakdown((deviceData as DeviceBreakdown[]) || []);
      }

      // Load location breakdown
      const { data: locationData, error: locationError } = await supabase.rpc("get_location_breakdown", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: 20,
      });

      if (locationError) {
        console.error("Error loading location breakdown:", locationError);
        if (locationError.code === "42883" || locationError.message?.includes("does not exist")) {
          setLocationBreakdown([]);
        }
      } else {
        setLocationBreakdown((locationData as LocationBreakdown[]) || []);
      }

      // Load entry/exit pages
      const { data: entryExitData, error: entryExitError } = await supabase.rpc("get_entry_exit_pages", {
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: 20,
      });

      if (entryExitError) {
        console.error("Error loading entry/exit pages:", entryExitError);
        if (entryExitError.code === "42883" || entryExitError.message?.includes("does not exist")) {
          setEntryExitPages([]);
        }
      } else {
        setEntryExitPages((entryExitData as EntryExitPage[]) || []);
      }

      // Now fetch profile names for all profile pages (from active users, top pages, and entry/exit pages)
      const profileUserIds = new Set<string>();
      
      // From active users
      activeUsers.forEach((user) => {
        if (user.current_page?.startsWith("/profile/")) {
          const userId = user.current_page.replace("/profile/", "").split("?")[0];
          if (userId && userId !== "user") {
            profileUserIds.add(userId);
          }
        }
      });

      // From top pages
      const topPagesData = pagesError ? [] : ((pagesData as TopPage[]) || []);
      topPagesData.forEach((page) => {
        if (page.page_path?.startsWith("/profile/")) {
          const userId = page.page_path.replace("/profile/", "").split("?")[0];
          if (userId && userId !== "user") {
            profileUserIds.add(userId);
          }
        }
      });

      // From entry/exit pages
      const entryExitDataArray = entryExitError ? [] : ((entryExitData as EntryExitPage[]) || []);
      entryExitDataArray.forEach((page) => {
        if (page.page_path?.startsWith("/profile/")) {
          const userId = page.page_path.replace("/profile/", "").split("?")[0];
          if (userId && userId !== "user") {
            profileUserIds.add(userId);
          }
        }
      });

      // Fetch profile names and usernames for all profile pages
      if (profileUserIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("clerk_id, username, display_name")
          .in("clerk_id", Array.from(profileUserIds));

        if (profilesError) {
          console.error("Error loading profile names:", profilesError);
        } else if (profiles) {
          const nameMap: Record<string, { name: string; username?: string | null }> = {};
          profiles.forEach((profile) => {
            nameMap[profile.clerk_id] = {
              name: profile.display_name || "Unknown User",
              username: profile.username,
            };
          });
          setProfileNames(nameMap as any);
        }
      } else {
        setProfileNames({});
      }
    } catch (error) {
      console.error("Error loading visitor analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds for active users
    const interval = setInterval(() => {
      if (viewType === "active") {
        loadData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [timeRange, viewType]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Visitor Analytics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track visitors, page views, and user behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "active", label: "Active Users", icon: Activity },
          { id: "pages", label: "Pages", icon: FileText },
          { id: "devices", label: "Devices", icon: Monitor },
          { id: "locations", label: "Locations", icon: MapPin },
          { id: "journeys", label: "Entry/Exit", icon: ArrowRight },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewType(id as ViewType)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              viewType === id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {viewType === "overview" && stats && (
        <div className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Total number of page views across all visitors in the selected time period. Each page load counts as one visit.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.total_visits)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Visits</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <Users className="w-5 h-5 text-green-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Number of distinct visitors (logged-in users or anonymous sessions) who visited your site. Each unique user or session is counted once.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.unique_visitors)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Visitors</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Number of unique browsing sessions. A session starts when a visitor arrives and ends after 30 minutes of inactivity or when they close their browser.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.unique_sessions)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sessions</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Average amount of time visitors spend on your site per session. Calculated from the time between first and last page view in each session.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(stats.avg_time_on_site)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Time on Site</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Number of page visits from users who were logged in. These visits can be attributed to specific user accounts.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.logged_in_visits)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Logged In Visits</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <Users className="w-5 h-5 text-gray-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Number of page visits from visitors who were not logged in. These are tracked by session ID rather than user account.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats.anonymous_visits)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Anonymous Visits</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Percentage of sessions where visitors viewed only one page before leaving. Lower bounce rates indicate better engagement. A bounce is a single-page session.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.bounce_rate.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bounce Rate</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 relative">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <div className="relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal">
                      Average number of pages viewed per session. Higher values indicate visitors are exploring more of your site. Calculated as total page views divided by total sessions.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.avg_pages_per_session.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pages per Session</p>
            </div>
          </div>

          {/* Page Statistics */}
          {topPages.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Common Pages */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Most Visited Pages
                    </h3>
                    <span title="Pages with the highest number of visits in the selected time period">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {topPages.slice(0, 5).map((page, idx) => {
                    // Check if this is a profile page and get the profile name
                    let pageDisplay: React.ReactNode = page.page_path;
                    if (page.page_path?.startsWith("/profile/")) {
                      const profileUserId = page.page_path.replace("/profile/", "").split("?")[0];
                      const profileData = profileNames[profileUserId];
                      if (profileData) {
                        const profileUrl = getProfileUrl({ username: profileData.username, clerk_id: profileUserId });
                        pageDisplay = (
                          <Link
                            href={profileUrl}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {profileData.name}'s Profile
                          </Link>
                        );
                      } else {
                        pageDisplay = (
                          <Link
                            href={page.page_path}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {page.page_path}
                          </Link>
                        );
                      }
                    }
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {pageDisplay}
                          </div>
                          {page.page_title && !page.page_path?.startsWith("/profile/") && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {page.page_title}
                            </div>
                          )}
                        </div>
                        <div className="ml-4 text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatNumber(page.visit_count)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatNumber(page.unique_visitors)} visitors
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Least Common Pages */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Least Visited Pages
                    </h3>
                    <span title="Pages with the lowest number of visits in the selected time period">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {topPages.length > 5 ? (
                    topPages.slice(-5).reverse().map((page, idx) => {
                      // Check if this is a profile page and get the profile name
                      let pageDisplay: React.ReactNode = page.page_path;
                      if (page.page_path?.startsWith("/profile/")) {
                        const profileUserId = page.page_path.replace("/profile/", "").split("?")[0];
                        const profileData = profileNames[profileUserId];
                        if (profileData) {
                          const profileUrl = getProfileUrl({ 
                            username: typeof profileData === 'string' ? null : profileData.username, 
                            clerk_id: profileUserId 
                          });
                          pageDisplay = (
                            <Link
                              href={profileUrl}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {typeof profileData === 'string' ? profileData : profileData.name}'s Profile
                            </Link>
                          );
                        } else {
                          pageDisplay = (
                            <Link
                              href={page.page_path}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {page.page_path}
                            </Link>
                          );
                        }
                      }
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {pageDisplay}
                            </div>
                            {page.page_title && !page.page_path?.startsWith("/profile/") && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {page.page_title}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatNumber(page.visit_count)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatNumber(page.unique_visitors)} visitors
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      Not enough data to show least visited pages
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top Entry/Exit Pages */}
          {entryExitPages.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Entry Pages */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Top Entry Pages
                    </h3>
                    <span title="Pages where visitors most commonly enter your site">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {entryExitPages
                    .sort((a, b) => b.entry_count - a.entry_count)
                    .slice(0, 5)
                    .map((page, idx) => {
                      // Check if this is a profile page and get the profile name
                      let pageDisplay: React.ReactNode = page.page_path;
                      if (page.page_path?.startsWith("/profile/")) {
                        const profileUserId = page.page_path.replace("/profile/", "").split("?")[0];
                        const profileData = profileNames[profileUserId];
                        if (profileData) {
                          const profileUrl = getProfileUrl({ 
                            username: typeof profileData === 'string' ? null : profileData.username, 
                            clerk_id: profileUserId 
                          });
                          pageDisplay = (
                            <Link
                              href={profileUrl}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {typeof profileData === 'string' ? profileData : profileData.name}'s Profile
                            </Link>
                          );
                        } else {
                          pageDisplay = (
                            <Link
                              href={page.page_path}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {page.page_path}
                            </Link>
                          );
                        }
                      }
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {pageDisplay}
                            </div>
                            {page.page_title && !page.page_path?.startsWith("/profile/") && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {page.page_title}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatNumber(page.entry_count)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              entries
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Top Exit Pages */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Top Exit Pages
                    </h3>
                    <span title="Pages where visitors most commonly leave your site. High exit rates may indicate issues with these pages.">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {entryExitPages
                    .sort((a, b) => b.exit_count - a.exit_count)
                    .slice(0, 5)
                    .map((page, idx) => {
                      // Check if this is a profile page and get the profile name
                      let pageDisplay: React.ReactNode = page.page_path;
                      if (page.page_path?.startsWith("/profile/")) {
                        const profileUserId = page.page_path.replace("/profile/", "").split("?")[0];
                        const profileData = profileNames[profileUserId];
                        if (profileData) {
                          const profileUrl = getProfileUrl({ 
                            username: typeof profileData === 'string' ? null : profileData.username, 
                            clerk_id: profileUserId 
                          });
                          pageDisplay = (
                            <Link
                              href={profileUrl}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {typeof profileData === 'string' ? profileData : profileData.name}'s Profile
                            </Link>
                          );
                        } else {
                          pageDisplay = (
                            <Link
                              href={page.page_path}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {page.page_path}
                            </Link>
                          );
                        }
                      }
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {pageDisplay}
                            </div>
                            {page.page_title && !page.page_path?.startsWith("/profile/") && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {page.page_title}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatNumber(page.exit_count)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {page.drop_off_rate.toFixed(1)}% drop-off
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Users View */}
      {viewType === "active" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Currently Active Users ({activeUsers.length})
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Users who have visited in the last 5 minutes
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activeUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No active users at the moment
              </div>
            ) : (
              activeUsers.map((user) => {
                // Check if current_page is a profile page and get the profile name
                let pageDisplay: React.ReactNode = user.current_page;
                if (user.current_page?.startsWith("/profile/")) {
                  const profileUserId = user.current_page.replace("/profile/", "").split("?")[0];
                  const profileData = profileNames[profileUserId];
                  if (profileData) {
                    const profileUrl = getProfileUrl({ username: profileData.username, clerk_id: profileUserId });
                    pageDisplay = (
                      <Link
                        href={profileUrl}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Viewing {profileData.name}'s Profile
                      </Link>
                    );
                  } else {
                    // Still show as link even if name not loaded yet
                    pageDisplay = (
                      <Link
                        href={user.current_page}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {user.current_page}
                      </Link>
                    );
                  }
                }

                return (
                  <div key={user.user_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {user.user_display_name || user.user_email || "Anonymous"}
                          </span>
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                            Active
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                          {pageDisplay}
                          <span>•</span>
                          <span>{formatDuration(user.time_on_page)}</span>
                          <span>•</span>
                          <span>{user.device_type}</span>
                          {user.country && (
                            <>
                              <span>•</span>
                              <span>{user.country}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Top Pages View */}
      {viewType === "pages" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Pages
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Unique Visitors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg. Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Exits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {topPages.map((page, idx) => {
                  // Check if this is a profile page and get the profile name
                  let pageDisplay: React.ReactNode = page.page_path;
                  if (page.page_path?.startsWith("/profile/")) {
                    const profileUserId = page.page_path.replace("/profile/", "").split("?")[0];
                    const profileName = profileNames[profileUserId];
                    if (profileName) {
                      pageDisplay = (
                        <Link
                          href={page.page_path}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {typeof profileName === 'string' ? profileName : profileName.name}'s Profile
                        </Link>
                      );
                    } else {
                      pageDisplay = (
                        <Link
                          href={page.page_path}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {page.page_path}
                        </Link>
                      );
                    }
                  }
                  
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {pageDisplay}
                          </div>
                          {page.page_title && !page.page_path?.startsWith("/profile/") && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {page.page_title}
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(page.visit_count)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(page.unique_visitors)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatDuration(page.avg_time_on_page)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(page.entry_count)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(page.exit_count)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Devices View */}
      {viewType === "devices" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Device Types
            </h3>
            <div className="space-y-3">
              {deviceBreakdown
                .reduce((acc, item) => {
                  const existing = acc.find((x) => x.device_type === item.device_type);
                  if (existing) {
                    existing.visit_count += item.visit_count;
                    existing.unique_visitors += item.unique_visitors;
                  } else {
                    acc.push({ ...item });
                  }
                  return acc;
                }, [] as DeviceBreakdown[])
                .sort((a, b) => b.visit_count - a.visit_count)
                .map((item, idx) => {
                  const total = deviceBreakdown.reduce((sum, d) => sum + d.visit_count, 0);
                  const percentage = (item.visit_count / total) * 100;
                  const Icon =
                    item.device_type === "mobile"
                      ? Smartphone
                      : item.device_type === "tablet"
                      ? Tablet
                      : Monitor;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {item.device_type || "Unknown"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(item.visit_count)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Browsers & OS
            </h3>
            <div className="space-y-3">
              {deviceBreakdown
                .sort((a, b) => b.visit_count - a.visit_count)
                .slice(0, 10)
                .map((item, idx) => {
                  const total = deviceBreakdown.reduce((sum, d) => sum + d.visit_count, 0);
                  const percentage = (item.visit_count / total) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.browser_name} on {item.os_name}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(item.visit_count)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Locations View */}
      {viewType === "locations" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Visitor Locations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Unique Visitors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {locationBreakdown.map((location, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {location.country || "Unknown"}
                          </div>
                          {location.city && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {location.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(location.visit_count)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(location.unique_visitors)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry/Exit Pages View */}
      {viewType === "journeys" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entry & Exit Pages
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track where visitors enter and exit your site
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Entries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Exits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Drop-off Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entryExitPages.map((page, idx) => {
                  // Check if this is a profile page and get the profile name
                  let pageDisplay: React.ReactNode = page.page_path;
                  if (page.page_path?.startsWith("/profile/")) {
                    const profileUserId = page.page_path.replace("/profile/", "").split("?")[0];
                    const profileData = profileNames[profileUserId];
                    if (profileData) {
                      const profileUrl = getProfileUrl({ 
                        username: typeof profileData === 'string' ? null : profileData.username, 
                        clerk_id: profileUserId 
                      });
                      pageDisplay = (
                        <Link
                          href={profileUrl}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {typeof profileData === 'string' ? profileData : profileData.name}'s Profile
                        </Link>
                      );
                    } else {
                      pageDisplay = (
                        <Link
                          href={page.page_path}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {page.page_path}
                        </Link>
                      );
                    }
                  }
                  
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {pageDisplay}
                          </div>
                          {page.page_title && !page.page_path?.startsWith("/profile/") && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {page.page_title}
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(page.entry_count)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatNumber(page.exit_count)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            page.drop_off_rate > 50
                              ? "text-red-600 dark:text-red-400"
                              : page.drop_off_rate > 25
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {page.drop_off_rate.toFixed(1)}%
                        </span>
                        <div className="flex-1 max-w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              page.drop_off_rate > 50
                                ? "bg-red-500"
                                : page.drop_off_rate > 25
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, page.drop_off_rate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

