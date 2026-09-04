"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Component that manages the current user's online status
 * Sets user as online when component mounts and updates last_seen periodically
 * Sets user as offline when component unmounts or user logs out
 */
export function OnlineStatusManager() {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const previousUserIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(true);

  // Handle logout - set user offline when user becomes null
  useEffect(() => {
    if (!isLoaded) return;

    // If user was logged in but is now null, they logged out
    if (previousUserIdRef.current && !user?.id) {
      const userIdToSetOffline = previousUserIdRef.current;
      
      // Set user as offline immediately
      (async () => {
        try {
          const { error } = await supabase.rpc("set_user_offline", {
            user_clerk_id: userIdToSetOffline,
          });
          if (error) {
            console.error("Error setting user offline on logout:", error);
          }
        } catch (error) {
          console.error("Error setting user offline on logout:", error);
        }
      })();

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      isActiveRef.current = false;
      previousUserIdRef.current = null;
    }

    // Update previous user ID
    if (user?.id) {
      previousUserIdRef.current = user.id;
    }
  }, [isLoaded, user?.id, supabase]);

  // Handle online status and heartbeat
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    isActiveRef.current = true;
    previousUserIdRef.current = user.id;

    const setOnline = async () => {
      try {
        // Set user as online
        const { error } = await supabase.rpc("set_user_online", {
          user_clerk_id: user.id,
        });

        if (error) {
          console.error("Error setting user online:", error);
        }
      } catch (error) {
        console.error("Error setting user online:", error);
      }
    };

    const updateHeartbeat = async () => {
      if (!isActiveRef.current || !user?.id) return;

      try {
        // Update last_seen (heartbeat)
        const { error } = await supabase.rpc("update_last_seen", {
          user_clerk_id: user.id,
        });

        if (error) {
          console.error("Error updating last seen:", error);
        }
      } catch (error) {
        console.error("Error updating last seen:", error);
      }
    };

    // Set online immediately
    setOnline();

    // Update heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(updateHeartbeat, 30000);

    // Cleanup: set offline when component unmounts
    return () => {
      isActiveRef.current = false;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Set user as offline if we still have a user ID
      if (user?.id) {
        (async () => {
          try {
            const { error } = await supabase.rpc("set_user_offline", {
              user_clerk_id: user.id,
            });
            if (error) {
              console.error("Error setting user offline:", error);
            }
          } catch (error) {
            console.error("Error setting user offline:", error);
          }
        })();
      }
    };
  }, [isLoaded, user?.id, supabase]);

  // This component doesn't render anything
  return null;
}

