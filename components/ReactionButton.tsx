"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { ThumbsUp, Heart, Laugh, AlertCircle, Frown, Angry } from "lucide-react";
import { hasFeatureAccess } from "@/lib/utils/subscriptionFeatures";

interface ReactionButtonProps {
  postId: string;
  initialReaction?: string | null;
  initialCount?: number;
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', icon: ThumbsUp, color: 'text-blue-600 dark:text-blue-400' },
  { type: 'love', emoji: '❤️', label: 'Love', icon: Heart, color: 'text-red-600 dark:text-red-400' },
  { type: 'laugh', emoji: '😂', label: 'Haha', icon: Laugh, color: 'text-yellow-600 dark:text-yellow-400' },
  { type: 'wow', emoji: '😮', label: 'Wow', icon: AlertCircle, color: 'text-purple-600 dark:text-purple-400' },
  { type: 'sad', emoji: '😢', label: 'Sad', icon: Frown, color: 'text-gray-600 dark:text-gray-400' },
  { type: 'angry', emoji: '😠', label: 'Angry', icon: Angry, color: 'text-orange-600 dark:text-orange-400' },
];

export function ReactionButton({ postId, initialReaction = null, initialCount = 0 }: ReactionButtonProps) {
  const { user, isLoaded } = useUser();
  const [currentReaction, setCurrentReaction] = useState<string | null>(initialReaction);
  const [reactionsCount, setReactionsCount] = useState(initialCount);
  const [showPicker, setShowPicker] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [hasRichReactions, setHasRichReactions] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { isSuspended } = useSuspensionCheck();

  // Load user plan and check rich reactions access
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
          setHasRichReactions(hasFeatureAccess(plan, "richReactions"));
          setPlanLoaded(true);
        }
      } catch (error) {
        console.error("Error loading user plan:", error);
        setPlanLoaded(true); // Set to true even on error to show correct tooltip
      }
    };

    loadUserPlan();
  }, [isLoaded, user?.id, supabase]);

  // Load current reaction on mount
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadReaction = async () => {
      try {
        const { data } = await supabase
          .from("post_reactions")
          .select("reaction_type")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single();

        if (data) {
          setCurrentReaction(data.reaction_type);
        }
      } catch (error) {
        // No reaction found
        setCurrentReaction(null);
      }
    };

    loadReaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, postId]);

  // Load total reactions count
  useEffect(() => {
    if (initialCount !== undefined) {
      setReactionsCount(initialCount);
    } else {
      const loadCount = async () => {
        try {
          const { count } = await supabase
            .from("post_reactions")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId);

          setReactionsCount(count || 0);
        } catch (error) {
          // Fallback to post_likes if post_reactions doesn't exist
          try {
            const { count } = await supabase
              .from("post_likes")
              .select("*", { count: "exact", head: true })
              .eq("post_id", postId);
            setReactionsCount(count || 0);
          } catch (e) {
            console.error("Error loading reactions count:", e);
          }
        }
      };

      loadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, initialCount]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
        setIsLongPress(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  const handleReaction = async (reactionType: string) => {
    if (!user?.id) return;
    if (isSuspended) {
      alert("Your account is suspended. You cannot react to posts.");
      return;
    }

    // Free plan users can only use "like" reaction
    if (!hasRichReactions && reactionType !== "like") {
      alert("Rich reactions (Love, Haha, Wow, Sad, Angry) are available for Pro and Ultimate plans. Upgrade to unlock all reaction types!");
      return;
    }

    setShowPicker(false);
    setIsLongPress(false);

    try {
      if (currentReaction === reactionType) {
        // Remove reaction if clicking the same one
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
        setCurrentReaction(null);
        // Reload count to ensure accuracy
        const { count } = await supabase
          .from("post_reactions")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId);
        setReactionsCount(count || 0);
      } else {
        // Upsert reaction (insert or update)
        const { error } = await supabase
          .from("post_reactions")
          .upsert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          }, {
            onConflict: 'post_id,user_id'
          });

        if (error) throw error;
        
        const oldReaction = currentReaction;
        setCurrentReaction(reactionType);
        
        // Update count: if had a reaction before, count stays same; if new, increment
        if (!oldReaction) {
          setReactionsCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleMouseDown = () => {
    // Only show picker for Pro/Ultimate users
    if (!hasRichReactions) {
      // Free users can only like, so just toggle like on click
      return;
    }
    setIsLongPress(false);
    const timer = setTimeout(() => {
      setShowPicker(true);
      setIsLongPress(true);
    }, 500); // Show picker after 500ms hold
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if it was a long press (picker is showing)
    if (showPicker || isLongPress) {
      e.preventDefault();
      return;
    }
    // Quick click - toggle like
    handleReaction('like');
  };

  const currentReactionData = REACTIONS.find(r => r.type === currentReaction) || REACTIONS[0];
  const ThumbsUpIcon = ThumbsUp;

  if (!isLoaded || !user) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 dark:text-gray-500"
      >
        <ThumbsUpIcon className="w-4 h-4" />
        <span className="font-medium">{reactionsCount || 0}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={isSuspended}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs ${
          currentReaction === 'like'
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : currentReaction
            ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
            : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        title={planLoaded ? (hasRichReactions ? "Click to like, hold for more reactions" : "Click to like") : ""}
      >
        {currentReaction ? (
          <span className="text-base">{REACTIONS.find(r => r.type === currentReaction)?.emoji || '👍'}</span>
        ) : (
          <ThumbsUpIcon className="w-4 h-4" />
        )}
        <span className="font-medium">{reactionsCount || 0}</span>
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 z-50 animate-fade-in"
        >
          {REACTIONS.map((reaction) => {
            const Icon = reaction.icon;
            const isActive = currentReaction === reaction.type;
            return (
              <button
                key={reaction.type}
                onClick={() => handleReaction(reaction.type)}
                className={`p-2 rounded-full transition-all hover:scale-125 ${
                  isActive
                    ? "bg-indigo-100 dark:bg-indigo-900/30 scale-110"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={reaction.label}
              >
                <span className="text-2xl">{reaction.emoji}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

