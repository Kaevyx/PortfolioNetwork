"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";

interface ShareButtonProps {
  postId: string;
  initialShared?: boolean;
  sharesCount?: number;
  originalPostAuthor?: string;
  onShareComplete?: () => void;
}

export function ShareButton({ postId, initialShared = false, sharesCount = 0, originalPostAuthor, onShareComplete }: ShareButtonProps) {
  const { user, isLoaded } = useUser();
  const [isShared, setIsShared] = useState(initialShared);
  const [count, setCount] = useState(sharesCount);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const supabase = createClient();

  // Load share status and count
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadShareStatus = async () => {
      try {
        // Check if user has shared
        const { data: userShare } = await supabase
          .from("reposts")
          .select("id")
          .eq("user_id", user.id)
          .eq("original_post_id", postId)
          .single();

        setIsShared(!!userShare);

        // Get total share count
        const { count: shareCount } = await supabase
          .from("reposts")
          .select("*", { count: "exact", head: true })
          .eq("original_post_id", postId);

        setCount(shareCount || 0);
      } catch (error) {
        // Ignore errors
      }
    };

    loadShareStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, postId]);

  const handleShareClick = () => {
    if (isShared) {
      handleUnshare();
    } else {
      setShowShareModal(true);
    }
  };

  const handleUnshare = async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      // Remove share
      const { error } = await supabase
        .from("reposts")
        .delete()
        .eq("user_id", user.id)
        .eq("original_post_id", postId);

      if (error) throw error;
      
      // Delete the share post if it exists
      const { data: sharePosts } = await supabase
        .from("posts")
        .select("id")
        .eq("profile_id", user.id)
        .eq("is_repost", true)
        .eq("original_post_id", postId);

      if (sharePosts && sharePosts.length > 0) {
        await supabase
          .from("posts")
          .delete()
          .in("id", sharePosts.map(p => p.id));
      }

      setIsShared(false);
      // Reload count
      const { count: shareCount } = await supabase
        .from("reposts")
        .select("*", { count: "exact", head: true })
        .eq("original_post_id", postId);
      setCount(shareCount || 0);
    } catch (error) {
      console.error("Error unsharing:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareComplete = () => {
    setIsShared(true);
    // Reload count
    const reloadCount = async () => {
      const { count: shareCount } = await supabase
        .from("reposts")
        .select("*", { count: "exact", head: true })
        .eq("original_post_id", postId);
      setCount(shareCount || 0);
    };
    reloadCount();
    onShareComplete?.();
  };

  if (!isLoaded || !user) return null;

  return (
    <>
      <button
        onClick={handleShareClick}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs ${
          isShared
            ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
            : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        title={isShared ? "Unshare" : "Share"}
      >
        <Share2 className={`w-4 h-4 ${isShared ? "fill-current" : ""}`} />
        {count > 0 && <span className="font-medium">{count}</span>}
      </button>
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={postId}
        originalPostAuthor={originalPostAuthor}
        onShareComplete={handleShareComplete}
      />
    </>
  );
}

