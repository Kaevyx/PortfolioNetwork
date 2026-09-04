import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route for admins to upload files on behalf of users
 */
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;
    const bucketName = formData.get("bucketName") as string;
    const targetUserId = formData.get("targetUserId") as string; // User ID to upload file for

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!fileType || !bucketName || !targetUserId) {
      return NextResponse.json(
        { error: "fileType, bucketName, and targetUserId are required" },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSizes: Record<string, number> = {
      profile_picture: 5 * 1024 * 1024, // 5 MB
      cv: 10 * 1024 * 1024, // 10 MB
      portfolio: 20 * 1024 * 1024, // 20 MB
    };

    const maxSize = maxSizes[fileType] || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: `File size exceeds limit. Maximum size for ${fileType} is ${maxSize / (1024 * 1024)} MB` 
        },
        { status: 400 }
      );
    }

    // Use service role client for storage operations
    const storageClient = createServiceRoleClient();

    // Generate unique file path
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${targetUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = fileName;

    // Detect MIME type
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream" || mimeType === "text/plain") {
      // Try to detect from extension
      const extensionMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      mimeType = extensionMap[fileExtension.toLowerCase()] || "application/octet-stream";
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get file URL
    let fileUrl: string;
    if (bucketName === "profile-pictures") {
      const { data } = storageClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      fileUrl = data.publicUrl;
    } else {
      const { data, error: urlError } = await storageClient.storage
        .from(bucketName)
        .createSignedUrl(filePath, 31536000); // 1 year
      if (urlError) throw urlError;
      fileUrl = data.signedUrl;
    }

    // Insert file record into database
    const { error: dbError } = await storageClient
      .from("storage_files")
      .insert({
        user_id: targetUserId,
        file_path: filePath,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        mime_type: mimeType,
        bucket_name: bucketName,
        moderation_status: "pending", // Files uploaded by admin still need moderation
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to delete the uploaded file if database insert fails
      await storageClient.storage.from(bucketName).remove([filePath]);
      return NextResponse.json(
        { error: "Failed to save file record", details: dbError.message },
        { status: 500 }
      );
    }

    // If this is a profile picture, update the user's profile and Clerk image
    // BUT only if the profile is already approved (not during initial setup)
    if (fileType === "profile_picture") {
      try {
        // Check if profile exists and is approved
        const { data: userProfile, error: profileCheckError } = await storageClient
          .from("profiles")
          .select("profile_status, avatar_url")
          .eq("clerk_id", targetUserId)
          .single();

        if (profileCheckError) {
          console.error("Error checking profile status:", profileCheckError);
        } else if (userProfile) {
          // Only update if profile is approved (not during initial setup)
          if (userProfile.profile_status === "approved") {
            // Update profile in Supabase
            const { error: profileUpdateError } = await storageClient
              .from("profiles")
              .update({ avatar_url: fileUrl })
              .eq("clerk_id", targetUserId);

            if (profileUpdateError) {
              console.error("Error updating profile avatar_url:", profileUpdateError);
            }

            // Update Clerk profile image
            try {
              await clerkClient().users.updateUser(targetUserId, {
                imageUrl: fileUrl,
              });
            } catch (clerkError: any) {
              console.error("Error updating Clerk profile image:", clerkError);
              // Don't fail the request if Clerk update fails
            }
          }
          // If profile is pending/rejected, the file will go through moderation
          // and be synced with Clerk when approved by admin
        }
      } catch (error: any) {
        console.error("Error updating profile picture:", error);
        // Don't fail the request if profile update fails
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      filePath,
      fileName: file.name,
      fileSize: file.size,
      message: fileType === "profile_picture"
        ? "Profile picture uploaded and updated successfully!"
        : "File uploaded successfully. It will be reviewed by an admin before being made public.",
      moderationStatus: "pending",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





