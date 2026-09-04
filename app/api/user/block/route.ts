import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route for users to block/unblock other users
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
    const { blockedUserId, reason } = body;

    if (!blockedUserId) {
      return NextResponse.json(
        { error: "blockedUserId is required" },
        { status: 400 }
      );
    }

    if (userId === blockedUserId) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", userId)
      .eq("blocked_id", blockedUserId)
      .single();

    if (existingBlock) {
      return NextResponse.json(
        { error: "User is already blocked" },
        { status: 400 }
      );
    }

    // Create block
    const { error } = await supabase
      .from("user_blocks")
      .insert({
        blocker_id: userId,
        blocked_id: blockedUserId,
        reason: reason || null,
      });

    if (error) throw error;

    // Also unfollow if following
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", blockedUserId);

    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", blockedUserId)
      .eq("following_id", userId);

    return NextResponse.json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (error: any) {
    console.error("Block user error:", error);
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

    const { searchParams } = new URL(request.url);
    const blockedUserId = searchParams.get("blockedUserId");

    if (!blockedUserId) {
      return NextResponse.json(
        { error: "blockedUserId parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Remove block
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", blockedUserId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (error: any) {
    console.error("Unblock user error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





