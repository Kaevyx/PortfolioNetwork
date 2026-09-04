"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Eye } from "lucide-react";

interface ProfileViewCounterProps {
  profileUserId: string;
  className?: string;
}

export function ProfileViewCounter({ profileUserId, className = "" }: ProfileViewCounterProps) {
  const { user } = useUser();
  const [viewCount, setViewCount] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Only show for profile owner
  useEffect(() => {
    if (!user?.id || user.id !== profileUserId) {
      return;
    }

    const loadViewCount = async () => {
      try {
        const response = await fetch(`/api/profile-views?profileId=${profileUserId}`);
        if (response.ok) {
          const data = await response.json();
          setViewCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error loading view count:", error);
      }
    };

    // Load immediately
    loadViewCount();

    // Update every 10 seconds
    intervalRef.current = setInterval(() => {
      loadViewCount();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.id, profileUserId]);

  // Don't show if not profile owner
  if (!user?.id || user.id !== profileUserId) {
    return null;
  }

  // Don't show loading state or if count is 0
  if (viewCount === null || viewCount === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg ${className}`}
    >
      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
        {viewCount} {viewCount === 1 ? "person" : "people"} {viewCount === 1 ? "is" : "are"} viewing your profile
      </span>
    </div>
  );
}

