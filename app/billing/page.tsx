"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  TrendingUp,
  Users,
  FileText,
  HardDrive,
  Zap,
  Crown,
  Sparkles
} from "lucide-react";
import { showToast } from "@/lib/utils/toast";
import { getUserPlanFeatures, getFeatureLimit } from "@/lib/utils/subscriptionFeatures";
import Link from "next/link";

interface SubscriptionDetails {
  subscription_id: string;
  plan_name: string;
  plan_display_name: string;
  status: string;
  is_trial: boolean;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  billing_cycle: string;
  last_limit_reset: string | null;
  custom_price_monthly?: number | null;
  custom_price_yearly?: number | null;
  price_monthly?: number | null;
  price_yearly?: number | null;
}

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [usage, setUsage] = useState({
    posts: 0,
    connections: 0,
    storageMB: 0,
  });
  const [cancelling, setCancelling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  useEffect(() => {
    if (isLoaded && user?.id) {
      loadBillingData();
      
      // Refresh data periodically to catch status changes
      const interval = setInterval(() => {
        console.log("Periodic refresh triggered (billing page)");
        loadBillingData();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [isLoaded, user?.id]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Get subscription details
      const { data: subData, error: subError } = await supabase
        .rpc('get_user_subscription_details', { p_user_id: user?.id });
      
      if (subError && subError.code !== 'P0001') {
        console.error("Error loading subscription:", subError);
      }
      
      // Also query directly from database as a fallback/verification
      const { data: directSubData, error: directError } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          status,
          plan_id,
          billing_cycle,
          is_trial,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          cancelled_at,
          last_limit_reset,
          subscription_plans:plan_id (
            name,
            display_name
          )
        `)
        .eq("user_id", user?.id)
        .in("status", ["active", "trial", "suspended"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("Direct database query result (billing page):", directSubData);
      console.log("Direct query status (billing page):", directSubData?.status);
      console.log("Direct query billing_cycle (billing page):", directSubData?.billing_cycle);
      
      // Use direct query if RPC doesn't return data, or if status is suspended
      if (directSubData && (!subData || subData.length === 0 || directSubData.status === 'suspended')) {
        console.log("Using direct query result (RPC may have missed suspended status)");
        
        // Get renewal date using RPC if available
        let renewalDate = null;
        if (directSubData.current_period_end) {
          renewalDate = directSubData.current_period_end;
        } else {
          try {
            const { data: renewalData } = await supabase
              .rpc('get_subscription_renewal_date', { p_user_id: user?.id });
            renewalDate = renewalData || null;
          } catch (e) {
            console.log("Could not get renewal date from RPC");
          }
        }
        
        const directSubscriptionData = {
          subscription_id: directSubData.id,
          plan_name: directSubData.subscription_plans?.name || "free",
          plan_display_name: directSubData.subscription_plans?.display_name || "Free",
          status: String(directSubData.status || "active").trim(),
          is_trial: directSubData.is_trial || false,
          trial_start: directSubData.trial_start,
          trial_end: directSubData.trial_end,
          current_period_start: directSubData.current_period_start,
          current_period_end: directSubData.current_period_end,
          renewal_date: renewalDate,
          cancel_at_period_end: directSubData.cancel_at_period_end || false,
          cancelled_at: directSubData.cancelled_at,
          billing_cycle: directSubData.billing_cycle || "monthly", // Preserve actual billing cycle
          last_limit_reset: directSubData.last_limit_reset,
        };
        console.log("Direct subscription data (billing page):", directSubscriptionData);
        console.log("Billing cycle preserved (billing page):", directSubscriptionData.billing_cycle);
        setSubscription(directSubscriptionData);
      } else if (subData && subData.length > 0) {
        // Ensure status is properly set from RPC response - don't default to active if status exists
        const subscriptionData = {
          ...subData[0],
          status: subData[0].status !== null && subData[0].status !== undefined ? String(subData[0].status).trim() : "active"
        };
        console.log("Subscription data loaded (billing page):", subscriptionData); // Debug log
        console.log("Status value:", subscriptionData.status, "Type:", typeof subscriptionData.status, "Raw:", subData[0].status);
        
        // If RPC status doesn't match direct query, use direct query status (especially for suspended)
        if (directSubData && directSubData.status && directSubData.status !== subscriptionData.status) {
          console.warn("Status mismatch! RPC returned:", subscriptionData.status, "Direct query returned:", directSubData.status);
          subscriptionData.status = String(directSubData.status).trim();
        }
        
        // Also check if billing cycle matches - if not, use direct query billing cycle
        if (directSubData && directSubData.billing_cycle && directSubData.billing_cycle !== subscriptionData.billing_cycle) {
          console.warn("Billing cycle mismatch! RPC returned:", subscriptionData.billing_cycle, "Direct query returned:", directSubData.billing_cycle);
          subscriptionData.billing_cycle = directSubData.billing_cycle;
        }
        
        console.log("Final subscription data (billing page):", subscriptionData);
        console.log("Final status (billing page):", subscriptionData.status);
        console.log("Final billing_cycle (billing page):", subscriptionData.billing_cycle);
        setSubscription(subscriptionData);
      }
      
      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("clerk_id", user?.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }
      
      // Get usage stats
      await loadUsageStats();
    } catch (error) {
      console.error("Error loading billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    if (!user?.id) return;
    
    const userPlan = profile?.subscription_plan || subscription?.plan_name || "free";
    const renewalDate = subscription?.renewal_date || profile?.subscription_renewal_date;
    
    // Calculate period start
    let periodStart: Date;
    const now = new Date();
    
    if (renewalDate) {
      const renewal = new Date(renewalDate);
      if (renewal > now) {
        periodStart = new Date(renewal);
        periodStart.setMonth(periodStart.getMonth() - 1);
      } else {
        periodStart = new Date(renewal);
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
    
    // Get posts count
    const { count: postsCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .gte("created_at", periodStart.toISOString())
      .is("is_scheduled", false);
    
    // Get connections count
    const { count: connectionsCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id);
    
    // Get storage usage
    const { data: storageData } = await supabase
      .from("storage_usage")
      .select("total_bytes")
      .eq("user_id", user.id)
      .single();
    
    const storageMB = storageData ? Math.round(storageData.total_bytes / (1024 * 1024)) : 0;
    
    setUsage({
      posts: postsCount || 0,
      connections: connectionsCount || 0,
      storageMB,
    });
  };

  const handleStartTrial = async (planName: string) => {
    if (!user?.id) return;
    
    try {
      setStartingTrial(true);
      const response = await fetch("/api/billing/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        showToast(data.error || "Failed to start trial", "error");
        return;
      }
      
      showToast(`7-day ${planName} trial started!`, "success");
      await loadBillingData();
    } catch (error) {
      console.error("Error starting trial:", error);
      showToast("Failed to start trial", "error");
    } finally {
      setStartingTrial(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    
    if (!confirm("Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.")) {
      return;
    }
    
    try {
      setCancelling(true);
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        showToast(data.error || "Failed to cancel subscription", "error");
        return;
      }
      
      showToast("Subscription cancelled. You'll retain access until the end of your billing period.", "success");
      await loadBillingData();
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      showToast("Failed to cancel subscription", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Determine user plan - prioritize subscription plan_name, but if suspended, use profile as fallback
  const userPlan = subscription?.plan_name || profile?.subscription_plan || "free";
  
  // Check for suspended status - normalize the check more robustly
  const subscriptionStatus = subscription?.status;
  const statusString = subscriptionStatus?.toString()?.trim()?.toLowerCase() || "";
  const isSuspended = statusString === "suspended";
  
  // Debug logging
  console.log("Billing page - Plan:", userPlan, "Status:", subscription?.status, "Status String:", statusString, "Is Suspended:", isSuspended, "Full subscription:", subscription);
  
  const features = getUserPlanFeatures(userPlan, subscription?.status);
  const isTrial = subscription?.is_trial || false;
  const renewalDate = subscription?.renewal_date || profile?.subscription_renewal_date;
  const trialEnd = subscription?.trial_end || profile?.subscription_trial_end;
  const hasActiveSubscription = subscription && subscription.status === 'active';
  const hasTrial = subscription && subscription.status === 'trial';
  const isCancelled = subscription?.cancel_at_period_end || subscription?.cancelled_at;

  const getTimeRemaining = () => {
    if (isTrial && trialEnd) {
      const end = new Date(trialEnd);
      const now = new Date();
      if (end <= now) return "Trial expired";
      return formatDistanceToNow(end, { addSuffix: true });
    }
    if (renewalDate) {
      const renewal = new Date(renewalDate);
      const now = new Date();
      if (renewal <= now) return "Renewed";
      return formatDistanceToNow(renewal, { addSuffix: true });
    }
    return "N/A";
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "pro":
        return <Zap className="w-6 h-6" />;
      case "ultimate":
        return <Crown className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "pro":
        return "from-blue-500 to-cyan-500";
      case "ultimate":
        return "from-purple-500 to-pink-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Billing & Subscription
          </h1>
          <button
            onClick={async () => {
              console.log("Refresh button clicked (billing page) - forcing reload");
              await loadBillingData();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Suspension Banner */}
        {(() => {
          // Double-check suspended status with more robust checking
          const checkStatus = subscription?.status?.toString()?.trim()?.toLowerCase();
          const isActuallySuspended = checkStatus === "suspended";
          const shouldShowBanner = isActuallySuspended && (userPlan === "pro" || userPlan === "ultimate");
          console.log("Banner check (billing page) - Status:", subscription?.status, "Check Status:", checkStatus, "Is Suspended:", isActuallySuspended, "User Plan:", userPlan, "Should Show:", shouldShowBanner);
          return shouldShowBanner;
        })() && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">
                  Subscription Suspended
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  Your {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan subscription has been suspended. 
                  Your account features have been temporarily reverted to the <strong>Free Plan</strong> level until 
                  your subscription is reactivated. Please contact support if you have any questions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${getPlanColor(userPlan)} text-white`}>
                {getPlanIcon(userPlan)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {subscription?.plan_display_name || userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan
                </h2>
                {isTrial && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 mt-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                    <Clock className="w-3 h-3" />
                    Trial
                  </span>
                )}
                {isCancelled && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 mt-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                    <XCircle className="w-3 h-3" />
                    Cancelled
                  </span>
                )}
              </div>
            </div>
            {hasActiveSubscription && !isCancelled && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                    Cancelling...
                  </>
                ) : isTrial ? (
                  "Cancel Trial"
                ) : (
                  "Cancel Subscription"
                )}
              </button>
            )}
            {hasTrial && !isCancelled && (
              <button
                onClick={async () => {
                  if (!confirm("Are you sure you want to cancel your trial? You'll lose access to premium features immediately.")) {
                    return;
                  }
                  try {
                    setCancelling(true);
                    const response = await fetch("/api/billing/cancel", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ cancelImmediately: true, reason: "User cancelled trial" }),
                    });
                    const data = await response.json();
                    if (!response.ok) {
                      showToast(data.error || "Failed to cancel trial", "error");
                      return;
                    }
                    showToast("Trial cancelled successfully", "success");
                    await loadBillingData();
                  } catch (error) {
                    console.error("Error cancelling trial:", error);
                    showToast("Failed to cancel trial", "error");
                  } finally {
                    setCancelling(false);
                  }
                }}
                disabled={cancelling}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Trial"
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isTrial ? "Trial Ends" : "Renews"}
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {userPlan === "free" || 
                   subscription?.billing_cycle === "free" || 
                   subscription?.billing_cycle === "lifetime"
                    ? "N/A"
                    : renewalDate || trialEnd
                      ? format(new Date(renewalDate || trialEnd || ""), "MMM d, yyyy 'at' h:mm a")
                      : subscription?.custom_price_monthly === 0 || subscription?.custom_price_yearly === 0
                        ? "No end date"
                        : "N/A"}
                </p>
                {userPlan !== "free" && 
                 subscription?.billing_cycle !== "free" && 
                 subscription?.billing_cycle !== "lifetime" && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {getTimeRemaining()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Billing Cycle</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {userPlan === "free" ? "Free" :
                   subscription?.billing_cycle === "yearly" ? "Yearly" : 
                   subscription?.billing_cycle === "monthly" ? "Monthly" : 
                   subscription?.billing_cycle === "free" ? "Free" :
                   subscription?.billing_cycle === "lifetime" ? "Lifetime" : 
                   "Monthly"}
                </p>
                {subscription?.billing_cycle === "yearly" && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Save 17% vs monthly
                  </p>
                )}
                {(userPlan === "free" || 
                  subscription?.billing_cycle === "free" || 
                  subscription?.billing_cycle === "lifetime") && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    No charge
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Plan Start and Plan End */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plan Start</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {subscription?.current_period_start
                    ? format(new Date(subscription.current_period_start), "MMM d, yyyy 'at' h:mm a")
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plan End</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {userPlan === "free" || 
                   subscription?.billing_cycle === "free" || 
                   subscription?.billing_cycle === "lifetime"
                    ? "N/A"
                    : subscription?.current_period_end
                      ? format(new Date(subscription.current_period_end), "MMM d, yyyy 'at' h:mm a")
                      : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {isCancelled && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Subscription Cancelled
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Your subscription will remain active until {renewalDate ? format(new Date(renewalDate), "MMM d, yyyy") : "the end of your billing period"}. 
                    After that, you'll be moved to the Free plan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Monthly Usage Limits
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Limits Reset On Your Renewal Date: {userPlan === "free" || 
              subscription?.billing_cycle === "free" || 
              subscription?.billing_cycle === "lifetime"
                ? "N/A"
                : renewalDate ? format(new Date(renewalDate), "MMM d, yyyy") : "N/A"}
          </p>
          
          <div className="space-y-4">
            {/* Posts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Posts</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usage.posts} / {features.maxPostsPerMonth === -1 ? "∞" : features.maxPostsPerMonth}
                </span>
              </div>
              {features.maxPostsPerMonth !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (usage.posts / features.maxPostsPerMonth) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Connections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connections</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usage.connections} / {features.maxConnections === -1 ? "∞" : features.maxConnections}
                </span>
              </div>
              {features.maxConnections !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (usage.connections / features.maxConnections) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Storage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usage.storageMB} MB / {features.maxStorageMB} MB
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (usage.storageMB / features.maxStorageMB) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trial Options */}
        {userPlan === "free" && !hasTrial && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Start A 7-Day Free Trial
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Try Pro Or Ultimate Features Free For 7 Days. No Credit Card Required.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Pro Trial</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Unlimited posts, connections, and advanced analytics
                </p>
                <button
                  onClick={() => handleStartTrial("pro")}
                  disabled={startingTrial}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {startingTrial ? (
                    <>
                      <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    "Start Pro Trial"
                  )}
                </button>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Ultimate Trial</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Everything in Pro plus API access, white-label, and more
                </p>
                <button
                  onClick={() => handleStartTrial("ultimate")}
                  disabled={startingTrial}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {startingTrial ? (
                    <>
                      <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    "Start Ultimate Trial"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {userPlan !== "ultimate" && !hasTrial && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Upgrade Your Plan</h3>
            <p className="text-sm text-indigo-100 mb-4">
              Get More Features And Higher Limits With A Paid Plan.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              View Plans & Pricing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

