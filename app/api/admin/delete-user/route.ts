import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route for admins to delete user accounts
 * Deletes ALL Supabase data/files and Clerk user
 */
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

    if (targetUserId === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const storageClient = createServiceRoleClient();
    const clerk = clerkClient();

    // Get all files for the user
    const { data: userFiles } = await storageClient
      .from("storage_files")
      .select("bucket_name, object_path, file_path")
      .eq("user_id", targetUserId);

    // Delete all files from storage
    if (userFiles && userFiles.length > 0) {
      const filesByBucket = new Map<string, string[]>();
      
      userFiles.forEach((file: any) => {
        const bucket = file.bucket_name;
        const path = file.object_path || file.file_path;
        if (bucket && path) {
          if (!filesByBucket.has(bucket)) {
            filesByBucket.set(bucket, []);
          }
          filesByBucket.get(bucket)!.push(path);
        }
      });

      // Delete files from each bucket
      for (const [bucket, paths] of filesByBucket.entries()) {
        try {
          await storageClient.storage
            .from(bucket)
            .remove(paths);
        } catch (error) {
          console.error(`Error deleting files from bucket ${bucket}:`, error);
          // Continue even if some deletions fail
        }
      }
    }

    // Delete all database records (cascade will handle related data)
    // The profile deletion will cascade to:
    // - storage_files
    // - follows
    // - posts
    // - post_comments
    // - post_reactions
    // - reviews
    // - notifications
    // - user_account_history
    // - etc.

    const { error: deleteError } = await storageClient
      .from("profiles")
      .delete()
      .eq("clerk_id", targetUserId);

    if (deleteError) {
      console.error("Error deleting profile:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete user data", details: deleteError.message },
        { status: 500 }
      );
    }

    // Delete Clerk user
    try {
      await clerk.users.deleteUser(targetUserId);
    } catch (clerkError: any) {
      console.error("Error deleting Clerk user:", clerkError);
      // Continue even if Clerk deletion fails - data is already deleted
    }

    // Log admin action
    try {
      await storageClient.rpc("log_admin_action", {
        p_admin_id: userId,
        p_action_type: "user_deleted",
        p_target_user_id: targetUserId,
        p_target_id: null,
        p_details: { deleted_at: new Date().toISOString() },
      });
    } catch (logError) {
      console.error("Error logging admin action:", logError);
      // Don't fail if logging fails
    }

    return NextResponse.json({
      success: true,
      message: "User account and all associated data deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





