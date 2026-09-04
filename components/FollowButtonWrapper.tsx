"use client";

import { FollowButton } from "./FollowButton";

interface FollowButtonWrapperProps {
  followerId: string;
  followingId: string;
  isFollowing: boolean;
  compact?: boolean;
  showConnectionStatus?: boolean;
}

export function FollowButtonWrapper({ followerId, followingId, isFollowing, compact = false, showConnectionStatus = false }: FollowButtonWrapperProps) {
  return (
    <div onMouseDown={(e) => e.stopPropagation()}>
      <FollowButton
        followerId={followerId}
        followingId={followingId}
        isFollowing={isFollowing}
        compact={compact}
        showConnectionStatus={showConnectionStatus}
      />
    </div>
  );
}

