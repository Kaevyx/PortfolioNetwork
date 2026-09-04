import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route to verify if an avatar URL still exists in storage
 * and clean up profile if it doesn't
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, avatarUrl } = await request.json();

    if (!userId || !avatarUrl) {
      return NextResponse.json(
        { error: "userId and avatarUrl are required" },
        { status: 400 }
      );
    }

    const storageClient = createServiceRoleClient();

    // Extract file path from URL
    // Supabase public URLs look like: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const urlPattern = /\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/;
    const match = avatarUrl.match(urlPattern);

    if (!match) {
      // If we can't parse the URL, assume it's invalid
      // Update profile to clear avatar_url
      await storageClient
        .from("profiles")
        .update({ avatar_url: null })
        .eq("clerk_id", userId);

      return NextResponse.json({
        valid: false,
        cleaned: true,
        message: "Invalid avatar URL format, cleared from profile",
      });
    }

    const [, bucketName, filePath] = match;

    // Check if file exists in storage
    try {
      const { data: files, error } = await storageClient.storage
        .from(bucketName)
        .list(filePath.split("/").slice(0, -1).join("/") || "", {
          limit: 1,
          search: filePath.split("/").pop() || "",
        });

      // Also check in storage_files table
      const { data: fileRecord } = await storageClient
        .from("storage_files")
        .select("id")
        .eq("user_id", userId)
        .eq("file_path", filePath)
        .eq("bucket_name", bucketName)
        .single();

      // If file doesn't exist in storage or database, clear avatar_url
      if ((!files || files.length === 0) && !fileRecord) {
        // Update profile to clear avatar_url
        await storageClient
          .from("profiles")
          .update({ avatar_url: null })
          .eq("clerk_id", userId);

        // Also update Clerk
        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const clerk = clerkClient();
          await clerk.users.updateUser(userId, {
            imageUrl: null,
          });
        } catch (clerkError: any) {
          console.error("Error updating Clerk:", clerkError);
          // Don't fail the request if Clerk update fails - it's not critical
        }

        return NextResponse.json({
          valid: false,
          cleaned: true,
          message: "Avatar file not found, cleared from profile and Clerk",
        });
      }

      return NextResponse.json({
        valid: true,
        message: "Avatar file exists",
      });
    } catch (storageError) {
      console.error("Error checking storage:", storageError);
      // If we can't verify, assume it's invalid and clear it
      await storageClient
        .from("profiles")
        .update({ avatar_url: null })
        .eq("clerk_id", userId);

      return NextResponse.json({
        valid: false,
        cleaned: true,
        message: "Error verifying file, cleared from profile",
      });
    }
  } catch (error: any) {
    console.error("Verify avatar error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

