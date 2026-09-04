"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, UserMinus, CheckCircle2 } from "lucide-react";
import { ConnectionAnimation } from "./ConnectionAnimation";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";

interface FollowButtonProps {
  followerId: string;
  followingId: string;
  isFollowing: boolean;
  compact?: boolean;
  showConnectionStatus?: boolean;
}

export function FollowButton({ followerId, followingId, isFollowing: initialIsFollowing, compact = false, showConnectionStatus = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConnectionAnimation, setShowConnectionAnimation] = useState(false);
  const [connectionUserName, setConnectionUserName] = useState("");
  const supabase = createClient();
  const { isSuspended } = useSuspensionCheck();

  const handleFollow = async () => {
    if (isSuspended) {
      alert("Your account is suspended. You cannot follow or unfollow users.");
      return;
    }
    
    // Check connection limit for free plan users
    if (!isFollowing) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("clerk_id", followerId)
          .single();

        const userPlan = profile?.subscription_plan || "free";
        const { getFeatureLimit, canPerformAction } = await import("@/lib/utils/subscriptionFeatures");
        const maxConnections = getFeatureLimit(userPlan, "maxConnections");
        
        if (maxConnections !== -1) {
          // Count current connections (following)
          const { count: connectionsCount } = await supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", followerId);
          
          if (connectionsCount !== null && connectionsCount >= maxConnections) {
            alert(`You've reached your connection limit (${maxConnections} connections). Upgrade to Pro for unlimited connections.`);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking connection limit:", error);
        // Continue anyway to avoid blocking users
      }
    }
    
    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", followerId)
          .eq("following_id", followingId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: followerId,
            following_id: followingId,
          });

        if (error) throw error;
        setIsFollowing(true);

        // Check if this creates a connection (mutual follow)
        const { data: otherUserFollowsMe } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", followingId)
          .eq("following_id", followerId)
          .single();

        if (otherUserFollowsMe) {
          // Get the other user's name for the animation
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("clerk_id", followingId)
            .single();

          setConnectionUserName(profile?.display_name || "this person");
          setShowConnectionAnimation(true);
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      alert("Failed to update follow status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check connection status (mutual follow) - updates when follow state changes
  useEffect(() => {
    if (!showConnectionStatus || !followerId || !followingId) return;

    const checkConnection = async () => {
      try {
        // Check if both users follow each other
        const { data: user1FollowsUser2 } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", followerId)
          .eq("following_id", followingId)
          .single();

        const { data: user2FollowsUser1 } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", followingId)
          .eq("following_id", followerId)
          .single();
        
        setIsConnected(!!user1FollowsUser2 && !!user2FollowsUser1);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFollowing, followerId, followingId, showConnectionStatus]);

  if (compact) {
    return (
      <button
        onClick={handleFollow}
        disabled={loading || isSuspended}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
          isFollowing
            ? isConnected && showConnectionStatus
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={
          isFollowing 
            ? isConnected && showConnectionStatus 
              ? "Unfollow (will disconnect)" 
              : "Unfollow"
            : "Follow back to connect"
        }
      >
        {isFollowing ? (
          <UserMinus className="w-3.5 h-3.5" />
        ) : (
          <UserPlus className="w-3.5 h-3.5" />
        )}
      </button>
    );
  }

  return (
    <>
      <ConnectionAnimation
        show={showConnectionAnimation}
        userName={connectionUserName}
        onComplete={() => setShowConnectionAnimation(false)}
      />
      <button
        onClick={handleFollow}
        disabled={loading || isSuspended}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
          isFollowing
            ? isConnected && showConnectionStatus
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={
          isFollowing 
            ? isConnected && showConnectionStatus 
              ? "Unfollow (will disconnect)" 
              : "Unfollow"
            : "Follow back to create a connection"
        }
      >
        {isFollowing ? (
          <>
            <UserMinus className="w-5 h-5" />
            {isConnected && showConnectionStatus ? "Unfollow" : "Unfollow"}
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            Follow
          </>
        )}
      </button>
    </>
  );
}

