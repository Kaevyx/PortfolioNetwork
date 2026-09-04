"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface BookmarkButtonProps {
  postId: string;
  initialBookmarked?: boolean;
}

export function BookmarkButton({ postId, initialBookmarked = false }: BookmarkButtonProps) {
  const { user, isLoaded } = useUser();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleToggle = async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) throw error;
        setIsBookmarked(false);
      } else {
        // Add bookmark
        const { error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: user.id,
            post_id: postId,
          });

        if (error) throw error;
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !user) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-1.5 rounded-lg transition-all ${
        isBookmarked
          ? "text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
      title={isBookmarked ? "Remove bookmark" : "Bookmark"}
    >
      {isBookmarked ? (
        <BookmarkCheck className="w-4 h-4 fill-current" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
    </button>
  );
}

