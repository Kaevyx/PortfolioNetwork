"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { ThumbsUp, Heart, Laugh, AlertCircle, Frown, Angry } from "lucide-react";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";

interface CommentReactionButtonProps {
  commentId: string;
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

export function CommentReactionButton({ commentId, initialReaction = null, initialCount = 0 }: CommentReactionButtonProps) {
  const { user, isLoaded } = useUser();
  const [currentReaction, setCurrentReaction] = useState<string | null>(initialReaction);
  const [reactionsCount, setReactionsCount] = useState(initialCount);
  const [showPicker, setShowPicker] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { isSuspended } = useSuspensionCheck();

  // Load current reaction on mount
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadReaction = async () => {
      try {
        const { data } = await supabase
          .from("comment_reactions")
          .select("reaction_type")
          .eq("comment_id", commentId)
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
  }, [isLoaded, user?.id, commentId]);

  // Load total reactions count
  useEffect(() => {
    if (initialCount !== undefined) {
      setReactionsCount(initialCount);
    } else {
      const loadCount = async () => {
        try {
          const { count } = await supabase
            .from("comment_reactions")
            .select("*", { count: "exact", head: true })
            .eq("comment_id", commentId);

          setReactionsCount(count || 0);
        } catch (error) {
          console.error("Error loading comment reactions count:", error);
        }
      };

      loadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId, initialCount]);

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
      alert("Your account is suspended. You cannot react to comments.");
      return;
    }

    setShowPicker(false);

    try {
      if (currentReaction === reactionType) {
        // Remove reaction if clicking the same one
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (error) throw error;
        setCurrentReaction(null);
        // Reload count to ensure accuracy
        const { count } = await supabase
          .from("comment_reactions")
          .select("*", { count: "exact", head: true })
          .eq("comment_id", commentId);
        setReactionsCount(count || 0);
      } else {
        // Upsert reaction (insert or update)
        const { error } = await supabase
          .from("comment_reactions")
          .upsert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType,
          }, {
            onConflict: 'comment_id,user_id'
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
      console.error("Error toggling comment reaction:", error);
    }
  };

  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      setShowPicker(true);
    }, 500); // Show picker after 500ms hold
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleClick = () => {
    if (!showPicker) {
      // Quick click - toggle like
      handleReaction('like');
    }
  };

  const ThumbsUpIcon = ThumbsUp;

  if (!isLoaded || !user) {
    return (
      <button
        disabled
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 dark:text-gray-500"
      >
        <ThumbsUpIcon className="w-3 h-3" />
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
        className={`flex items-center gap-1 px-2 py-1 rounded transition-all text-xs ${
          currentReaction === 'like'
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : currentReaction
            ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
            : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        title="Click to like, hold for more reactions"
      >
        {currentReaction ? (
          <span className="text-sm">{REACTIONS.find(r => r.type === currentReaction)?.emoji || '👍'}</span>
        ) : (
          <ThumbsUpIcon className="w-3 h-3" />
        )}
        {reactionsCount > 0 && (
          <span className="font-medium text-xs">{reactionsCount}</span>
        )}
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


