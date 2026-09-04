import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route to cancel a subscription
 * For trials, cancels immediately. For paid subscriptions, cancels at period end.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { cancelImmediately, reason } = await request.json();
    
    const supabase = await createClient();
    
    // Get current subscription to check if it's a trial
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("is_trial, status")
      .eq("user_id", userId)
      .in("status", ["active", "trial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (subError || !subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }
    
    // For trials, cancel immediately. For paid subscriptions, cancel at period end.
    const shouldCancelImmediately = cancelImmediately || subscription.is_trial || subscription.status === 'trial';
    
    // Cancel subscription using the database function
    const { error } = await supabase.rpc('cancel_subscription', {
      p_user_id: userId,
      p_reason: reason || null,
      p_cancel_immediately: shouldCancelImmediately
    });

    if (error) {
      console.error("Error cancelling subscription:", error);
      return NextResponse.json(
        { error: error.message || "Failed to cancel subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: shouldCancelImmediately 
        ? "Subscription cancelled immediately" 
        : "Subscription will be cancelled at the end of your billing period"
    });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

