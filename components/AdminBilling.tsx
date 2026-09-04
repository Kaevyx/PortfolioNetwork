"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import {
  CreditCard,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  Zap,
  Crown,
  Sparkles,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  DollarSign,
  Settings,
  Save,
  X,
  Ban,
  User,
} from "lucide-react";
import { showToast } from "@/lib/utils/toast";
import { useRouter } from "next/navigation";

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
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  billing_cycle: string;
  last_limit_reset: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string | null;
  user_display_name: string | null;
  user_email: string | null;
  has_subscription_record: boolean; // Whether user has a record in user_subscriptions
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_connections: number;
  max_posts_per_month: number;
  max_storage_mb: number;
}

interface EditModalData {
  subscription: Subscription | null; // null for bulk operations
  subscriptions?: Subscription[]; // For bulk operations
  field: 'plan' | 'renewal_date' | 'billing_cycle' | 'trial' | 'limits' | 'cancel' | 'prices' | 'dates' | 'bulk';
  mode?: 'single' | 'bulk';
}

export function AdminBilling({ supabase, currentUserId }: { supabase: SupabaseClient; currentUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [billingCycleFilter, setBillingCycleFilter] = useState<string>("all");
  const [customPriceFilter, setCustomPriceFilter] = useState<string>("all");
  const [editingModal, setEditingModal] = useState<EditModalData | null>(null);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newSubscriptionUserId, setNewSubscriptionUserId] = useState("");
  const [newSubscriptionPlan, setNewSubscriptionPlan] = useState("pro");
  const [newSubscriptionIsTrial, setNewSubscriptionIsTrial] = useState(false);
  const [newSubscriptionTrialDays, setNewSubscriptionTrialDays] = useState(7);
  const [newSubscriptionBillingCycle, setNewSubscriptionBillingCycle] = useState("monthly");

  // Check for URL parameters (user, status, plan, billingCycle, customPrice)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get('user');
      const statusParam = params.get('status');
      const planParam = params.get('plan');
      const billingCycleParam = params.get('billingCycle');
      const customPriceParam = params.get('customPrice');
      
      if (userId) {
        setSearchQuery(userId);
      }
      if (statusParam) {
        setStatusFilter(statusParam);
      }
      if (planParam) {
        setPlanFilter(planParam);
      }
      if (billingCycleParam) {
        setBillingCycleFilter(billingCycleParam);
      }
      if (customPriceParam === 'yes') {
        setCustomPriceFilter('yes');
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchQuery, statusFilter, planFilter, billingCycleFilter, customPriceFilter]);

  const loadData = async () => {
    await Promise.all([loadSubscriptions(), loadPlans()]);
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("name");

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Get all users from profiles with their subscription info
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          clerk_id,
          display_name,
          email,
          subscription_plan,
          is_premium
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get active, trial, and suspended subscriptions (not cancelled, not expired)
      // For each user, get the most recent subscription
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans:plan_id (
            name,
            display_name,
            price_monthly,
            price_yearly
          )
        `)
        .in("status", ["active", "trial", "suspended"])
        .is("cancelled_at", null)
        .order("created_at", { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      // Create a map of user_id to their most recent subscription (active, trial, or suspended)
      // Only include subscriptions that are not cancelled
      const subscriptionMap = new Map();
      (subscriptionsData || []).forEach((sub: any) => {
        // Only add if not already in map (to get most recent) and not cancelled
        if (!subscriptionMap.has(sub.user_id) && 
            sub.status !== "cancelled" && 
            !sub.cancelled_at &&
            (sub.status === "active" || sub.status === "trial" || sub.status === "suspended")) {
        subscriptionMap.set(sub.user_id, {
        id: sub.id,
        plan_id: sub.plan_id,
        plan_name: sub.subscription_plans?.name || "unknown",
        plan_display_name: sub.subscription_plans?.display_name || "Unknown",
        plan_price_monthly: sub.subscription_plans?.price_monthly || 0,
        plan_price_yearly: sub.subscription_plans?.price_yearly || 0,
            custom_price_monthly: sub.custom_price_monthly || null,
            custom_price_yearly: sub.custom_price_yearly || null,
        status: sub.status,
        is_trial: sub.is_trial || false,
        trial_start: sub.trial_start,
        trial_end: sub.trial_end,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        cancelled_at: sub.cancelled_at,
        billing_cycle: sub.billing_cycle || "monthly",
        last_limit_reset: sub.last_limit_reset,
        stripe_subscription_id: sub.stripe_subscription_id,
        stripe_customer_id: sub.stripe_customer_id,
        created_at: sub.created_at,
        });
        }
      });

      // Combine profiles with subscription data
      // Always show the current active plan from profile, not cancelled subscriptions
      const formattedSubscriptions: Subscription[] = (profiles || []).map((profile: any) => {
        const subscription = subscriptionMap.get(profile.clerk_id);
        // Use profile's subscription_plan as the source of truth for current plan
        // This ensures cancelled trials don't show as the current plan
        const planName = profile.subscription_plan || "free";
        
        // Get plan price from plans array or subscription data
        const plan = plans.find(p => p.name === planName);
        
        // If there's an active subscription, use its data but ensure plan_name matches profile
        // If subscription exists but plan doesn't match profile, profile is the source of truth
        const finalPlanName = subscription && subscription.plan_name === planName 
          ? subscription.plan_name 
          : planName;
        
        return {
          id: subscription?.id || null,
          user_id: profile.clerk_id,
          plan_id: subscription?.plan_id || plan?.id || null,
          plan_name: finalPlanName,
          plan_display_name: subscription?.plan_display_name || plan?.display_name || (planName.charAt(0).toUpperCase() + planName.slice(1)),
          plan_price_monthly: subscription?.plan_price_monthly || plan?.price_monthly || 0,
          plan_price_yearly: subscription?.plan_price_yearly || plan?.price_yearly || 0,
          custom_price_monthly: subscription?.custom_price_monthly || null,
          custom_price_yearly: subscription?.custom_price_yearly || null,
          // Always use the actual status from the subscription record if it exists
          // Only default to "active" if there's no subscription record at all
          status: subscription?.status || "active",
          is_trial: subscription?.is_trial || false,
          trial_start: subscription?.trial_start || null,
          trial_end: subscription?.trial_end || null,
          current_period_start: subscription?.current_period_start || null,
          current_period_end: subscription?.current_period_end || null,
          cancel_at_period_end: subscription?.cancel_at_period_end || false,
          cancelled_at: subscription?.cancelled_at || null,
          billing_cycle: subscription?.billing_cycle || "monthly",
          last_limit_reset: subscription?.last_limit_reset || null,
          stripe_subscription_id: subscription?.stripe_subscription_id || null,
          stripe_customer_id: subscription?.stripe_customer_id || null,
          created_at: subscription?.created_at || null,
          user_display_name: profile.display_name || null,
          user_email: profile.email || null,
          has_subscription_record: !!subscription,
        };
      });

      setSubscriptions(formattedSubscriptions);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      showToast("Failed to load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterSubscriptions = () => {
    let filtered = [...subscriptions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.user_display_name?.toLowerCase().includes(query) ||
          sub.user_email?.toLowerCase().includes(query) ||
          sub.plan_name.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => {
        if (statusFilter === "active") return sub.status === "active" && !sub.cancel_at_period_end;
        if (statusFilter === "trial") return sub.is_trial || sub.status === "trial";
        if (statusFilter === "cancelled") return sub.status === "cancelled" || sub.cancel_at_period_end;
        if (statusFilter === "expired") return sub.status === "expired";
        if (statusFilter === "free") return sub.plan_name === "free";
        return true;
      });
    }

    // Plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter((sub) => sub.plan_name === planFilter);
    }

    // Billing cycle filter
    if (billingCycleFilter !== "all") {
      filtered = filtered.filter((sub) => sub.billing_cycle === billingCycleFilter);
    }

    // Custom price filter
    if (customPriceFilter !== "all") {
      if (customPriceFilter === "has_custom" || customPriceFilter === "yes") {
        filtered = filtered.filter((sub) => 
          (sub.custom_price_monthly !== null && sub.custom_price_monthly !== undefined) ||
          (sub.custom_price_yearly !== null && sub.custom_price_yearly !== undefined)
        );
      } else if (customPriceFilter === "no_custom") {
        filtered = filtered.filter((sub) => 
          sub.custom_price_monthly === null && sub.custom_price_yearly === null
        );
      } else if (customPriceFilter === "free_custom") {
        filtered = filtered.filter((sub) => 
          sub.custom_price_monthly === 0 || sub.custom_price_yearly === 0
        );
      }
    }

    setFilteredSubscriptions(filtered);
  };

  const handleCreateSubscription = async () => {
    if (!newSubscriptionUserId || !newSubscriptionPlan) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    try {
      setUpdating(true);

      // Get plan ID
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", newSubscriptionPlan)
        .single();

      if (planError || !planData) {
        throw new Error("Plan not found");
      }

      if (newSubscriptionIsTrial) {
        // Create trial using the database function
        const { data: trialData, error } = await supabase.rpc('start_trial', {
          p_user_id: newSubscriptionUserId,
          p_plan_name: newSubscriptionPlan,
          p_trial_days: newSubscriptionTrialDays
        });

        if (error) throw error;
        
        // Log billing event and create notification
        await supabase.rpc('log_billing_event', {
          p_user_id: newSubscriptionUserId,
          p_subscription_id: trialData?.subscription_id || null,
          p_event_type: 'trial_started',
          p_performed_by: currentUserId,
          p_new_plan_name: newSubscriptionPlan,
          p_details: { trial_days: newSubscriptionTrialDays }
        });
        
        showToast("Trial created successfully", "success");
      } else {
        // Create regular subscription
        const now = new Date();
        const periodEnd = new Date(now);
        if (newSubscriptionBillingCycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const { data: subData, error } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: newSubscriptionUserId,
            plan_id: planData.id,
            status: "active",
            is_trial: false,
            current_period_start: now.toISOString(),
            current_period_end: (newSubscriptionBillingCycle === 'free' || newSubscriptionBillingCycle === 'lifetime') ? null : periodEnd.toISOString(),
            billing_cycle: newSubscriptionBillingCycle,
            last_limit_reset: now.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        
        // Get plan prices
        const { data: planPrices } = await supabase
          .from("subscription_plans")
          .select("price_monthly, price_yearly")
          .eq("id", planData.id)
          .single();
        
        // Log billing event and create notification
        await supabase.rpc('log_billing_event', {
          p_user_id: newSubscriptionUserId,
          p_subscription_id: subData?.id || null,
          p_event_type: 'subscription_created',
          p_performed_by: currentUserId,
          p_new_plan_name: newSubscriptionPlan,
          p_new_billing_cycle: newSubscriptionBillingCycle,
          p_new_price_monthly: planPrices?.price_monthly || 0,
          p_new_price_yearly: planPrices?.price_yearly || 0
        });
        
        showToast("Subscription created successfully", "success");
      }

      setCreatingSubscription(false);
      setNewSubscriptionUserId("");
      setNewSubscriptionPlan("pro");
      setNewSubscriptionIsTrial(false);
      setNewSubscriptionTrialDays(7);
      setNewSubscriptionBillingCycle("monthly");
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      showToast(error.message || "Failed to create subscription", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePlan = async (subscription: Subscription, newPlanName: string) => {
    try {
      setUpdating(true);
      
      // Get new plan ID
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", newPlanName)
        .single();

      if (planError || !planData) {
        throw new Error("Plan not found");
      }

      // Get old plan name and prices
      const oldPlan = plans.find(p => p.id === subscription.plan_id);
      const newPlanPrices = plans.find(p => p.name === newPlanName);
      
      // Check if subscription record exists for this user (regardless of status)
      // Due to UNIQUE constraint on user_id, we must UPDATE existing record, not INSERT
      const { data: existingSub, error: checkError } = await supabase
        .from("user_subscriptions")
        .select("id, status, cancelled_at, cancel_at_period_end")
        .eq("user_id", subscription.user_id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
        throw checkError;
      }

      const isCancelled = existingSub?.status === "cancelled" || existingSub?.cancelled_at || existingSub?.cancel_at_period_end;
      const planChanged = oldPlan?.name !== newPlanName;
      let subscriptionId = existingSub?.id || subscription.id;
      
      if (existingSub) {
        // UPDATE existing subscription record (handles both active and cancelled)
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const updateData: any = {
          plan_id: planData.id,
          status: "active",
          is_trial: false,
          cancelled_at: null,
          cancel_at_period_end: false,
          cancellation_reason: null,
        };

        // Only update dates if subscription was cancelled (reactivating)
        // If custom price is 0 (free), set no end date
        const existingSubWithPrices = existingSub as any; // Type assertion for custom price fields
        const hasCustomPrice = existingSubWithPrices.custom_price_monthly !== null || existingSubWithPrices.custom_price_yearly !== null;
        const isFreeSubscription = (existingSubWithPrices.custom_price_monthly === 0) || (existingSubWithPrices.custom_price_yearly === 0);
        
        if (isCancelled) {
          if (isFreeSubscription) {
            // Free subscription - no end date
            updateData.current_period_start = now.toISOString();
            updateData.current_period_end = null;
            updateData.last_limit_reset = now.toISOString();
      } else {
            updateData.current_period_start = now.toISOString();
            updateData.current_period_end = periodEnd.toISOString();
            updateData.last_limit_reset = now.toISOString();
          }
        }

        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update(updateData)
          .eq("id", existingSub.id);

        if (updateError) throw updateError;
        subscriptionId = existingSub.id;
      } else {
        // INSERT new subscription record (user has no subscription record)
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { data: subData, error: insertError } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: subscription.user_id,
            plan_id: planData.id,
            status: "active",
            is_trial: false,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            billing_cycle: "monthly",
            last_limit_reset: now.toISOString(),
            cancelled_at: null,
            cancel_at_period_end: false,
          })
          .select()
          .single();

        if (insertError) {
          // If insert fails due to unique constraint, try updating instead
          if (insertError.code === '23505' || insertError.message?.includes('unique constraint')) {
            const { data: existingSub2 } = await supabase
              .from("user_subscriptions")
              .select("id")
              .eq("user_id", subscription.user_id)
              .single();
            
            if (existingSub2) {
              const { error: updateError2 } = await supabase
                .from("user_subscriptions")
                .update({
                  plan_id: planData.id,
                  status: "active",
                  is_trial: false,
                  cancelled_at: null,
                  cancel_at_period_end: false,
                })
                .eq("id", existingSub2.id);
              
              if (updateError2) throw updateError2;
              subscriptionId = existingSub2.id;
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        } else {
        subscriptionId = subData?.id || null;
        }
      }
      
      // Update profile's subscription_plan to match the new plan
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          subscription_plan: newPlanName,
          is_premium: newPlanName !== "free"
        })
        .eq("clerk_id", subscription.user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        // Don't throw - subscription was updated, profile update is secondary
      }

      // Log billing event
      if (isCancelled && existingSub) {
        // Reactivating from cancelled
        await supabase.rpc('log_billing_event', {
          p_user_id: subscription.user_id,
          p_subscription_id: subscriptionId,
          p_event_type: 'subscription_created',
          p_performed_by: currentUserId,
          p_old_plan_name: subscription.plan_name,
          p_new_plan_name: newPlanName,
          p_old_price_monthly: oldPlan?.price_monthly || 0,
          p_new_price_monthly: newPlanPrices?.price_monthly || 0,
          p_old_price_yearly: oldPlan?.price_yearly || 0,
          p_new_price_yearly: newPlanPrices?.price_yearly || 0,
          p_details: { reactivated_from_cancelled: true, admin_updated: true }
        });
      } else if (planChanged) {
        // Plan changed
        await supabase.rpc('log_billing_event', {
          p_user_id: subscription.user_id,
          p_subscription_id: subscriptionId,
          p_event_type: 'plan_changed',
          p_performed_by: currentUserId,
          p_old_plan_name: oldPlan?.name || subscription.plan_name,
          p_new_plan_name: newPlanName,
          p_old_price_monthly: oldPlan?.price_monthly || 0,
          p_new_price_monthly: newPlanPrices?.price_monthly || 0,
          p_old_price_yearly: oldPlan?.price_yearly || 0,
          p_new_price_yearly: newPlanPrices?.price_yearly || 0,
          p_details: { admin_updated: true }
        });
      } else if (!existingSub) {
        // New subscription created
        await supabase.rpc('log_billing_event', {
          p_user_id: subscription.user_id,
          p_subscription_id: subscriptionId,
          p_event_type: 'subscription_created',
          p_performed_by: currentUserId,
          p_new_plan_name: newPlanName,
          p_new_price_monthly: newPlanPrices?.price_monthly || 0,
          p_new_price_yearly: newPlanPrices?.price_yearly || 0,
          p_details: { admin_created: true }
        });
      }

      showToast("Plan updated successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating plan:", error);
      showToast(error.message || "Failed to update plan", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateRenewalDate = async (subscription: Subscription, newDate: string) => {
    try {
      setUpdating(true);

      if (!subscription.has_subscription_record || !subscription.id) {
        throw new Error("Subscription record not found");
      }

      const { error: subError } = await supabase
        .from("user_subscriptions")
        .update({ current_period_end: newDate })
        .eq("id", subscription.id);

      if (subError) throw subError;

      // Also update the profile's subscription_renewal_date for quick access
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ subscription_renewal_date: newDate })
        .eq("clerk_id", subscription.user_id);

      if (profileError) {
        console.error("Error updating profile renewal date:", profileError);
        // Don't fail the entire operation if profile update fails
      }

      // Log billing event
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: 'renewal_date_updated',
        p_performed_by: currentUserId,
        p_details: { new_renewal_date: newDate }
      });

      showToast("Renewal date updated successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating renewal date:", error);
      showToast(error.message || "Failed to update renewal date", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStartDate = async (subscription: Subscription, newDate: string) => {
    try {
      setUpdating(true);

      if (!subscription.has_subscription_record || !subscription.id) {
        throw new Error("Subscription record not found");
      }

      const { error } = await supabase
        .from("user_subscriptions")
        .update({ current_period_start: newDate })
        .eq("id", subscription.id);

      if (error) throw error;

      showToast("Start date updated successfully", "success");
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating start date:", error);
      showToast(error.message || "Failed to update start date", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePlanAndBillingCycle = async (subscription: Subscription, newPlanName: string, newCycle: string) => {
    try {
      setUpdating(true);
      
      // Get new plan ID
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", newPlanName)
        .single();

      if (planError || !planData) {
        throw new Error("Plan not found");
      }

      // Check if subscription record exists
      const { data: existingSub, error: checkError } = await supabase
        .from("user_subscriptions")
        .select("id, status, cancelled_at, cancel_at_period_end")
        .eq("user_id", subscription.user_id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const now = new Date();
      const periodEnd = newCycle === 'free' || newCycle === 'lifetime' 
        ? null 
        : (newCycle === 'yearly' 
            ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
            : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          ).toISOString();

      const updateData: any = {
        plan_id: planData.id,
        billing_cycle: newCycle,
        status: "active",
        is_trial: false,
        cancelled_at: null,
        cancel_at_period_end: false,
        cancellation_reason: null,
      };

      // Set period end based on billing cycle
      if (newCycle === 'free' || newCycle === 'lifetime') {
        updateData.current_period_end = null;
        updateData.custom_price_monthly = null;
        updateData.custom_price_yearly = null;
      } else {
        updateData.current_period_end = periodEnd;
        // Only set period start if subscription was cancelled (reactivating)
        if (existingSub && (existingSub.status === "cancelled" || existingSub.cancelled_at)) {
          updateData.current_period_start = now.toISOString();
          updateData.last_limit_reset = now.toISOString();
        }
      }

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update(updateData)
          .eq("id", existingSub.id);

        if (updateError) throw updateError;
      } else {
        // Create new subscription
        updateData.user_id = subscription.user_id;
        updateData.current_period_start = now.toISOString();
        updateData.last_limit_reset = now.toISOString();
        
        const { error: insertError } = await supabase
          .from("user_subscriptions")
          .insert(updateData)
          .select()
          .single();

        if (insertError) {
          // If insert fails due to unique constraint, try updating instead
          if (insertError.code === '23505') {
            const { data: existingSub2 } = await supabase
              .from("user_subscriptions")
              .select("id")
              .eq("user_id", subscription.user_id)
              .single();
            
            if (existingSub2) {
              const { error: updateError2 } = await supabase
                .from("user_subscriptions")
                .update(updateData)
                .eq("id", existingSub2.id);
              
              if (updateError2) throw updateError2;
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }
      }
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          subscription_plan: newPlanName,
          is_premium: newPlanName !== "free"
        })
        .eq("clerk_id", subscription.user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      // Log billing event
      const oldPlan = plans.find(p => p.id === subscription.plan_id);
      const newPlanPrices = plans.find(p => p.name === newPlanName);
      
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: existingSub?.id || subscription.id,
        p_event_type: 'plan_changed',
        p_performed_by: currentUserId,
        p_old_plan_name: oldPlan?.name || subscription.plan_name,
        p_new_plan_name: newPlanName,
        p_old_billing_cycle: subscription.billing_cycle || 'monthly',
        p_new_billing_cycle: newCycle,
        p_old_price_monthly: oldPlan?.price_monthly || 0,
        p_new_price_monthly: newPlanPrices?.price_monthly || 0,
        p_old_price_yearly: oldPlan?.price_yearly || 0,
        p_new_price_yearly: newPlanPrices?.price_yearly || 0,
        p_details: { admin_updated: true, plan_and_billing_cycle_changed: true }
      });

      showToast("Plan and billing cycle updated successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating plan and billing cycle:", error);
      showToast(error.message || "Failed to update plan and billing cycle", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateBillingCycle = async (subscription: Subscription, newCycle: string) => {
    try {
      setUpdating(true);

      // If no subscription record exists, we need to create one first
      if (!subscription.has_subscription_record || !subscription.id) {
        // Get the plan ID for the current plan
        const plan = plans.find(p => p.name === subscription.plan_name);
        if (!plan) {
          throw new Error(`Plan "${subscription.plan_name}" not found. Please select a plan first.`);
        }

        // Create a new subscription record with the billing cycle
        const now = new Date();
        const periodEnd = newCycle === 'free' || newCycle === 'lifetime' 
          ? null 
          : (newCycle === 'yearly' 
              ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
              : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
            ).toISOString();

        const { data: newSub, error: createError } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: subscription.user_id,
            plan_id: plan.id,
            status: 'active',
            billing_cycle: newCycle,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd,
            custom_price_monthly: newCycle === 'free' || newCycle === 'lifetime' ? null : undefined,
            custom_price_yearly: newCycle === 'free' || newCycle === 'lifetime' ? null : undefined,
          })
          .select()
          .single();

        if (createError) {
          // If insert fails due to unique constraint, try to update existing
          if (createError.code === '23505') {
            const { data: existingSub } = await supabase
              .from("user_subscriptions")
              .select("id")
              .eq("user_id", subscription.user_id)
              .maybeSingle();
            
            if (existingSub) {
              // Update the existing subscription
              const updateData: any = { billing_cycle: newCycle };
              if (newCycle === 'free' || newCycle === 'lifetime') {
                updateData.current_period_end = null;
                updateData.custom_price_monthly = null;
                updateData.custom_price_yearly = null;
              } else {
                updateData.current_period_end = periodEnd;
              }
              
              const { error: updateError } = await supabase
                .from("user_subscriptions")
                .update(updateData)
                .eq("id", existingSub.id);
              
              if (updateError) throw updateError;
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        } else {
          // Subscription created successfully, log the event
          await supabase.rpc('log_billing_event', {
            p_user_id: subscription.user_id,
            p_subscription_id: newSub.id,
            p_event_type: 'billing_cycle_changed',
            p_performed_by: currentUserId,
            p_old_billing_cycle: subscription.billing_cycle || 'monthly',
            p_new_billing_cycle: newCycle
          });

          showToast("Billing cycle set successfully", "success");
          setEditingModal(null);
          await loadSubscriptions();
          return;
        }
      }

      // If subscription record exists, update it
      const updateData: any = { billing_cycle: newCycle };
      
      // If setting to free or lifetime, set no end date and clear custom prices
      if (newCycle === 'free' || newCycle === 'lifetime') {
        updateData.current_period_end = null;
        updateData.custom_price_monthly = null;
        updateData.custom_price_yearly = null;
      } else {
        // For monthly/yearly, set end date if not already set
        const { data: currentSub } = await supabase
          .from("user_subscriptions")
          .select("current_period_end")
          .eq("id", subscription.id)
          .single();
        
        if (currentSub && !currentSub.current_period_end) {
          const now = new Date();
          const periodEnd = new Date(now);
          if (newCycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }
          updateData.current_period_end = periodEnd.toISOString();
        }
      }

      const { error } = await supabase
        .from("user_subscriptions")
        .update(updateData)
        .eq("id", subscription.id);

      if (error) throw error;

      // Log billing event
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: 'billing_cycle_changed',
        p_performed_by: currentUserId,
        p_old_billing_cycle: subscription.billing_cycle,
        p_new_billing_cycle: newCycle
      });

      showToast("Billing cycle updated successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating billing cycle:", error);
      showToast(error.message || "Failed to update billing cycle", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateTrial = async (subscription: Subscription, planName: string, trialDays: number) => {
    try {
      setUpdating(true);

      const { data: trialData, error } = await supabase.rpc('start_trial', {
        p_user_id: subscription.user_id,
        p_plan_name: planName,
        p_trial_days: trialDays
      });

      if (error) throw error;
      
      // Log billing event and create notification
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: trialData?.subscription_id || null,
        p_event_type: 'trial_started',
        p_performed_by: currentUserId,
        p_new_plan_name: planName,
        p_details: { trial_days: trialDays }
      });

      showToast("Trial created successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error creating trial:", error);
      showToast(error.message || "Failed to create trial", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSubscription = async (subscription: Subscription, immediate: boolean) => {
    const isTrial = subscription.is_trial || subscription.status === 'trial';
    const message = isTrial 
      ? "Are you sure you want to cancel this trial? The user will lose access immediately."
      : `Are you sure you want to ${immediate ? "immediately cancel" : "cancel at period end"} this subscription?`;
    
    if (!confirm(message)) {
      return;
    }

    try {
      setUpdating(true);
      
      // For trials, always cancel immediately
      const cancelImmediately = immediate || isTrial;
      
      const { error } = await supabase.rpc('cancel_subscription', {
        p_user_id: subscription.user_id,
        p_reason: isTrial ? "Trial cancelled by admin" : "Cancelled by admin",
        p_cancel_immediately: cancelImmediately
      });

      if (error) throw error;

      // Log billing event and create notification
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: isTrial ? 'trial_cancelled' : 'subscription_cancelled',
        p_performed_by: currentUserId,
        p_old_plan_name: subscription.plan_name,
        p_details: { reason: isTrial ? "Trial cancelled by admin" : "Cancelled by admin", immediate: cancelImmediately }
      });

      showToast(isTrial ? "Trial cancelled successfully" : "Subscription cancelled successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      showToast(error.message || "Failed to cancel subscription", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleSuspendPlan = async (subscription: Subscription) => {
    if (!confirm("Are you sure you want to suspend this subscription? The user will lose access to premium features immediately, but their plan will remain as " + subscription.plan_name + ".")) {
      return;
    }

    try {
      setUpdating(true);
      
      // Update subscription status to suspended
      // DO NOT set cancelled_at - suspension is different from cancellation
      // DO NOT update profile - keep the plan name so it shows correctly
      // Update by subscription ID to ensure we're updating the correct one
      console.log("=== SUSPENSION DEBUG ===");
      console.log("Subscription object:", subscription);
      console.log("Subscription ID to update:", subscription.id);
      console.log("User ID:", subscription.user_id);
      console.log("Current status:", subscription.status);
      
      // First, verify the subscription exists in the database
      const { data: existingSub, error: checkError } = await supabase
        .from("user_subscriptions")
        .select("id, status, user_id, plan_id")
        .eq("id", subscription.id)
        .single();
      
      if (checkError || !existingSub) {
        console.error("Subscription not found in database:", checkError);
        throw new Error(`Subscription with ID ${subscription.id} not found in database`);
      }
      
      console.log("Found subscription in database:", existingSub);
      
      // Check if there are multiple subscriptions for this user
      const { data: allUserSubs, error: allSubsError } = await supabase
        .from("user_subscriptions")
        .select("id, status, user_id, plan_id, created_at")
        .eq("user_id", subscription.user_id)
        .order("created_at", { ascending: false });
      
      if (!allSubsError && allUserSubs) {
        console.log(`Found ${allUserSubs.length} subscription(s) for user ${subscription.user_id}:`, allUserSubs);
        if (allUserSubs.length > 1) {
          console.warn("WARNING: Multiple subscriptions found for this user! This might cause issues.");
        }
      }
      
      const { data: updateData, error: subError } = await supabase
        .from("user_subscriptions")
        .update({ 
          status: 'suspended',
          cancellation_reason: "Suspended by admin",
          cancelled_at: null  // Explicitly clear cancelled_at if it was set
        })
        .eq("id", subscription.id)  // Use subscription ID instead of user_id + status filter
        .select("id, status, user_id");  // Return the updated row to verify

      if (subError) {
        console.error("Error updating subscription to suspended:", subError);
        showToast(`Failed to suspend subscription: ${subError.message}`, "error");
        throw subError;
      }
      
      console.log("Update response:", updateData);
      
      if (!updateData || updateData.length === 0) {
        console.error("No rows were updated! Subscription ID might not exist:", subscription.id);
        throw new Error("No subscription found with the provided ID. The subscription may have been deleted.");
      }

      // Verify the subscription status was actually updated FIRST
      const { data: verifySub, error: verifyError } = await supabase
        .from("user_subscriptions")
        .select("status, plan_id, user_id")
        .eq("id", subscription.id)
        .single();
      
      if (verifyError) {
        console.error("Error verifying subscription:", verifyError);
        throw new Error("Failed to verify subscription status update");
      } else {
        console.log("Verified subscription status:", verifySub);
        if (verifySub.status !== 'suspended') {
          console.error("CRITICAL: Subscription status was not set to 'suspended'! Actual status:", verifySub.status);
          throw new Error(`Status update failed. Expected 'suspended' but got '${verifySub.status}'`);
        }
      }

      // CRITICAL: The trigger now skips profile updates for suspended status
      // But we need to explicitly set the profile to keep the original plan name
      // Do this AFTER the subscription update to ensure it sticks
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          subscription_plan: subscription.plan_name,  // Keep original plan name (pro/ultimate)
          is_premium: subscription.plan_name !== "free"  // Keep premium status
        })
        .eq("clerk_id", subscription.user_id);

      if (profileError) {
        console.error("Error preserving plan name in profile:", profileError);
        throw profileError;
      }
      
      // Verify the profile was updated correctly
      const { data: verifyProfile, error: verifyProfileError } = await supabase
        .from("profiles")
        .select("subscription_plan, is_premium")
        .eq("clerk_id", subscription.user_id)
        .single();
      
      if (verifyProfileError) {
        console.error("Error verifying profile update:", verifyProfileError);
      } else if (verifyProfile && verifyProfile.subscription_plan !== subscription.plan_name) {
        console.error("CRITICAL: Profile plan name mismatch after suspension!");
        console.error("Expected:", subscription.plan_name, "Got:", verifyProfile.subscription_plan);
        // Retry once more
        await supabase
          .from("profiles")
          .update({ 
            subscription_plan: subscription.plan_name,
            is_premium: subscription.plan_name !== "free"
          })
          .eq("clerk_id", subscription.user_id);
      }

      // Log billing event
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: 'subscription_suspended',
        p_performed_by: currentUserId,
        p_old_plan_name: subscription.plan_name,
        p_new_plan_name: subscription.plan_name, // Keep same plan name
        p_details: { reason: "Suspended by admin" }
      });

      showToast("Subscription suspended successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error suspending subscription:", error);
      showToast(error.message || "Failed to suspend subscription", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUnsuspendPlan = async (subscription: Subscription) => {
    if (!confirm("Are you sure you want to unsuspend this subscription? The user will regain access to premium features.")) {
      return;
    }

    try {
      setUpdating(true);
      
      // Reactivate subscription
      const { error: subError } = await supabase
        .from("user_subscriptions")
        .update({ 
          status: 'active',
          cancelled_at: null,
          cancellation_reason: null
        })
        .eq("user_id", subscription.user_id)
        .eq("status", "suspended");

      if (subError) throw subError;

      // Restore user's plan
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          subscription_plan: subscription.plan_name,
          is_premium: subscription.plan_name !== "free"
        })
        .eq("clerk_id", subscription.user_id);

      if (profileError) throw profileError;

      // Log billing event
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: 'subscription_unsuspended',
        p_performed_by: currentUserId,
        p_new_plan_name: subscription.plan_name,
        p_details: { reason: "Unsuspended by admin" }
      });

      showToast("Subscription unsuspended successfully", "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error unsuspending subscription:", error);
      showToast(error.message || "Failed to unsuspend subscription", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetLimits = async (userId: string) => {
    try {
      setUpdating(true);
      
      const { error } = await supabase.rpc('reset_user_limits', {
        p_user_id: userId
      });

      if (error) throw error;

      showToast("Limits reset successfully", "success");
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error resetting limits:", error);
      showToast("Failed to reset limits", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePlanPrice = async (planId: string, priceMonthly: number, priceYearly: number) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from("subscription_plans")
        .update({
          price_monthly: priceMonthly,
          price_yearly: priceYearly,
        })
        .eq("id", planId);

      if (error) throw error;

      showToast("Plan prices updated successfully", "success");
      await loadPlans();
    } catch (error: any) {
      console.error("Error updating plan prices:", error);
      showToast("Failed to update plan prices", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateCustomPrice = async (subscription: Subscription, priceMonthly: number | null, priceYearly: number | null) => {
    if (!subscription.has_subscription_record || !subscription.id) {
      showToast("No subscription record found. Please create a subscription first.", "error");
      return;
    }

    try {
      setUpdating(true);

      const updateData: any = {};
      
      // Only update if value is provided
      // null means clear custom price (use plan default) - explicitly set to NULL in database
      // 0 is a valid value (free subscription)
      // undefined means don't update this field
      if (priceMonthly !== undefined) {
        // Explicitly set to null if null, otherwise set the value
        if (priceMonthly === null) {
          updateData.custom_price_monthly = null;
        } else {
          updateData.custom_price_monthly = priceMonthly;
        }
      }
      if (priceYearly !== undefined) {
        // Explicitly set to null if null, otherwise set the value
        if (priceYearly === null) {
          updateData.custom_price_yearly = null;
        } else {
          updateData.custom_price_yearly = priceYearly;
        }
      }
      
      console.log("Updating custom prices:", updateData);

      // If price is 0 (free), set no end date
      const isFreeSubscription = (priceMonthly === 0) || (priceYearly === 0);
      if (isFreeSubscription) {
        updateData.current_period_end = null;
      } else if (priceMonthly === null && priceYearly === null) {
        // If clearing custom prices, restore normal end date if needed
        const { data: currentSub } = await supabase
          .from("user_subscriptions")
          .select("current_period_end")
          .eq("id", subscription.id)
          .single();
        
        if (currentSub && !currentSub.current_period_end) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          updateData.current_period_end = periodEnd.toISOString();
        }
      }

      // Verify we have something to update
      if (Object.keys(updateData).length === 0) {
        showToast("No changes to save", "info");
        return;
      }

      const { data: updatedData, error } = await supabase
        .from("user_subscriptions")
        .update(updateData)
        .eq("id", subscription.id)
        .select("custom_price_monthly, custom_price_yearly"); // Return updated values to verify

      if (error) throw error;
      
      console.log("Custom prices updated successfully:", updatedData);
      
      // Verify the update worked
      if (updatedData && updatedData.length > 0) {
        const updated = updatedData[0];
        if (priceMonthly !== undefined) {
          // Check if null was set correctly
          const expectedMonthly = priceMonthly === null ? null : priceMonthly;
          if (updated.custom_price_monthly !== expectedMonthly) {
            console.warn("Monthly price mismatch! Expected:", expectedMonthly, "Got:", updated.custom_price_monthly);
          } else {
            console.log("Monthly price verified:", updated.custom_price_monthly);
          }
        }
        if (priceYearly !== undefined) {
          const expectedYearly = priceYearly === null ? null : priceYearly;
          if (updated.custom_price_yearly !== expectedYearly) {
            console.warn("Yearly price mismatch! Expected:", expectedYearly, "Got:", updated.custom_price_yearly);
          } else {
            console.log("Yearly price verified:", updated.custom_price_yearly);
          }
        }
      }

      // Log billing event
      const plan = plans.find(p => p.name === subscription.plan_name);
      // Use custom price if set, otherwise plan price
      const oldMonthly = subscription.custom_price_monthly !== null && subscription.custom_price_monthly !== undefined 
        ? subscription.custom_price_monthly 
        : (plan?.price_monthly || 0);
      const oldYearly = subscription.custom_price_yearly !== null && subscription.custom_price_yearly !== undefined 
        ? subscription.custom_price_yearly 
        : (plan?.price_yearly || 0);
      const newMonthly = priceMonthly !== null && priceMonthly !== undefined 
        ? priceMonthly 
        : (plan?.price_monthly || 0);
      const newYearly = priceYearly !== null && priceYearly !== undefined 
        ? priceYearly 
        : (plan?.price_yearly || 0);

      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: 'subscription_updated',
        p_performed_by: currentUserId,
        p_old_plan_name: subscription.plan_name,
        p_new_plan_name: subscription.plan_name,
        p_old_price_monthly: oldMonthly,
        p_new_price_monthly: newMonthly,
        p_old_price_yearly: oldYearly,
        p_new_price_yearly: newYearly,
        p_details: { 
          custom_pricing_updated: true,
          custom_monthly: priceMonthly,
          custom_yearly: priceYearly
        }
      });

      showToast("Custom pricing updated successfully", "success");
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating custom price:", error);
      showToast(error.message || "Failed to update custom price", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleSetSubscriptionStatus = async (subscription: Subscription, newStatus: string) => {
    if (!subscription.has_subscription_record || !subscription.id) {
      showToast("No subscription record found. Please create a subscription first.", "error");
      return;
    }

    try {
      setUpdating(true);

      const updateData: any = {
        status: newStatus,
      };

      // Clear cancelled fields if activating
      if (newStatus === "active") {
        updateData.cancelled_at = null;
        updateData.cancel_at_period_end = false;
        updateData.cancellation_reason = null;
      } else if (newStatus === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancel_at_period_end = false;
      } else if (newStatus === "suspended") {
        // For suspension, explicitly clear cancelled_at and set cancellation_reason
        updateData.cancelled_at = null;  // Suspension is NOT cancellation
        updateData.cancel_at_period_end = false;
        updateData.cancellation_reason = "Suspended by admin";
      }

      console.log("Updating subscription status to:", newStatus, "Subscription ID:", subscription.id);
      
      const { data: updateDataResult, error } = await supabase
        .from("user_subscriptions")
        .update(updateData)
        .eq("id", subscription.id)
        .select("id, status");  // Return updated row to verify

      if (error) {
        console.error("Error updating subscription status:", error);
        showToast(`Failed to update subscription status: ${error.message}`, "error");
        throw error;
      }
      
      console.log("Update response:", updateDataResult);
      
      if (!updateDataResult || updateDataResult.length === 0) {
        console.error("No rows were updated! Subscription ID might not exist:", subscription.id);
        throw new Error("No subscription found with the provided ID. The subscription may have been deleted.");
      }
      
      // Verify the update was successful - check immediately
      const { data: updatedSub, error: verifyError } = await supabase
        .from("user_subscriptions")
        .select("status, plan_id, user_id")
        .eq("id", subscription.id)
        .single();
      
      if (verifyError) {
        console.error("Error verifying subscription update:", verifyError);
        throw new Error("Failed to verify subscription status update");
      } else {
        console.log("Subscription status updated successfully:", updatedSub);
        if (updatedSub.status !== newStatus) {
          console.error("CRITICAL: Status mismatch! Expected:", newStatus, "Got:", updatedSub.status);
          showToast(`Status update verification failed. Expected ${newStatus} but got ${updatedSub.status}`, "error");
          throw new Error(`Status update failed. Expected ${newStatus} but got ${updatedSub.status}`);
        }
      }

      // Update profile ONLY if activating or cancelling
      // DO NOT update profile when suspending - keep the plan name
      // Note: There's a database trigger that may update the profile, but we want to ensure
      // the plan name is preserved when suspending
      if (newStatus === "active") {
        await supabase
          .from("profiles")
          .update({
            subscription_plan: subscription.plan_name,
            is_premium: subscription.plan_name !== "free"
          })
          .eq("clerk_id", subscription.user_id);
      } else if (newStatus === "cancelled") {
        await supabase
          .from("profiles")
          .update({
            subscription_plan: "free",
            is_premium: false
          })
          .eq("clerk_id", subscription.user_id);
      } else if (newStatus === "suspended") {
        // CRITICAL: The trigger now skips profile updates for suspended status
        // But we need to explicitly set the profile to keep the original plan name
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            subscription_plan: subscription.plan_name,  // Keep original plan name (pro/ultimate)
            is_premium: subscription.plan_name !== "free"  // Keep premium status
          })
          .eq("clerk_id", subscription.user_id);

        if (profileError) {
          console.error("Error preserving plan name in profile:", profileError);
          throw profileError;
        }
        
        // Verify the profile was updated correctly
        const { data: verifyProfile, error: verifyProfileError } = await supabase
          .from("profiles")
          .select("subscription_plan, is_premium")
          .eq("clerk_id", subscription.user_id)
          .single();
        
        if (verifyProfileError) {
          console.error("Error verifying profile update:", verifyProfileError);
        } else if (verifyProfile && verifyProfile.subscription_plan !== subscription.plan_name) {
          console.error("CRITICAL: Profile plan name mismatch after suspension!");
          console.error("Expected:", subscription.plan_name, "Got:", verifyProfile.subscription_plan);
          // Retry once more
          await supabase
            .from("profiles")
            .update({ 
              subscription_plan: subscription.plan_name,
              is_premium: subscription.plan_name !== "free"
            })
            .eq("clerk_id", subscription.user_id);
        }
      }

      // Log status change
      await supabase.rpc('log_billing_event', {
        p_user_id: subscription.user_id,
        p_subscription_id: subscription.id,
        p_event_type: newStatus === "active" ? 'subscription_updated' : 
                     newStatus === "cancelled" ? 'subscription_cancelled' :
                     newStatus === "suspended" ? 'subscription_suspended' : 'subscription_updated',
        p_performed_by: currentUserId,
        p_old_plan_name: subscription.plan_name,
        p_new_plan_name: newStatus === "cancelled" ? "free" : subscription.plan_name,
        p_details: { status_changed_to: newStatus, manual_update: true }
      });

      showToast(`Subscription status updated to ${newStatus}`, "success");
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      console.error("Error updating subscription status:", error);
      showToast(error.message || "Failed to update subscription status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkUpdate = async (updates: any[]) => {
    if (!updates || updates.length === 0) {
      showToast("Please select at least one user and make changes", "error");
      return;
    }
    setUpdating(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const update of updates) {
        try {
        if (update.type === 'plan') {
          await handleUpdatePlan(update.subscription, update.planName);
            successCount++;
        } else if (update.type === 'renewal_date') {
          await handleUpdateRenewalDate(update.subscription, update.renewalDate);
            successCount++;
        } else if (update.type === 'billing_cycle') {
          await handleUpdateBillingCycle(update.subscription, update.billingCycle);
            successCount++;
          } else if (update.type === 'status') {
            await handleSetSubscriptionStatus(update.subscription, update.status);
            successCount++;
          } else if (update.type === 'custom_price') {
            await handleUpdateCustomPrice(update.subscription, update.priceMonthly, update.priceYearly);
            successCount++;
          }
        } catch (error: any) {
          console.error(`Error updating ${update.subscription.user_id}:`, error);
          errorCount++;
        }
      }
      
      if (errorCount > 0) {
        showToast(`Bulk update completed with ${errorCount} error(s): ${successCount} change(s) applied`, "error");
      } else {
        showToast(`Bulk update completed: ${successCount} change(s) applied`, "success");
      }
      setEditingModal(null);
      await loadSubscriptions();
    } catch (error: any) {
      showToast(error.message || "Bulk update failed", "error");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (subscription: Subscription) => {
    // Check if suspended FIRST - this applies to all plans including free
    if (subscription.status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded">
          <Ban className="w-3 h-3" />
          Suspended
        </span>
      );
    }
    
    // Free plan users should show as Active (unless suspended, which is handled above)
    if (subscription.plan_name === "free") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      );
    }
    
    // Check if there's an active subscription record (even if old one was cancelled)
    // If has_subscription_record is true and status is active, show active
    if (subscription.has_subscription_record && 
        subscription.status === "active" && 
        !subscription.cancelled_at && 
        !subscription.cancel_at_period_end) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      );
    }
    
    // Check if trial (and not cancelled)
    if ((subscription.is_trial || subscription.status === "trial") && 
        !subscription.cancelled_at && 
        subscription.status !== "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
          <Clock className="w-3 h-3" />
          Trial
        </span>
      );
    }
    
    // Check if cancelled (but not for free plans)
    if (subscription.status === "cancelled" || subscription.cancelled_at || subscription.cancel_at_period_end) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    }
    
    // Default to active (for users with active plan but no subscription record)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
        <CheckCircle2 className="w-3 h-3" />
        Active
      </span>
    );
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case "pro":
        return <Zap className="w-4 h-4" />;
      case "ultimate":
        return <Crown className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const stats = {
    total: subscriptions.length,
    free: subscriptions.filter((s) => s.plan_name === "free").length,
    active: subscriptions.filter((s) => s.status === "active" && !s.cancel_at_period_end).length,
    trial: subscriptions.filter((s) => s.is_trial || s.status === "trial").length,
    cancelled: subscriptions.filter((s) => s.cancel_at_period_end || s.cancelled_at).length,
    suspended: subscriptions.filter((s) => s.status === "suspended").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Subscriptions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage User Subscriptions, Trials, And Billing For All Users
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingModal({ subscription: null, field: 'prices', mode: 'bulk' })}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-lg font-semibold">£</span>
            Edit Prices
          </button>
          <button
            onClick={() => setEditingModal({ subscription: null, subscriptions: filteredSubscriptions, field: 'bulk', mode: 'bulk' })}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Bulk Operations
          </button>
          <button
            onClick={() => setCreatingSubscription(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Subscription
          </button>
        <button
          onClick={loadSubscriptions}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Free Plan</p>
              <p className="text-2xl font-bold text-blue-600">{stats.free}</p>
            </div>
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Trials</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.trial}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
              <p className="text-2xl font-bold text-orange-600">{stats.suspended}</p>
            </div>
            <Ban className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>


      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="free">Free Plan</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="ultimate">Ultimate</option>
          </select>
          <select
            value={billingCycleFilter}
            onChange={(e) => setBillingCycleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Billing Cycles</option>
            <option value="free">Free</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <select
            value={customPriceFilter}
            onChange={(e) => setCustomPriceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Pricing Types</option>
            <option value="has_custom">Has Custom Pricing</option>
            <option value="no_custom">Default Pricing Only</option>
            <option value="free_custom">Free Custom Pricing</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Billing Cycle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Renewal Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan End
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {subscription.user_display_name || "Unknown User"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {subscription.user_email || subscription.user_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getPlanIcon(subscription.plan_name)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {subscription.plan_display_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscription)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {subscription.plan_name === "free" ? "Free" :
                       subscription.billing_cycle === "yearly" ? "Yearly" : 
                       subscription.billing_cycle === "monthly" ? "Monthly" : 
                       subscription.billing_cycle === "free" ? "Free" :
                       subscription.billing_cycle === "lifetime" ? "Lifetime" : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {subscription.plan_name === "free" || 
                       subscription.billing_cycle === "free" || 
                       subscription.billing_cycle === "lifetime"
                        ? "N/A"
                        : subscription.current_period_end
                          ? (
                              <>
                                <div>{format(new Date(subscription.current_period_end), "MMM d, yyyy")}</div>
                                {(() => {
                                  const renewalDate = new Date(subscription.current_period_end);
                                  const now = new Date();
                                  const diff = renewalDate.getTime() - now.getTime();
                                  if (diff <= 0) {
                                    return <div className="text-xs text-red-600 dark:text-red-400">Expired</div>;
                                  }
                                  const days = differenceInDays(renewalDate, now);
                                  const hours = differenceInHours(renewalDate, now) % 24;
                                  if (days > 0) {
                                    return (
                                      <div className={`text-xs ${days <= 7 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                                        {days} day{days !== 1 ? 's' : ''} remaining
                                      </div>
                                    );
                                  } else if (hours > 0) {
                                    return (
                                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                        {hours} hour{hours !== 1 ? 's' : ''} remaining
                                      </div>
                                    );
                                  } else {
                                    const minutes = differenceInMinutes(renewalDate, now);
                                    return (
                                      <div className="text-xs text-red-600 dark:text-red-400">
                                        {minutes} minute{minutes !== 1 ? 's' : ''} remaining
                                      </div>
                                    );
                                  }
                                })()}
                              </>
                            )
                          : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {subscription.current_period_start
                        ? format(new Date(subscription.current_period_start), "MMM d, yyyy")
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {subscription.plan_name === "free" || 
                       subscription.billing_cycle === "free" || 
                       subscription.billing_cycle === "lifetime"
                        ? "N/A"
                        : subscription.current_period_end
                          ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
                          : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(() => {
                        // Use the same logic as the RPC function for consistency
                        const billingCycle = subscription.billing_cycle || "monthly";
                        const isFreeOrLifetime = billingCycle === "free" || billingCycle === "lifetime" || subscription.plan_name === "free";
                        
                        if (isFreeOrLifetime) {
                          return <span className="text-green-600 dark:text-green-400 font-semibold">£0.00</span>;
                        }
                        
                        // Calculate effective price (same as RPC function)
                        const isYearly = billingCycle === "yearly";
                        const effectivePrice = isYearly
                          ? (subscription.custom_price_yearly !== null && subscription.custom_price_yearly !== undefined
                              ? subscription.custom_price_yearly
                              : (subscription.plan_price_yearly || 0))
                          : (subscription.custom_price_monthly !== null && subscription.custom_price_monthly !== undefined
                              ? subscription.custom_price_monthly
                              : (subscription.plan_price_monthly || 0));
                        
                        const hasCustomPrice = isYearly
                          ? (subscription.custom_price_yearly !== null && subscription.custom_price_yearly !== undefined)
                          : (subscription.custom_price_monthly !== null && subscription.custom_price_monthly !== undefined);
                        
                        return (
                          <>
                            {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          minimumFractionDigits: 2,
                            }).format(effectivePrice)}
                            {hasCustomPrice && (
                              <span className="ml-1 text-xs text-green-600 dark:text-green-400" title={effectivePrice === 0 ? "Free subscription" : "Custom price"}>
                                *
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            router.push(`/admin?tab=users&viewUser=${subscription.user_id}`);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          title="View User Details"
                        >
                          <User className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingModal({ subscription, field: 'plan', mode: 'single' })}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          title="Manage Subscription"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {subscription.has_subscription_record && subscription.status !== "suspended" && subscription.plan_name !== "free" && (
                        <button
                            onClick={() => handleSuspendPlan(subscription)}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                            title="Suspend Subscription"
                          >
                            <Ban className="w-4 h-4" />
                        </button>
                        )}
                        {subscription.status === "suspended" && (
                          <button
                            onClick={() => handleUnsuspendPlan(subscription)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            title="Unsuspend Subscription"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {!subscription.has_subscription_record && subscription.plan_name !== "free" && (
                        <button
                            onClick={() => setEditingModal({ subscription, field: 'plan', mode: 'single' })}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            title="Create Subscription"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Subscription Modal */}
      {creatingSubscription && (
        <CreateSubscriptionModal
          onClose={() => setCreatingSubscription(false)}
          onCreate={handleCreateSubscription}
          plans={plans}
          userId={newSubscriptionUserId}
          setUserId={setNewSubscriptionUserId}
          plan={newSubscriptionPlan}
          setPlan={setNewSubscriptionPlan}
          isTrial={newSubscriptionIsTrial}
          setIsTrial={setNewSubscriptionIsTrial}
          trialDays={newSubscriptionTrialDays}
          setTrialDays={setNewSubscriptionTrialDays}
          billingCycle={newSubscriptionBillingCycle}
          setBillingCycle={setNewSubscriptionBillingCycle}
          updating={updating}
        />
      )}

      {/* Unified Edit Modal */}
      {editingModal && (
        <UnifiedSubscriptionModal
          modalData={editingModal}
          onClose={() => setEditingModal(null)}
          onUpdatePlan={handleUpdatePlan}
          onUpdateRenewalDate={handleUpdateRenewalDate}
          onUpdateStartDate={handleUpdateStartDate}
          onUpdateBillingCycle={handleUpdateBillingCycle}
          onCreateTrial={handleCreateTrial}
          onCancelSubscription={handleCancelSubscription}
          onResetLimits={handleResetLimits}
          onUpdatePlanPrice={handleUpdatePlanPrice}
          onBulkUpdate={handleBulkUpdate}
          onSuspendPlan={handleSuspendPlan}
          onUnsuspendPlan={handleUnsuspendPlan}
          onSetSubscriptionStatus={handleSetSubscriptionStatus}
          onUpdateCustomPrice={handleUpdateCustomPrice}
          onUpdatePlanAndBillingCycle={handleUpdatePlanAndBillingCycle}
          plans={plans}
          updating={updating}
          supabase={supabase}
          currentUserId={currentUserId}
        />
      )}

      {/* Legacy Edit Modal - keeping for backward compatibility */}
      {false && editingModal && (
        <EditSubscriptionModal
          modalData={editingModal}
          onClose={() => setEditingModal(null)}
          onUpdatePlan={handleUpdatePlan}
          onUpdateRenewalDate={handleUpdateRenewalDate}
          onUpdateBillingCycle={handleUpdateBillingCycle}
          onCreateTrial={handleCreateTrial}
          onCancelSubscription={handleCancelSubscription}
          plans={plans}
          updating={updating}
        />
      )}
    </div>
  );
}

// Custom Pricing Editor Component
function CustomPricingEditor({
  subscription,
  onUpdateCustomPrice,
  updating,
}: {
  subscription: Subscription;
  onUpdateCustomPrice?: (subscription: Subscription, priceMonthly: number | null, priceYearly: number | null) => void;
  updating: boolean;
}) {
  const [customMonthly, setCustomMonthly] = useState<string>(
    subscription.custom_price_monthly?.toString() || ""
  );
  const [customYearly, setCustomYearly] = useState<string>(
    subscription.custom_price_yearly?.toString() || ""
  );

  useEffect(() => {
    setCustomMonthly(subscription.custom_price_monthly?.toString() || "");
    setCustomYearly(subscription.custom_price_yearly?.toString() || "");
  }, [subscription.custom_price_monthly, subscription.custom_price_yearly]);

  const handleSave = () => {
    if (!onUpdateCustomPrice) return;
    
    // Empty string means clear custom price (use plan default)
    // 0 is a valid value (free subscription)
    // Any other number is a custom price
    const monthlyValue = customMonthly === "" ? null : (isNaN(parseFloat(customMonthly)) ? null : parseFloat(customMonthly));
    const yearlyValue = customYearly === "" ? null : (isNaN(parseFloat(customYearly)) ? null : parseFloat(customYearly));
    
    // Only update if values changed
    const monthlyChanged = monthlyValue !== subscription.custom_price_monthly;
    const yearlyChanged = yearlyValue !== subscription.custom_price_yearly;
    
    if (monthlyChanged || yearlyChanged) {
      onUpdateCustomPrice(
        subscription,
        monthlyChanged ? monthlyValue : (subscription.custom_price_monthly ?? null),
        yearlyChanged ? yearlyValue : (subscription.custom_price_yearly ?? null)
      );
    }
  };

  const handleClear = (type: 'monthly' | 'yearly') => {
    if (type === 'monthly') {
      setCustomMonthly("");
      if (onUpdateCustomPrice) {
        onUpdateCustomPrice(subscription, null, subscription.custom_price_yearly ?? null);
      }
    } else {
      setCustomYearly("");
      if (onUpdateCustomPrice) {
        onUpdateCustomPrice(subscription, subscription.custom_price_monthly ?? null, null);
      }
    }
  };

  const hasChanges = (() => {
    const monthlyValue = customMonthly === "" ? null : (isNaN(parseFloat(customMonthly)) ? null : parseFloat(customMonthly));
    const yearlyValue = customYearly === "" ? null : (isNaN(parseFloat(customYearly)) ? null : parseFloat(customYearly));
    return monthlyValue !== subscription.custom_price_monthly || yearlyValue !== subscription.custom_price_yearly;
  })();

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Pricing</label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Set custom prices for this user. Leave empty to use plan default prices. Set to 0 for free subscription (no end date).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Custom Monthly Price (GBP)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={customMonthly}
              onChange={(e) => setCustomMonthly(e.target.value)}
              placeholder={subscription.plan_price_monthly?.toString() || "0"}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
              disabled={updating}
            />
            <button
              onClick={() => handleClear('monthly')}
              disabled={updating || !subscription.custom_price_monthly}
              className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
              title="Clear custom price"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Plan default: £{subscription.plan_price_monthly?.toFixed(2) || "0.00"}
            {subscription.custom_price_monthly && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (Custom: £{subscription.custom_price_monthly.toFixed(2)})
              </span>
            )}
          </p>
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Custom Yearly Price (GBP)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={customYearly}
              onChange={(e) => setCustomYearly(e.target.value)}
              placeholder={subscription.plan_price_yearly?.toString() || "0"}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
              disabled={updating}
            />
            <button
              onClick={() => handleClear('yearly')}
              disabled={updating || !subscription.custom_price_yearly}
              className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
              title="Clear custom price"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Plan default: £{subscription.plan_price_yearly?.toFixed(2) || "0.00"}
            {subscription.custom_price_yearly && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                (Custom: £{subscription.custom_price_yearly.toFixed(2)})
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={updating || !hasChanges}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {updating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Custom Prices</span>
            </>
          )}
        </button>
        {(subscription.custom_price_monthly !== null || subscription.custom_price_yearly !== null) && (
          <button
            onClick={() => {
              if (onUpdateCustomPrice) {
                onUpdateCustomPrice(subscription, null, null);
              }
            }}
            disabled={updating}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title="Reset both prices to plan defaults"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset to Default</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Plan Price Editor Component
function PlanPriceEditor({ plan, onUpdate, updating }: { plan: Plan; onUpdate: (id: string, monthly: number, yearly: number) => void; updating: boolean }) {
  const [priceMonthly, setPriceMonthly] = useState(plan.price_monthly);
  const [priceYearly, setPriceYearly] = useState(plan.price_yearly);

  useEffect(() => {
    setPriceMonthly(plan.price_monthly);
    setPriceYearly(plan.price_yearly);
  }, [plan]);

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 dark:text-white">{plan.display_name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{plan.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Monthly</label>
          <input
            type="number"
            step="0.01"
            value={priceMonthly}
            onChange={(e) => setPriceMonthly(parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Yearly</label>
          <input
            type="number"
            step="0.01"
            value={priceYearly}
            onChange={(e) => setPriceYearly(parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => onUpdate(plan.id, priceMonthly, priceYearly)}
          disabled={updating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Create Subscription Modal Component
function CreateSubscriptionModal({
  onClose,
  onCreate,
  plans,
  userId,
  setUserId,
  plan,
  setPlan,
  isTrial,
  setIsTrial,
  trialDays,
  setTrialDays,
  billingCycle,
  setBillingCycle,
  updating,
}: any) {
  return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Subscription</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User ID (Clerk ID)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="user_xxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plan
                </label>
                <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              {plans.map((p: Plan) => (
                <option key={p.id} value={p.name}>{p.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create as Trial</span>
            </label>
          </div>
          {isTrial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trial Days
              </label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                min="1"
                max="365"
              />
            </div>
          )}
          {!isTrial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Billing Cycle
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="free">Free (No Charge)</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime (Permanent Free)</option>
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={updating || !userId}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Single User Modal Component (extracted to avoid parser issues)
function SingleUserModal({
  subscription,
  activeTab,
  setActiveTab,
  newPlan,
  setNewPlan,
  newStartDate,
  setNewStartDate,
  newRenewalDate,
  setNewRenewalDate,
  newBillingCycle,
  setNewBillingCycle,
  trialPlan,
  setTrialPlan,
  trialDays,
  setTrialDays,
  plans,
  updating,
  onClose,
  onUpdatePlan,
  onUpdateStartDate,
  onUpdateRenewalDate,
  onUpdateBillingCycle,
  onCreateTrial,
  onCancelSubscription,
  onResetLimits,
  onSuspendPlan,
  onUnsuspendPlan,
  onUpdateCustomPrice,
  onSetSubscriptionStatus,
  billingHistory,
  loadingHistory,
  loadBillingHistory,
  format,
  Loader2,
  X,
  Clock,
  RefreshCw,
  onUpdatePlanAndBillingCycle,
}: any) {
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [planChangePlan, setPlanChangePlan] = useState(subscription?.plan_name || "free");
  const [planChangeBillingCycle, setPlanChangeBillingCycle] = useState(subscription?.billing_cycle || "monthly");
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Manage Subscription - {subscription.user_display_name || subscription.user_email}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs for single user view */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'history'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400"
            }`}
          >
            History
          </button>
        </div>

        {/* Subscription Overview */}
        {activeTab === 'overview' && (
          <>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Plan</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{subscription.plan_display_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                    {subscription.status === "suspended" 
                      ? "Suspended"
                      : subscription.status === "cancelled" || subscription.cancelled_at
                        ? "Cancelled"
                        : subscription.status === "trial" || subscription.is_trial
                          ? "Trial"
                          : subscription.status === "active" || !subscription.status
                            ? "Active"
                            : subscription.status || "Active"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Plan Start</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {subscription.current_period_start ? format(new Date(subscription.current_period_start), "MMM d, yyyy 'at' h:mm a") : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Renewal Date</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {subscription.plan_name === "free" || 
                     subscription.billing_cycle === "free" || 
                     subscription.billing_cycle === "lifetime"
                      ? "N/A"
                      : subscription.current_period_end 
                        ? format(new Date(subscription.current_period_end), "MMM d, yyyy 'at' h:mm a") 
                        : "N/A"}
                  </p>
                  {subscription.plan_name !== "free" && 
                   subscription.billing_cycle !== "free" && 
                   subscription.billing_cycle !== "lifetime" &&
                   subscription.current_period_end && (() => {
                     const renewalDate = new Date(subscription.current_period_end);
                     const now = new Date();
                     const diff = renewalDate.getTime() - now.getTime();
                     if (diff <= 0) {
                       return <p className="text-xs text-red-600 dark:text-red-400 mt-1">Expired</p>;
                     }
                     const days = differenceInDays(renewalDate, now);
                     const hours = differenceInHours(renewalDate, now) % 24;
                     if (days > 0) {
                       return (
                         <p className={`text-xs mt-1 ${days <= 7 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                           {days} day{days !== 1 ? 's' : ''} remaining
                         </p>
                       );
                     } else if (hours > 0) {
                       return (
                         <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                           {hours} hour{hours !== 1 ? 's' : ''} remaining
                         </p>
                       );
                     } else {
                       const minutes = differenceInMinutes(renewalDate, now);
                       return (
                         <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                           {minutes} minute{minutes !== 1 ? 's' : ''} remaining
                         </p>
                       );
                     }
                   })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Billing Cycle</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {subscription.plan_name === "free" ? "Free" :
                     subscription.billing_cycle === "yearly" ? "Yearly" : 
                     subscription.billing_cycle === "monthly" ? "Monthly" : 
                     subscription.billing_cycle === "free" ? "Free" :
                     subscription.billing_cycle === "lifetime" ? "Lifetime" : 
                     "Monthly"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Plan End</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {subscription.plan_name === "free" || 
                     subscription.billing_cycle === "free" || 
                     subscription.billing_cycle === "lifetime"
                      ? "N/A"
                      : subscription.current_period_end
                        ? format(new Date(subscription.current_period_end), "MMM d, yyyy 'at' h:mm a")
                        : "N/A"}
                  </p>
                </div>
                {subscription.is_trial && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Trial End</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {subscription.trial_end ? format(new Date(subscription.trial_end), "MMM d, yyyy 'at' h:mm a") : "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Subscription Status</label>
                {subscription.has_subscription_record ? (
                  <>
                <div className="flex gap-2">
                  <select
                        value={subscription.status || "active"}
                        onChange={(e) => {
                          if (onSetSubscriptionStatus && confirm(`Are you sure you want to change the subscription status to ${e.target.value}?`)) {
                            onSetSubscriptionStatus(subscription, e.target.value);
                          }
                        }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        disabled={updating}
                      >
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="suspended">Suspended</option>
                        <option value="trial">Trial</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 self-center">Current: {subscription.status || "active"}</p>
                    </div>
                    {subscription.cancelled_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cancelled on: {format(new Date(subscription.cancelled_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No subscription record found. Create a subscription or start a trial to manage status.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Change Plan & Billing Cycle</label>
                <button
                  onClick={() => setShowPlanChangeModal(true)}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Change Plan & Billing Cycle
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Update plan and billing cycle together to avoid conflicts
                </p>
              </div>

              {/* Nested Plan Change Modal */}
              {showPlanChangeModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Plan & Billing Cycle</h3>
                      <button 
                        onClick={() => setShowPlanChangeModal(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Plan
                        </label>
                        <select
                          value={planChangePlan}
                          onChange={(e) => setPlanChangePlan(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={updating}
                  >
                    {plans.map((p: Plan) => (
                      <option key={p.id} value={p.name}>{p.display_name}</option>
                    ))}
                  </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Billing Cycle
                        </label>
                        <select
                          value={planChangeBillingCycle}
                          onChange={(e) => setPlanChangeBillingCycle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          disabled={updating}
                        >
                          <option value="free">Free (No Charge)</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                          <option value="lifetime">Lifetime (Permanent Free)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Current: {subscription.billing_cycle || "monthly"}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                  <button
                          onClick={() => setShowPlanChangeModal(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          disabled={updating}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (onUpdatePlanAndBillingCycle) {
                              onUpdatePlanAndBillingCycle(subscription, planChangePlan, planChangeBillingCycle);
                              setShowPlanChangeModal(false);
                            }
                          }}
                          disabled={updating || (planChangePlan === subscription.plan_name && planChangeBillingCycle === subscription.billing_cycle)}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Update"}
                  </button>
                </div>
              </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Update Dates</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                      disabled={updating}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Renewal Date</label>
                    <input
                      type="datetime-local"
                      value={newRenewalDate}
                      onChange={(e) => setNewRenewalDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                      disabled={updating}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={newBillingCycle}
                    onChange={(e) => setNewBillingCycle(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={updating}
                  >
                    <option value="free">Free (No Charge)</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime (Permanent Free)</option>
                  </select>
                  <button
                    onClick={() => {
                      if (newStartDate) onUpdateStartDate(subscription, newStartDate);
                      if (newRenewalDate) onUpdateRenewalDate(subscription, newRenewalDate);
                      if (newBillingCycle) onUpdateBillingCycle(subscription, newBillingCycle);
                    }}
                    disabled={updating}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Dates"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Trial Management</label>
                {subscription.is_trial && !subscription.cancelled_at && subscription.status !== "cancelled" && subscription.status !== "active" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onCancelSubscription(subscription, true)}
                      disabled={updating}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cancel Trial"}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={trialPlan}
                      onChange={(e) => setTrialPlan(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={updating}
                    >
                      <option value="pro">Pro</option>
                      <option value="ultimate">Ultimate</option>
                    </select>
                    <input
                      type="number"
                      value={trialDays}
                      onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      min="1"
                      max="365"
                      placeholder="Days"
                      disabled={updating}
                    />
                    <button
                      onClick={() => onCreateTrial(subscription, trialPlan, trialDays)}
                      disabled={updating}
                      className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Trial"}
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {subscription.is_trial && (subscription.cancelled_at || subscription.status === "cancelled") 
                    ? "Cancelled trials are shown in the History tab." 
                    : "Create a new trial for this user."}
                </p>
              </div>

              {subscription.has_subscription_record && (
                <CustomPricingEditor
                  subscription={subscription}
                  onUpdateCustomPrice={onUpdateCustomPrice}
                  updating={updating}
                />
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Subscription Actions</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onResetLimits(subscription.user_id)}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reset Limits"}
                  </button>
                  {subscription.status !== "suspended" && subscription.plan_name !== "free" && onSuspendPlan && (
                    <button
                      onClick={() => {
                        onSuspendPlan(subscription);
                        onClose();
                      }}
                      disabled={updating}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      Suspend Plan
                    </button>
                  )}
                  {subscription.status === "suspended" && onUnsuspendPlan && (
                    <button
                      onClick={() => {
                        onUnsuspendPlan(subscription);
                        onClose();
                      }}
                      disabled={updating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Unsuspend Plan
                    </button>
                  )}
                  {!subscription.is_trial && !subscription.cancelled_at && subscription.status !== "cancelled" && (
                    <>
                      <button
                        onClick={() => onCancelSubscription(subscription, false)}
                        disabled={updating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cancel At Period End"}
                      </button>
                      <button
                        onClick={() => onCancelSubscription(subscription, true)}
                        disabled={updating}
                        className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cancel Immediately"}
                      </button>
                    </>
                  )}
                  {!subscription.is_trial && (subscription.cancelled_at || subscription.status === "cancelled") && (
                    <div className="col-span-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">Subscription Has Been Cancelled</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && subscription && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Billing History</h4>
              <button
                onClick={loadBillingHistory}
                disabled={loadingHistory}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-600 flex items-center gap-1"
              >
                {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No Billing History Available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {billingHistory.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                            {event.event_type?.replace(/_/g, ' ')}
                          </span>
                          {event.old_plan_name && event.new_plan_name && event.old_plan_name !== event.new_plan_name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {event.old_plan_name} → {event.new_plan_name}
                            </span>
                          )}
                        </div>
                        {event.details && typeof event.details === 'object' && Object.keys(event.details).length > 0 && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {event.details.reason || event.details.message || 'No additional details'}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Unified Subscription Modal Component
function UnifiedSubscriptionModal({
  modalData,
  onClose,
  onUpdatePlan,
  onUpdateRenewalDate,
  onUpdateStartDate,
  onUpdateBillingCycle,
  onCreateTrial,
  onCancelSubscription,
  onResetLimits,
  onUpdatePlanPrice,
  onBulkUpdate,
  onSuspendPlan,
  onUnsuspendPlan,
  onSetSubscriptionStatus,
  onUpdateCustomPrice,
  onUpdatePlanAndBillingCycle,
  plans,
  updating,
  supabase,
  currentUserId,
}: any): JSX.Element | null {
  const { subscription, subscriptions, field, mode } = modalData;
  
  // Helper function to filter users for bulk operations
  const getFilteredUsersForBulk = () => {
    const allSubs = subscriptions || modalData.subscriptions || [];
    if (!bulkUserSearch) return allSubs;
    
    const searchLower = bulkUserSearch.toLowerCase();
    return allSubs.filter((sub: Subscription) => {
      const displayName = (sub.user_display_name || "").toLowerCase();
      const email = (sub.user_email || "").toLowerCase();
      const userId = (sub.user_id || "").toLowerCase();
      const planName = (sub.plan_name || "").toLowerCase();
      
      return displayName.includes(searchLower) || 
             email.includes(searchLower) || 
             userId.includes(searchLower) ||
             planName.includes(searchLower);
    });
  };
  
  // For single user modals, always default to 'overview' unless a specific action is specified
  // For bulk operations or other modes, use the field to determine the tab
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'dates' | 'trial' | 'cancel' | 'prices' | 'bulk' | 'history'>(() => {
    // If it's a single user modal, default to overview unless field is explicitly set to something other than 'plan'
    if (subscription && mode === 'single') {
      // Only use field-based tab if it's a specific action (not just 'plan' from Edit button)
      if (field === 'cancel') return 'cancel';
      if (field === 'trial') return 'trial';
      if (field === 'history') return 'history';
      // Default to overview for single user modals
      return 'overview';
    }
    // For other modes, use field to determine tab
    return field === 'plan' ? 'plan' :
    field === 'renewal_date' || field === 'billing_cycle' ? 'dates' :
    field === 'trial' ? 'trial' :
    field === 'cancel' ? 'cancel' :
    field === 'prices' ? 'prices' :
    field === 'bulk' ? 'bulk' :
      field === 'history' ? 'history' : 'overview';
  });
  
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [newPlan, setNewPlan] = useState(subscription?.plan_name || "free");
  const [newRenewalDate, setNewRenewalDate] = useState(
    subscription?.current_period_end ? format(new Date(subscription.current_period_end), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [newStartDate, setNewStartDate] = useState(
    subscription?.current_period_start ? format(new Date(subscription.current_period_start), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [newBillingCycle, setNewBillingCycle] = useState(subscription?.billing_cycle || "monthly");
  const [trialPlan, setTrialPlan] = useState("pro");
  const [trialDays, setTrialDays] = useState(7);
  const [bulkPlan, setBulkPlan] = useState("pro");
  const [bulkRenewalDate, setBulkRenewalDate] = useState("");
  const [bulkBillingCycle, setBulkBillingCycle] = useState("monthly");
  const [bulkStatus, setBulkStatus] = useState("active");
  const [bulkCustomPriceMonthly, setBulkCustomPriceMonthly] = useState<number | null>(null);
  const [bulkCustomPriceYearly, setBulkCustomPriceYearly] = useState<number | null>(null);
  const [bulkUpdatePlan, setBulkUpdatePlan] = useState(false);
  const [bulkUpdateRenewalDate, setBulkUpdateRenewalDate] = useState(false);
  const [bulkUpdateBillingCycle, setBulkUpdateBillingCycle] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState(false);
  const [bulkUpdateCustomPrice, setBulkUpdateCustomPrice] = useState(false);
  const [bulkResetCustomPrice, setBulkResetCustomPrice] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkUserSearch, setBulkUserSearch] = useState("");
  const [priceMonthly, setPriceMonthly] = useState<Record<string, number>>({});
  const [priceYearly, setPriceYearly] = useState<Record<string, number>>({});

  // Update state when subscription changes (e.g., after cancellation)
  useEffect(() => {
    if (subscription) {
      setNewPlan(subscription.plan_name || "free");
      setNewRenewalDate(
        subscription.current_period_end ? format(new Date(subscription.current_period_end), "yyyy-MM-dd'T'HH:mm") : ""
      );
      setNewStartDate(
        subscription.current_period_start ? format(new Date(subscription.current_period_start), "yyyy-MM-dd'T'HH:mm") : ""
      );
      setNewBillingCycle(subscription.billing_cycle || "monthly");
    }
  }, [subscription]);

  useEffect(() => {
    if (plans) {
      const prices: Record<string, number> = {};
      const yearly: Record<string, number> = {};
      plans.forEach((plan: Plan) => {
        prices[plan.id] = plan.price_monthly;
        yearly[plan.id] = plan.price_yearly;
      });
      setPriceMonthly(prices);
      setPriceYearly(yearly);
    }
  }, [plans]);

  const loadBillingHistory = useCallback(async () => {
    if (!subscription?.user_id || !supabase) return;
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase.rpc('get_user_billing_history', {
        p_user_id: subscription.user_id
      });
      if (error) throw error;
      setBillingHistory(data || []);
    } catch (error) {
      console.error("Error loading billing history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [subscription?.user_id, supabase]);

  // Load billing history when subscription is available
  useEffect(() => {
    if (subscription && subscription.user_id && supabase) {
      loadBillingHistory();
    }
  }, [subscription?.user_id, supabase, loadBillingHistory]);

  const handleSave = () => {
    if (activeTab === 'plan' && subscription) {
      onUpdatePlan(subscription, newPlan);
    } else if (activeTab === 'dates' && subscription) {
      if (newStartDate) onUpdateStartDate(subscription, newStartDate);
      if (newRenewalDate) onUpdateRenewalDate(subscription, newRenewalDate);
      if (newBillingCycle) onUpdateBillingCycle(subscription, newBillingCycle);
    } else if (activeTab === 'trial' && subscription) {
      onCreateTrial(subscription, trialPlan, trialDays);
    } else if (activeTab === 'cancel' && subscription) {
      // Handled by buttons
    } else if (activeTab === 'prices') {
      plans.forEach((plan: Plan) => {
        if (priceMonthly[plan.id] !== plan.price_monthly || priceYearly[plan.id] !== plan.price_yearly) {
          onUpdatePlanPrice(plan.id, priceMonthly[plan.id], priceYearly[plan.id]);
        }
      });
    } else if (activeTab === 'bulk' && (subscriptions || modalData.subscriptions)) {
      const subsToUpdate = subscriptions || modalData.subscriptions || [];
      const updates: any[] = [];
      const selectedCount = Array.from(selectedUsers).length;
      
      if (selectedCount === 0) {
        showToast("Please select at least one user", "error");
        return;
      }
      
      // Check if at least one field is selected for update
      if (!bulkUpdatePlan && !bulkUpdateRenewalDate && !bulkUpdateBillingCycle && !bulkUpdateStatus && !bulkUpdateCustomPrice && !bulkResetCustomPrice) {
        showToast("Please select at least one field to update", "error");
        return;
      }
      
      subsToUpdate.forEach((sub: Subscription) => {
        if (selectedUsers.has(sub.user_id)) {
          // Only add updates for fields that are checked
          if (bulkUpdatePlan && bulkPlan && bulkPlan !== sub.plan_name) {
            updates.push({ type: 'plan', subscription: sub, planName: bulkPlan });
          }
          if (bulkUpdateRenewalDate && bulkRenewalDate) {
            updates.push({ type: 'renewal_date', subscription: sub, renewalDate: bulkRenewalDate });
          }
          if (bulkUpdateBillingCycle && bulkBillingCycle && bulkBillingCycle !== sub.billing_cycle) {
            updates.push({ type: 'billing_cycle', subscription: sub, billingCycle: bulkBillingCycle });
          }
          if (bulkUpdateStatus && bulkStatus && bulkStatus !== sub.status) {
            updates.push({ type: 'status', subscription: sub, status: bulkStatus });
          }
          if (bulkUpdateCustomPrice) {
            // Always add custom price update (even if both are null, to clear custom pricing)
            updates.push({ 
              type: 'custom_price', 
              subscription: sub, 
              priceMonthly: bulkCustomPriceMonthly ?? null,
              priceYearly: bulkCustomPriceYearly ?? null
            });
          }
          if (bulkResetCustomPrice) {
            // Reset custom prices to default (set both to null)
            // Only reset if user actually has custom prices set
            const hasCustomPrice = (sub.custom_price_monthly !== null && sub.custom_price_monthly !== undefined) ||
                                   (sub.custom_price_yearly !== null && sub.custom_price_yearly !== undefined);
            if (hasCustomPrice) {
              updates.push({ 
                type: 'custom_price', 
                subscription: sub, 
                priceMonthly: null,
                priceYearly: null
              });
            }
          }
        }
      });
      
      if (updates.length > 0) {
        onBulkUpdate(updates);
      } else {
        showToast("No changes to apply for selected users", "info");
        return;
      }
    }
  };

  // For individual user subscriptions, show simplified single-view modal
  if (subscription && mode === 'single') {
    return (
      <SingleUserModal
        subscription={subscription}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        newPlan={newPlan}
        setNewPlan={setNewPlan}
        newStartDate={newStartDate}
        setNewStartDate={setNewStartDate}
        newRenewalDate={newRenewalDate}
        setNewRenewalDate={setNewRenewalDate}
        newBillingCycle={newBillingCycle}
        setNewBillingCycle={setNewBillingCycle}
        trialPlan={trialPlan}
        setTrialPlan={setTrialPlan}
        trialDays={trialDays}
        setTrialDays={setTrialDays}
        plans={plans}
        updating={updating}
        onClose={onClose}
        onUpdatePlan={onUpdatePlan}
        onUpdateStartDate={onUpdateStartDate}
        onUpdateRenewalDate={onUpdateRenewalDate}
        onUpdateBillingCycle={onUpdateBillingCycle}
        onCreateTrial={onCreateTrial}
        onCancelSubscription={onCancelSubscription}
        onResetLimits={onResetLimits}
        onSuspendPlan={onSuspendPlan}
        onUnsuspendPlan={onUnsuspendPlan}
        onUpdateCustomPrice={onUpdateCustomPrice}
        onSetSubscriptionStatus={onSetSubscriptionStatus}
        billingHistory={billingHistory}
        loadingHistory={loadingHistory}
        loadBillingHistory={loadBillingHistory}
        format={format}
        Loader2={Loader2}
        X={X}
        Clock={Clock}
        RefreshCw={RefreshCw}
        onUpdatePlanAndBillingCycle={onUpdatePlanAndBillingCycle}
      />
    );
  }

  // For bulk operations or prices, show tabbed interface
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {subscription ? `Manage Subscription - ${subscription.user_display_name || subscription.user_email}` : "Bulk Operations"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Only for bulk operations and prices */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'prices'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400"
            }`}
          >
            Plan Prices
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-600 dark:text-gray-400"
            }`}
          >
            Bulk Operations
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'prices' && (
            <div className="space-y-4">
              {plans.map((plan: Plan) => (
                <div key={plan.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{plan.display_name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{plan.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Monthly</label>
                      <input
                        type="number"
                        step="0.01"
                        value={priceMonthly[plan.id] || plan.price_monthly}
                        onChange={(e) => setPriceMonthly({ ...priceMonthly, [plan.id]: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Yearly</label>
                      <input
                        type="number"
                        step="0.01"
                        value={priceYearly[plan.id] || plan.price_yearly}
                        onChange={(e) => setPriceYearly({ ...priceYearly, [plan.id]: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => onUpdatePlanPrice(plan.id, priceMonthly[plan.id] || plan.price_monthly, priceYearly[plan.id] || plan.price_yearly)}
                      disabled={updating}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-6">
              {/* User Selection with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Users ({selectedUsers.size} selected)
                </label>
                
                {/* Search Bar */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={bulkUserSearch}
                      onChange={(e) => setBulkUserSearch(e.target.value)}
                      placeholder="Search by username, email, or user ID..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                    {bulkUserSearch && (
                      <button
                        onClick={() => setBulkUserSearch("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                  <div className="flex items-center gap-2 p-2 mb-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        const filtered = getFilteredUsersForBulk();
                        const allUserIds = filtered.map((s: Subscription) => s.user_id);
                        const newSet = new Set(selectedUsers);
                        allUserIds.forEach((id: string) => newSet.add(id));
                        setSelectedUsers(newSet);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Select All (Filtered)
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      onClick={() => {
                        const allUserIds = (subscriptions || modalData.subscriptions || []).map((s: Subscription) => s.user_id);
                        setSelectedUsers(new Set(allUserIds));
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      onClick={() => setSelectedUsers(new Set())}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                  {getFilteredUsersForBulk().map((sub: Subscription) => (
                    <label key={sub.user_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(sub.user_id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedUsers);
                          if (e.target.checked) {
                            newSet.add(sub.user_id);
                          } else {
                            newSet.delete(sub.user_id);
                          }
                          setSelectedUsers(newSet);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-white flex-1">
                        {sub.user_display_name || sub.user_email || sub.user_id}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {sub.plan_name} • {sub.billing_cycle}
                      </span>
                    </label>
                  ))}
                  {getFilteredUsersForBulk().length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                      No users found matching "{bulkUserSearch}"
                </div>
                  )}
              </div>
              </div>

              {/* Granular Update Options */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Select Fields to Update (check the fields you want to change)
                </h4>
                
                <div className="space-y-4">
                  {/* Plan Update */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkUpdatePlan}
                        onChange={(e) => setBulkUpdatePlan(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Update Plan</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Change subscription plan for selected users
                        </p>
                      </div>
                    </label>
                    {bulkUpdatePlan && (
                      <div className="mt-3 ml-7">
                <select
                  value={bulkPlan}
                  onChange={(e) => setBulkPlan(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  {plans.map((p: Plan) => (
                    <option key={p.id} value={p.name}>{p.display_name}</option>
                  ))}
                </select>
              </div>
                    )}
                  </div>

                  {/* Billing Cycle Update */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                <input
                        type="checkbox"
                        checked={bulkUpdateBillingCycle}
                        onChange={(e) => setBulkUpdateBillingCycle(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Update Billing Cycle</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Change billing frequency (monthly, yearly, free, lifetime)
                        </p>
              </div>
                    </label>
                    {bulkUpdateBillingCycle && (
                      <div className="mt-3 ml-7">
                <select
                  value={bulkBillingCycle}
                  onChange={(e) => setBulkBillingCycle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                          <option value="free">Free (No Charge)</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                          <option value="lifetime">Lifetime (Permanent Free)</option>
                </select>
              </div>
                    )}
                  </div>

                  {/* Status Update */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkUpdateStatus}
                        onChange={(e) => setBulkUpdateStatus(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Update Status</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Change subscription status (active, trial, cancelled, suspended)
                        </p>
                      </div>
                    </label>
                    {bulkUpdateStatus && (
                      <div className="mt-3 ml-7">
                        <select
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="active">Active</option>
                          <option value="trial">Trial</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Renewal Date Update */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkUpdateRenewalDate}
                        onChange={(e) => setBulkUpdateRenewalDate(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Update Renewal Date</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Set a new renewal date for selected subscriptions
                        </p>
                      </div>
                    </label>
                    {bulkUpdateRenewalDate && (
                      <div className="mt-3 ml-7">
                        <input
                          type="datetime-local"
                          value={bulkRenewalDate}
                          onChange={(e) => setBulkRenewalDate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Custom Pricing Update */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkUpdateCustomPrice}
                        onChange={(e) => setBulkUpdateCustomPrice(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Update Custom Pricing</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Set custom monthly/yearly prices (leave empty to clear custom pricing)
                        </p>
                      </div>
                    </label>
                    {bulkUpdateCustomPrice && (
                      <div className="mt-3 ml-7 space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Price (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={bulkCustomPriceMonthly === null ? '' : bulkCustomPriceMonthly}
                            onChange={(e) => setBulkCustomPriceMonthly(e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="Leave empty to keep current"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Yearly Price (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={bulkCustomPriceYearly === null ? '' : bulkCustomPriceYearly}
                            onChange={(e) => setBulkCustomPriceYearly(e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="Leave empty to keep current"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 Tip: Leave both empty to clear custom pricing and use plan defaults
                        </p>
                      </div>
                    )}
                    
                    {/* Reset Custom Prices to Default Option */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkResetCustomPrice}
                          onChange={(e) => {
                            setBulkResetCustomPrice(e.target.checked);
                            if (e.target.checked) {
                              // Uncheck the update custom price option if reset is selected
                              setBulkUpdateCustomPrice(false);
                            }
                          }}
                          className="w-4 h-4 rounded mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Reset Custom Prices to Default</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Clear custom pricing for selected users and revert to default plan prices
                          </p>
                          {(() => {
                            const subsToCheck = subscriptions || modalData.subscriptions || [];
                            const selectedSubs = subsToCheck.filter((sub: Subscription) => 
                              selectedUsers.has(sub.user_id) && 
                              ((sub.custom_price_monthly !== null && sub.custom_price_monthly !== undefined) ||
                               (sub.custom_price_yearly !== null && sub.custom_price_yearly !== undefined))
                            );
                            return selectedSubs.length > 0 && (
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                {selectedSubs.length} of {Array.from(selectedUsers).length} selected user{Array.from(selectedUsers).length !== 1 ? 's' : ''} have custom pricing
                              </p>
                            );
                          })()}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {selectedUsers.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>{selectedUsers.size}</strong> user{selectedUsers.size !== 1 ? 's' : ''} selected
                    {bulkUpdatePlan && ` • Plan: ${plans.find((p: Plan) => p.name === bulkPlan)?.display_name || bulkPlan}`}
                    {bulkUpdateBillingCycle && ` • Billing: ${bulkBillingCycle}`}
                    {bulkUpdateStatus && ` • Status: ${bulkStatus}`}
                    {bulkUpdateRenewalDate && ` • Renewal Date: ${bulkRenewalDate || 'Not set'}`}
                    {bulkUpdateCustomPrice && ` • Custom Pricing: ${bulkCustomPriceMonthly !== null ? `£${bulkCustomPriceMonthly}/mo` : 'Keep current'} ${bulkCustomPriceYearly !== null ? `£${bulkCustomPriceYearly}/yr` : ''}`}
                    {bulkResetCustomPrice && ` • Reset Custom Prices to Default`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          {activeTab !== 'cancel' && activeTab !== 'prices' && (
            <button
              onClick={handleSave}
              disabled={updating}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Edit Subscription Modal Component (Legacy - keeping for backward compatibility)
function EditSubscriptionModal({
  modalData,
  onClose,
  onUpdatePlan,
  onUpdateRenewalDate,
  onUpdateBillingCycle,
  onCreateTrial,
  onCancelSubscription,
  plans,
  updating,
}: any) {
  const { subscription, field } = modalData;
  const [newPlan, setNewPlan] = useState(subscription.plan_name);
  const [newRenewalDate, setNewRenewalDate] = useState(
    subscription.current_period_end ? format(new Date(subscription.current_period_end), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [newBillingCycle, setNewBillingCycle] = useState(subscription.billing_cycle || "monthly");
  const [trialPlan, setTrialPlan] = useState("pro");
  const [trialDays, setTrialDays] = useState(7);

  const handleSubmit = () => {
    if (field === 'plan') {
      onUpdatePlan(subscription, newPlan);
    } else if (field === 'renewal_date') {
      onUpdateRenewalDate(subscription, newRenewalDate);
    } else if (field === 'billing_cycle') {
      onUpdateBillingCycle(subscription, newBillingCycle);
    } else if (field === 'trial') {
      onCreateTrial(subscription, trialPlan, trialDays);
    } else if (field === 'cancel') {
      onCancelSubscription(subscription, false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Subscription</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {field === 'plan' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Plan</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={updating}
            >
              {plans.map((p: Plan) => (
                <option key={p.id} value={p.name}>{p.display_name}</option>
              ))}
            </select>
          </div>
        )}

        {field === 'renewal_date' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Renewal Date</label>
            <input
              type="datetime-local"
              value={newRenewalDate}
              onChange={(e) => setNewRenewalDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={updating}
            />
          </div>
        )}

        {field === 'billing_cycle' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Billing Cycle</label>
            <select
              value={newBillingCycle}
              onChange={(e) => setNewBillingCycle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={updating}
            >
              <option value="free">Free (No Charge)</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime (Permanent Free)</option>
            </select>
          </div>
        )}

        {field === 'trial' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trial Plan</label>
              <select
                value={trialPlan}
                onChange={(e) => setTrialPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={updating}
              >
                <option value="pro">Pro</option>
                <option value="ultimate">Ultimate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trial Days</label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                min="1"
                max="365"
                disabled={updating}
              />
            </div>
          </div>
        )}

        {field === 'cancel' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel this subscription?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onCancelSubscription(subscription, false)}
                disabled={updating}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel at Period End
              </button>
              <button
                onClick={() => onCancelSubscription(subscription, true)}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Immediately
              </button>
            </div>
          </div>
        )}
        {field !== 'cancel' && (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={updating}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
