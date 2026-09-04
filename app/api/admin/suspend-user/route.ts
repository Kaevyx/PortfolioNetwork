import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route for admins to suspend/lock user accounts
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

    // Check if user is admin
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, reason, durationDays } = body;

    if (!targetUserId || !reason) {
      return NextResponse.json(
        { error: "targetUserId and reason are required" },
        { status: 400 }
      );
    }

    // Use service role client
    const storageClient = createServiceRoleClient();

    // Calculate suspension end date (if duration provided)
    let suspensionEndsAt: string | null = null;
    if (durationDays && durationDays > 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);
      suspensionEndsAt = endDate.toISOString();
    }

    // Update profile
    const { error } = await storageClient
      .from("profiles")
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: userId,
        suspension_ends_at: suspensionEndsAt,
      })
      .eq("clerk_id", targetUserId);

    if (error) throw error;

    // Suspend user's subscription if they have one
    try {
      const { data: activeSubscriptions } = await storageClient
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", targetUserId)
        .in("status", ["active", "trial"]);

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        await storageClient
          .from("user_subscriptions")
          .update({
            status: 'suspended',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: `Account suspended: ${reason}`
          })
          .eq("user_id", targetUserId)
          .in("status", ["active", "trial"]);

        // Downgrade to free plan
        await storageClient
          .from("profiles")
          .update({
            subscription_plan: 'free',
            is_premium: false
          })
          .eq("clerk_id", targetUserId);
      }
    } catch (subError) {
      console.error("Error suspending user subscription:", subError);
      // Don't fail the entire operation if subscription suspension fails
    }

    // Log admin action
    try {
      await storageClient.rpc("log_admin_action", {
        p_admin_id: userId,
        p_action_type: "user_suspended",
        p_target_user_id: targetUserId,
        p_target_id: null,
        p_details: {
          reason,
          durationDays: durationDays || null,
          endsAt: suspensionEndsAt,
        },
      });

      // Log to user account history
      await storageClient.rpc("log_user_account_history", {
        p_user_id: targetUserId,
        p_action_type: "account_suspended",
        p_performed_by: userId,
        p_details: {
          reason,
          durationDays: durationDays || null,
          endsAt: suspensionEndsAt,
        },
      });
    } catch (logError) {
      console.error("Error logging admin action:", logError);
    }

    // Create notification for user
    try {
      const { data: adminProfile } = await storageClient
        .from("profiles")
        .select("display_name")
        .eq("clerk_id", userId)
        .single();

      const durationText = durationDays 
        ? ` for ${durationDays} day${durationDays > 1 ? 's' : ''}`
        : " permanently";
      
      await storageClient
        .from("notifications")
        .insert({
          user_id: targetUserId,
          type: "account_suspended",
          actor_id: userId,
          target_id: targetUserId,
          message: `Your account was suspended${durationText}. Reason: ${reason}. Your profile is not visible during this time.`,
        });
    } catch (notifError) {
      console.error("Error creating suspension notification:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "User account suspended successfully",
    });
  } catch (error: any) {
    console.error("Suspend user error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("clerk_id", userId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    // Use service role client
    const storageClient = createServiceRoleClient();

    // Unsuspend user
    const { error } = await storageClient
      .from("profiles")
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null,
        suspension_ends_at: null,
      })
      .eq("clerk_id", targetUserId);

    if (error) throw error;

    // Restore user's subscription if it was suspended due to account suspension
    try {
      const { data: profile } = await storageClient
        .from("profiles")
        .select("subscription_plan")
        .eq("clerk_id", targetUserId)
        .single();

      if (profile && profile.subscription_plan !== "free") {
        // Check if there's a suspended subscription
        const { data: suspendedSub } = await storageClient
          .from("user_subscriptions")
          .select("id, plan_name")
          .eq("user_id", targetUserId)
          .eq("status", "suspended")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (suspendedSub) {
          // Reactivate the subscription
          await storageClient
            .from("user_subscriptions")
            .update({
              status: 'active',
              cancelled_at: null,
              cancellation_reason: null
            })
            .eq("id", suspendedSub.id);

          // Restore premium status
          await storageClient
            .from("profiles")
            .update({
              subscription_plan: suspendedSub.plan_name || profile.subscription_plan,
              is_premium: true
            })
            .eq("clerk_id", targetUserId);
        }
      }
    } catch (subError) {
      console.error("Error restoring user subscription:", subError);
      // Don't fail the entire operation if subscription restoration fails
    }

    // Log admin action
    try {
      await storageClient.rpc("log_admin_action", {
        p_admin_id: userId,
        p_action_type: "user_unsuspended",
        p_target_user_id: targetUserId,
        p_target_id: null,
        p_details: { unsuspended_at: new Date().toISOString() },
      });

      // Log to user account history
      await storageClient.rpc("log_user_account_history", {
        p_user_id: targetUserId,
        p_action_type: "account_unsuspended",
        p_performed_by: userId,
        p_details: { unsuspended_at: new Date().toISOString() },
      });
    } catch (logError) {
      console.error("Error logging admin action:", logError);
    }

    // Create notification for user
    try {
      const { data: adminProfile } = await storageClient
        .from("profiles")
        .select("display_name")
        .eq("clerk_id", userId)
        .single();

      await storageClient
        .from("notifications")
        .insert({
          user_id: targetUserId,
          type: "account_unsuspended",
          actor_id: userId,
          target_id: targetUserId,
          message: `Your account suspension was lifted. Your profile is now visible again.`,
        });
    } catch (notifError) {
      console.error("Error creating unsuspension notification:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "User account unsuspended successfully",
    });
  } catch (error: any) {
    console.error("Unsuspend user error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





