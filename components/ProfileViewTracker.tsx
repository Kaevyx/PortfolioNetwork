"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

interface ProfileViewTrackerProps {
  profileUserId: string;
}

// Component to track when someone views a profile (invisible, just tracks)
export function ProfileViewTracker({ profileUserId }: ProfileViewTrackerProps) {
  const { user } = useUser();
  const hasTrackedRef = useRef(false);
  const lastTrackRef = useRef<number>(0);

  useEffect(() => {
    if (!user?.id || user.id === profileUserId || hasTrackedRef.current) {
      return;
    }

    const trackView = async () => {
      const now = Date.now();
      // Throttle: only track once every 10 seconds
      if (now - lastTrackRef.current < 10000) {
        return;
      }

      try {
        await fetch("/api/profile-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: profileUserId }),
        });
        lastTrackRef.current = now;
        hasTrackedRef.current = true;
      } catch (error) {
        console.error("Error tracking profile view:", error);
      }
    };

    // Track after a short delay to ensure page is loaded
    const timeoutId = setTimeout(() => {
      trackView();
    }, 1000);

    // Also track every 10 seconds while on page
    const intervalId = setInterval(() => {
      trackView();
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [user?.id, profileUserId]);

  return null; // This component is invisible
}

