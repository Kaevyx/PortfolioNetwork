import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route for admins to delete files on behalf of users
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
    const filePath = searchParams.get("filePath");
    const bucketName = searchParams.get("bucketName");
    const targetUserId = searchParams.get("targetUserId"); // Optional: if provided, verify file belongs to this user

    if (!filePath || !bucketName) {
      return NextResponse.json(
        { error: "filePath and bucketName are required" },
        { status: 400 }
      );
    }

    // Use service role client for storage operations
    const storageClient = createServiceRoleClient();

    // Verify file exists and get file record
    const { data: fileRecord, error: checkError } = await storageClient
      .from("storage_files")
      .select("*")
      .eq("file_path", filePath)
      .single();

    if (checkError || !fileRecord) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // If targetUserId is provided, verify the file belongs to that user
    if (targetUserId && fileRecord.user_id !== targetUserId) {
      return NextResponse.json(
        { error: "File does not belong to the specified user" },
        { status: 403 }
      );
    }

    // Prevent deletion of profile pictures - users must have a profile picture
    // But admins can delete them if needed (e.g., for moderation)
    // We'll allow it but warn the admin

    // Delete from storage
    const { error: deleteError } = await storageClient.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete file", details: deleteError.message },
        { status: 500 }
      );
    }

    // If this was a profile picture, check if it's the current avatar and clear it
    if (fileRecord.file_type === "profile_picture") {
      try {
        const { data: userProfile } = await storageClient
          .from("profiles")
          .select("avatar_url, clerk_id")
          .eq("clerk_id", fileRecord.user_id)
          .single();

        if (userProfile?.avatar_url && (userProfile.avatar_url.includes(filePath) || userProfile.avatar_url.includes(fileRecord.file_name))) {
          // Clear avatar_url
          await storageClient
            .from("profiles")
            .update({ avatar_url: null })
            .eq("clerk_id", fileRecord.user_id);

          // Also update Clerk
          try {
            const { clerkClient } = await import("@clerk/nextjs/server");
            const clerk = clerkClient();
            await clerk.users.updateUser(fileRecord.user_id, {
              imageUrl: null,
            });
          } catch (clerkError: any) {
            console.error("Error updating Clerk:", clerkError);
            // Don't fail the request if Clerk update fails
          }
        }
      } catch (profileError) {
        console.error("Error clearing profile avatar:", profileError);
        // Continue even if this fails
      }
    }

    // Delete from database (trigger will update storage_usage)
    const { error: dbError } = await storageClient
      .from("storage_files")
      .delete()
      .eq("id", fileRecord.id);

    if (dbError) {
      console.error("Database delete error:", dbError);
      return NextResponse.json(
        { error: "Failed to remove file record", details: dbError.message },
        { status: 500 }
      );
    }

    // Recalculate storage usage to ensure accuracy
    const { data: remainingFiles } = await storageClient
      .from("storage_files")
      .select("file_size")
      .eq("user_id", fileRecord.user_id);

    const recalculatedBytes = remainingFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
    const recalculatedCount = remainingFiles?.length || 0;

    // Update storage_usage table
    await storageClient
      .from("storage_usage")
      .upsert({
        user_id: fileRecord.user_id,
        total_bytes: recalculatedBytes,
        file_count: recalculatedCount,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





