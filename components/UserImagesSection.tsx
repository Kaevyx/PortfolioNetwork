"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/lib/utils/toast";

interface UserImagesSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function UserImagesSection({ userId, isOwnProfile = false }: UserImagesSectionProps) {
  const { user } = useUser();
  const [images, setImages] = useState<Array<{ id: string; image_url: string; created_at: string; post_id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        
        // Get all posts with images for this user
        const { data: posts, error } = await supabase
          .from("posts")
          .select("id, image_url, created_at")
          .eq("profile_id", userId)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(50); // Limit to 50 most recent images

        if (error) throw error;

            const imagePosts: Array<{ id: string; image_url: string; created_at: string; post_id?: string }> = [];
            
            (posts || []).forEach((post: any) => {
              if (post.image_url) {
                let imageUrls: string[] = [];
                
                // Handle array or string, and ensure all values are valid strings
                if (Array.isArray(post.image_url)) {
                  // It's already an array - process it
                  imageUrls = post.image_url
                    .map((url: any) => {
                      if (url === null || url === undefined) return '';
                      return String(url).trim();
                    })
                    .filter((url: string) => url !== '' && url.length > 0);
                } else if (typeof post.image_url === 'string') {
                  // Could be a JSON string array or a single URL
                  const trimmed = post.image_url.trim();
                  if (trimmed !== '') {
                    // Try to parse as JSON array first
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                      try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) {
                          imageUrls = parsed
                            .map((url: any) => String(url).trim())
                            .filter((url: string) => url !== '');
                        } else {
                          imageUrls = [trimmed];
                        }
                      } catch {
                        // Not valid JSON, treat as single URL
                        imageUrls = [trimmed];
                      }
                    } else {
                      // Single URL string
                      imageUrls = [trimmed];
                    }
                  }
                }
                
                // Add each valid URL as a separate image entry
                imageUrls.forEach((url: string, idx: number) => {
                  // Ensure URL is valid (not an array stringified)
                  if (url && !url.startsWith('[') && !url.startsWith('{')) {
                    imagePosts.push({
                      id: `${post.id}-${idx}`,
                      image_url: url,
                      created_at: post.created_at,
                      post_id: post.id,
                    });
                  }
                });
              }
            });
            
            console.log('📸 UserImagesSection: Loaded', imagePosts.length, 'images from', posts?.length || 0, 'posts');

        setImages(imagePosts);
      } catch (error) {
        console.error("Error loading images:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [userId, supabase]);

  const handleDeleteImage = async (postId: string, imageUrl: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOwnProfile || !user?.id || user.id !== userId) return;

    if (!confirm("Are you sure you want to delete this image? This will also delete the post it's attached to. This action cannot be undone.")) {
      return;
    }

    setDeletingId(postId);
    try {
      // Delete the post (which will trigger image deletion via PostCard)
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("profile_id", userId); // Ensure user can only delete their own posts

      if (deleteError) throw deleteError;

      // Delete the image from storage
      try {
        const deleteResponse = await fetch(
          `/api/post/delete-image?imageUrl=${encodeURIComponent(imageUrl)}&postId=${postId}`,
          { method: "DELETE" }
        );
        
        if (!deleteResponse.ok) {
          console.warn("Failed to delete post image, but post was deleted");
        }
      } catch (imageError) {
        console.error("Error deleting post image:", imageError);
      }

      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== postId));
      showToast("Image deleted successfully", "success");
      
      // Trigger storage update event
      window.dispatchEvent(new CustomEvent('storage-updated'));
    } catch (error: any) {
      console.error("Error deleting image:", error);
      showToast("Failed to delete image: " + (error.message || "Unknown error"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          {isOwnProfile ? "Your Images" : "Images"}
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No images yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        {isOwnProfile ? "Your Images" : "Images"}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          ({images.length})
        </span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square rounded-lg overflow-hidden group"
          >
            <Link
              href={image.post_id ? `/feed?post=${image.post_id}` : "#"}
              className="block w-full h-full"
            >
              <img
                src={image.image_url}
                alt="Post image"
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </Link>
            {isOwnProfile && user?.id === userId && (
              <button
                onClick={(e) => handleDeleteImage(image.id, image.image_url, e)}
                disabled={deletingId === image.id}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                title="Delete image"
              >
                {deletingId === image.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

