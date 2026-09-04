"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { X, Image as ImageIcon, Lock, Upload, Loader2, Calendar, Clock } from "lucide-react";
import { extractHashtags } from "@/lib/utils/hashtags";
import { showToast } from "@/lib/utils/toast";
import { checkContentSafety } from "@/lib/utils/databaseContentModeration";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { canPerformAction } from "@/lib/utils/subscriptionFeatures";

interface CreatePostProps {
  onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, isLoaded } = useUser();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [userPlan, setUserPlan] = useState<string>("free");
  const [canSchedule, setCanSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_IMAGES = 5;
  const supabase = createClient();
  const { isSuspended } = useSuspensionCheck();

  // Load user plan and check scheduling capability
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadUserPlan = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("clerk_id", user.id)
          .single();

        if (profile) {
          const plan = profile.subscription_plan || "free";
          setUserPlan(plan);
          setCanSchedule(canPerformAction(plan, "schedulePost"));
        }
      } catch (error) {
        console.error("Error loading user plan:", error);
      }
    };

    loadUserPlan();
  }, [isLoaded, user?.id, supabase]);

  // Calculate minimum time (10 minutes from now)
  const getMinTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Validate scheduled date/time
  const validateScheduledDateTime = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    
    const scheduledDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    
    // Check if date is today or later
    const scheduledDateOnly = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduledDateOnly.setHours(0, 0, 0, 0);
    
    if (scheduledDateOnly < today) {
      return "Scheduled date must be today or later";
    }
    
    // If scheduled for today, check time is at least 10 minutes in the future
    if (scheduledDateOnly.getTime() === today.getTime() && scheduledDateTime <= minDateTime) {
      return "Scheduled time must be at least 10 minutes in the future";
    }
    
    return null;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (imageFiles.length + files.length > MAX_IMAGES) {
      showToast(`You can only upload up to ${MAX_IMAGES} images per post`, "error");
      return;
    }

    const validFiles: File[] = [];
    const fileReaders: Promise<string>[] = [];

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast(`${file.name} is not an image file`, "error");
        return;
      }

      // Validate file size (max 10MB for post images)
      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) {
        showToast(`${file.name} is too large. Maximum size is 10MB`, "error");
        return;
      }

      validFiles.push(file);
      
      // Create preview promise
      const previewPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
      
      fileReaders.push(previewPromise);
    });

    // Wait for all previews to be ready, then update state
    if (validFiles.length > 0) {
      Promise.all(fileReaders).then((previews) => {
        setImageFiles((prev) => [...prev, ...validFiles]);
        setImagePreviews((prev) => [...prev, ...previews]);
      });
    }

    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (files: File[]): Promise<string[]> => {
    if (!files.length || !user?.id) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      // Upload all images sequentially to avoid overwhelming the server
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "post_image");
        formData.append("bucketName", "profile-pictures");

        const response = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || result.message || `Failed to upload ${file.name}`);
        }

        uploadedUrls.push(result.fileUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error("Image upload error:", error);
      showToast(error.message || "Failed to upload images. Please try again.", "error");
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !content.trim()) return;
    if (isSuspended) {
      showToast("Your account is suspended. You cannot create posts.", "error");
      return;
    }

    // Check post limit for free plan users
    try {
      const limitResponse = await fetch("/api/posts/check-limit");
      if (limitResponse.ok) {
        const limitData = await limitResponse.json();
        if (!limitData.canCreate) {
          showToast(
            `You've reached your monthly post limit (${limitData.limit} posts). Upgrade to Pro for unlimited posts.`,
            "error"
          );
          return;
        }
      }
    } catch (error) {
      console.error("Error checking post limit:", error);
      // Continue anyway to avoid blocking users
    }

    // Check for blocked domains and inappropriate content
    const safetyCheck = await checkContentSafety(content.trim());
    if (!safetyCheck.isSafe) {
      // Log the blocked attempt
      try {
        const { logBlockedAttempt } = await import('@/lib/utils/databaseContentModeration');
        await logBlockedAttempt({
          userId: user.id,
          contentType: 'post',
          attemptedContent: content.trim(),
          matchedKeyword: safetyCheck.matchedKeyword,
          matchedDomain: safetyCheck.matchedDomain,
          category: safetyCheck.category,
          severity: safetyCheck.severity,
          messageShown: safetyCheck.reason,
          contextUrl: window.location.pathname,
          keywordId: safetyCheck.keywordId,
          domainId: safetyCheck.domainId,
        });
      } catch (error) {
        console.error("Error logging blocked attempt:", error);
      }
      
      showToast(
        safetyCheck.reason || "Your post violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate.",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      let finalImageUrls: string[] | null = null;

      // If there are files to upload, upload them first
      if (imageFiles.length > 0) {
        const uploadedUrls = await handleImageUpload(imageFiles);
        if (uploadedUrls.length > 0) {
          finalImageUrls = uploadedUrls;
        } else {
          // Upload failed, don't create post
          setLoading(false);
          return;
        }
      } else if (imageUrl.trim()) {
        // If using URL input, wrap in array
        finalImageUrls = [imageUrl.trim()];
      }

      // Extract hashtags and mentions from content
      const hashtags = extractHashtags(content.trim());
      
      // Extract mentions
      const { extractMentions } = await import('@/lib/utils/mentions');
      const mentions = extractMentions(content.trim());
      console.log('Extracted mentions from post:', mentions);
      
      // Resolve mentions to user IDs
      const { resolveMentionsToUserIds } = await import('@/lib/utils/mentions');
      const mentionedUserIds = await resolveMentionsToUserIds(supabase, mentions);
      console.log('Resolved mention user IDs:', mentionedUserIds);
      
      // Calculate scheduled_at if scheduling
      let scheduledAt: string | null = null;
      if (isScheduled && canSchedule && scheduledDate && scheduledTime) {
        const validationError = validateScheduledDateTime(scheduledDate, scheduledTime);
        if (validationError) {
          showToast(validationError, "error");
          setLoading(false);
          return;
        }
        
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        scheduledAt = scheduledDateTime.toISOString();
      }
      
      // Insert post first to get the post ID
      const { data: newPost, error } = await supabase.from("posts").insert({
        profile_id: user.id,
        content: content.trim(),
        image_url: finalImageUrls,
        hashtags: hashtags.length > 0 ? hashtags : null,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : null,
        is_scheduled: isScheduled && scheduledAt !== null,
        scheduled_at: scheduledAt,
        published_at: scheduledAt ? null : new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      // Create notifications for mentioned users (after post is created)
      if (mentionedUserIds.length > 0 && newPost) {
        const posterName = user.firstName || user.email?.split('@')[0] || 'Someone';
        
        for (const mentionedUserId of mentionedUserIds) {
          if (mentionedUserId !== user.id) {
            // Check user's notification preferences
            const { data: mentionedUserProfile } = await supabase
              .from('profiles')
              .select('settings')
              .eq('clerk_id', mentionedUserId)
              .single();
            
            const userSettings = mentionedUserProfile?.settings as any;
            const notifications = userSettings?.notifications || {};
            const inAppEnabled = notifications.inAppNotifications !== false;
            const mentionEnabled = notifications.newMention !== false;
            
            if (inAppEnabled && mentionEnabled) {
              const { error: notifError } = await supabase.from('notifications').insert({
                user_id: mentionedUserId,
                type: 'mention',
                actor_id: user.id,
                target_id: `post:${newPost.id}`, // Prefix with "post:" to indicate it's a post mention
                message: `${posterName} mentioned you in a post`
              });
              
              if (notifError) {
                console.error('Error creating mention notification:', notifError);
              } else {
                console.log(`Mention notification created for user ${mentionedUserId}`);
              }
            } else {
              console.log(`Mention notification skipped for user ${mentionedUserId} (inApp: ${inAppEnabled}, mention: ${mentionEnabled})`);
            }
          }
        }
      }

      // Success - clear form and show message
      setContent("");
      setImageUrl("");
      setImageFiles([]);
      setImagePreviews([]);
      setIsScheduled(false);
      setScheduledDate("");
      setScheduledTime("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showToast(
        isScheduled && scheduledAt 
          ? `Post scheduled for ${new Date(scheduledAt).toLocaleString()}!` 
          : "Post created successfully!",
        "success"
      );
      
      // Call callback to refresh feed
      onPostCreated?.();
    } catch (error: any) {
      console.error("Error creating post:", error);
      showToast(
        error.message || "Failed to create post. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !user) return null;

  if (isSuspended) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Lock className="w-5 h-5" />
          <p className="text-sm">Your account is suspended. You cannot create posts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 mb-4 hover:shadow-md transition-all">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              const cursorPos = e.target.selectionStart || 0;
              setContent(e.target.value);
              // Trigger mention detection after state update
              setTimeout(() => {
                const input = textareaRef.current;
                if (input) {
                  input.setSelectionRange(cursorPos, cursorPos);
                }
              }, 0);
            }}
            onKeyDown={(e) => {
              // Handle mention autocomplete navigation
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                // Let MentionAutocomplete handle these
              }
            }}
            onSelect={(e) => {
              // Trigger mention detection on selection change
              const target = e.target as HTMLTextAreaElement;
              const cursorPos = target.selectionStart || 0;
              // This will be handled by the onChange handler
            }}
            placeholder="Share your professional updates, achievements, or insights..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none text-sm placeholder:text-gray-400"
            disabled={loading || isSuspended}
          />
          <MentionAutocomplete
            value={content}
            onChange={(newValue) => setContent(newValue)}
            onSelect={(mention) => {
              // Mention is already inserted by the component
            }}
            inputRef={textareaRef}
            disabled={loading || isSuspended}
          />
        </div>

        {/* Image Previews */}
        {(imagePreviews.length > 0 || imageUrl) && (
          <div className="mt-3 space-y-2">
            {/* Multiple image previews */}
            {imagePreviews.length > 0 && (
              <div className={`grid gap-2 ${
                imagePreviews.length === 1 ? "grid-cols-1" :
                imagePreviews.length === 2 ? "grid-cols-2" :
                imagePreviews.length === 3 ? "grid-cols-3" :
                imagePreviews.length === 4 ? "grid-cols-2" :
                "grid-cols-3"
              }`}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* URL input preview */}
            {imageUrl && imagePreviews.length === 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
                >
                  <X className="w-3 h-3" />
                </button>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* Scheduling Options - Pro/Ultimate only */}
        {canSchedule && isScheduled && (
          <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Schedule Post</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setScheduledDate(e.target.value);
                    // If date is today, update min time
                    if (e.target.value === new Date().toISOString().split('T')[0]) {
                      const minTime = getMinTime();
                      if (!scheduledTime || scheduledTime < minTime) {
                        setScheduledTime(minTime);
                      }
                    } else {
                      // If date is in the future, reset time to a reasonable default (e.g., 9:00 AM)
                      if (!scheduledTime) {
                        setScheduledTime("09:00");
                      }
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  required={isScheduled}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime || getMinTime()}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={scheduledDate === new Date().toISOString().split('T')[0] ? getMinTime() : undefined}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  required={isScheduled}
                />
              </div>
            </div>
            {(scheduledDate || new Date().toISOString().split('T')[0]) && (scheduledTime || getMinTime()) && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Post will be published on {new Date(`${scheduledDate || new Date().toISOString().split('T')[0]}T${scheduledTime || getMinTime()}`).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            {/* File Upload Button - Only for Pro/Ultimate users */}
            {userPlan !== "free" && (
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all rounded-lg text-xs">
                {uploadingImages ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {uploadingImages ? "Uploading..." : `Upload Photos (${imageFiles.length}/${MAX_IMAGES})`}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={uploadingImages || loading || imageFiles.length >= MAX_IMAGES}
                />
              </label>
            )}
            
            {/* URL Input (Alternative) - only show if no files selected and user is Pro/Ultimate */}
            {userPlan !== "free" && imageFiles.length === 0 && imagePreviews.length === 0 && (
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all rounded-lg text-xs">
                <ImageIcon className="w-4 h-4" />
                <span className="font-medium">Image URL</span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Post Scheduling - Pro/Ultimate only */}
            {canSchedule && (
              <button
                type="button"
                onClick={() => {
                  const newScheduled = !isScheduled;
                  setIsScheduled(newScheduled);
                  
                  // Initialize date/time when enabling scheduling
                  if (newScheduled) {
                    const today = new Date().toISOString().split('T')[0];
                    setScheduledDate(today);
                    
                    const now = new Date();
                    now.setMinutes(now.getMinutes() + 10);
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    setScheduledTime(`${hours}:${minutes}`);
                  } else {
                    // Clear when disabling
                    setScheduledDate("");
                    setScheduledTime("");
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isScheduled
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
            )}
            <button
              type="submit"
              disabled={loading || uploadingImages || !content.trim() || (isScheduled && (!scheduledDate || !scheduledTime))}
              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-xs shadow-sm hover:shadow disabled:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isScheduled ? "Scheduling..." : "Posting..."}
                </>
              ) : (
                isScheduled ? "Schedule Post" : "Post"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
