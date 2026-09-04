"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Sparkles, Users, TrendingUp, Star, Crown } from "lucide-react";
import { AvatarImage } from "./AvatarImage";
import { FollowButton } from "./FollowButton";
import { OnlineStatus } from "./OnlineStatus";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface SimilarSkillsUser {
  clerk_id: string;
  username?: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  common_skills: string[];
  common_skills_count: number;
  total_skills_count: number;
  is_verified: boolean;
  subscription_plan: string;
  featured_priority: number;
}

interface UserFollowStatus {
  isFollowing: boolean;
  isConnected: boolean; // Mutual connection
}

export function PeopleWithSimilarSkills({ limit = 6 }: { limit?: number }) {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [similarUsers, setSimilarUsers] = useState<SimilarSkillsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [followStatuses, setFollowStatuses] = useState<Record<string, UserFollowStatus>>({});

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false);
      return;
    }

    const loadSimilarUsers = async () => {
      setLoading(true);
      try {
        // First, get user's skills to display
        const { data: profile } = await supabase
          .from("profiles")
          .select("skills")
          .eq("clerk_id", user.id)
          .single();

        if (profile?.skills && Array.isArray(profile.skills)) {
          setUserSkills(profile.skills);
        }

        // Get users with similar skills
        const { data, error } = await supabase.rpc("get_users_with_similar_skills", {
          p_user_id: user.id,
          p_limit: limit,
          p_min_common_skills: 1,
        });

        if (error) {
          // Log detailed error information
          console.error("Error loading similar skills users:", error);
          console.error("Error type:", typeof error);
          console.error("Error keys:", Object.keys(error || {}));
          console.error("Error stringified:", JSON.stringify(error, null, 2));
          
          const errorCode = (error as any)?.code;
          const errorMessage = (error as any)?.message || String(error);
          
          // Check if function doesn't exist
          if (errorCode === 'PGRST202' || errorCode === '42883' || 
              (errorMessage && errorMessage.toLowerCase().includes('function') && 
               errorMessage.toLowerCase().includes('does not exist'))) {
            console.warn("Skills features not yet configured. Please run the database migration: supabase/skills-features-system.sql");
          }
          setSimilarUsers([]);
          return;
        }

        const users = data || [];
        setSimilarUsers(users);

        // Fetch follow statuses for all users
        if (users.length > 0 && user.id) {
          const userIds = users.map((u) => u.clerk_id);
          
          // Get all follows where current user is the follower
          const { data: followingData } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id)
            .in("following_id", userIds);

          // Get all follows where current user is being followed (for mutual connections)
          const { data: followersData } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", user.id)
            .in("follower_id", userIds);

          const followingIds = new Set(followingData?.map((f: any) => f.following_id) || []);
          const followerIds = new Set(followersData?.map((f: any) => f.follower_id) || []);

          // Build follow status map
          const statusMap: Record<string, UserFollowStatus> = {};
          userIds.forEach((userId) => {
            const isFollowing = followingIds.has(userId);
            const isFollowingMe = followerIds.has(userId);
            statusMap[userId] = {
              isFollowing,
              isConnected: isFollowing && isFollowingMe, // Mutual connection
            };
          });

          setFollowStatuses(statusMap);
        }
      } catch (error) {
        console.error("Error loading similar skills users:", error);
        setSimilarUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadSimilarUsers();
  }, [user, isLoaded, limit, supabase]);

  if (!isLoaded || loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (similarUsers.length === 0) {
    if (userSkills.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">People with Similar Skills</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">Add skills to your profile to discover connections</p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Add skills to your profile →
          </Link>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-lg p-6 border-2 border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">People with Similar Skills</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {userSkills.length > 0 && `${userSkills.length} skill${userSkills.length !== 1 ? 's' : ''} in common`}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {similarUsers.map((person) => (
          <div
            key={person.clerk_id}
            className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all card-hover"
          >
            <Link href={getProfileUrl({ username: person.username, clerk_id: person.clerk_id })} className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <AvatarImage
                  src={person.avatar_url}
                  alt={person.display_name}
                  fallbackText={person.display_name?.charAt(0).toUpperCase() || "U"}
                  className="border-2 border-indigo-500 shadow-lg"
                  size="lg"
                  userId={person.clerk_id}
                />
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatus userId={person.clerk_id} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {person.display_name}
                  </h3>
                  {person.is_verified && (
                    <Star className="w-4 h-4 text-blue-500 fill-current flex-shrink-0" />
                  )}
                  {person.subscription_plan === "ultimate" && (
                    <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  )}
                  {person.subscription_plan === "pro" && (
                    <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                {person.bio && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                    {person.bio}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                    <Users className="w-3 h-3" />
                    <span className="font-semibold">{person.common_skills_count}</span>
                    <span>common skill{person.common_skills_count !== 1 ? 's' : ''}</span>
                  </div>
                  {person.common_skills.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {person.common_skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {person.common_skills.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{person.common_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
            <div onMouseDown={(e) => e.stopPropagation()}>
              <FollowButton
                followerId={user?.id || ""}
                followingId={person.clerk_id}
                isFollowing={followStatuses[person.clerk_id]?.isFollowing || false}
                compact={true}
                showConnectionStatus={true}
              />
              {followStatuses[person.clerk_id]?.isConnected && (
                <div className="mt-1 text-xs text-center text-gray-500 dark:text-gray-400">
                  Connected
                </div>
              )}
              {followStatuses[person.clerk_id]?.isFollowing && !followStatuses[person.clerk_id]?.isConnected && (
                <div className="mt-1 text-xs text-center text-gray-500 dark:text-gray-400">
                  Following
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {similarUsers.length >= limit && (
        <div className="mt-4 text-center">
          <Link
            href="/explore?filter=skills"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            View more people with similar skills →
          </Link>
        </div>
      )}
    </div>
  );
}

