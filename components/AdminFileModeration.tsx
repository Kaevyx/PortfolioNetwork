"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X, Clock, AlertCircle, Loader2, Search, FileText, Image, Download, Eye, User, Trash2 } from "lucide-react";

interface AdminFileModerationProps {
  supabase: any;
  currentUserId: string;
}

interface FileRecord {
  id: string;
  user_id: string; // Schema uses user_id
  profile_id?: string; // May exist if schema was updated
  bucket_name: string;
  file_path: string; // Schema uses file_path
  object_path?: string; // May exist if schema was updated
  file_size: number; // Schema uses file_size
  file_size_bytes?: number; // May exist if schema was updated
  mime_type: string | null;
  file_type?: string; // Type of file (profile_picture, cv, portfolio, etc.)
  created_at: string;
  moderation_status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export function AdminFileModeration({ supabase, currentUserId }: AdminFileModerationProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [filter]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      // Try to load files with profile info, but fallback to just files if foreign key doesn't exist
      let query = supabase
        .from("storage_files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      // Try to include profile info if foreign key exists
      try {
        query = supabase
          .from("storage_files")
          .select(`
            *,
            profile:profiles!storage_files_user_id_fkey(
              display_name,
              avatar_url
            )
          `)
          .order("created_at", { ascending: false })
          .limit(100);
      } catch (e) {
        // Foreign key might not exist, use simple query
        console.log("Foreign key not found, using simple query");
      }

      if (filter !== "all") {
        query = query.eq("moderation_status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading files:", error);
        // If foreign key error, try simple query without join
        if (error.message?.includes("foreign key") || error.message?.includes("fkey") || error.code === "PGRST116") {
          console.log("Foreign key not found, using simple query");
          let simpleQuery = supabase
            .from("storage_files")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          
          if (filter !== "all") {
            simpleQuery = simpleQuery.eq("moderation_status", filter);
          }
          
          const { data: simpleData, error: simpleError } = await simpleQuery;
          
          if (simpleError) throw simpleError;
          setFiles(simpleData || []);
        } else {
          throw error;
        }
      } else {
        setFiles(data || []);
      }
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (fileId: string, userId: string, filePath: string, bucketName: string) => {
    // Prevent approving rejected files
    const file = files.find((f) => f.id === fileId);
    if (file?.moderation_status === "rejected") {
      alert("Cannot approve a file that has been rejected. The file must be re-uploaded.");
      return;
    }

    if (!confirm("Are you sure you want to approve this file? It will be made public.")) {
      return;
    }

    setProcessingId(fileId);
    try {
      const notes = reviewNotes[fileId] || null;

      // Update file moderation status
      const { error } = await supabase
        .from("storage_files")
        .update({
          moderation_status: "approved",
          reviewed_by: currentUserId,
          review_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", fileId);

      if (error) throw error;

      // If this is a profile picture, sync with Clerk and update profile
      const file = files.find((f) => f.id === fileId);
      if (file && file.file_type === "profile_picture") {
        try {
          // Get file URL
          let fileUrl: string;
          if (bucketName === "profile-pictures") {
            const { data } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath);
            fileUrl = data.publicUrl;
          } else {
            const { data, error: urlError } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(filePath, 31536000); // 1 year
            if (urlError) throw urlError;
            fileUrl = data.signedUrl;
          }

          // Get current profile to find old avatar
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("clerk_id", userId)
            .single();

          // Find and delete old approved profile pictures for this user
          if (currentProfile?.avatar_url) {
            // Find old profile picture files
            const { data: oldFiles } = await supabase
              .from("storage_files")
              .select("*")
              .eq("user_id", userId)
              .eq("file_type", "profile_picture")
              .eq("moderation_status", "approved")
              .neq("id", fileId); // Exclude the newly approved one

            // Delete old profile pictures from storage and database
            for (const oldFile of oldFiles || []) {
              try {
                // Delete from storage
                const oldFilePath = oldFile.object_path || oldFile.file_path;
                const oldBucket = oldFile.bucket_name;
                if (oldFilePath && oldBucket) {
                  await supabase.storage
                    .from(oldBucket)
                    .remove([oldFilePath]);
                }

                // Delete from database
                await supabase
                  .from("storage_files")
                  .delete()
                  .eq("id", oldFile.id);
              } catch (deleteError) {
                console.error("Error deleting old profile picture:", deleteError);
                // Continue even if deletion fails
              }
            }
          }

          // Update profile avatar_url
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ avatar_url: fileUrl })
            .eq("clerk_id", userId);

          if (profileError) {
            console.error("Error updating profile avatar_url:", profileError);
          }

          // Sync with Clerk
          try {
            const response = await fetch("/api/sync-profile-picture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, imageUrl: fileUrl }),
            });
            
            if (!response.ok) {
              console.error("Failed to sync with Clerk");
            }
          } catch (clerkError) {
            console.error("Error syncing with Clerk:", clerkError);
          }
        } catch (syncError) {
          console.error("Error syncing profile picture:", syncError);
          // Don't fail the approval if sync fails
        }
      }

      // Log admin action
      try {
        const fileName = (file.object_path || file.file_path || "").split("/").pop() || "your file";
        await fetch("/api/log-admin-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "file_approved",
            targetUserId: userId,
            targetId: fileId,
            details: {
              fileName,
              fileType: file.file_type,
              notes: notes || null,
            },
          }),
        });
      } catch (logError) {
        console.error("Error logging admin action:", logError);
      }

      // Create notification for file approval
      try {
        const fileName = (file.object_path || file.file_path || "").split("/").pop() || "your file";
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "file_approved",
            actor_id: currentUserId,
            target_id: fileId,
            message: `Your file "${fileName}" has been approved and is now publicly visible.`,
          });
      } catch (notifError) {
        console.error("Error creating approval notification:", notifError);
        // Don't fail the approval if notification fails
      }

      await loadFiles();
      setReviewNotes({ ...reviewNotes, [fileId]: "" });
    } catch (error: any) {
      console.error("Error approving file:", error);
      alert("Failed to approve file: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (fileId: string) => {
    const notes = reviewNotes[fileId];
    if (!notes || notes.trim().length === 0) {
      alert("Please provide a reason for rejection");
      return;
    }

    if (!confirm("Are you sure you want to reject this file? It will be removed from public access.")) {
      return;
    }

    setProcessingId(fileId);
    try {
      const file = files.find((f) => f.id === fileId);
      if (!file) {
        throw new Error("File not found");
      }

      const userId = file.user_id;
      const fileName = (file.object_path || file.file_path || "").split("/").pop() || "your file";
      const filePath = file.object_path || file.file_path;

      // Delete file from storage first
      if (filePath) {
        try {
          await supabase.storage
            .from(file.bucket_name)
            .remove([filePath]);
        } catch (storageError) {
          console.error("Error deleting file from storage:", storageError);
          // Continue even if storage deletion fails
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("storage_files")
        .delete()
        .eq("id", fileId);

      if (deleteError) throw deleteError;

      // If this was a profile picture, ensure it's completely removed and cannot become the profile picture
      if (file.file_type === "profile_picture") {
        try {
          // Check if this was the current avatar
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("clerk_id", userId)
            .single();

          // Clear avatar_url if it matches the rejected file (check multiple ways)
          const shouldClearAvatar = profile?.avatar_url && (
            profile.avatar_url.includes(filePath) || 
            profile.avatar_url.includes(fileName) ||
            profile.avatar_url.includes(file.id) ||
            profile.avatar_url.includes(file.object_path || file.file_path || "")
          );

          if (shouldClearAvatar) {
            // Clear avatar_url
            await supabase
              .from("profiles")
              .update({ avatar_url: null })
              .eq("clerk_id", userId);

            // Also update Clerk
            try {
              await fetch("/api/sync-profile-picture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, imageUrl: null }),
              });
            } catch (clerkError) {
              console.error("Error clearing Clerk avatar:", clerkError);
            }
          }

          // Also ensure any other rejected profile pictures for this user are deleted
          const { data: rejectedPics } = await supabase
            .from("storage_files")
            .select("*")
            .eq("user_id", userId)
            .eq("file_type", "profile_picture")
            .eq("moderation_status", "rejected");

          for (const rejectedPic of rejectedPics || []) {
            try {
              const rejectedPath = rejectedPic.object_path || rejectedPic.file_path;
              if (rejectedPath) {
                await supabase.storage
                  .from(rejectedPic.bucket_name)
                  .remove([rejectedPath]);
              }
              await supabase
                .from("storage_files")
                .delete()
                .eq("id", rejectedPic.id);
            } catch (err) {
              console.error("Error cleaning up rejected profile picture:", err);
            }
          }
        } catch (profileError) {
          console.error("Error clearing profile avatar:", profileError);
        }
      }

      // Log admin action
      try {
        await fetch("/api/log-admin-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "file_rejected",
            targetUserId: userId,
            targetId: fileId,
            details: {
              fileName,
              fileType: file.file_type,
              reason: notes,
            },
          }),
        });
      } catch (logError) {
        console.error("Error logging admin action:", logError);
      }

      // Create notification for file rejection
      try {
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "file_rejected",
            actor_id: currentUserId,
            target_id: fileId,
            message: `Your file "${fileName}" has been rejected. Reason: ${notes}. The file has been removed from your account.`,
          });
      } catch (notifError) {
        console.error("Error creating rejection notification:", notifError);
        // Don't fail the rejection if notification fails
      }

      await loadFiles();
      setReviewNotes({ ...reviewNotes, [fileId]: "" });
    } catch (error: any) {
      console.error("Error rejecting file:", error);
      alert("Failed to reject file: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePreview = async (file: FileRecord) => {
    try {
      // Get signed URL for private files or public URL for public files
      const filePath = file.object_path || file.file_path;
      if (!filePath) {
        throw new Error("File path not found");
      }
      
      let url: string;
      if (file.bucket_name === "profile-pictures") {
        const { data } = supabase.storage
          .from(file.bucket_name)
          .getPublicUrl(filePath);
        url = data.publicUrl;
      } else {
        const { data, error } = await supabase.storage
          .from(file.bucket_name)
          .createSignedUrl(filePath, 3600); // 1 hour

        if (error) throw error;
        url = data.signedUrl;
      }

      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (error: any) {
      console.error("Error generating preview:", error);
      alert("Failed to load file preview: " + error.message);
    }
  };

  const handleDeleteFile = async (file: FileRecord) => {
    // Prevent deletion of profile pictures unless explicitly needed
    if (file.file_type === "profile_picture") {
      if (!confirm("Are you sure you want to delete this profile picture? This will remove it from the user's account. Continue?")) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
        return;
      }
    }

    setDeletingFileId(file.id);
    try {
      const filePath = file.object_path || file.file_path;
      if (!filePath || !file.bucket_name) {
        throw new Error("File path or bucket name not found");
      }

      const response = await fetch(
        `/api/admin/delete-file?filePath=${encodeURIComponent(filePath)}&bucketName=${encodeURIComponent(file.bucket_name)}&targetUserId=${encodeURIComponent(file.user_id)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete file");
      }

      // Reload files
      await loadFiles();
      alert("File deleted successfully");
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Failed to delete file: " + error.message);
    } finally {
      setDeletingFileId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="w-5 h-5" />;
    if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const filteredFiles = files.filter((file) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filePath = file.object_path || file.file_path || "";
      const userId = file.profile_id || file.user_id || "";
      return (
        file.profile?.display_name?.toLowerCase().includes(query) ||
        filePath.toLowerCase().includes(query) ||
        userId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Modal */}
      {previewUrl && previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Preview: {(previewFile.object_path || previewFile.file_path || "").split("/").pop()}
              </h3>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {previewFile.mime_type?.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Download className="w-4 h-4" />
                    Download to View
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user, filename, or path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {filter === "pending" ? "No pending files to review" : "No files found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Image Thumbnail for images */}
                  {file.mime_type?.startsWith("image/") || file.file_type === "post_image" || file.file_type === "profile_picture" ? (() => {
                    const filePath = file.object_path || file.file_path;
                    let imageUrl: string | null = null;
                    if (filePath && file.bucket_name) {
                      // Post images and profile pictures are in profile-pictures bucket (public)
                      if (file.bucket_name === "profile-pictures" || file.file_type === "post_image" || file.file_type === "profile_picture") {
                        const { data } = supabase.storage
                          .from(file.bucket_name)
                          .getPublicUrl(filePath);
                        imageUrl = data.publicUrl;
                      } else {
                        // For other buckets, try to get public URL first
                        try {
                          const { data } = supabase.storage
                            .from(file.bucket_name)
                            .getPublicUrl(filePath);
                          imageUrl = data.publicUrl;
                        } catch {
                          // If public URL fails, will use preview on click
                          imageUrl = null;
                        }
                      }
                    }
                    return imageUrl ? (
                      <div className="relative flex-shrink-0 group">
                        <img
                          src={imageUrl}
                          alt={(file.object_path || file.file_path || "").split("/").pop() || "Image"}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handlePreview(file)}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center pointer-events-none">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      getFileIcon(file.mime_type)
                    );
                  })() : getFileIcon(file.mime_type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {(file.object_path || file.file_path || file.file_name || "").split("/").pop()}
                      </h3>
                      {file.moderation_status === "pending" && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      )}
                      {file.moderation_status === "approved" && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                          Approved
                        </span>
                      )}
                      {file.moderation_status === "rejected" && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                          Rejected
                        </span>
                      )}
                    </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <div className="flex items-center gap-2">
                          {file.profile?.avatar_url ? (
                            <img
                              src={file.profile.avatar_url}
                              alt={file.profile.display_name}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span>{file.profile?.display_name || "Unknown User"}</span>
                        </div>
                        <span>•</span>
                        <span>{formatBytes(file.file_size_bytes || file.file_size || 0)}</span>
                        <span>•</span>
                        <span>{file.mime_type || "Unknown type"}</span>
                        <span>•</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        <span className="font-mono">{file.object_path || file.file_path || ""}</span>
                      </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {/* Delete button - admins can delete any file except profile pictures (with confirmation) */}
                  {file.file_type !== "profile_picture" && (
                    <button
                      onClick={() => handleDeleteFile(file)}
                      disabled={deletingFileId === file.id}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete file"
                    >
                      {deletingFileId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {/* Allow deletion of profile pictures with extra confirmation */}
                  {file.file_type === "profile_picture" && (
                    <button
                      onClick={() => handleDeleteFile(file)}
                      disabled={deletingFileId === file.id}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete profile picture (admin only)"
                    >
                      {deletingFileId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {file.moderation_status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Review Notes {file.moderation_status === "pending" && "(Required for rejection)"}
                    </label>
                    <textarea
                      value={reviewNotes[file.id] || ""}
                      onChange={(e) =>
                        setReviewNotes({ ...reviewNotes, [file.id]: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add notes about your decision (required for rejection)..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(file.id, file.user_id, file.object_path || file.file_path || "", file.bucket_name)}
                      disabled={processingId === file.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {processingId === file.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(file.id)}
                      disabled={processingId === file.id || !reviewNotes[file.id]?.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {processingId === file.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {file.moderation_status !== "pending" && file.review_notes && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Review Notes</p>
                      <p className="text-sm text-blue-800 dark:text-blue-400">{file.review_notes}</p>
                      {file.reviewed_at && (
                        <p className="text-xs text-blue-700 dark:text-blue-500 mt-2">
                          Reviewed: {new Date(file.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

