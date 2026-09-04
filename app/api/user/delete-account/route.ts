import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route for users to delete their own account
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

    const body = await request.json();
    const { confirmText } = body;

    // Require confirmation text
    if (confirmText !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Please type 'DELETE MY ACCOUNT' to confirm" },
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
      .eq("user_id", userId);

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
    const { error: deleteError } = await storageClient
      .from("profiles")
      .delete()
      .eq("clerk_id", userId);

    if (deleteError) {
      console.error("Error deleting profile:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account data", details: deleteError.message },
        { status: 500 }
      );
    }

    // Delete Clerk user
    try {
      await clerk.users.deleteUser(userId);
    } catch (clerkError: any) {
      console.error("Error deleting Clerk user:", clerkError);
      // Continue even if Clerk deletion fails - data is already deleted
    }

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





