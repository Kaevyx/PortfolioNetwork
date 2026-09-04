"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  Crown,
  CheckCircle2,
  X,
  ArrowRight,
  Users,
  MessageSquare,
  HardDrive,
  Calendar,
  TrendingUp,
  BarChart3,
  FileText,
  Download,
  Code,
  Shield,
  Lock,
  Eye,
  CreditCard,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  getUserPlanFeatures, 
  getFeatureLimit, 
  canPerformAction,
  hasFeatureAccess 
} from "@/lib/utils/subscriptionFeatures";

interface PlanSummaryProps {
  profile?: any;
}

export function PlanSummary({ profile }: PlanSummaryProps) {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [planStats, setPlanStats] = useState({
    postsThisMonth: 0,
    connectionsCount: 0,
    storageUsedMB: 0,
    storageLimitMB: 50,
    scheduledPostsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    loadPlanStats();
  }, [isLoaded, user?.id]);

  const loadPlanStats = async () => {
    try {
      setLoading(true);
      const userPlan = profile?.subscription_plan || "free";
      const features = getUserPlanFeatures(userPlan);
      
      // Get posts this period (based on renewal date, not calendar month)
      const now = new Date();
      let periodStart: Date;
      
      if (profile?.subscription_renewal_date) {
        const renewalDate = new Date(profile.subscription_renewal_date);
        if (renewalDate > now) {
          periodStart = new Date(renewalDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
        } else {
          periodStart = new Date(renewalDate);
          while (periodStart <= now) {
            const next = new Date(periodStart);
            next.setMonth(next.getMonth() + 1);
            if (next > now) break;
            periodStart = next;
          }
        }
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user?.id)
        .gte("created_at", periodStart.toISOString())
        .is("is_scheduled", false);
      
      // Get connections count
      const { count: connectionsCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user?.id);
      
      // Get storage usage
      const { data: storageUsage } = await supabase
        .from("storage_usage")
        .select("total_bytes")
        .eq("user_id", user?.id)
        .single();
      
      const storageLimitMB = getFeatureLimit(userPlan, "maxStorageMB");
      const storageUsedMB = storageUsage ? Math.round(storageUsage.total_bytes / (1024 * 1024)) : 0;
      
      // Get scheduled posts count (only for Pro/Ultimate)
      let scheduledPostsCount = 0;
      if (canPerformAction(userPlan, "schedulePost")) {
        const { count: scheduledCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user?.id)
          .eq("is_scheduled", true);
        scheduledPostsCount = scheduledCount || 0;
      }
      
      setPlanStats({
        postsThisMonth: postsCount || 0,
        connectionsCount: connectionsCount || 0,
        storageUsedMB,
        storageLimitMB,
        scheduledPostsCount,
      });
    } catch (error) {
      console.error("Error loading plan stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !user?.id || loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        </div>
      </div>
    );
  }

  const userPlan = profile?.subscription_plan || "free";
  const features = getUserPlanFeatures(userPlan);
  const maxPosts = getFeatureLimit(userPlan, "maxPostsPerMonth");
  const maxConnections = getFeatureLimit(userPlan, "maxConnections");
  const postsRemaining = maxPosts === -1 ? -1 : Math.max(0, maxPosts - planStats.postsThisMonth);
  const connectionsRemaining = maxConnections === -1 ? -1 : Math.max(0, maxConnections - planStats.connectionsCount);
  const storageRemaining = planStats.storageLimitMB - planStats.storageUsedMB;
  const storagePercent = (planStats.storageUsedMB / planStats.storageLimitMB) * 100;
  const canSchedule = canPerformAction(userPlan, "schedulePost");

  const planConfig = {
    free: {
      name: "Free",
      icon: <Zap className="w-6 h-6" />,
      color: "text-gray-600 dark:text-gray-300",
      bgColor: "bg-gray-100 dark:bg-gray-700",
      gradient: "from-gray-500 to-gray-600",
    },
    pro: {
      name: "Pro",
      icon: <Sparkles className="w-6 h-6" />,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      gradient: "from-indigo-500 to-purple-600",
    },
    ultimate: {
      name: "Ultimate",
      icon: <Crown className="w-6 h-6" />,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      gradient: "from-purple-500 to-pink-600",
    },
  };

  const config = planConfig[userPlan as keyof typeof planConfig] || planConfig.free;
  const isFree = userPlan === "free";
  const isPro = userPlan === "pro";
  const isUltimate = userPlan === "ultimate";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Plan Header */}
      <div className={`bg-gradient-to-r ${config.gradient} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              {config.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold">{config.name} Plan</h3>
              <p className="text-white/80 text-sm">
                {isFree && "Perfect for getting started"}
                {isPro && "For professionals who want more"}
                {isUltimate && "For power users and professionals"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              aria-label={isCollapsed ? "Expand plan details" : "Collapse plan details"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <Link
              href="/dashboard?tab=billing"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            >
              Billing
              <CreditCard className="w-4 h-4" />
            </Link>
            {!isUltimate && (
              <Link
                href="/pricing"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              >
                Upgrade
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && (
      <div className="p-6 space-y-6">
        {/* Usage Metrics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Usage This Month
          </h4>

          {/* Posts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <MessageSquare className="w-4 h-4" />
                <span>Posts</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {planStats.postsThisMonth}
                {maxPosts !== -1 && ` / ${maxPosts}`}
                {maxPosts === -1 && " / Unlimited"}
              </span>
            </div>
            {maxPosts !== -1 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    postsRemaining === 0
                      ? "bg-red-500"
                      : postsRemaining <= maxPosts * 0.2
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, (planStats.postsThisMonth / maxPosts) * 100)}%` }}
                />
              </div>
            )}
            {maxPosts !== -1 && postsRemaining <= maxPosts * 0.2 && postsRemaining > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {postsRemaining} posts remaining this month
              </p>
            )}
            {maxPosts !== -1 && postsRemaining === 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Post limit reached. Upgrade for unlimited posts.
              </p>
            )}
          </div>

          {/* Connections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4" />
                <span>Connections</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {planStats.connectionsCount}
                {maxConnections !== -1 && ` / ${maxConnections}`}
                {maxConnections === -1 && " / Unlimited"}
              </span>
            </div>
            {maxConnections !== -1 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    connectionsRemaining === 0
                      ? "bg-red-500"
                      : connectionsRemaining <= maxConnections * 0.2
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, (planStats.connectionsCount / maxConnections) * 100)}%` }}
                />
              </div>
            )}
            {maxConnections !== -1 && connectionsRemaining <= maxConnections * 0.2 && connectionsRemaining > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {connectionsRemaining} connections remaining
              </p>
            )}
            {maxConnections !== -1 && connectionsRemaining === 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Connection limit reached. Upgrade for unlimited connections.
              </p>
            )}
          </div>

          {/* Scheduled Posts - Pro/Ultimate only */}
          {canSchedule && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>Scheduled Posts</span>
                </div>
                <Link
                  href="/scheduled-posts"
                  className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {planStats.scheduledPostsCount} pending
                </Link>
              </div>
              {planStats.scheduledPostsCount > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, (planStats.scheduledPostsCount / 10) * 100)}%` }}
                  />
                </div>
              )}
              {planStats.scheduledPostsCount === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  No scheduled posts
                </p>
              )}
            </div>
          )}

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <HardDrive className="w-4 h-4" />
                <span>Storage</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {planStats.storageUsedMB} MB / {planStats.storageLimitMB} MB
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storagePercent >= 90
                    ? "bg-red-500"
                    : storagePercent >= 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(100, storagePercent)}%` }}
              />
            </div>
            {storageRemaining < planStats.storageLimitMB * 0.1 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {storageRemaining} MB remaining. Consider upgrading for more storage.
              </p>
            )}
          </div>
        </div>

        {/* Feature Access */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            Available Features
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              {features.basicAnalytics ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.basicAnalytics ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                Basic Analytics
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.advancedAnalytics ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.advancedAnalytics ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                Advanced Analytics
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.fileUploads ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.fileUploads ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                File Uploads
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.postScheduling ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.postScheduling ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                Post Scheduling
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.richReactions ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.richReactions ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                Rich Reactions
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.dataExport ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.dataExport ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                Data Export
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.premiumBadge ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.premiumBadge ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                Premium Badge
              </span>
            </div>
            <div className="flex items-center gap-2">
              {features.apiAccess ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={features.apiAccess ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                API Access
              </span>
            </div>
          </div>
        </div>

        {/* Safety Features - Always Available */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            Safety Features (Always Free)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Content Moderation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Verification Badge</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Reporting System</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Privacy Controls</span>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {isFree && (
          <Link
            href="/pricing"
            className="block w-full text-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Upgrade to Pro
            <ArrowRight className="w-4 h-4 inline-block ml-2" />
          </Link>
        )}
        {isPro && (
          <Link
            href="/pricing"
            className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
          >
            Upgrade to Ultimate
            <ArrowRight className="w-4 h-4 inline-block ml-2" />
          </Link>
        )}
      </div>
      )}
    </div>
  );
}

