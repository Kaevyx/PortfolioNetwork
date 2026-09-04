import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API route to delete a post image and update storage counts
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
    const imageUrl = searchParams.get("imageUrl");
    const postId = searchParams.get("postId");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Use service role client for storage operations
    const storageClient = createServiceRoleClient();

    // Extract file path from URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/profile-pictures/post_image/[userId]/[timestamp]-[random].jpg
    let filePath: string | null = null;
    let bucketName: string | null = null;

    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.indexOf("object") + 1;
      
      if (bucketIndex > 0 && bucketIndex < pathParts.length) {
        bucketName = pathParts[bucketIndex + 1]; // public or signed
        const actualBucket = pathParts[bucketIndex + 2]; // bucket name
        const filePathParts = pathParts.slice(bucketIndex + 3); // rest is file path
        
        if (actualBucket && filePathParts.length > 0) {
          bucketName = actualBucket;
          filePath = filePathParts.join("/");
        }
      }
    } catch (urlError) {
      console.error("Error parsing image URL:", urlError);
    }

    // If we couldn't parse the URL, try to find the file by URL in storage_files
    if (!filePath || !bucketName) {
      const { data: fileRecord } = await storageClient
        .from("storage_files")
        .select("file_path, bucket_name, user_id, file_type")
        .eq("user_id", userId)
        .eq("file_type", "post_image")
        .limit(100);

      // Find file record where the URL matches
      if (fileRecord) {
        for (const file of fileRecord) {
          // Try to match by constructing URL
          const { data: urlData } = storageClient.storage
            .from(file.bucket_name)
            .getPublicUrl(file.file_path);
          
          if (urlData.publicUrl === imageUrl) {
            filePath = file.file_path;
            bucketName = file.bucket_name;
            break;
          }
        }
      }
    }

    if (!filePath || !bucketName) {
      console.warn("Could not determine file path or bucket from URL:", imageUrl);
      // Still try to delete from database if postId is provided
      if (postId) {
        // Find file by matching post image_url
        const { data: post } = await storageClient
          .from("posts")
          .select("image_url")
          .eq("id", postId)
          .single();

        if (post?.image_url === imageUrl) {
          // Try to find the file record
          const { data: files } = await storageClient
            .from("storage_files")
            .select("id, file_path, bucket_name")
            .eq("user_id", userId)
            .eq("file_type", "post_image")
            .limit(100);

          // Match by URL
          for (const file of files || []) {
            const { data: urlData } = storageClient.storage
              .from(file.bucket_name)
              .getPublicUrl(file.file_path);
            
            if (urlData.publicUrl === imageUrl) {
              filePath = file.file_path;
              bucketName = file.bucket_name;
              break;
            }
          }
        }
      }
    }

    // Delete from storage if we have the path
    if (filePath && bucketName) {
      try {
        const { error: deleteError } = await storageClient.storage
          .from(bucketName)
          .remove([filePath]);

        if (deleteError) {
          console.error("Error deleting file from storage:", deleteError);
          // Continue to delete from database even if storage deletion fails
        }
      } catch (storageError) {
        console.error("Error deleting file from storage:", storageError);
      }
    }

    // Delete from database (this will trigger storage_usage update via triggers)
    // IMPORTANT: Only delete post_image files, never profile_picture files
    // Try to find the file record first - it might be matched by URL or file path
    let fileRecordToDelete = null;
    
    if (filePath) {
      // First try to find by file_path
      const { data: fileRecord } = await storageClient
        .from("storage_files")
        .select("id, file_type, user_id, file_path")
        .eq("user_id", userId)
        .eq("file_path", filePath)
        .single();

      if (fileRecord) {
        fileRecordToDelete = fileRecord;
      }
    }
    
    // If not found by path, try to find by matching URL
    if (!fileRecordToDelete && imageUrl) {
      const { data: allPostImages } = await storageClient
        .from("storage_files")
        .select("id, file_type, user_id, file_path, bucket_name")
        .eq("user_id", userId)
        .eq("file_type", "post_image")
        .limit(100);

      if (allPostImages) {
        for (const file of allPostImages) {
          const { data: urlData } = storageClient.storage
            .from(file.bucket_name)
            .getPublicUrl(file.file_path);
          
          if (urlData.publicUrl === imageUrl) {
            fileRecordToDelete = file;
            break;
          }
        }
      }
    }

    // If we found a file record, delete it (this triggers the storage_usage update)
    if (fileRecordToDelete) {
      if (fileRecordToDelete.file_type === "profile_picture") {
        return NextResponse.json(
          { 
            error: "Cannot delete profile picture",
            message: "This is a profile picture and cannot be deleted. Profile pictures are managed separately from post images."
          },
          { status: 403 }
        );
      }

      // Delete the file record (this will trigger the storage_usage update via database trigger)
      const { error: dbError } = await storageClient
        .from("storage_files")
        .delete()
        .eq("id", fileRecordToDelete.id);

      if (dbError) {
        console.error("Error deleting file record:", dbError);
        // Continue even if database deletion fails - storage was already deleted
      } else {
        console.log(`Successfully deleted file record ${fileRecordToDelete.id} from storage_files`);
      }
    } else {
      console.warn("File record not found in storage_files - storage was deleted but record may not exist");
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting post image:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

