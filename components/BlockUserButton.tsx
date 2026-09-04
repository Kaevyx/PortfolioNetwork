"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Ban, Unlock } from "lucide-react";

interface BlockUserButtonProps {
  targetUserId: string;
  targetUserName: string;
  onBlockChange?: () => void;
}

export function BlockUserButton({ targetUserId, targetUserName, onBlockChange }: BlockUserButtonProps) {
  const { user } = useUser();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Check if user is blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from("user_blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", targetUserId)
          .single();
        
        setIsBlocked(!!data);
      } catch (error) {
        // Not blocked
        setIsBlocked(false);
      }
    };
    
    checkBlockStatus();
  }, [user?.id, targetUserId, supabase]);

  const handleBlock = async () => {
    if (!user?.id) return;

    if (isBlocked) {
      // Unblock
      if (!confirm(`Are you sure you want to unblock ${targetUserName}?`)) {
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/user/block?blockedUserId=${targetUserId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to unblock user");
        }

        setIsBlocked(false);
        if (onBlockChange) onBlockChange();
      } catch (error: any) {
        console.error("Error unblocking user:", error);
        alert("Failed to unblock user: " + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Block
      const reason = prompt(`Enter reason for blocking ${targetUserName} (optional):`);
      
      if (!confirm(`Are you sure you want to block ${targetUserName}? They will not be able to see your profile or interact with you.`)) {
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/user/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockedUserId: targetUserId,
            reason: reason || null,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to block user");
        }

        setIsBlocked(true);
        if (onBlockChange) onBlockChange();
      } catch (error: any) {
        console.error("Error blocking user:", error);
        alert("Failed to block user: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <button
      onClick={handleBlock}
      disabled={loading}
      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-2 ${
        isBlocked
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
      } disabled:opacity-50`}
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : isBlocked ? (
        <>
          <Unlock className="w-4 h-4" />
          Unblock
        </>
      ) : (
        <>
          <Ban className="w-4 h-4" />
          Block
        </>
      )}
    </button>
  );
}

