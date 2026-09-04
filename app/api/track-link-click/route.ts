import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { linkId } = await request.json();

    if (!linkId) {
      return NextResponse.json({ error: "Link ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the link to check owner
    const { data: link, error: linkError } = await supabase
      .from("user_links")
      .select("profile_id")
      .eq("id", linkId)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Don't count clicks from the link owner
    if (userId && userId === link.profile_id) {
      return NextResponse.json({ success: true, counted: false, message: "Own clicks not counted" });
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referrer = request.headers.get("referer") || null;

    // Check if this user has already clicked this link
    if (userId) {
      const { data: existingClick } = await supabase
        .from("link_clicks")
        .select("id")
        .eq("link_id", linkId)
        .eq("user_id", userId)
        .single();

      if (existingClick) {
        // User already clicked, don't count again but allow the click
        return NextResponse.json({ success: true, counted: false, message: "Already clicked" });
      }
    } else {
      // For anonymous users, check IP address
      const { data: existingClick } = await supabase
        .from("link_clicks")
        .select("id")
        .eq("link_id", linkId)
        .eq("ip_address", ipAddress)
        .is("user_id", null)
        .single();

      if (existingClick) {
        // IP already clicked, don't count again but allow the click
        return NextResponse.json({ success: true, counted: false, message: "Already clicked" });
      }
    }

    // Record the click (will be counted by trigger if it's the first click)
    const { error: insertError } = await supabase
      .from("link_clicks")
      .insert({
        link_id: linkId,
        user_id: userId || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
      });

    if (insertError) {
      console.error("Error inserting link click:", insertError);
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
    }

    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    console.error("Error in track-link-click:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
