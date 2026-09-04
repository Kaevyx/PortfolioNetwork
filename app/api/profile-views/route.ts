import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

// Track profile view
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await request.json();
    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
    }

    // Don't track own profile views
    if (userId === profileId) {
      return NextResponse.json({ error: "Cannot track own profile" }, { status: 400 });
    }

    const supabase = await createClient();

    // Upsert view record (update if exists, insert if not)
    const { error } = await supabase
      .from("profile_views")
      .upsert(
        {
          profile_id: profileId,
          viewer_id: userId,
          viewed_at: new Date().toISOString(),
        },
        {
          onConflict: "profile_id,viewer_id",
        }
      );

    if (error) {
      console.error("Error tracking profile view:", error);
      return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in profile view tracking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get active viewer count
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
    }

    // Only allow users to see their own profile view count
    if (userId !== profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();

    // Get count of active viewers (viewed in last 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { count, error } = await supabase
      .from("profile_views")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .gte("viewed_at", tenSecondsAgo);

    if (error) {
      console.error("Error getting view count:", error);
      return NextResponse.json({ error: "Failed to get view count" }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error("Error in get view count:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

