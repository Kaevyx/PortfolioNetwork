"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

interface SuspensionStatus {
  isSuspended: boolean;
  reason: string | null;
  endsAt: string | null;
  loading: boolean;
}

export function useSuspensionCheck(): SuspensionStatus {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<SuspensionStatus>({
    isSuspended: false,
    reason: null,
    endsAt: null,
    loading: true,
  });
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setStatus({ isSuspended: false, reason: null, endsAt: null, loading: false });
      return;
    }

    const checkSuspension = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_suspended, suspension_reason, suspension_ends_at")
          .eq("clerk_id", user.id)
          .single();

        if (error) throw error;

        const isSuspended = data?.is_suspended || false;
        let endsAt = data?.suspension_ends_at;

        // Check if suspension has expired
        if (isSuspended && endsAt) {
          const endDate = new Date(endsAt);
          if (endDate < new Date()) {
            // Suspension expired
            setStatus({ isSuspended: false, reason: null, endsAt: null, loading: false });
            return;
          }
        }

        setStatus({
          isSuspended,
          reason: data?.suspension_reason || null,
          endsAt: endsAt || null,
          loading: false,
        });
      } catch (error) {
        console.error("Error checking suspension:", error);
        setStatus({ isSuspended: false, reason: null, endsAt: null, loading: false });
      }
    };

    checkSuspension();
  }, [user?.id, isLoaded, supabase]);

  return status;
}





