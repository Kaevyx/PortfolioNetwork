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
    const targetUserId = searchParams.get("targetUserId");

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

    // Delete from storage
    const { error: deleteError } = await storageClient.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      console.error("Delete error:", deleteError);

      return NextResponse.json(
        {
          error: "Failed to delete file",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    // If this was a profile picture, clear the avatar reference
    if (fileRecord.file_type === "profile_picture") {
      try {
        const { data: userProfile } = await storageClient
          .from("profiles")
          .select("avatar_url, clerk_id")
          .eq("clerk_id", fileRecord.user_id)
          .single();

        if (
          userProfile?.avatar_url &&
          (
            userProfile.avatar_url.includes(filePath) ||
            userProfile.avatar_url.includes(fileRecord.file_name)
          )
        ) {
          // Clear avatar_url in Supabase
          const { error: avatarError } = await storageClient
            .from("profiles")
            .update({ avatar_url: null })
            .eq("clerk_id", fileRecord.user_id);

          if (avatarError) {
            console.error(
              "Error clearing avatar_url:",
              avatarError
            );
          }
        }
      } catch (profileError) {
        console.error(
          "Error clearing profile avatar:",
          profileError
        );

        // Continue even if this fails
      }
    }

    // Delete from database
    // Trigger will update storage_usage
    const { error: dbError } = await storageClient
      .from("storage_files")
      .delete()
      .eq("id", fileRecord.id);

    if (dbError) {
      console.error(
        "Database delete error:",
        dbError
      );

      return NextResponse.json(
        {
          error: "Failed to remove file record",
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    // Recalculate storage usage to ensure accuracy
    const { data: remainingFiles } = await storageClient
      .from("storage_files")
      .select("file_size")
      .eq("user_id", fileRecord.user_id);

    const recalculatedBytes =
      remainingFiles?.reduce(
        (sum, file) => sum + (file.file_size || 0),
        0
      ) || 0;

    const recalculatedCount =
      remainingFiles?.length || 0;

    // Update storage_usage table
    await storageClient
      .from("storage_usage")
      .upsert(
        {
          user_id: fileRecord.user_id,
          total_bytes: recalculatedBytes,
          file_count: recalculatedCount,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}