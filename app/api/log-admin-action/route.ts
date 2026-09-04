import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route to log admin actions
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

    const body = await request.json();
    const { actionType, targetUserId, targetId, details } = body;

    // Use service role client to bypass RLS
    const supabase = createServiceRoleClient();

    // Check if user is admin
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

    // Log admin action
    const { data, error } = await supabase.rpc("log_admin_action", {
      p_admin_id: userId,
      p_action_type: actionType,
      p_target_user_id: targetUserId || null,
      p_target_id: targetId || null,
      p_details: details || null,
    });

    if (error) {
      console.error("Error logging admin action:", error);
      // Don't fail the request if logging fails
    }

    // Also log to user account history if targetUserId is provided
    if (targetUserId) {
      await supabase.rpc("log_user_account_history", {
        p_user_id: targetUserId,
        p_action_type: actionType,
        p_performed_by: userId,
        p_details: details || null,
      });
    }

    return NextResponse.json({ success: true, actionId: data });
  } catch (error: any) {
    console.error("Admin action logging error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





