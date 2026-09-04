"use client";

import { useState, useEffect } from "react";
import { HardDrive, Upload, FileText, Image, Trash2, AlertCircle, CheckCircle2, X, Loader2, Lock, Clock, Eye, Maximize2 } from "lucide-react";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { formatDistanceToNow } from "date-fns";

interface StorageSettingsSectionProps {
  supabase: any;
  userId: string;
}

export function StorageSettingsSection({ supabase, userId }: StorageSettingsSectionProps) {
  const [storageData, setStorageData] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [filesError, setFilesError] = useState<string | null>(null);
  const [currentProfilePicture, setCurrentProfilePicture] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const { isSuspended } = useSuspensionCheck();

  useEffect(() => {
    if (!userId) return;
    loadStorageData();
    
    // Listen for storage update events (when files are deleted/uploaded)
    const handleStorageUpdate = () => {
      loadStorageData();
    };
    
    window.addEventListener('storage-updated', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('storage-updated', handleStorageUpdate);
    };
  }, [userId]);

  const loadStorageData = async () => {
    try {
      setLoading(true);
      
      // Get user's plan and profile picture
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, avatar_url")
        .eq("clerk_id", userId)
        .single();
      
      setUserPlan(profile?.subscription_plan || "free");
      setCurrentProfilePicture(profile?.avatar_url || null);
      
      // Load storage usage
      const usageResponse = await fetch("/api/storage-usage");
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setStorageData(usageData);
      }

      // Load files list - show all user files (pending, approved, rejected)
      // Use API route to bypass RLS and ensure accurate file listing
      setFilesError(null);
      try {
        const response = await fetch(`/api/get-user-files?userId=${userId}`);
        if (response.ok) {
          const result = await response.json();
          console.log(`Loaded ${result.files?.length || 0} files for user ${userId}`, result.files);
          setFiles(result.files || []);
        } else {
          // Fallback to direct query
          const { data: filesData, error: filesError } = await supabase
            .from("storage_files")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          if (filesError) {
            console.error("Error loading files:", filesError);
            setFilesError("Failed to load files. Please refresh the page.");
            setFiles([]);
          } else {
            setFiles(filesData || []);
          }
        }
      } catch (fetchError) {
        console.error("Error fetching files via API:", fetchError);
        // Fallback to direct query
        const { data: filesData, error: filesError } = await supabase
          .from("storage_files")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (filesError) {
          console.error("Error loading files:", filesError);
          setFilesError("Failed to load files. Please refresh the page.");
          setFiles([]);
        } else {
          setFiles(filesData || []);
        }
      }
    } catch (error) {
      console.error("Error loading storage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (isSuspended) {
      alert("Your account is suspended. You cannot upload files.");
      e.target.value = ""; // Clear the input
      return;
    }

    setUploading(true);
    try {
      let bucketName = "";
      switch (fileType) {
        case "profile_picture":
          bucketName = "profile-pictures";
          break;
        case "cv":
          bucketName = "cv-resumes";
          break;
        default:
          bucketName = "portfolio-files";
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);
      formData.append("bucketName", bucketName);

      const response = await fetch("/api/upload-file", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.upgradeRequired) {
          // Show upgrade prompt
          const upgrade = confirm(
            "File uploads require a Pro or Ultimate plan. Free plan users can use links instead.\n\n" +
            "Would you like to upgrade your plan?"
          );
          if (upgrade) {
            window.location.href = "/pricing";
          }
        } else {
          alert(result.message || result.error || "Failed to upload file");
        }
        return;
      }

      // Reload data
      await loadStorageData();
      
      // If this was a profile picture, update the preview
      if (fileType === "profile_picture" && result.fileUrl) {
        setCurrentProfilePicture(result.fileUrl);
      }
      
      // Trigger a custom event to notify other components (like TopConnectionCard) to refresh
      window.dispatchEvent(new CustomEvent('storage-updated'));
      
      // Show success message with moderation notice
      const toast = document.createElement("div");
      toast.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-blue-500 text-white animate-fade-in max-w-md";
      toast.innerHTML = `
        <div class="flex items-start gap-2">
          <div class="flex-1">
            <p class="font-medium">File uploaded successfully!</p>
            <p class="text-sm text-blue-100 mt-1">${fileType === "profile_picture" ? "Your profile picture has been uploaded and will be reviewed by an admin." : "Your file is pending review and will be made public once approved by an admin."}</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 5000);

      // Clear file input
      e.target.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Failed to upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, objectPath: string, bucketName: string, fileType: string) => {
    if (isSuspended) {
      alert("Your account is suspended. You cannot delete files.");
      return;
    }
    
    // Prevent deletion of profile pictures - users must have a profile picture
    if (fileType === "profile_picture") {
      alert("Profile pictures cannot be deleted. Please upload a new picture to replace your current one.");
      return;
    }

    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }

    setDeletingId(fileId);
    try {
      const response = await fetch(`/api/upload-file?filePath=${encodeURIComponent(objectPath)}&bucketName=${encodeURIComponent(bucketName)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete file");
      }

      // Reload data to refresh file list and storage usage
      await loadStorageData();
      
      // Trigger a custom event to notify other components (like TopConnectionCard) to refresh
      window.dispatchEvent(new CustomEvent('storage-updated'));

      // Show success message
      const toast = document.createElement("div");
      toast.className = "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-green-500 text-white animate-fade-in";
      toast.textContent = "File deleted successfully!";
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Failed to delete file: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangeProfilePicture = (fileId: string) => {
    // Trigger file input click for profile picture upload
    const fileInput = document.getElementById(`profile-picture-input`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      // If input doesn't exist, redirect to profile edit page
      window.location.href = "/profile/edit";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "profile_picture":
        return <Image className="w-4 h-4" />;
      case "post_image":
        return <Image className="w-4 h-4" />;
      case "cv":
        return <FileText className="w-4 h-4" />;
      case "portfolio":
        return <Upload className="w-4 h-4" />;
      default:
        return <Upload className="w-4 h-4" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case "profile_picture":
        return "Profile Pictures";
      case "post_image":
        return "Post Images";
      case "cv":
        return "CVs/Resumes";
      case "portfolio":
        return "Portfolio Files";
      default:
        return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  const { usedMB, limitMB, percentage, fileCount, breakdown, lastUpdated } = storageData || {};
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <HardDrive className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Storage Management</h2>
      </div>

      {/* Storage Overview */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Storage Usage</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {usedMB?.toFixed(1) || 0} MB of {limitMB || 50} MB used
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</span>
              </p>
            )}
          </div>
          {isNearLimit && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isAtLimit 
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
            }`}>
              <AlertCircle className="w-4 h-4" />
              {isAtLimit ? "Limit Reached" : "Near Limit"}
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${
              isAtLimit
                ? "bg-red-600"
                : isNearLimit
                ? "bg-orange-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${Math.min(percentage || 0, 100)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{fileCount || 0} files</span>
          <span>{percentage || 0}% used</span>
        </div>

        {/* Breakdown by Type */}
        {breakdown && breakdown.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Storage by Type</h4>
            <div className="space-y-2">
              {breakdown.map((item: any) => (
                <div key={item.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getFileTypeIcon(item.type)}
                    <span className="text-gray-700 dark:text-gray-300">{getFileTypeLabel(item.type)}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {item.count} {item.count === 1 ? "file" : "files"} • {item.sizeMB.toFixed(1)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upload Files</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Profile Picture Upload - Available for all plans */}
          <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
            <div className="flex flex-col items-center text-center">
              {currentProfilePicture ? (
                <div className="relative mb-3">
                  <img
                    src={currentProfilePicture}
                    alt="Current profile picture"
                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500"
                    onError={(e) => {
                      // If image fails to load, clear it
                      e.currentTarget.style.display = 'none';
                      setCurrentProfilePicture(null);
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1 border-2 border-white dark:border-gray-800">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <Image className="w-8 h-8 text-gray-400 mb-2" />
              )}
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Profile Picture {currentProfilePicture && <span className="text-green-600 dark:text-green-400">✓</span>}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {currentProfilePicture ? "Max 5 MB (JPG, PNG, WebP)" : "Required • Max 5 MB (JPG, PNG, WebP)"}
              </p>
              <label className="cursor-pointer">
                  <input
                    id="profile-picture-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleFileUpload(e, "profile_picture")}
                    disabled={uploading || isSuspended}
                    className="hidden"
                  />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {currentProfilePicture ? "Change Picture" : "Upload Picture"}
                    </>
                  )}
                </span>
              </label>
              {currentProfilePicture && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Profile pictures are required and cannot be deleted
                </p>
              )}
            </div>
          </div>

          {/* CV Upload - Pro/Business only */}
          {userPlan === "free" ? (
            <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex flex-col items-center text-center">
                <FileText className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">CV/Resume</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Requires Pro or Ultimate plan</p>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3 w-full">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                    Free plan users can use links for CVs (Google Drive, Dropbox, etc.)
                  </p>
                  <a
                    href="/pricing"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Upgrade to Pro →
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
              <div className="flex flex-col items-center text-center">
                <FileText className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">CV/Resume</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Max 10 MB (PDF, DOC, DOCX)</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => handleFileUpload(e, "cv")}
                    disabled={uploading || isSuspended}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload CV
                      </>
                    )}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Files List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Your Files</h3>
          <div className="flex items-center gap-2">
            {filesError && (
              <span className="text-xs text-red-600 dark:text-red-400">{filesError}</span>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {files.length} {files.length === 1 ? "file" : "files"}
              {storageData?.fileCount !== undefined && storageData.fileCount !== files.length && (
                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                  (DB shows {storageData.fileCount})
                </span>
              )}
            </span>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No files uploaded yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Upload your first file above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              // Ensure we have a valid file object
              if (!file || !file.id) {
                console.warn("Invalid file object:", file);
                return null;
              }

              const statusColors = {
                pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                approved: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
              };
              const statusLabels = {
                pending: "Pending Review",
                approved: "Approved",
                rejected: "Rejected",
              };
              const status = file.moderation_status || "pending";
              const fileName = file.file_name || (file.object_path || file.file_path || "").split("/").pop() || "Unknown file";
              const isImage = file.file_type === "post_image" || file.file_type === "profile_picture";
              
              // Get image URL if it's an image
              let imageUrl: string | null = null;
              if (isImage && file.bucket_name && (file.object_path || file.file_path)) {
                const { data: urlData } = supabase.storage
                  .from(file.bucket_name)
                  .getPublicUrl(file.object_path || file.file_path);
                imageUrl = urlData.publicUrl;
              }
              
              const handleViewImage = () => {
                if (imageUrl) {
                  setPreviewImage(imageUrl);
                  setPreviewFileName(fileName);
                }
              };
              
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Image Thumbnail for post images */}
                    {file.file_type === "post_image" && imageUrl ? (
                      <div className="relative flex-shrink-0 group">
                        <img
                          src={imageUrl}
                          alt={fileName}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={handleViewImage}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center pointer-events-none">
                          <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      getFileTypeIcon(file.file_type || "portfolio")
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate" title={fileName}>
                          {fileName}
                        </p>
                        {status !== "approved" && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
                            {statusLabels[status as keyof typeof statusLabels]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{getFileTypeLabel(file.file_type || "portfolio")}</span>
                        <span>•</span>
                        <span>{formatBytes(file.file_size_bytes || file.file_size || 0)}</span>
                        <span>•</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        {file.moderation_status && (
                          <>
                            <span>•</span>
                            <span className="text-xs">{(file.moderation_status || "pending").charAt(0).toUpperCase() + (file.moderation_status || "pending").slice(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* View button for images */}
                    {isImage && imageUrl && file.file_type !== "profile_picture" && (
                      <button
                        onClick={handleViewImage}
                        className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="View image"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {file.file_type === "profile_picture" ? (
                      <button
                        onClick={() => handleChangeProfilePicture(file.id)}
                        className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="Change profile picture (required)"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteFile(file.id, file.object_path || file.file_path || "", file.bucket_name, file.file_type)}
                        disabled={deletingId === file.id || isSuspended}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete file"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning/Info Messages */}
      {isAtLimit && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-300 mb-1">Storage Limit Reached</p>
              <p className="text-sm text-red-800 dark:text-red-400 mb-3">
                You've used all your storage. Please delete some files or upgrade your plan to continue uploading.
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
              >
                Upgrade Plan →
              </a>
            </div>
          </div>
        </div>
      )}

      {isNearLimit && !isAtLimit && (
        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900 dark:text-orange-300 mb-1">Storage Almost Full</p>
              <p className="text-sm text-orange-800 dark:text-orange-400 mb-3">
                You're using {percentage}% of your storage. Consider upgrading for more space.
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400 hover:underline"
              >
                View Plans →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setPreviewImage(null);
            setPreviewFileName(null);
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => {
                setPreviewImage(null);
                setPreviewFileName(null);
              }}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt={previewFileName || "Preview"}
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {previewFileName && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg">
                <p className="text-sm font-medium truncate">{previewFileName}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

