"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { format, formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Crown,
  Sparkles,
  RefreshCw,
  TrendingUp,
  DollarSign,
  FileText,
  Download,
  Settings,
} from "lucide-react";

// Custom Pound Sterling icon component
const PoundSterling = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>£</span>
);
import { showToast } from "@/lib/utils/toast";
import { getUserPlanFeatures, getFeatureLimit } from "@/lib/utils/subscriptionFeatures";

interface SubscriptionDetails {
  subscription_id: string | null;
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
  custom_price_monthly: number | null;
  custom_price_yearly: number | null;
  price_monthly: number | null;
  price_yearly: number | null;
}

export function UserBilling() {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [planDetails, setPlanDetails] = useState<any>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    loadBillingData();
    
    // Refresh data periodically to catch status changes
    const interval = setInterval(() => {
      console.log("Periodic refresh triggered");
      loadBillingData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [isLoaded, user?.id]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      console.log("=== USER BILLING DATA LOAD START ===");
      console.log("User ID:", user?.id);

      // Get subscription details (includes custom prices)
      const { data: subData, error: subError } = await supabase
        .rpc('get_user_subscription_details', { p_user_id: user?.id });

      console.log("RPC Response - subData:", subData);
      console.log("RPC Response - subError:", subError);
      if (subData && subData.length > 0) {
        console.log("RPC returned subscription with status:", subData[0].status);
        console.log("RPC returned billing_cycle:", subData[0].billing_cycle);
      }

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
          custom_price_monthly,
          custom_price_yearly,
          subscription_plans:plan_id (
            name,
            display_name,
            price_monthly,
            price_yearly
          )
        `)
        .eq("user_id", user?.id)
        .in("status", ["active", "trial", "suspended"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("=== DIRECT QUERY RESULT ===");
      console.log("Direct database query result:", directSubData);
      console.log("Direct query error:", directError);
      console.log("Direct query status:", directSubData?.status);
      console.log("Direct query billing_cycle:", directSubData?.billing_cycle);
      console.log("Direct query plan name:", directSubData?.subscription_plans?.name);

      // ALWAYS prioritize direct query if it shows suspended, regardless of RPC result
      const isSuspendedInDirectQuery = directSubData?.status === 'suspended';
      const hasRPCData = subData && subData.length > 0;
      
      console.log("Decision logic:");
      console.log("- Direct query has data:", !!directSubData);
      console.log("- Direct query status is suspended:", isSuspendedInDirectQuery);
      console.log("- RPC has data:", hasRPCData);
      console.log("- Will use direct query:", !hasRPCData || isSuspendedInDirectQuery);

      // Use direct query if RPC doesn't return data, or if status is suspended and RPC might not have it
      if (directSubData && (!hasRPCData || isSuspendedInDirectQuery)) {
        console.log("=== USING DIRECT QUERY RESULT ===");
        console.log("Reason: RPC may have missed suspended status or no RPC data");
        
        // Get renewal date using RPC if available, otherwise calculate
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
        
        // CRITICAL: Normalize status to ensure it's exactly 'suspended' if that's what the DB says
        const normalizedStatus = directSubData.status 
          ? String(directSubData.status).trim().toLowerCase() 
          : "active";
        const finalStatus = normalizedStatus === "suspended" ? "suspended" : normalizedStatus;
        
        const directSubscriptionData = {
          subscription_id: directSubData.id,
          plan_name: directSubData.subscription_plans?.name || "free",
          plan_display_name: directSubData.subscription_plans?.display_name || "Free",
          status: finalStatus, // Use normalized status
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
          custom_price_monthly: directSubData.custom_price_monthly,
          custom_price_yearly: directSubData.custom_price_yearly,
          price_monthly: directSubData.subscription_plans?.price_monthly || 0,
          price_yearly: directSubData.subscription_plans?.price_yearly || 0,
        };
        console.log("=== DIRECT SUBSCRIPTION DATA CREATED ===");
        console.log("Direct subscription data:", directSubscriptionData);
        console.log("Status (raw from DB):", directSubData.status);
        console.log("Status (normalized):", normalizedStatus);
        console.log("Status (final):", finalStatus);
        console.log("Billing cycle preserved:", directSubscriptionData.billing_cycle);
        setSubscription(directSubscriptionData);
        
        // Calculate effective prices (custom if set, otherwise plan price, 0 for free/lifetime)
        const isFreeOrLifetime = directSubData.billing_cycle === 'free' || directSubData.billing_cycle === 'lifetime';
        const effectiveMonthly = isFreeOrLifetime ? 0 : (directSubData.custom_price_monthly ?? directSubData.subscription_plans?.price_monthly ?? 0);
        const effectiveYearly = isFreeOrLifetime ? 0 : (directSubData.custom_price_yearly ?? directSubData.subscription_plans?.price_yearly ?? 0);
        
        setPlanDetails({
          price_monthly: effectiveMonthly,
          price_yearly: effectiveYearly,
          custom_price_monthly: directSubData.custom_price_monthly ?? null,
          custom_price_yearly: directSubData.custom_price_yearly ?? null,
        });
      } else if (subData && subData.length > 0) {
        console.log("=== USING RPC RESULT (with direct query verification) ===");
        // Ensure status is properly set from RPC response - don't default to active if status exists
        const subscriptionData = {
          ...subData[0],
          status: subData[0].status !== null && subData[0].status !== undefined ? String(subData[0].status).trim() : "active"
        };
        console.log("Subscription data loaded from RPC:", subscriptionData);
        console.log("Subscription status value:", subscriptionData.status, "Type:", typeof subscriptionData.status, "Raw:", subData[0].status);
        
        // CRITICAL: If direct query shows suspended, ALWAYS use that, regardless of RPC
        if (directSubData && directSubData.status === 'suspended') {
          console.warn("⚠️ CRITICAL: Direct query shows SUSPENDED but RPC may not! Overriding status.");
          subscriptionData.status = "suspended";
        } else if (directSubData && directSubData.status && directSubData.status !== subscriptionData.status) {
          console.warn("Status mismatch! RPC returned:", subscriptionData.status, "Direct query returned:", directSubData.status);
          subscriptionData.status = String(directSubData.status).trim();
        }
        
        // Also check if billing cycle matches - if not, use direct query billing cycle
        if (directSubData && directSubData.billing_cycle && directSubData.billing_cycle !== subscriptionData.billing_cycle) {
          console.warn("Billing cycle mismatch! RPC returned:", subscriptionData.billing_cycle, "Direct query returned:", directSubData.billing_cycle);
          subscriptionData.billing_cycle = directSubData.billing_cycle;
        }
        
        console.log("=== FINAL SUBSCRIPTION DATA (RPC path) ===");
        console.log("Final subscription data:", subscriptionData);
        console.log("Final status:", subscriptionData.status);
        console.log("Final billing_cycle:", subscriptionData.billing_cycle);
        setSubscription(subscriptionData);
        
        // Use effective prices from RPC (0 for free/lifetime, custom if set, otherwise plan price)
        // Always set planDetails from RPC response to ensure custom prices are included
        setPlanDetails({
          price_monthly: subData[0].price_monthly ?? 0,
          price_yearly: subData[0].price_yearly ?? 0,
          custom_price_monthly: subData[0].custom_price_monthly ?? null,
          custom_price_yearly: subData[0].custom_price_yearly ?? null,
          ...subData[0]
        });
      } else {
        // User doesn't have a subscription record, create default from profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("subscription_plan, subscription_renewal_date, subscription_trial_end, subscription_last_limit_reset")
          .eq("clerk_id", user?.id)
          .single();
        
        // Set planDetails even if no subscription record exists
        if (profileData) {
          // Get plan prices from subscription_plans table
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("price_monthly, price_yearly")
            .eq("name", profileData.subscription_plan || "free")
            .single();
          
          setPlanDetails({
            price_monthly: planData?.price_monthly ?? 0,
            price_yearly: planData?.price_yearly ?? 0,
            custom_price_monthly: null,
            custom_price_yearly: null,
          });
        }

        if (profileData) {
          setSubscription({
            subscription_id: null,
            plan_name: profileData.subscription_plan || "free",
            plan_display_name: (profileData.subscription_plan || "free").charAt(0).toUpperCase() + (profileData.subscription_plan || "free").slice(1),
            status: "active",
            is_trial: false,
            trial_start: null,
            trial_end: profileData.subscription_trial_end,
            current_period_start: null,
            current_period_end: profileData.subscription_renewal_date,
            renewal_date: profileData.subscription_renewal_date,
            cancel_at_period_end: false,
            cancelled_at: null,
            billing_cycle: "monthly",
            last_limit_reset: profileData.subscription_last_limit_reset,
          });
        }
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

      // Get plan details (fallback if RPC didn't return prices)
      if (!planDetails && (subscription?.plan_name || profileData?.subscription_plan)) {
        const planName = subscription?.plan_name || profileData?.subscription_plan || "free";
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("name", planName)
          .single();

        if (planData) {
          setPlanDetails(planData);
        }
      }
    } catch (error) {
      console.error("Error loading billing data:", error);
      showToast("Failed to load billing information", "error");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = () => {
    if (!subscription?.renewal_date && !subscription?.current_period_end) {
      return null;
    }

    const renewalDate = subscription.renewal_date 
      ? new Date(subscription.renewal_date)
      : subscription.current_period_end 
      ? new Date(subscription.current_period_end)
      : null;

    if (!renewalDate) return null;

    const now = new Date();
    const diff = renewalDate.getTime() - now.getTime();

    if (diff <= 0) {
      return { text: "Expired", color: "text-red-600 dark:text-red-400" };
    }

    const days = differenceInDays(renewalDate, now);
    const hours = differenceInHours(renewalDate, now) % 24;
    const minutes = differenceInMinutes(renewalDate, now) % 60;

    if (days > 0) {
      return {
        text: `${days} day${days !== 1 ? 's' : ''} remaining`,
        color: days <= 7 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400",
      };
    } else if (hours > 0) {
      return {
        text: `${hours} hour${hours !== 1 ? 's' : ''} remaining`,
        color: "text-yellow-600 dark:text-yellow-400",
      };
    } else {
      return {
        text: `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`,
        color: "text-red-600 dark:text-red-400",
      };
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case "pro":
        return <Zap className="w-6 h-6" />;
      case "ultimate":
        return <Crown className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  const getStatusBadge = () => {
    // Get status and normalize it (trim whitespace, lowercase for comparison)
    // Try multiple ways to get the status
    const statusFromSub = subscription?.status;
    const statusString = statusFromSub?.toString()?.trim()?.toLowerCase() || "";
    const currentStatus = statusString;
    
    console.log("Status badge check - Raw status:", statusFromSub, "Normalized:", currentStatus);
    
    // Check for suspended status first - this is the most important check
    if (currentStatus === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full">
          <AlertCircle className="w-4 h-4" />
          Suspended
        </span>
      );
    }

    if (subscription?.is_trial || currentStatus === "trial") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
          <Clock className="w-4 h-4" />
          Trial
        </span>
      );
    }

    if (subscription?.cancel_at_period_end || subscription?.cancelled_at || currentStatus === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full">
          <XCircle className="w-4 h-4" />
          Cancelled
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
        <CheckCircle2 className="w-4 h-4" />
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Determine user plan - prioritize subscription plan_name, but if suspended, use profile as fallback
  // This ensures we show the correct plan name even if subscription data is incomplete
  const userPlan = subscription?.plan_name || profile?.subscription_plan || "free";
  
  // Check for suspended status - normalize the check more robustly
  const subscriptionStatus = subscription?.status;
  const statusString = subscriptionStatus?.toString()?.trim()?.toLowerCase() || "";
  const isSuspended = statusString === "suspended";
  
  // Debug logging
  console.log("User billing - Plan:", userPlan, "Status:", subscription?.status, "Status String:", statusString, "Is Suspended:", isSuspended, "Full subscription:", subscription);
  
  const features = getUserPlanFeatures(userPlan, subscription?.status);
  const timeRemaining = getTimeRemaining();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage Your Subscription And Billing Details
          </p>
        </div>
        <button
          onClick={async () => {
            console.log("Refresh button clicked - forcing reload");
            await loadBillingData();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className={`bg-gradient-to-r ${
          userPlan === "pro" ? "from-indigo-500 to-purple-600" :
          userPlan === "ultimate" ? "from-purple-500 to-pink-600" :
          "from-gray-500 to-gray-600"
        } p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                {getPlanIcon(userPlan)}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{subscription?.plan_display_name || userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan</h3>
                <p className="text-white/80 text-sm mt-1">
                  {getStatusBadge()}
                </p>
              </div>
            </div>
            {userPlan !== "ultimate" && (
              <Link
                href="/pricing"
                className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Suspension Banner */}
          {(() => {
            // Double-check suspended status with more robust checking
            const checkStatus = subscription?.status?.toString()?.trim()?.toLowerCase();
            const isActuallySuspended = checkStatus === "suspended";
            const shouldShowBanner = isActuallySuspended && (userPlan === "pro" || userPlan === "ultimate");
            console.log("Banner check - Status:", subscription?.status, "Check Status:", checkStatus, "Is Suspended:", isActuallySuspended, "User Plan:", userPlan, "Should Show:", shouldShowBanner);
            return shouldShowBanner;
          })() && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
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

          {/* Billing Cycle Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Billing Cycle</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subscription?.plan_name === "free" ? "Free" :
                 subscription?.billing_cycle === "yearly" ? "Yearly" : 
                 subscription?.billing_cycle === "monthly" ? "Monthly" : 
                 subscription?.billing_cycle === "free" ? "Free" :
                 subscription?.billing_cycle === "lifetime" ? "Lifetime" : 
                 "N/A"}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Renewal Date</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subscription?.plan_name === "free" || 
                 subscription?.billing_cycle === "free" || 
                 subscription?.billing_cycle === "lifetime"
                  ? "N/A"
                  : subscription?.renewal_date || subscription?.current_period_end
                    ? format(new Date(subscription.renewal_date || subscription.current_period_end!), "MMM d, yyyy 'at' h:mm a")
                    : "N/A"}
              </p>
              {timeRemaining && subscription?.plan_name !== "free" && 
               subscription?.billing_cycle !== "free" && 
               subscription?.billing_cycle !== "lifetime" && (
                <p className={`text-xs font-semibold mt-1 ${timeRemaining.color}`}>
                  {timeRemaining.text}
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Plan Start</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subscription?.current_period_start
                  ? format(new Date(subscription.current_period_start), "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Plan End */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Plan End</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subscription?.plan_name === "free" || 
                 subscription?.billing_cycle === "free" || 
                 subscription?.billing_cycle === "lifetime"
                  ? "N/A"
                  : subscription?.current_period_end
                    ? format(new Date(subscription.current_period_end), "MMM d, yyyy 'at' h:mm a")
                    : "N/A"}
              </p>
            </div>
          </div>

          {/* Trial Info */}
          {subscription?.is_trial && subscription.trial_end && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">Trial Information</h4>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-yellow-800 dark:text-yellow-300">
                  <strong>Trial Started:</strong> {subscription.trial_start ? format(new Date(subscription.trial_start), "MMM d, yyyy") : "N/A"}
                </p>
                <p className="text-yellow-800 dark:text-yellow-300">
                  <strong>Trial Ends:</strong> {format(new Date(subscription.trial_end), "MMM d, yyyy 'at' h:mm a")}
                </p>
                <p className="text-yellow-800 dark:text-yellow-300">
                  <strong>Time Remaining:</strong> {formatDistanceToNow(new Date(subscription.trial_end), { addSuffix: false })}
                </p>
              </div>
            </div>
          )}

          {/* Plan Price */}
          {(planDetails || subscription) && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <PoundSterling className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Plan Price
              </h4>
              <div>
                {(() => {
                  const billingCycle = subscription?.billing_cycle || "monthly";
                  const isFreeOrLifetime = billingCycle === "free" || billingCycle === "lifetime";
                  const isMonthly = billingCycle === "monthly";
                  const isYearly = billingCycle === "yearly";
                  
                  if (isFreeOrLifetime) {
                    return (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {billingCycle === "free" ? "Free Plan" : "Lifetime Plan"}
                        </p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: "GBP",
                            minimumFractionDigits: 2,
                          }).format(0)}
                        </p>
                      </div>
                    );
                  }
                  
                  // Use effective prices from RPC (already includes custom prices)
                  // The RPC function returns price_monthly and price_yearly which are already calculated
                  // as: 0 for free/lifetime, custom_price if set, otherwise plan_price
                  // We should use these directly, not recalculate
                  const price = isYearly 
                    ? (planDetails?.price_yearly ?? subscription?.price_yearly ?? 0)
                    : (planDetails?.price_monthly ?? subscription?.price_monthly ?? 0);
                  
                  // Ensure we're using the effective price (already calculated by RPC)
                  // Don't recalculate here - trust the RPC function
                  
                  return (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {isYearly ? "Yearly" : "Monthly"} Billing
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(price)}
                        <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                          /{isYearly ? "year" : "month"}
                        </span>
                      </p>
                      {isYearly && planDetails.price_monthly > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Save {new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: "GBP",
                            minimumFractionDigits: 2,
                          }).format((planDetails.price_monthly * 12) - planDetails.price_yearly)} per year vs monthly
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Plan Features */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              Plan Features
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(features).map(([key, value]) => {
                if (typeof value === 'boolean') {
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {value ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={value ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Plan Limits */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Plan Limits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Connections</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {getFeatureLimit(userPlan, "maxConnections", subscription?.status) === -1 ? "Unlimited" : getFeatureLimit(userPlan, "maxConnections", subscription?.status)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Posts per Month</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {getFeatureLimit(userPlan, "maxPostsPerMonth", subscription?.status) === -1 ? "Unlimited" : getFeatureLimit(userPlan, "maxPostsPerMonth", subscription?.status)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Storage</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {getFeatureLimit(userPlan, "maxStorageMB", subscription?.status) === -1 ? "Unlimited" : `${getFeatureLimit(userPlan, "maxStorageMB", subscription?.status)} MB`}
                </p>
              </div>
            </div>
          </div>

          {/* Last Limit Reset */}
          {subscription?.last_limit_reset && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-blue-900 dark:text-blue-200">Last Limit Reset</h4>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {format(new Date(subscription.last_limit_reset), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}

          {/* Cancellation Info */}
          {subscription?.cancel_at_period_end && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h4 className="font-semibold text-red-900 dark:text-red-200">Subscription Cancelled</h4>
              </div>
              <p className="text-sm text-red-800 dark:text-red-300">
                Your Subscription Will End On {subscription.current_period_end ? format(new Date(subscription.current_period_end), "MMM d, yyyy") : "The Renewal Date"}.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/pricing"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center font-semibold"
            >
              {userPlan === "free" ? "Upgrade Plan" : "Change Plan"}
            </Link>
            {subscription?.subscription_id && !subscription.cancel_at_period_end && !subscription.is_trial && (
              <Link
                href="/billing"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
              >
                Manage Subscription
              </Link>
            )}
            {subscription?.is_trial && !subscription.cancelled_at && (
              <button
                onClick={async () => {
                  if (!confirm("Are you sure you want to cancel your trial? You'll lose access to premium features immediately.")) {
                    return;
                  }
                  try {
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
                    loadBillingData();
                  } catch (error) {
                    console.error("Error cancelling trial:", error);
                    showToast("Failed to cancel trial", "error");
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Cancel Trial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

