"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Ban,
  Mail,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  FileText,
  UserX,
  UserCheck,
  BarChart3,
  Calendar,
  ExternalLink,
  Flag,
} from "lucide-react";
import Link from "next/link";

interface ProblematicUser {
  clerk_id: string;
  display_name: string;
  count: number;
  last_occurrence?: string;
  severity?: "low" | "medium" | "high";
}

interface ModerationStats {
  totalSuspensions: number;
  totalWarnings: number;
  totalTickets: number;
  totalReports: number;
  activeSuspensions: number;
  unacknowledgedWarnings: number;
  openTickets: number;
  pendingReports: number;
  suspensionsThisMonth: number;
  warningsThisMonth: number;
  ticketsThisMonth: number;
  reportsThisMonth: number;
}

export function AdminUserModerationAnalytics() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [problematicUsers, setProblematicUsers] = useState<{
    suspensions: ProblematicUser[];
    warnings: ProblematicUser[];
    tickets: ProblematicUser[];
    reports: ProblematicUser[];
  } | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadProblematicUsers()]);
    } catch (error) {
      console.error("Error loading moderation analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date();
      const timeRanges = {
        "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        "all": new Date(0),
      };
      const periodStart = timeRanges[timeRange];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total counts
      const [
        { count: totalSuspensions },
        { count: totalWarnings },
        { count: totalTickets },
        { count: totalReports },
        { count: activeSuspensions },
        { count: unacknowledgedWarnings },
        { count: openTickets },
        { count: pendingReports },
        { count: suspensionsThisMonth },
        { count: warningsThisMonth },
        { count: ticketsThisMonth },
        { count: reportsThisMonth },
      ] = await Promise.all([
        supabase
          .from("user_account_history")
          .select("*", { count: "exact", head: true })
          .eq("action_type", "account_suspended"),
        supabase
          .from("content_warnings")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("reported_type", "profile"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_suspended", true),
        supabase
          .from("content_warnings")
          .select("*", { count: "exact", head: true })
          .eq("is_acknowledged", false)
          .eq("is_active", true),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress", "waiting_user", "customer_reply"]),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("user_account_history")
          .select("*", { count: "exact", head: true })
          .eq("action_type", "account_suspended")
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("content_warnings")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("reported_type", "profile")
          .gte("created_at", monthStart.toISOString()),
      ]);

      setStats({
        totalSuspensions: totalSuspensions || 0,
        totalWarnings: totalWarnings || 0,
        totalTickets: totalTickets || 0,
        totalReports: totalReports || 0,
        activeSuspensions: activeSuspensions || 0,
        unacknowledgedWarnings: unacknowledgedWarnings || 0,
        openTickets: openTickets || 0,
        pendingReports: pendingReports || 0,
        suspensionsThisMonth: suspensionsThisMonth || 0,
        warningsThisMonth: warningsThisMonth || 0,
        ticketsThisMonth: ticketsThisMonth || 0,
        reportsThisMonth: reportsThisMonth || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadProblematicUsers = async () => {
    try {
      // Get users with most suspensions
      const { data: suspensionHistory } = await supabase
        .from("user_account_history")
        .select("user_id, created_at")
        .eq("action_type", "account_suspended")
        .order("created_at", { ascending: false });

      const suspensionCounts: Record<string, { count: number; lastOccurrence: string }> = {};
      if (suspensionHistory) {
        suspensionHistory.forEach((entry: any) => {
          if (!suspensionCounts[entry.user_id]) {
            suspensionCounts[entry.user_id] = { count: 0, lastOccurrence: entry.created_at };
          }
          suspensionCounts[entry.user_id].count += 1;
          if (new Date(entry.created_at) > new Date(suspensionCounts[entry.user_id].lastOccurrence)) {
            suspensionCounts[entry.user_id].lastOccurrence = entry.created_at;
          }
        });
      }

      // Also count currently suspended users
      const { data: currentlySuspended } = await supabase
        .from("profiles")
        .select("clerk_id")
        .eq("is_suspended", true);

      if (currentlySuspended) {
        currentlySuspended.forEach((user: any) => {
          if (!suspensionCounts[user.clerk_id]) {
            suspensionCounts[user.clerk_id] = { count: 0, lastOccurrence: new Date().toISOString() };
          }
          suspensionCounts[user.clerk_id].count += 1;
        });
      }

      // Get users with most warnings (with severity)
      const { data: warnings } = await supabase
        .from("content_warnings")
        .select("user_id, created_at, severity")
        .order("created_at", { ascending: false });

      const warningCounts: Record<string, { count: number; lastOccurrence: string; highSeverity: number }> = {};
      if (warnings) {
        warnings.forEach((warning: any) => {
          if (!warningCounts[warning.user_id]) {
            warningCounts[warning.user_id] = { count: 0, lastOccurrence: warning.created_at, highSeverity: 0 };
          }
          warningCounts[warning.user_id].count += 1;
          if (warning.severity === "high") {
            warningCounts[warning.user_id].highSeverity += 1;
          }
          if (new Date(warning.created_at) > new Date(warningCounts[warning.user_id].lastOccurrence)) {
            warningCounts[warning.user_id].lastOccurrence = warning.created_at;
          }
        });
      }

      // Get users with most support tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("user_id, created_at, status")
        .order("created_at", { ascending: false });

      const ticketCounts: Record<string, { count: number; lastOccurrence: string; openTickets: number }> = {};
      if (tickets) {
        tickets.forEach((ticket: any) => {
          if (!ticketCounts[ticket.user_id]) {
            ticketCounts[ticket.user_id] = { count: 0, lastOccurrence: ticket.created_at, openTickets: 0 };
          }
          ticketCounts[ticket.user_id].count += 1;
          if (["open", "in_progress", "waiting_user", "customer_reply"].includes(ticket.status)) {
            ticketCounts[ticket.user_id].openTickets += 1;
          }
          if (new Date(ticket.created_at) > new Date(ticketCounts[ticket.user_id].lastOccurrence)) {
            ticketCounts[ticket.user_id].lastOccurrence = ticket.created_at;
          }
        });
      }

      // Get users with most reports
      const { data: reports } = await supabase
        .from("reports")
        .select("reported_id, created_at, status")
        .eq("reported_type", "profile")
        .order("created_at", { ascending: false });

      const reportCounts: Record<string, { count: number; lastOccurrence: string; pendingReports: number }> = {};
      if (reports) {
        reports.forEach((report: any) => {
          if (!reportCounts[report.reported_id]) {
            reportCounts[report.reported_id] = { count: 0, lastOccurrence: report.created_at, pendingReports: 0 };
          }
          reportCounts[report.reported_id].count += 1;
          if (report.status === "pending") {
            reportCounts[report.reported_id].pendingReports += 1;
          }
          if (new Date(report.created_at) > new Date(reportCounts[report.reported_id].lastOccurrence)) {
            reportCounts[report.reported_id].lastOccurrence = report.created_at;
          }
        });
      }

      // Get all unique user IDs
      const allUserIds = new Set([
        ...Object.keys(suspensionCounts),
        ...Object.keys(warningCounts),
        ...Object.keys(ticketCounts),
        ...Object.keys(reportCounts),
      ]);

      if (allUserIds.size === 0) {
        setProblematicUsers({ suspensions: [], warnings: [], tickets: [], reports: [] });
        return;
      }

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("clerk_id, display_name")
        .in("clerk_id", Array.from(allUserIds));

      const profileMap = new Map(profiles?.map((p: any) => [p.clerk_id, p.display_name]) || []);

      // Build results with severity indicators
      const suspensions = Object.entries(suspensionCounts)
        .map(([clerk_id, data]) => ({
          clerk_id,
          display_name: profileMap.get(clerk_id) || "Unknown",
          count: data.count,
          last_occurrence: data.lastOccurrence,
          severity: data.count >= 3 ? "high" : data.count >= 2 ? "medium" : "low",
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const warningsList = Object.entries(warningCounts)
        .map(([clerk_id, data]) => ({
          clerk_id,
          display_name: profileMap.get(clerk_id) || "Unknown",
          count: data.count,
          last_occurrence: data.lastOccurrence,
          severity: data.highSeverity > 0 || data.count >= 5 ? "high" : data.count >= 3 ? "medium" : "low",
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const ticketsList = Object.entries(ticketCounts)
        .map(([clerk_id, data]) => ({
          clerk_id,
          display_name: profileMap.get(clerk_id) || "Unknown",
          count: data.count,
          last_occurrence: data.lastOccurrence,
          severity: data.openTickets >= 3 || data.count >= 10 ? "high" : data.count >= 5 ? "medium" : "low",
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const reportsList = Object.entries(reportCounts)
        .map(([clerk_id, data]) => ({
          clerk_id,
          display_name: profileMap.get(clerk_id) || "Unknown",
          count: data.count,
          last_occurrence: data.lastOccurrence,
          severity: data.pendingReports >= 2 || data.count >= 5 ? "high" : data.count >= 3 ? "medium" : "low",
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setProblematicUsers({
        suspensions,
        warnings: warningsList,
        tickets: ticketsList,
        reports: reportsList,
      });
    } catch (error) {
      console.error("Error loading problematic users:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getSeverityColor = (severity?: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      case "low":
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600";
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Moderation Analytics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor user behavior, suspensions, warnings, tickets, and reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Suspensions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Suspensions</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSuspensions}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">total</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {stats.activeSuspensions} active
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.suspensionsThisMonth} this month
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Warnings</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalWarnings}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">total</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                  {stats.unacknowledgedWarnings} unacknowledged
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.warningsThisMonth} this month
                </span>
              </div>
            </div>
          </div>

          {/* Support Tickets */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Support Tickets</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTickets}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">total</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {stats.openTickets} open
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.ticketsThisMonth} this month
                </span>
              </div>
            </div>
          </div>

          {/* Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reports</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalReports}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">total</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {stats.pendingReports} pending
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {stats.reportsThisMonth} this month
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problematic Users Grid */}
      {problematicUsers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Suspensions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Suspensions</h3>
              </div>
              <Link
                href="/admin?tab=users"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {problematicUsers.suspensions.length > 0 ? (
                problematicUsers.suspensions.map((user, idx) => (
                  <Link
                    key={user.clerk_id}
                    href={`/admin?tab=users&user=${user.clerk_id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-sm font-semibold text-red-600 dark:text-red-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.display_name}
                          </span>
                          {user.severity && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(user.severity)}`}>
                              {user.severity}
                            </span>
                          )}
                        </div>
                        {user.last_occurrence && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Last: {formatRelativeTime(user.last_occurrence)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {user.count}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No suspensions</p>
              )}
            </div>
          </div>

          {/* Most Warnings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Warnings</h3>
              </div>
              <Link
                href="/admin?tab=moderation"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {problematicUsers.warnings.length > 0 ? (
                problematicUsers.warnings.map((user, idx) => (
                  <Link
                    key={user.clerk_id}
                    href={`/admin?tab=users&user=${user.clerk_id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.display_name}
                          </span>
                          {user.severity && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(user.severity)}`}>
                              {user.severity}
                            </span>
                          )}
                        </div>
                        {user.last_occurrence && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Last: {formatRelativeTime(user.last_occurrence)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                        {user.count}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No warnings</p>
              )}
            </div>
          </div>

          {/* Most Support Tickets */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Support Tickets</h3>
              </div>
              <Link
                href="/admin?tab=support"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {problematicUsers.tickets.length > 0 ? (
                problematicUsers.tickets.map((user, idx) => (
                  <Link
                    key={user.clerk_id}
                    href={`/admin?tab=users&user=${user.clerk_id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.display_name}
                          </span>
                          {user.severity && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(user.severity)}`}>
                              {user.severity}
                            </span>
                          )}
                        </div>
                        {user.last_occurrence && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Last: {formatRelativeTime(user.last_occurrence)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {user.count}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No tickets</p>
              )}
            </div>
          </div>

          {/* Most Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Reports</h3>
              </div>
              <Link
                href="/admin?tab=reports"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {problematicUsers.reports.length > 0 ? (
                problematicUsers.reports.map((user, idx) => (
                  <Link
                    key={user.clerk_id}
                    href={`/admin?tab=users&user=${user.clerk_id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.display_name}
                          </span>
                          {user.severity && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityColor(user.severity)}`}>
                              {user.severity}
                            </span>
                          )}
                        </div>
                        {user.last_occurrence && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Last: {formatRelativeTime(user.last_occurrence)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {user.count}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No reports</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Metrics Section */}
      {stats && problematicUsers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Monthly Trends
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Suspensions This Month</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.suspensionsThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Warnings This Month</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.warningsThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Tickets This Month</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.ticketsThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Reports This Month</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.reportsThisMonth}
                </span>
              </div>
            </div>
          </div>

          {/* Action Required */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Action Required
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin?tab=reports"
                className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border border-orange-200 dark:border-orange-800"
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Pending Reports</span>
                </div>
                <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {stats.pendingReports}
                </span>
              </Link>
              <Link
                href="/admin?tab=moderation"
                className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Unacknowledged Warnings</span>
                </div>
                <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                  {stats.unacknowledgedWarnings}
                </span>
              </Link>
              <Link
                href="/admin?tab=support"
                className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Open Support Tickets</span>
                </div>
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {stats.openTickets}
                </span>
              </Link>
              <Link
                href="/admin?tab=users"
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Active Suspensions</span>
                </div>
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {stats.activeSuspensions}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

