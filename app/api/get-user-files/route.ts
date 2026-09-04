import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route to get user's files (bypasses RLS for accurate file listing)
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

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    // Users can only request their own files (unless admin)
    const targetUserId = requestedUserId || userId;
    
    if (targetUserId !== userId) {
      // Check if user is admin
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("clerk_id", userId)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // Use service role client to bypass RLS
    const storageClient = createServiceRoleClient();

    // Get all files for the user
    const { data: files, error } = await storageClient
      .from("storage_files")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching files:", error);
      return NextResponse.json(
        { error: "Failed to fetch files", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      files: files || [],
      count: files?.length || 0,
    });
  } catch (error: any) {
    console.error("Get user files error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

