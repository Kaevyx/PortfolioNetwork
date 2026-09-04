"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Eye, CheckCircle2, AlertCircle } from "lucide-react";

interface PortfolioSeenButtonProps {
  portfolioOwnerId: string;
  onSeenUpdate?: (count: number) => void;
}

export function PortfolioSeenButton({ portfolioOwnerId, onSeenUpdate }: PortfolioSeenButtonProps) {
  const { user, isLoaded } = useUser();
  const [isSeen, setIsSeen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id || !portfolioOwnerId) return;

    const checkSeenStatus = async () => {
      // Check if user has already marked this portfolio as seen
      const { data: existingView } = await supabase
        .from("portfolio_views")
        .select("marked_seen")
        .eq("portfolio_owner_id", portfolioOwnerId)
        .eq("viewer_id", user.id)
        .single();

      if (existingView) {
        setIsSeen(existingView.marked_seen || false);
      }

      // Get total seen count
      const { count } = await supabase
        .from("portfolio_views")
        .select("*", { count: "exact", head: true })
        .eq("portfolio_owner_id", portfolioOwnerId)
        .eq("marked_seen", true);

      setSeenCount(count || 0);
    };

    checkSeenStatus();
  }, [isLoaded, user?.id, portfolioOwnerId, supabase]);

  const handleMarkSeen = async () => {
    if (!user?.id || loading || isSeen) {
      // If already seen, show warning
      if (isSeen) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
      return;
    }

    setLoading(true);
    try {
      // First, ensure a view record exists
      const { data: existingView } = await supabase
        .from("portfolio_views")
        .select("id, marked_seen")
        .eq("portfolio_owner_id", portfolioOwnerId)
        .eq("viewer_id", user.id)
        .single();

      if (existingView) {
        // Only update if not already seen (prevent unseeing)
        if (!existingView.marked_seen) {
          const { error } = await supabase
            .from("portfolio_views")
            .update({
              marked_seen: true,
              seen_at: new Date().toISOString(),
            })
            .eq("id", existingView.id);

          if (!error) {
            setIsSeen(true);
            setSeenCount((prev) => prev + 1);
            onSeenUpdate?.(seenCount + 1);
          }
        }
      } else {
        // Create new view with seen marked
        const { error } = await supabase
          .from("portfolio_views")
          .insert({
            portfolio_owner_id: portfolioOwnerId,
            viewer_id: user.id,
            marked_seen: true,
            seen_at: new Date().toISOString(),
          });

        if (!error) {
          setIsSeen(true);
          setSeenCount((prev) => prev + 1);
          onSeenUpdate?.(seenCount + 1);
        }
      }
    } catch (error) {
      console.error("Error marking portfolio as seen:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !user?.id || user.id === portfolioOwnerId) {
    return null; // Don't show for own portfolio or if not logged in
  }

  return (
    <div className="relative">
      {showWarning && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>You've already marked this portfolio as seen</span>
          </div>
        </div>
      )}
      <button
        onClick={handleMarkSeen}
        disabled={loading || isSeen}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isSeen
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed opacity-75"
            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        title={isSeen ? "Already marked as seen" : "Mark portfolio as seen"}
      >
        {isSeen ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Seen</span>
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            <span>Mark as Seen</span>
          </>
        )}
        {seenCount > 0 && (
          <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {seenCount}
          </span>
        )}
      </button>
    </div>
  );
}

