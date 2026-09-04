import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * One-time API route to sync existing profile pictures with Clerk
 * This should be run once to update existing users' Clerk profile images
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
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all profiles with avatar_url
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("clerk_id, avatar_url, display_name")
      .not("avatar_url", "is", null)
      .neq("avatar_url", "");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch profiles", details: error.message },
        { status: 500 }
      );
    }

    const results = {
      total: profiles?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    const clerk = clerkClient();

    // Update each profile's Clerk image
    for (const profile of profiles || []) {
      try {
        await clerk.users.updateUser(profile.clerk_id, {
          imageUrl: profile.avatar_url,
        });
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${profile.display_name} (${profile.clerk_id}): ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.successful} of ${results.total} profiles`,
      results,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}






