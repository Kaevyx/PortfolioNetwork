import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { canPerformAction, getFeatureLimit } from "@/lib/utils/subscriptionFeatures";

/**
 * API route to check if user can create a post based on their subscription plan
 * Limits are reset on renewal date, not calendar month
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    
    // Get user's subscription plan and renewal date
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_renewal_date, subscription_last_limit_reset")
      .eq("clerk_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    const userPlan = profile.subscription_plan || "free";
    const maxPosts = getFeatureLimit(userPlan, "maxPostsPerMonth");
    
    // If unlimited, return success
    if (maxPosts === -1) {
      return NextResponse.json({
        canCreate: true,
        remaining: -1,
        limit: -1,
        used: 0,
      });
    }

    // Determine the period start date based on renewal date
    let periodStart: Date;
    const now = new Date();
    
    if (profile.subscription_renewal_date) {
      const renewalDate = new Date(profile.subscription_renewal_date);
      const lastReset = profile.subscription_last_limit_reset 
        ? new Date(profile.subscription_last_limit_reset)
        : null;
      
      // If we have a last reset date and it's after the renewal date, use it
      // Otherwise, calculate from renewal date
      if (lastReset && lastReset >= renewalDate) {
        periodStart = lastReset;
      } else {
        // Calculate the current period start based on renewal date
        // If renewal date is in the future, count backwards
        if (renewalDate > now) {
          // Renewal is in the future, so we're in the current period
          // Find the start of this period (one month before renewal)
          periodStart = new Date(renewalDate);
          periodStart.setMonth(periodStart.getMonth() - 1);
        } else {
          // Renewal date has passed, so we're in a new period
          // Find the most recent renewal date before now
          periodStart = new Date(renewalDate);
          while (periodStart <= now) {
            const nextPeriod = new Date(periodStart);
            nextPeriod.setMonth(nextPeriod.getMonth() + 1);
            if (nextPeriod > now) break;
            periodStart = nextPeriod;
          }
        }
      }
    } else {
      // Fallback to calendar month if no renewal date
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Count posts created since period start
    const { count, error: countError } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", userId)
      .gte("created_at", periodStart.toISOString())
      .is("is_scheduled", false); // Don't count scheduled posts until published

    if (countError) {
      return NextResponse.json(
        { error: "Failed to check post count" },
        { status: 500 }
      );
    }

    const postsThisPeriod = count || 0;
    const remaining = Math.max(0, maxPosts - postsThisPeriod);
    const canCreate = remaining > 0;

    return NextResponse.json({
      canCreate,
      remaining,
      limit: maxPosts,
      used: postsThisPeriod,
      periodStart: periodStart.toISOString(),
      renewalDate: profile.subscription_renewal_date,
    });
  } catch (error) {
    console.error("Error checking post limit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
