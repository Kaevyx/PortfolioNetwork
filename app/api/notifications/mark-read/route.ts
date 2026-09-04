import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { notificationId, markAll } = body;

    let supabase;
    try {
      supabase = await createClient();
    } catch (error: any) {
      console.error("Error creating Supabase client:", error);
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    if (markAll) {
      // Mark all unread notifications as read for this user
      const { data, error } = await supabase
        .from("notifications")
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("read", false)
        .select();

      if (error) {
        console.error("Error marking all notifications as read:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json(
          { 
            error: "Failed to mark all notifications as read",
            details: error.message || String(error)
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        updated: data?.length || 0
      });
    } else if (notificationId) {
      // Mark single notification as read
      const { error } = await supabase
        .from("notifications")
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return NextResponse.json(
          { error: "Failed to mark notification as read" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Missing notificationId or markAll flag" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error in mark-read route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

