"use client";

import { useState } from "react";
import { X, Share2, User } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { checkContentSafety } from "@/lib/utils/databaseContentModeration";
import { showToast } from "@/lib/utils/toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  originalPostAuthor?: string;
  onShareComplete?: () => void;
}

export function ShareModal({ isOpen, onClose, postId, originalPostAuthor, onShareComplete }: ShareModalProps) {
  const { user } = useUser();
  const [shareComment, setShareComment] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!user?.id) return;

    // Check for blocked domains and inappropriate content in share comment
    if (shareComment.trim()) {
      const safetyCheck = await checkContentSafety(shareComment.trim());
      if (!safetyCheck.isSafe) {
        // Log the blocked attempt
        try {
          const { logBlockedAttempt } = await import('@/lib/utils/databaseContentModeration');
          await logBlockedAttempt({
            userId: user.id,
            contentType: 'share_comment',
            attemptedContent: shareComment.trim(),
            matchedKeyword: safetyCheck.matchedKeyword,
            matchedDomain: safetyCheck.matchedDomain,
            category: safetyCheck.category,
            severity: safetyCheck.severity,
            messageShown: safetyCheck.reason,
            contextUrl: `/feed?post=${postId}`,
            keywordId: safetyCheck.keywordId,
            domainId: safetyCheck.domainId,
          });
        } catch (error) {
          console.error("Error logging blocked attempt:", error);
        }
        
        showToast(
          safetyCheck.reason || "Your share comment violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate.",
          "error"
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Create share record
      const { error: shareError } = await supabase
        .from("reposts")
        .insert({
          user_id: user.id,
          original_post_id: postId,
        });

      if (shareError) throw shareError;

      // Get original post to create share
      const { data: originalPost } = await supabase
        .from("posts")
        .select("content, image_url, profile_id, hashtags, mentions")
        .eq("id", postId)
        .single();

      if (originalPost) {
        // Create a new post that is a share with optional comment
        // If there's a comment, use it as content, otherwise use original content
        const shareContent = shareComment.trim() 
          ? shareComment.trim()
          : originalPost.content || "";

        // Extract hashtags from share comment and merge with original post hashtags
        const { extractHashtags } = await import("@/lib/utils/hashtags");
        const shareCommentHashtags = shareComment.trim() ? extractHashtags(shareComment.trim()) : [];
        const originalHashtags = originalPost.hashtags || [];
        
        // Merge hashtags, removing duplicates (case-insensitive)
        const allHashtags = [...originalHashtags, ...shareCommentHashtags];
        const uniqueHashtags = Array.from(
          new Set(allHashtags.map(h => h.toLowerCase()))
        ).map(h => h.startsWith('#') ? h : `#${h}`);

        const { error: postError } = await supabase
          .from("posts")
          .insert({
            profile_id: user.id,
            content: shareContent,
            image_url: originalPost.image_url,
            hashtags: uniqueHashtags.length > 0 ? uniqueHashtags : null,
            mentions: originalPost.mentions,
            is_repost: true,
            original_post_id: postId,
            share_comment: shareComment.trim() || null,
          });

        if (postError) throw postError;
      }

      setShareComment("");
      onClose();
      onShareComplete?.();
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Failed to share post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share Post</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user?.fullName || "You"}
              </p>
              {originalPostAuthor && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sharing from {originalPostAuthor}
                </p>
              )}
            </div>
          </div>

          {/* Share Comment Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add a comment (optional)
            </label>
            <textarea
              value={shareComment}
              onChange={(e) => setShareComment(e.target.value)}
              placeholder="Say something about this post..."
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {shareComment.length}/500
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
            {shareComment.trim() ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {shareComment}
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                Your share will appear without a comment
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

