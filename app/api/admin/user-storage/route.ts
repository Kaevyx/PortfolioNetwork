import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route for admins to get user storage usage
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

    // Use service role client to bypass RLS
    const storageClient = createServiceRoleClient();

    // Get user's files
    const { data: files, error: filesError } = await storageClient
      .from("storage_files")
      .select("file_type, file_size")
      .eq("user_id", targetUserId);

    if (filesError) {
      console.error("Error fetching files:", filesError);
    }

    // Calculate actual usage from files
    const usedBytes = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
    const fileCount = files?.length || 0;
    const usedMB = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;

    // Get user's plan
    const { data: userProfile } = await storageClient
      .from("profiles")
      .select("subscription_plan")
      .eq("clerk_id", targetUserId)
      .single();

    // Get storage limit for plan
    const { data: plan } = await storageClient
      .from("subscription_plans")
      .select("max_storage_mb")
      .eq("name", userProfile?.subscription_plan || "free")
      .single();

    const limitMB = plan?.max_storage_mb || 50;
    const limitBytes = limitMB * 1024 * 1024;
    const percentage = Math.round((usedBytes / limitBytes) * 100);

    // Get file breakdown by type
    const breakdown: Record<string, { count: number; size: number }> = {};
    if (files) {
      files.forEach((file) => {
        const fileType = file.file_type || "unknown";
        if (!breakdown[fileType]) {
          breakdown[fileType] = { count: 0, size: 0 };
        }
        breakdown[fileType].count++;
        breakdown[fileType].size += file.file_size || 0;
      });
    }

    return NextResponse.json({
      usedBytes,
      usedMB,
      limitBytes,
      limitMB,
      percentage,
      fileCount,
      breakdown: Object.entries(breakdown).map(([type, data]) => ({
        type,
        count: data.count,
        sizeMB: Math.round((data.size / (1024 * 1024)) * 100) / 100,
      })),
    });
  } catch (error: any) {
    console.error("Admin user storage error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





