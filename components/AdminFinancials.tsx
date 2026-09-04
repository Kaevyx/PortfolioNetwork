"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  ArrowRight,
  ExternalLink,
  Target,
  Activity,
  Zap,
  Crown,
  Sparkles,
  Info,
} from "lucide-react";
import { showToast } from "@/lib/utils/toast";

interface Subscription {
  id: string | null;
  user_id: string;
  plan_id: string | null;
  plan_name: string;
  plan_display_name: string;
  plan_price_monthly?: number;
  plan_price_yearly?: number;
  custom_price_monthly?: number | null;
  custom_price_yearly?: number | null;
  status: string;
  is_trial: boolean;
  billing_cycle: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
}

// Tooltip component for metric explanations
const MetricTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-help"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }
        }}
      >
        <Info className="w-4 h-4" />
      </span>
      {showTooltip && (
        <div 
          className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-auto"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="whitespace-normal leading-relaxed">{text}</p>
          <div className="absolute top-full left-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      )}
    </span>
  );
};

export function AdminFinancials({ supabase, currentUserId }: { supabase: SupabaseClient; currentUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Function to navigate to billing tab with filters
  const navigateToBilling = (filters?: { status?: string; plan?: string; billingCycle?: string; customPrice?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.plan) params.set('plan', filters.plan);
    if (filters?.billingCycle) params.set('billingCycle', filters.billingCycle);
    if (filters?.customPrice) params.set('customPrice', filters.customPrice);
    
    // Navigate to admin page with billing tab and filters
    router.push(`/admin?tab=billing${params.toString() ? '&' + params.toString() : ''}`);
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSubscriptions(), loadPlans()]);
    } catch (error) {
      console.error("Error loading financial data:", error);
      showToast("Failed to load financial data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("name");

      if (error) throw error;
      if (data) setPlans(data);
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      // Load subscriptions with plan data
      const { data: subsData, error: subsError } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          user_id,
          plan_id,
          status,
          is_trial,
          billing_cycle,
          current_period_end,
          cancelled_at,
          cancel_at_period_end,
          custom_price_monthly,
          custom_price_yearly
        `);

      if (subsError) throw subsError;

      if (subsData) {
        // Load plan data separately and merge
        const planIds = [...new Set(subsData.map((s: any) => s.plan_id).filter(Boolean))];
        const { data: plansData } = await supabase
          .from("subscription_plans")
          .select("*")
          .in("id", planIds);

        const plansMap = new Map(plansData?.map((p: any) => [p.id, p]) || []);

        const formattedSubs = subsData.map((sub: any) => {
          const plan = plansMap.get(sub.plan_id);
          return {
            id: sub.id,
            user_id: sub.user_id,
            plan_id: sub.plan_id,
            plan_name: plan?.name || "free",
            plan_display_name: plan?.display_name || "Free",
            plan_price_monthly: plan?.price_monthly || 0,
            plan_price_yearly: plan?.price_yearly || 0,
            custom_price_monthly: sub.custom_price_monthly,
            custom_price_yearly: sub.custom_price_yearly,
            status: sub.status,
            is_trial: sub.is_trial,
            billing_cycle: sub.billing_cycle || "monthly",
            current_period_end: sub.current_period_end,
            cancelled_at: sub.cancelled_at,
            cancel_at_period_end: sub.cancel_at_period_end,
          };
        });
        setSubscriptions(formattedSubs);
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    }
  };

  // Calculate effective price (custom if set, otherwise plan price, 0 for free/lifetime)
  const getEffectivePrice = (sub: Subscription, isMonthly: boolean) => {
    if (sub.billing_cycle === "free" || sub.billing_cycle === "lifetime") {
      return 0;
    }
    if (isMonthly) {
      return sub.custom_price_monthly !== null && sub.custom_price_monthly !== undefined
        ? sub.custom_price_monthly
        : (sub.plan_price_monthly || 0);
    } else {
      return sub.custom_price_yearly !== null && sub.custom_price_yearly !== undefined
        ? sub.custom_price_yearly
        : (sub.plan_price_yearly || 0);
    }
  };

  // Calculate MRR (Monthly Recurring Revenue)
  const calculateMRR = () => {
    let mrr = 0;
    const activeSubs = subscriptions.filter(
      (sub) => sub.status === "active" && !sub.cancel_at_period_end && !sub.cancelled_at && sub.plan_name !== "free"
    );

    activeSubs.forEach((sub) => {
      if (sub.billing_cycle === "monthly" || sub.billing_cycle === "free" || sub.billing_cycle === "lifetime") {
        mrr += getEffectivePrice(sub, true);
      } else if (sub.billing_cycle === "yearly") {
        mrr += getEffectivePrice(sub, false) / 12;
      }
    });

    return mrr;
  };

  // Calculate ARR (Annual Recurring Revenue)
  const calculateARR = () => {
    return calculateMRR() * 12;
  };

  // Calculate potential revenue from active trials
  const calculateTrialConversionRevenue = () => {
    let potentialMRR = 0;
    const activeTrials = subscriptions.filter(
      (sub) => sub.is_trial && sub.status === "trial" && sub.plan_name !== "free"
    );

    activeTrials.forEach((sub) => {
      if (sub.billing_cycle === "monthly") {
        potentialMRR += getEffectivePrice(sub, true);
      } else if (sub.billing_cycle === "yearly") {
        potentialMRR += getEffectivePrice(sub, false) / 12;
      }
    });

    return {
      monthly: potentialMRR,
      annual: potentialMRR * 12,
      trialCount: activeTrials.length,
    };
  };

  // Calculate revenue by plan
  const calculateRevenueByPlan = () => {
    const revenueByPlan: Record<string, { mrr: number; count: number }> = {};
    const activeSubs = subscriptions.filter(
      (sub) => sub.status === "active" && !sub.cancel_at_period_end && !sub.cancelled_at && sub.plan_name !== "free"
    );

    activeSubs.forEach((sub) => {
      if (!revenueByPlan[sub.plan_name]) {
        revenueByPlan[sub.plan_name] = { mrr: 0, count: 0 };
      }
      revenueByPlan[sub.plan_name].count++;
      if (sub.billing_cycle === "monthly") {
        revenueByPlan[sub.plan_name].mrr += getEffectivePrice(sub, true);
      } else if (sub.billing_cycle === "yearly") {
        revenueByPlan[sub.plan_name].mrr += getEffectivePrice(sub, false) / 12;
      }
    });

    return revenueByPlan;
  };

  // Calculate churn metrics
  const calculateChurnMetrics = () => {
    const activeCount = subscriptions.filter(
      (sub) => sub.status === "active" && !sub.cancel_at_period_end && !sub.cancelled_at && sub.plan_name !== "free"
    ).length;

    const cancelledCount = subscriptions.filter(
      (sub) => (sub.status === "cancelled" || sub.cancel_at_period_end || sub.cancelled_at) && sub.plan_name !== "free"
    ).length;

    const totalPaid = activeCount + cancelledCount;
    const churnRate = totalPaid > 0 ? (cancelledCount / totalPaid) * 100 : 0;

    return {
      active: activeCount,
      cancelled: cancelledCount,
      total: totalPaid,
      churnRate,
    };
  };

  // Calculate revenue by status
  const calculateRevenueByStatus = () => {
    const revenueByStatus: Record<string, { mrr: number; count: number }> = {
      active: { mrr: 0, count: 0 },
      trial: { mrr: 0, count: 0 },
      cancelled: { mrr: 0, count: 0 },
      suspended: { mrr: 0, count: 0 },
    };

    subscriptions.forEach((sub) => {
      if (sub.plan_name === "free") return;

      let status = sub.status;
      if (sub.is_trial) status = "trial";
      if (sub.cancel_at_period_end || sub.cancelled_at) status = "cancelled";

      if (!revenueByStatus[status]) {
        revenueByStatus[status] = { mrr: 0, count: 0 };
      }

      revenueByStatus[status].count++;
      if (sub.billing_cycle === "monthly") {
        revenueByStatus[status].mrr += getEffectivePrice(sub, true);
      } else if (sub.billing_cycle === "yearly") {
        revenueByStatus[status].mrr += getEffectivePrice(sub, false) / 12;
      }
    });

    return revenueByStatus;
  };

  // Calculate additional metrics
  const calculateARPU = () => {
    const activeSubs = subscriptions.filter(
      (sub) => sub.status === "active" && !sub.cancel_at_period_end && !sub.cancelled_at && sub.plan_name !== "free"
    );
    if (activeSubs.length === 0) return 0;
    return mrr / activeSubs.length;
  };

  const calculateLTV = () => {
    const arpu = calculateARPU();
    const churnRate = churnMetrics.churnRate / 100;
    if (churnRate === 0) return arpu * 12; // If no churn, assume 1 year minimum
    return arpu / churnRate;
  };

  const calculateGrowthRate = () => {
    // This would ideally compare to previous period, but for now we'll calculate potential growth
    const activeCount = subscriptions.filter(
      (sub) => sub.status === "active" && !sub.cancel_at_period_end && !sub.cancelled_at && sub.plan_name !== "free"
    ).length;
    const trialCount = subscriptions.filter((sub) => sub.is_trial && sub.status === "trial").length;
    if (activeCount === 0) return trialCount > 0 ? 100 : 0;
    return (trialCount / activeCount) * 100;
  };

  const calculateCustomPricingStats = () => {
    const customPriced = subscriptions.filter(
      (sub) => (sub.custom_price_monthly !== null && sub.custom_price_monthly !== undefined) ||
                (sub.custom_price_yearly !== null && sub.custom_price_yearly !== undefined)
    );
    return {
      count: customPriced.length,
      totalMRR: customPriced.reduce((sum, sub) => {
        if (sub.billing_cycle === "monthly") {
          return sum + getEffectivePrice(sub, true);
        } else if (sub.billing_cycle === "yearly") {
          return sum + getEffectivePrice(sub, false) / 12;
        }
        return sum;
      }, 0)
    };
  };

  // Calculate lost revenue scenarios with detailed metrics
  const calculateLostRevenueScenarios = () => {
    const freeUsers = subscriptions.filter((sub) => sub.plan_name === "free");
    const proUsers = subscriptions.filter((sub) => sub.plan_name === "pro");
    const ultimateUsers = subscriptions.filter((sub) => sub.plan_name === "ultimate");
    
    // Users on "free" billing cycle (regardless of plan)
    const freeBillingCycleUsers = subscriptions.filter((sub) => sub.billing_cycle === "free");
    
    // Users on "lifetime" billing cycle (regardless of plan)
    const lifetimeBillingCycleUsers = subscriptions.filter((sub) => sub.billing_cycle === "lifetime");
    
    // Users with custom pricing
    const customPricedUsers = subscriptions.filter(
      (sub) => (sub.custom_price_monthly !== null && sub.custom_price_monthly !== undefined) ||
                (sub.custom_price_yearly !== null && sub.custom_price_yearly !== undefined)
    );
    
    // Get plan prices
    const proPlan = plans.find((p: Plan) => p.name === "pro");
    const ultimatePlan = plans.find((p: Plan) => p.name === "ultimate");
    
    const proMonthly = proPlan?.price_monthly || 0;
    const proYearly = proPlan?.price_yearly || 0;
    const ultimateMonthly = ultimatePlan?.price_monthly || 0;
    const ultimateYearly = ultimatePlan?.price_yearly || 0;
    
    // Calculate custom pricing impact
    let customPricingGainMRR = 0;
    let customPricingLossMRR = 0;
    let customPricingGainCount = 0;
    let customPricingLossCount = 0;
    let customPricingNeutralCount = 0;
    
    customPricedUsers.forEach((sub) => {
      // Skip users with "lifetime" billing cycle as they don't contribute to MRR
      if (sub.billing_cycle === "lifetime") {
        return;
      }
      
      const isMonthly = sub.billing_cycle === "monthly" || !sub.billing_cycle || sub.billing_cycle === "free";
      const defaultPrice = isMonthly ? (sub.plan_price_monthly || 0) : (sub.plan_price_yearly || 0);
      const customPrice = isMonthly 
        ? (sub.custom_price_monthly ?? 0)
        : (sub.custom_price_yearly ?? 0);
      
      const priceDiff = customPrice - defaultPrice;
      const mrrDiff = isMonthly ? priceDiff : priceDiff / 12;
      
      if (mrrDiff > 0) {
        customPricingGainMRR += mrrDiff;
        customPricingGainCount++;
      } else if (mrrDiff < 0) {
        customPricingLossMRR += Math.abs(mrrDiff);
        customPricingLossCount++;
      } else {
        customPricingNeutralCount++;
      }
    });
    
    // Scenario 1: All free users upgrade to Pro
    // Exclude users with "lifetime" billing cycle as they're handled separately
    const freeToProMRR = freeUsers
      .filter((sub) => sub.billing_cycle !== "lifetime")
      .reduce((sum, sub) => {
        if (sub.billing_cycle === "monthly" || !sub.billing_cycle || sub.billing_cycle === "free") {
          return sum + proMonthly;
        } else if (sub.billing_cycle === "yearly") {
          return sum + (proYearly / 12);
        }
        return sum;
      }, 0);
    
    // Scenario 2: All free users upgrade to Ultimate
    // Exclude users with "lifetime" billing cycle as they're handled separately
    const freeToUltimateMRR = freeUsers
      .filter((sub) => sub.billing_cycle !== "lifetime")
      .reduce((sum, sub) => {
        if (sub.billing_cycle === "monthly" || !sub.billing_cycle || sub.billing_cycle === "free") {
          return sum + ultimateMonthly;
        } else if (sub.billing_cycle === "yearly") {
          return sum + (ultimateYearly / 12);
        }
        return sum;
      }, 0);
    
    // Scenario 3: All Pro users upgrade to Ultimate
    // Exclude users with "free" or "lifetime" billing cycles as they're handled separately
    // Include ALL Pro users regardless of status (active, trial, suspended, cancelled)
    const eligibleProUsers = proUsers.filter((sub) => sub.billing_cycle !== "free" && sub.billing_cycle !== "lifetime");
    const proToUltimateMRR = eligibleProUsers.reduce((sum, sub) => {
      const currentMRR = sub.billing_cycle === "monthly" 
        ? getEffectivePrice(sub, true)
        : sub.billing_cycle === "yearly"
        ? getEffectivePrice(sub, false) / 12
        : 0;
      const newMRR = sub.billing_cycle === "monthly"
        ? ultimateMonthly
        : sub.billing_cycle === "yearly"
        ? ultimateYearly / 12
        : 0;
      const additionalMRR = newMRR - currentMRR;
      return sum + additionalMRR;
    }, 0);
    
    // Scenario 4: All free + Pro users upgrade by one tier
    const freeToProAndProToUltimateMRR = freeToProMRR + proToUltimateMRR;
    
    // Scenario 5: All users (free + pro) upgrade to Ultimate
    const allToUltimateMRR = freeToUltimateMRR + proToUltimateMRR;
    
    // Scenario 6: All users on "free" billing cycle upgrade to Pro (monthly)
    const freeBillingCycleToProMRR = freeBillingCycleUsers.reduce((sum, sub) => {
      return sum + proMonthly;
    }, 0);
    
    // Scenario 7: All users on "free" billing cycle upgrade to Ultimate (monthly)
    const freeBillingCycleToUltimateMRR = freeBillingCycleUsers.reduce((sum, sub) => {
      return sum + ultimateMonthly;
    }, 0);
    
    // Scenario 8: All users on "free" billing cycle upgrade to Pro (yearly)
    const freeBillingCycleToProYearlyMRR = freeBillingCycleUsers.reduce((sum, sub) => {
      return sum + (proYearly / 12);
    }, 0);
    
    // Scenario 9: All users on "free" billing cycle upgrade to Ultimate (yearly)
    const freeBillingCycleToUltimateYearlyMRR = freeBillingCycleUsers.reduce((sum, sub) => {
      return sum + (ultimateYearly / 12);
    }, 0);
    
    // Scenario 10: All users on "lifetime" billing cycle upgrade to Pro (monthly)
    const lifetimeBillingCycleToProMRR = lifetimeBillingCycleUsers.reduce((sum, sub) => {
      return sum + proMonthly;
    }, 0);
    
    // Scenario 11: All users on "lifetime" billing cycle upgrade to Ultimate (monthly)
    const lifetimeBillingCycleToUltimateMRR = lifetimeBillingCycleUsers.reduce((sum, sub) => {
      return sum + ultimateMonthly;
    }, 0);
    
    // Scenario 12: All users on "lifetime" billing cycle upgrade to Pro (yearly)
    const lifetimeBillingCycleToProYearlyMRR = lifetimeBillingCycleUsers.reduce((sum, sub) => {
      return sum + (proYearly / 12);
    }, 0);
    
    // Scenario 13: All users on "lifetime" billing cycle upgrade to Ultimate (yearly)
    const lifetimeBillingCycleToUltimateYearlyMRR = lifetimeBillingCycleUsers.reduce((sum, sub) => {
      return sum + (ultimateYearly / 12);
    }, 0);
    
    return {
      // Plan upgrade scenarios
      freeToPro: {
        mrr: freeToProMRR,
        arr: freeToProMRR * 12,
        userCount: freeUsers.filter((sub) => sub.billing_cycle !== "lifetime").length,
        description: "All Free plan users upgrade to Pro (excludes lifetime billing cycle)"
      },
      freeToUltimate: {
        mrr: freeToUltimateMRR,
        arr: freeToUltimateMRR * 12,
        userCount: freeUsers.filter((sub) => sub.billing_cycle !== "lifetime").length,
        description: "All Free plan users upgrade to Ultimate (excludes lifetime billing cycle)"
      },
      proToUltimate: {
        mrr: proToUltimateMRR,
        arr: proToUltimateMRR * 12,
        userCount: proUsers.filter((sub) => sub.billing_cycle !== "free" && sub.billing_cycle !== "lifetime").length,
        description: "All Pro users upgrade to Ultimate (excludes free/lifetime billing cycles)"
      },
      freeToProAndProToUltimate: {
        mrr: freeToProAndProToUltimateMRR,
        arr: freeToProAndProToUltimateMRR * 12,
        userCount: freeUsers.filter((sub) => sub.billing_cycle !== "lifetime").length + 
                   proUsers.filter((sub) => sub.billing_cycle !== "free" && sub.billing_cycle !== "lifetime").length,
        description: "All Free → Pro, All Pro → Ultimate (excludes free/lifetime billing cycles)"
      },
      allToUltimate: {
        mrr: allToUltimateMRR,
        arr: allToUltimateMRR * 12,
        userCount: freeUsers.filter((sub) => sub.billing_cycle !== "lifetime").length + 
                   proUsers.filter((sub) => sub.billing_cycle !== "free" && sub.billing_cycle !== "lifetime").length,
        description: "All Free + Pro users upgrade to Ultimate (excludes free/lifetime billing cycles)"
      },
      // Free billing cycle scenarios
      freeBillingCycleToPro: {
        mrr: freeBillingCycleToProMRR,
        arr: freeBillingCycleToProMRR * 12,
        userCount: freeBillingCycleUsers.length,
        description: "All users on Free billing cycle upgrade to Pro (monthly)"
      },
      freeBillingCycleToUltimate: {
        mrr: freeBillingCycleToUltimateMRR,
        arr: freeBillingCycleToUltimateMRR * 12,
        userCount: freeBillingCycleUsers.length,
        description: "All users on Free billing cycle upgrade to Ultimate (monthly)"
      },
      freeBillingCycleToProYearly: {
        mrr: freeBillingCycleToProYearlyMRR,
        arr: freeBillingCycleToProYearlyMRR * 12,
        userCount: freeBillingCycleUsers.length,
        description: "All users on Free billing cycle upgrade to Pro (yearly)"
      },
      freeBillingCycleToUltimateYearly: {
        mrr: freeBillingCycleToUltimateYearlyMRR,
        arr: freeBillingCycleToUltimateYearlyMRR * 12,
        userCount: freeBillingCycleUsers.length,
        description: "All users on Free billing cycle upgrade to Ultimate (yearly)"
      },
      // Lifetime billing cycle scenarios
      lifetimeBillingCycleToPro: {
        mrr: lifetimeBillingCycleToProMRR,
        arr: lifetimeBillingCycleToProMRR * 12,
        userCount: lifetimeBillingCycleUsers.length,
        description: "All users on Lifetime billing cycle upgrade to Pro (monthly)"
      },
      lifetimeBillingCycleToUltimate: {
        mrr: lifetimeBillingCycleToUltimateMRR,
        arr: lifetimeBillingCycleToUltimateMRR * 12,
        userCount: lifetimeBillingCycleUsers.length,
        description: "All users on Lifetime billing cycle upgrade to Ultimate (monthly)"
      },
      lifetimeBillingCycleToProYearly: {
        mrr: lifetimeBillingCycleToProYearlyMRR,
        arr: lifetimeBillingCycleToProYearlyMRR * 12,
        userCount: lifetimeBillingCycleUsers.length,
        description: "All users on Lifetime billing cycle upgrade to Pro (yearly)"
      },
      lifetimeBillingCycleToUltimateYearly: {
        mrr: lifetimeBillingCycleToUltimateYearlyMRR,
        arr: lifetimeBillingCycleToUltimateYearlyMRR * 12,
        userCount: lifetimeBillingCycleUsers.length,
        description: "All users on Lifetime billing cycle upgrade to Ultimate (yearly)"
      },
      // Custom pricing impact
      customPricing: {
        gainMRR: customPricingGainMRR,
        gainARR: customPricingGainMRR * 12,
        lossMRR: customPricingLossMRR,
        lossARR: customPricingLossMRR * 12,
        netMRR: customPricingGainMRR - customPricingLossMRR,
        netARR: (customPricingGainMRR - customPricingLossMRR) * 12,
        gainCount: customPricingGainCount,
        lossCount: customPricingLossCount,
        neutralCount: customPricingNeutralCount,
        totalCount: customPricedUsers.length,
        description: "Custom Pricing Impact"
      }
    };
  };

  const mrr = calculateMRR();
  const arr = calculateARR();
  const trialConversion = calculateTrialConversionRevenue();
  const revenueByPlan = calculateRevenueByPlan();
  const churnMetrics = calculateChurnMetrics();
  const revenueByStatus = calculateRevenueByStatus();
  const arpu = calculateARPU();
  const ltv = calculateLTV();
  const growthRate = calculateGrowthRate();
  const customPricingStats = calculateCustomPricingStats();
  const lostRevenueScenarios = calculateLostRevenueScenarios();
  const [activeLostRevenueTab, setActiveLostRevenueTab] = useState<'overview' | 'free-billing' | 'custom-pricing'>('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Analytics</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Revenue Metrics, Subscription Analytics, And Financial Insights
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((prev) => prev + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigateToBilling({ status: 'active' })}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
          <MetricTooltip text="Monthly Recurring Revenue (MRR) is calculated by summing all active paid subscriptions converted to monthly amounts. Monthly subscriptions count at full price, yearly subscriptions are divided by 12. Free, lifetime, and cancelled subscriptions are excluded. Custom prices are used when set, otherwise plan prices are used.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Recurring Revenue</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              minimumFractionDigits: 2,
            }).format(mrr)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            {subscriptions.filter((s) => s.status === "active" && !s.cancel_at_period_end && s.plan_name !== "free").length} active subscriptions
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          <MetricTooltip text="Annual Recurring Revenue (ARR) is calculated by multiplying Monthly Recurring Revenue (MRR) by 12. This represents the projected annual revenue if all current active subscriptions continue for a full year.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Annual Recurring Revenue</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              minimumFractionDigits: 2,
            }).format(arr)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Projected annual revenue
          </p>
        </div>

        <button
          onClick={() => navigateToBilling({ status: 'trial' })}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" />
          </div>
          <MetricTooltip text="Potential Trial Revenue shows the MRR that would be generated if all active trials convert to paid subscriptions. Calculated by summing the monthly equivalent prices of all active trial subscriptions (yearly trials divided by 12).">
            <p className="text-sm text-gray-600 dark:text-gray-400">Potential Trial Revenue</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              minimumFractionDigits: 2,
            }).format(trialConversion.monthly)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            {trialConversion.trialCount} active trials
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>

        <button
          onClick={() => navigateToBilling({ status: 'cancelled' })}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
          </div>
          <MetricTooltip text="Churn Rate is calculated as (Cancelled Subscriptions / Total Paid Subscriptions) × 100. Total Paid includes both active and cancelled subscriptions. Free plans are excluded from this calculation.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Churn Rate</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {churnMetrics.churnRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            {churnMetrics.cancelled} cancelled / {churnMetrics.total} total
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <MetricTooltip text="Average Revenue Per User (ARPU) is calculated by dividing Monthly Recurring Revenue (MRR) by the number of active paid subscriptions. This shows the average monthly revenue generated per active customer. Free plans are excluded from both the revenue and count.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Revenue Per User</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              minimumFractionDigits: 2,
            }).format(arpu)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per month</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <MetricTooltip text="Customer Lifetime Value (LTV) estimates the total revenue a customer will generate over their lifetime. Calculated as ARPU ÷ Churn Rate. If churn rate is 0%, it defaults to ARPU × 12 (one year minimum). Higher LTV indicates more valuable customers.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Customer Lifetime Value</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              minimumFractionDigits: 2,
            }).format(ltv)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Estimated LTV</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <MetricTooltip text="Growth Potential shows the percentage increase in active subscriptions if all current trials convert to paid. Calculated as (Active Trials / Active Paid Subscriptions) × 100. This indicates potential growth from trial conversions.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Growth Potential</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {growthRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From trial conversions</p>
        </div>

        <button
          onClick={() => navigateToBilling({ customPrice: 'yes' })}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <CreditCard className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
          </div>
          <MetricTooltip text="Custom Pricing shows the total MRR from subscriptions with custom prices set by admins. This includes subscriptions where either monthly or yearly custom price is set (not null). The MRR is calculated using custom prices when available, otherwise plan prices.">
            <p className="text-sm text-gray-600 dark:text-gray-400">Custom Pricing</p>
          </MetricTooltip>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: "GBP",
              minimumFractionDigits: 2,
            }).format(customPricingStats.totalMRR)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            {customPricingStats.count} subscriptions
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <MetricTooltip text="Revenue by Plan shows the Monthly Recurring Revenue (MRR) and subscription count for each plan type. Only active, non-cancelled subscriptions are included. MRR uses custom prices when set, otherwise plan prices. Yearly subscriptions are converted to monthly by dividing by 12.">
              Revenue by Plan
            </MetricTooltip>
          </h3>
          <div className="space-y-4">
            {Object.entries(revenueByPlan).map(([planName, data]) => {
              const planIcon = planName === "pro" ? Zap : planName === "ultimate" ? Crown : Sparkles;
              const PlanIcon = planIcon;
              return (
                <button
                  key={planName}
                  onClick={() => navigateToBilling({ plan: planName, status: 'active' })}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <PlanIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{planName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{data.count} subscriptions</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(data.mrr)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">MRR</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
            {Object.keys(revenueByPlan).length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No active paid subscriptions</p>
            )}
          </div>
        </div>

        {/* Revenue by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <MetricTooltip text="Revenue by Status shows the Monthly Recurring Revenue (MRR) and subscription count grouped by status (Active, Trial, Cancelled, Suspended). Free plans are excluded. MRR is calculated using effective prices (custom if set, otherwise plan price) and converted to monthly amounts for yearly subscriptions.">
              Revenue by Status
            </MetricTooltip>
          </h3>
          <div className="space-y-4">
            {Object.entries(revenueByStatus).map(([status, data]) => {
              if (data.count === 0) return null;
              const statusConfig = {
                active: { label: "Active", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
                trial: { label: "Trial", icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
                cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-600 dark:text-red-400" },
                suspended: { label: "Suspended", icon: AlertCircle, color: "text-orange-600 dark:text-orange-400" },
              }[status] || { label: status, icon: CreditCard, color: "text-gray-600 dark:text-gray-400" };

              const Icon = statusConfig.icon;
              return (
                <button
                  key={status}
                  onClick={() => navigateToBilling({ status: status === 'cancelled' ? 'cancelled' : status })}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${statusConfig.color}`} />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{statusConfig.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{data.count} subscriptions</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(data.mrr)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">MRR</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trial Conversion Potential */}
      {trialConversion.trialCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <MetricTooltip text="Trial Conversion Potential shows the revenue impact if all active trials convert to paid subscriptions. Displays the count of active trials, potential monthly revenue (if all convert), and potential annual revenue (monthly × 12).">
              Trial Conversion Potential
            </MetricTooltip>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Trials</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{trialConversion.trialCount}</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Potential Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {new Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency: "GBP",
                  minimumFractionDigits: 2,
                }).format(trialConversion.monthly)}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Potential Annual Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {new Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency: "GBP",
                  minimumFractionDigits: 2,
                }).format(trialConversion.annual)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <MetricTooltip text="Subscription Statistics shows counts of subscriptions by status. Active Paid includes non-cancelled paid subscriptions. Active Trials shows subscriptions currently in trial. Cancelled includes subscriptions that are cancelled or set to cancel. Suspended shows subscriptions that have been suspended by admins.">
              Subscription Statistics
            </MetricTooltip>
          </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{churnMetrics.active}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Paid</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {subscriptions.filter((s) => s.is_trial && s.status === "trial").length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Trials</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{churnMetrics.cancelled}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Cancelled</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {subscriptions.filter((s) => s.status === "suspended").length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Suspended</p>
          </div>
        </div>
      </div>

      {/* Lost Revenue Opportunities - Detailed with Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <MetricTooltip text="Lost Revenue Opportunities show potential additional revenue if users upgraded their plans. These are hypothetical scenarios based on current user counts and plan prices. Monthly subscriptions use monthly prices, yearly subscriptions use yearly prices divided by 12.">
              Lost Revenue Opportunities
            </MetricTooltip>
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveLostRevenueTab('overview')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeLostRevenueTab === 'overview'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Plan Upgrades
          </button>
          <button
            onClick={() => setActiveLostRevenueTab('free-billing')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeLostRevenueTab === 'free-billing'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Free/Lifetime Billing ({lostRevenueScenarios.freeBillingCycleToPro.userCount + lostRevenueScenarios.lifetimeBillingCycleToPro.userCount} users)
          </button>
          <button
            onClick={() => setActiveLostRevenueTab('custom-pricing')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeLostRevenueTab === 'custom-pricing'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Custom Pricing Impact ({lostRevenueScenarios.customPricing.totalCount} users)
          </button>
        </div>

        {/* Tab Content */}
        {activeLostRevenueTab === 'overview' && (
          <div className="space-y-4">
          {/* Scenario 1: Free to Pro */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeToPro.description}</h4>
                  <MetricTooltip text="Calculates potential MRR if all users currently on the Free plan upgrade to Pro. For each Free plan user: if their billing cycle is monthly or free, uses Pro monthly price; if yearly, uses Pro yearly price divided by 12. Sums all these values to get total MRR. ARR = MRR × 12.">
                    <></>
                  </MetricTooltip>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeToPro.userCount} users</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.freeToPro.mrr)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeToPro.arr.toLocaleString("en-GB")}/year</p>
              </div>
            </div>
          </div>

          {/* Scenario 2: Free to Ultimate */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeToUltimate.description}</h4>
                  <MetricTooltip text="Calculates potential MRR if all users currently on the Free plan upgrade to Ultimate. For each Free plan user: if their billing cycle is monthly or free, uses Ultimate monthly price; if yearly, uses Ultimate yearly price divided by 12. Sums all these values to get total MRR. ARR = MRR × 12.">
                    <></>
                  </MetricTooltip>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeToUltimate.userCount} users</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.freeToUltimate.mrr)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeToUltimate.arr.toLocaleString("en-GB")}/year</p>
              </div>
            </div>
          </div>

          {/* Scenario 3: Pro to Ultimate */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.proToUltimate.description}</h4>
                  <MetricTooltip text="Calculates additional MRR if all Pro users upgrade to Ultimate. For each Pro user: calculates current MRR (using effective price - custom if set, otherwise plan price, converted to monthly), then calculates new MRR at Ultimate price. The difference (new MRR - current MRR) is the additional revenue. Sums all differences. ARR = MRR × 12.">
                    <></>
                  </MetricTooltip>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.proToUltimate.userCount} users</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.proToUltimate.mrr)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.proToUltimate.arr.toLocaleString("en-GB")}/year</p>
              </div>
            </div>
          </div>

          {/* Scenario 4: Free to Pro + Pro to Ultimate */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeToProAndProToUltimate.description}</h4>
                  <MetricTooltip text="Combined scenario: calculates MRR from all Free users upgrading to Pro PLUS all Pro users upgrading to Ultimate. This is the sum of 'All Free users upgrade to Pro' MRR and 'All Pro users upgrade to Ultimate' MRR. Shows total potential revenue from a one-tier upgrade strategy. ARR = MRR × 12.">
                    <></>
                  </MetricTooltip>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeToProAndProToUltimate.userCount} users</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.freeToProAndProToUltimate.mrr)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeToProAndProToUltimate.arr.toLocaleString("en-GB")}/year</p>
              </div>
            </div>
          </div>

          {/* Scenario 5: All to Ultimate */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.allToUltimate.description}</h4>
                  <MetricTooltip text="Maximum revenue scenario: calculates MRR if all Free and Pro users upgrade directly to Ultimate. For Free users: uses Ultimate price based on their billing cycle. For Pro users: calculates additional MRR (Ultimate price - current Pro price). Sums all values. This represents the maximum potential revenue from upgrades. ARR = MRR × 12.">
                    <></>
                  </MetricTooltip>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.allToUltimate.userCount} users</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.allToUltimate.mrr)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.allToUltimate.arr.toLocaleString("en-GB")}/year</p>
              </div>
            </div>
          </div>
          </div>
        )}

        {activeLostRevenueTab === 'free-billing' && (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>{lostRevenueScenarios.freeBillingCycleToPro.userCount}</strong> users are currently on "Free (No Charge)" billing cycle, 
                and <strong>{lostRevenueScenarios.lifetimeBillingCycleToPro.userCount}</strong> users are on "Lifetime" billing cycle, 
                regardless of their plan type. These scenarios show potential revenue if they were converted to paid billing cycles.
              </p>
            </div>
            
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Free Billing Cycle Users</h4>
            </div>

            {/* Free Billing Cycle to Pro Monthly */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeBillingCycleToPro.description}</h4>
                    <MetricTooltip text="Calculates potential MRR if all users on 'Free (No Charge)' billing cycle (regardless of plan) convert to Pro with monthly billing. For each user: adds Pro monthly price. Sums all values. This assumes all users switch to monthly billing. ARR = MRR × 12.">
                      <></>
                    </MetricTooltip>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeBillingCycleToPro.userCount} users</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: "GBP",
                      minimumFractionDigits: 2,
                    }).format(lostRevenueScenarios.freeBillingCycleToPro.mrr)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeBillingCycleToPro.arr.toLocaleString("en-GB")}/year</p>
                </div>
              </div>
            </div>

            {/* Free Billing Cycle to Ultimate Monthly */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeBillingCycleToUltimate.description}</h4>
                    <MetricTooltip text="Calculates potential MRR if all users on 'Free (No Charge)' billing cycle (regardless of plan) convert to Ultimate with monthly billing. For each user: adds Ultimate monthly price. Sums all values. This assumes all users switch to monthly billing. ARR = MRR × 12.">
                      <span></span>
                    </MetricTooltip>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeBillingCycleToUltimate.userCount} users</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: "GBP",
                      minimumFractionDigits: 2,
                    }).format(lostRevenueScenarios.freeBillingCycleToUltimate.mrr)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeBillingCycleToUltimate.arr.toLocaleString("en-GB")}/year</p>
                </div>
              </div>
            </div>

            {/* Free Billing Cycle to Pro Yearly */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeBillingCycleToProYearly.description}</h4>
                    <MetricTooltip text="Calculates potential MRR if all users on 'Free (No Charge)' billing cycle (regardless of plan) convert to Pro with yearly billing. For each user: adds Pro yearly price divided by 12 (to get monthly equivalent). Sums all values. This assumes all users switch to yearly billing. ARR = MRR × 12.">
                      <span></span>
                    </MetricTooltip>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeBillingCycleToProYearly.userCount} users</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: "GBP",
                      minimumFractionDigits: 2,
                    }).format(lostRevenueScenarios.freeBillingCycleToProYearly.mrr)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeBillingCycleToProYearly.arr.toLocaleString("en-GB")}/year</p>
                </div>
              </div>
            </div>

            {/* Free Billing Cycle to Ultimate Yearly */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.freeBillingCycleToUltimateYearly.description}</h4>
                    <MetricTooltip text="Calculates potential MRR if all users on 'Free (No Charge)' billing cycle (regardless of plan) convert to Ultimate with yearly billing. For each user: adds Ultimate yearly price divided by 12 (to get monthly equivalent). Sums all values. This assumes all users switch to yearly billing. ARR = MRR × 12.">
                      <span></span>
                    </MetricTooltip>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.freeBillingCycleToUltimateYearly.userCount} users</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: "GBP",
                      minimumFractionDigits: 2,
                    }).format(lostRevenueScenarios.freeBillingCycleToUltimateYearly.mrr)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.freeBillingCycleToUltimateYearly.arr.toLocaleString("en-GB")}/year</p>
                </div>
              </div>
            </div>

            {/* Lifetime Billing Cycle Section */}
            {lostRevenueScenarios.lifetimeBillingCycleToPro.userCount > 0 && (
              <>
                <div className="mt-6 mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Lifetime Billing Cycle Users</h4>
                </div>

                {/* Lifetime Billing Cycle to Pro Monthly */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.lifetimeBillingCycleToPro.description}</h4>
                        <MetricTooltip text="Calculates potential MRR if all users on 'Lifetime' billing cycle (regardless of plan) convert to Pro with monthly billing. For each user: adds Pro monthly price. Sums all values. This assumes all users switch from lifetime (permanent free) to monthly billing. ARR = MRR × 12.">
                          <></>
                        </MetricTooltip>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.lifetimeBillingCycleToPro.userCount} users</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(lostRevenueScenarios.lifetimeBillingCycleToPro.mrr)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.lifetimeBillingCycleToPro.arr.toLocaleString("en-GB")}/year</p>
                    </div>
                  </div>
                </div>

                {/* Lifetime Billing Cycle to Ultimate Monthly */}
                <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.lifetimeBillingCycleToUltimate.description}</h4>
                        <MetricTooltip text="Calculates potential MRR if all users on 'Lifetime' billing cycle (regardless of plan) convert to Ultimate with monthly billing. For each user: adds Ultimate monthly price. Sums all values. This assumes all users switch from lifetime (permanent free) to monthly billing. ARR = MRR × 12.">
                          <span></span>
                        </MetricTooltip>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.lifetimeBillingCycleToUltimate.userCount} users</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(lostRevenueScenarios.lifetimeBillingCycleToUltimate.mrr)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.lifetimeBillingCycleToUltimate.arr.toLocaleString("en-GB")}/year</p>
                    </div>
                  </div>
                </div>

                {/* Lifetime Billing Cycle to Pro Yearly */}
                <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.lifetimeBillingCycleToProYearly.description}</h4>
                        <MetricTooltip text="Calculates potential MRR if all users on 'Lifetime' billing cycle (regardless of plan) convert to Pro with yearly billing. For each user: adds Pro yearly price divided by 12 (to get monthly equivalent). Sums all values. This assumes all users switch from lifetime (permanent free) to yearly billing. ARR = MRR × 12.">
                          <span></span>
                        </MetricTooltip>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.lifetimeBillingCycleToProYearly.userCount} users</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(lostRevenueScenarios.lifetimeBillingCycleToProYearly.mrr)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.lifetimeBillingCycleToProYearly.arr.toLocaleString("en-GB")}/year</p>
                    </div>
                  </div>
                </div>

                {/* Lifetime Billing Cycle to Ultimate Yearly */}
                <div className="p-4 bg-gradient-to-r from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20 rounded-lg border border-fuchsia-200 dark:border-fuchsia-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{lostRevenueScenarios.lifetimeBillingCycleToUltimateYearly.description}</h4>
                        <MetricTooltip text="Calculates potential MRR if all users on 'Lifetime' billing cycle (regardless of plan) convert to Ultimate with yearly billing. For each user: adds Ultimate yearly price divided by 12 (to get monthly equivalent). Sums all values. This assumes all users switch from lifetime (permanent free) to yearly billing. ARR = MRR × 12.">
                          <span></span>
                        </MetricTooltip>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{lostRevenueScenarios.lifetimeBillingCycleToUltimateYearly.userCount} users</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                        }).format(lostRevenueScenarios.lifetimeBillingCycleToUltimateYearly.mrr)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">+£{lostRevenueScenarios.lifetimeBillingCycleToUltimateYearly.arr.toLocaleString("en-GB")}/year</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeLostRevenueTab === 'custom-pricing' && (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>{lostRevenueScenarios.customPricing.totalCount}</strong> users have custom pricing set. 
                This shows the revenue impact compared to default plan prices.
              </p>
            </div>

            {/* Custom Pricing Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Gained</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.customPricing.gainMRR)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {lostRevenueScenarios.customPricing.gainCount} users paying above default
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  +£{lostRevenueScenarios.customPricing.gainARR.toLocaleString("en-GB")}/year
                </p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Lost</p>
                  <MetricTooltip text="Calculates total MRR lost from users paying custom prices below their plan's default prices. For each user with custom pricing: compares custom price to default plan price. If custom price is lower, calculates the difference (default - custom) and converts to monthly if yearly. Sums all negative differences (as positive values). ARR = MRR × 12.">
                    <span></span>
                  </MetricTooltip>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.customPricing.lossMRR)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {lostRevenueScenarios.customPricing.lossCount} users paying below default
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  -£{lostRevenueScenarios.customPricing.lossARR.toLocaleString("en-GB")}/year
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${
                lostRevenueScenarios.customPricing.netMRR >= 0
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              }`}>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Net Impact</p>
                  <MetricTooltip text="Calculates the net revenue impact of all custom pricing. Formula: Revenue Gained MRR - Revenue Lost MRR. Positive values mean custom pricing is generating more revenue than defaults would. Negative values mean custom pricing is costing revenue compared to defaults. ARR = Net MRR × 12.">
                    <span></span>
                  </MetricTooltip>
                </div>
                <p className={`text-2xl font-bold mt-1 ${
                  lostRevenueScenarios.customPricing.netMRR >= 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}>
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(lostRevenueScenarios.customPricing.netMRR)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {lostRevenueScenarios.customPricing.neutralCount} users at default price
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lostRevenueScenarios.customPricing.netMRR >= 0 ? '+' : ''}£{Math.abs(lostRevenueScenarios.customPricing.netARR).toLocaleString("en-GB")}/year
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Total Custom Priced</p>
                  <p className="font-bold text-gray-900 dark:text-white">{lostRevenueScenarios.customPricing.totalCount}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Above Default</p>
                  <p className="font-bold text-green-600 dark:text-green-400">{lostRevenueScenarios.customPricing.gainCount}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Below Default</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{lostRevenueScenarios.customPricing.lossCount}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">At Default</p>
                  <p className="font-bold text-gray-600 dark:text-gray-400">{lostRevenueScenarios.customPricing.neutralCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 <strong>Plan Upgrades:</strong> Assumes all users maintain their current billing cycles (monthly/yearly) when upgrading. Revenue calculations use plan prices, not custom prices.
            <br />
            💡 <strong>Free/Lifetime Billing Cycle:</strong> Shows potential revenue if users on "Free (No Charge)" or "Lifetime" billing cycles were converted to paid cycles.
            <br />
            💡 <strong>Custom Pricing:</strong> Compares custom prices to default plan prices. Positive values indicate revenue gained, negative values indicate revenue lost compared to defaults.
          </p>
        </div>
      </div>
    </div>
  );
}

