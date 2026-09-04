"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface OnlineStatusProps {
  userId: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function OnlineStatus({ userId, showText = false, size = "md", className = "" }: OnlineStatusProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState<boolean>(true);
  const supabase = createClient();

  // Check if user has showOnlineStatus enabled
  useEffect(() => {
    if (!userId) return;

    const checkPrivacySettings = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("settings")
          .eq("clerk_id", userId)
          .single();

        // Default to true if settings don't exist
        const showOnlineStatus = data?.settings?.privacy?.showOnlineStatus !== false;
        setShowStatus(showOnlineStatus);
      } catch (error) {
        // Default to showing status if error
        setShowStatus(true);
      }
    };

    checkPrivacySettings();
  }, [userId]);

  useEffect(() => {
    if (!userId || !showStatus) return;

    const loadStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("online_status")
          .select("is_online, last_seen")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading online status:", error);
          return;
        }

        if (data) {
          setIsOnline(data.is_online);
          setLastSeen(data.last_seen ? new Date(data.last_seen) : null);
        } else {
          setIsOnline(false);
          setLastSeen(null);
        }
      } catch (error) {
        console.error("Error loading online status:", error);
      }
    };

    loadStatus();

    // Set up real-time subscription
    const channel = supabase
      .channel(`online-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_status",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setIsOnline((payload.new as any).is_online);
            setLastSeen((payload.new as any).last_seen ? new Date((payload.new as any).last_seen) : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!showStatus || isOnline === null) {
    return null; // Don't show if privacy setting disabled or loading
  }

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative flex-shrink-0">
        <div
          className={`${dotSize} rounded-full border-2 ${
            isOnline
              ? "bg-green-500 border-white dark:border-gray-800"
              : "bg-gray-400 border-white dark:border-gray-800"
          }`}
          title={isOnline ? "Online" : lastSeen ? `Last seen ${formatDistanceToNow(lastSeen, { addSuffix: true })}` : "Offline"}
        />
        {isOnline && (
          <div
            className={`absolute inset-0 ${dotSize} rounded-full bg-green-500 animate-ping opacity-75`}
            aria-hidden="true"
          />
        )}
      </div>
      {showText && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {isOnline ? "Online" : lastSeen ? `Last seen ${formatDistanceToNow(lastSeen, { addSuffix: true })}` : "Offline"}
        </span>
      )}
    </div>
  );
}

