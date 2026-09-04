import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route for uploading files to Supabase Storage
 * Supports: Profile pictures, CVs/resumes, portfolio files
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string; // 'profile_picture', 'cv', 'portfolio', 'post_image'
    const bucketName = formData.get("bucketName") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!fileType || !bucketName) {
      return NextResponse.json(
        { error: "fileType and bucketName are required" },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSizes: Record<string, number> = {
      profile_picture: 5 * 1024 * 1024, // 5 MB
      cv: 10 * 1024 * 1024, // 10 MB
      portfolio: 20 * 1024 * 1024, // 20 MB
      post_image: 10 * 1024 * 1024, // 10 MB for post images
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

    // Validate file type
    const allowedTypes: Record<string, string[]> = {
      profile_picture: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      cv: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      portfolio: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      post_image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    };

    const allowed = allowedTypes[fileType] || [];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    // Use regular client for database queries (profile check)
    const supabase = await createClient();
    
    // Check user's subscription plan and suspension status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan, is_suspended, suspension_ends_at")
      .eq("clerk_id", userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to verify subscription" },
        { status: 500 }
      );
    }

    // Check if user is suspended
    if (profile?.is_suspended) {
      // Check if suspension has expired
      let isSuspended = true;
      if (profile.suspension_ends_at) {
        const endDate = new Date(profile.suspension_ends_at);
        if (endDate < new Date()) {
          isSuspended = false;
        }
      }
      
      if (isSuspended) {
        return NextResponse.json(
          {
            error: "Account suspended",
            message: "Your account is suspended. You cannot upload files during this time.",
          },
          { status: 403 }
        );
      }
    }

    const userPlan = profile?.subscription_plan || "free";
    
    // Check if user can upload files using feature gating
    const { canPerformAction } = await import("@/lib/utils/subscriptionFeatures");
    
    // Free plan users can only upload profile pictures and post images, not CVs or other files
    if (fileType !== "profile_picture" && fileType !== "post_image") {
      if (!canPerformAction(userPlan, "uploadFile")) {
        return NextResponse.json(
          {
            error: "File uploads require Pro or Ultimate plan",
            message: "Free plan users can upload profile pictures and post images only. For CVs and other files, use links or upgrade to Pro or Ultimate.",
            upgradeRequired: true,
            currentPlan: userPlan,
          },
          { status: 403 }
        );
      }
    }

    // Check storage availability
    const { data: storageCheck, error: checkError } = await supabase
      .rpc("check_storage_available", {
        user_clerk_id: userId,
        file_size_bytes: file.size,
      });

    if (checkError) {
      console.error("Storage check error:", checkError);
      // Continue anyway, but log the error
    } else if (storageCheck === false) {
      // Get user's current usage and limit
      const { data: usage } = await supabase
        .from("storage_usage")
        .select("total_bytes")
        .eq("user_id", userId)
        .single();

      const { data: plan } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("clerk_id", userId)
        .single();

      const { data: planLimit } = await supabase
        .from("subscription_plans")
        .select("max_storage_mb")
        .eq("name", plan?.subscription_plan || "free")
        .single();

      const limitMB = planLimit?.max_storage_mb || 50;
      const usedMB = usage ? Math.round(usage.total_bytes / (1024 * 1024)) : 0;

      return NextResponse.json(
        {
          error: "Storage limit exceeded",
          message: `You have used ${usedMB} MB of your ${limitMB} MB storage limit. Please delete some files or upgrade your plan.`,
          usedMB,
          limitMB,
        },
        { status: 403 }
      );
    }

    // Generate unique file name
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileType}/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Normalize MIME type for Supabase Storage
    // The bucket allows: image/jpeg, image/jpg, image/png, image/webp, image/gif
    let contentType = file.type;
    
    // If file.type is empty, incorrect, or text/plain, detect from file extension
    if (!contentType || contentType === "text/plain" || contentType.includes("text/plain")) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const extToMime: Record<string, string> = {
        "jpg": "image/jpeg",  // Bucket allows both jpg and jpeg, but we'll use jpeg
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "gif": "image/gif",
        "pdf": "application/pdf",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      contentType = extToMime[ext || ""] || file.type;
      console.log(`Detected MIME type from extension: ${ext} -> ${contentType}`);
    }
    
    // Map image/jpg to image/jpeg (bucket allows both, but jpeg is standard)
    if (contentType === "image/jpg") {
      contentType = "image/jpeg";
    }

    console.log(`Uploading file: ${file.name}, type: ${file.type}, detected: ${contentType}, bucket: ${bucketName}`);

    // Use service role client for storage operations to bypass RLS
    // Since we're using Clerk (not Supabase Auth), RLS policies won't work
    const storageClient = createServiceRoleClient();

    // Upload to Supabase Storage with explicit contentType
    // We MUST set contentType explicitly to prevent Supabase from auto-detecting as text/plain
    let uploadData, uploadError;
    
    const result = await storageClient.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: contentType, // Explicitly set to prevent text/plain detection
        upsert: false,
      });
    
    uploadData = result.data;
    uploadError = result.error;
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      
      // Provide helpful error message for MIME type issues
      if (uploadError.statusCode === '415' || 
          uploadError.message?.includes("mime type") || 
          uploadError.message?.includes("not supported")) {
        return NextResponse.json(
          { 
            error: "File type not allowed by bucket configuration",
            details: `The ${bucketName} bucket has MIME type restrictions that don't allow ${contentType}. Please configure the bucket in Supabase Dashboard → Storage → ${bucketName} → Settings to allow this MIME type, or remove MIME type restrictions. See FIX_STORAGE_UPLOAD_ERROR.md for detailed instructions.`,
            bucketName,
            mimeType: contentType,
            help: "Configure bucket MIME type restrictions in Supabase Dashboard"
          },
          { status: 415 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL (for public buckets) or signed URL (for private buckets)
    let fileUrl: string;
    if (bucketName === "profile-pictures") {
      // Public bucket - get public URL
      const { data: urlData } = storageClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    } else {
      // Private bucket - get signed URL (valid for 1 year)
      const { data: urlData, error: urlError } = await storageClient.storage
        .from(bucketName)
        .createSignedUrl(filePath, 31536000); // 1 year
      
      if (urlError) {
        return NextResponse.json(
          { error: "Failed to generate file URL", details: urlError.message },
          { status: 500 }
        );
      }
      fileUrl = urlData.signedUrl;
    }

    // Record file in database
    // Post images and profile pictures are auto-approved (no moderation needed)
    // Profile pictures are required and always used, so they should be auto-approved
    // Other files (CVs, portfolios) require moderation
    const moderationStatus = (fileType === "post_image" || fileType === "profile_picture") ? "approved" : "pending";
    
    // Use service role client for database insert (bypasses RLS)
    // Note: Schema uses user_id, file_path, file_size (not profile_id, object_path, file_size_bytes)
    const { error: dbError } = await storageClient
      .from("storage_files")
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: file.name,
        file_type: fileType, // 'profile_picture', 'cv', 'post_image', etc.
        file_size: file.size,
        mime_type: contentType, // Use the normalized contentType
        bucket_name: bucketName,
        moderation_status: moderationStatus, // Post images auto-approved, others require moderation
      });

    if (dbError) {
      console.error("Database error inserting file record:", dbError);
      // File is uploaded but not tracked - return error so user knows
      return NextResponse.json(
        {
          success: false,
          error: "File uploaded but failed to record in database",
          details: dbError.message,
          fileUrl, // Still return the URL so user can use it
        },
        { status: 500 }
      );
    }

    // If this is a profile picture, update the user's profile and Clerk image
    // BUT only if the profile is already approved (not during initial setup)
    if (fileType === "profile_picture") {
      try {
        // Check if profile exists and is approved
        const { data: userProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("profile_status, avatar_url")
          .eq("clerk_id", userId)
          .single();

        if (profileCheckError) {
          console.error("Error checking profile status:", profileCheckError);
        } else if (userProfile) {
          // Only update if profile is approved (not during initial setup)
          if (userProfile.profile_status === "approved") {
            // Update profile in Supabase
            const { error: profileUpdateError } = await supabase
              .from("profiles")
              .update({ avatar_url: fileUrl })
              .eq("clerk_id", userId);

            if (profileUpdateError) {
              console.error("Error updating profile avatar_url:", profileUpdateError);
            }

            // Update Clerk profile image
            try {
              await clerkClient().users.updateUser(userId, {
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
        : fileType === "post_image"
        ? "Image uploaded successfully!"
        : "File uploaded successfully. It will be reviewed by an admin before being made public.",
      moderationStatus: moderationStatus,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to remove files
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

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("filePath");
    const bucketName = searchParams.get("bucketName");

    if (!filePath || !bucketName) {
      return NextResponse.json(
        { error: "filePath and bucketName are required" },
        { status: 400 }
      );
    }

    // Use service role client for storage operations
    const storageClient = createServiceRoleClient();

    // Verify file belongs to user
    // Note: Schema uses file_path and user_id (not object_path and profile_id)
    const { data: fileRecord, error: checkError } = await storageClient
      .from("storage_files")
      .select("*")
      .eq("file_path", filePath)
      .eq("user_id", userId)
      .single();

    if (checkError || !fileRecord) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      );
    }

    // Prevent deletion of profile pictures - users must have a profile picture
    // Profile pictures are managed separately and should not be deleted through this endpoint
    if (fileRecord.file_type === "profile_picture") {
      // Check if this is the current avatar
      const { data: profile } = await storageClient
        .from("profiles")
        .select("avatar_url")
        .eq("clerk_id", userId)
        .single();

      const isCurrentAvatar = profile?.avatar_url && (
        profile.avatar_url.includes(filePath) ||
        profile.avatar_url.includes(fileRecord.file_path || "") ||
        profile.avatar_url === filePath
      );

      if (isCurrentAvatar) {
        return NextResponse.json(
          { 
            error: "Cannot delete current profile picture",
            message: "This is your current profile picture and cannot be deleted. Please upload a new picture to replace it first."
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { 
          error: "Profile pictures cannot be deleted",
          message: "Profile pictures are managed separately. Please upload a new picture to replace your current one."
        },
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
        { error: "Failed to delete file", details: deleteError.message },
        { status: 500 }
      );
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

    // If this is a profile picture, check if it's the current avatar and clean it up
    if (fileRecord.file_type === "profile_picture") {
      try {
        // Get current profile to check if this is the active avatar
        const { data: profile } = await storageClient
          .from("profiles")
          .select("avatar_url")
          .eq("clerk_id", userId)
          .single();

        // Check if the deleted file matches the current avatar_url
        // We need to check if the avatar_url contains the file path or matches the URL
        const currentAvatarUrl = profile?.avatar_url || "";
        const deletedFilePath = fileRecord.file_path || filePath;
        
        // More comprehensive check for matching avatar
        const isCurrentAvatar = currentAvatarUrl && (
          currentAvatarUrl.includes(deletedFilePath) ||
          currentAvatarUrl.includes(filePath) ||
          currentAvatarUrl.includes(`profile-pictures/${filePath}`) ||
          currentAvatarUrl.includes(`profile-pictures/${deletedFilePath}`) ||
          // Check if URL ends with the file path
          currentAvatarUrl.endsWith(filePath) ||
          currentAvatarUrl.endsWith(deletedFilePath)
        );

        // If this was the active avatar, find another approved profile picture or set to null
        if (isCurrentAvatar) {
          console.log(`Profile picture deleted is the current avatar for user ${userId}, cleaning up...`);
          // Find another approved profile picture
          const { data: otherProfilePictures } = await storageClient
            .from("storage_files")
            .select("*")
            .eq("user_id", userId)
            .eq("file_type", "profile_picture")
            .eq("moderation_status", "approved")
            .order("created_at", { ascending: false })
            .limit(1);

          let newAvatarUrl: string | null = null;

          if (otherProfilePictures && otherProfilePictures.length > 0) {
            const otherFile = otherProfilePictures[0];
            if (otherFile.bucket_name === "profile-pictures") {
              const { data: urlData } = storageClient.storage
                .from(otherFile.bucket_name)
                .getPublicUrl(otherFile.file_path);
              newAvatarUrl = urlData.publicUrl;
            } else {
              const { data: signedUrl } = await storageClient.storage
                .from(otherFile.bucket_name)
                .createSignedUrl(otherFile.file_path, 31536000);
              newAvatarUrl = signedUrl.signedUrl;
            }
          }

          // Update profile avatar_url (set to null if no other picture found)
          const { error: profileUpdateError } = await storageClient
            .from("profiles")
            .update({ avatar_url: newAvatarUrl })
            .eq("clerk_id", userId);

          if (profileUpdateError) {
            console.error("Error updating profile avatar_url after deletion:", profileUpdateError);
          } else {
            console.log(`Updated profile avatar_url to: ${newAvatarUrl || 'null'} for user ${userId}`);
            // Verify the update was successful
            const { data: updatedProfile } = await storageClient
              .from("profiles")
              .select("avatar_url")
              .eq("clerk_id", userId)
              .single();
            console.log(`Verified profile avatar_url is now: ${updatedProfile?.avatar_url || 'null'}`);
          }

          // Update Clerk profile image
          try {
            await clerkClient().users.updateUser(userId, {
              imageUrl: newAvatarUrl || null,
            });
            console.log(`Updated Clerk imageUrl to: ${newAvatarUrl || 'null'} for user ${userId}`);
          } catch (clerkError: any) {
            console.error("Error updating Clerk profile image after deletion:", clerkError);
          }
        }
      } catch (avatarCleanupError) {
        console.error("Error cleaning up avatar after profile picture deletion:", avatarCleanupError);
        // Don't fail the deletion if cleanup fails
      }
    }

    // Recalculate storage usage to ensure accuracy
    // This is a fallback in case triggers don't fire correctly
    const { data: remainingFiles } = await storageClient
      .from("storage_files")
      .select("file_size")
      .eq("user_id", userId);

    const recalculatedBytes = remainingFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
    const recalculatedCount = remainingFiles?.length || 0;

    // Update storage_usage table
    await storageClient
      .from("storage_usage")
      .upsert({
        user_id: userId,
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

