"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Users, Sparkles, X } from "lucide-react";

export function ConnectionEncouragement() {
  const { user, isLoaded } = useUser();
  const [pendingCount, setPendingCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id || dismissed) return;

    const loadPending = async () => {
      try {
        // Get people who follow you
        const { data: followingMe } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);

        // Get who you're following
        const { data: iAmFollowing } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
        const iAmFollowingIds = new Set(iAmFollowing?.map((f: any) => f.following_id) || []);

        // Pending = people who follow you but you don't follow back
        const pending = Array.from(followingMeIds).filter((id: string) => !iAmFollowingIds.has(id));
        setPendingCount(pending.length);
      } catch (error) {
        console.error("Error loading pending connections:", error);
      }
    };

    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, dismissed]);

  if (!isLoaded || dismissed || pendingCount === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 rounded-lg shadow-lg p-4 mb-4 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">Complete Your Connections!</h3>
              <p className="text-xs text-indigo-100 mb-3">
                {pendingCount} {pendingCount === 1 ? "person" : "people"} {pendingCount === 1 ? "follows" : "follow"} you. Follow them back to create {pendingCount === 1 ? "a connection" : "connections"}!
              </p>
              <Link
                href="/connections"
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-xs font-semibold"
              >
                <Users className="w-4 h-4" />
                View Connections
              </Link>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

