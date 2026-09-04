"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

interface DeleteReviewButtonProps {
  reviewId: string;
  reviewerId: string;
  onDeleted: () => void;
}

export function DeleteReviewButton({ reviewId, reviewerId, onDeleted }: DeleteReviewButtonProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Only show delete button if current user is the reviewer
  if (!user || user.id !== reviewerId) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("reviewer_id", user.id); // Double check ownership

      if (error) throw error;

      onDeleted();
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Failed to delete review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
      title="Delete review"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}






