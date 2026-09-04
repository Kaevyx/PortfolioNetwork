import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Search, Users, CheckCircle2, Briefcase, User, Star } from "lucide-react";
import { FollowButtonWrapper } from "@/components/FollowButtonWrapper";
import { AvatarImage } from "@/components/AvatarImage";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { userId: currentUserId } = await auth();
  const supabase = await createClient();

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, clerk_id")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    notFound();
  }

  // Get followers with more profile data
  const { data: followers } = await supabase
    .from("follows")
    .select("*, profiles!follows_follower_id_fkey(display_name, clerk_id, username, bio, avatar_url, is_verified, profile_type, location)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  // Get additional stats for each follower
  const followersWithStats = await Promise.all(
    (followers || []).map(async (follow: any) => {
      const followerId = follow.follower_id;
      
      // Get followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", followerId);

      // Get posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", followerId);

      // Get average rating
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewee_id", followerId);

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
        : 0;

      return {
        ...follow,
        stats: {
          followersCount: followersCount || 0,
          postsCount: postsCount || 0,
          avgRating,
        },
      };
    })
  );

  // Check which followers the current user is following (for unfollow buttons)
  let followingMap = new Map<string, boolean>();
  let connectionsMap = new Map<string, boolean>();
  if (currentUserId) {
    const { data: currentUserFollowing } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);
    
    const { data: followingMe } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", currentUserId);
    
    const followingIds = new Set(currentUserFollowing?.map((f: any) => f.following_id) || []);
    const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
    
    followers?.forEach((f: any) => {
      followingMap.set(f.follower_id, followingIds.has(f.follower_id));
      // Check if connected (mutual follow)
      connectionsMap.set(f.follower_id, followingIds.has(f.follower_id) && followingMeIds.has(f.follower_id));
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href={getProfileUrl({ username: profile.username, clerk_id: userId })}
          className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.display_name}'s Followers
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {followers?.length || 0} {followers?.length === 1 ? 'follower' : 'followers'}
                </p>
              </div>
            </div>
          </div>

          {followersWithStats && followersWithStats.length > 0 ? (
            <div className="space-y-3">
              {followersWithStats.map((follow: any) => {
                const followerProfile = follow.profiles;
                if (!followerProfile) return null;
                const isCurrentUserFollowing = currentUserId ? followingMap.get(follow.follower_id) : false;
                const isConnected = currentUserId ? connectionsMap.get(follow.follower_id) : false;
                const isCurrentUser = currentUserId === follow.follower_id;

                return (
                  <div
                    key={follow.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md"
                  >
                    <Link
                      href={getProfileUrl({ username: followerProfile.username, clerk_id: followerProfile.clerk_id })}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="relative flex-shrink-0">
                        <AvatarImage
                          src={followerProfile.avatar_url}
                          alt={followerProfile.display_name}
                          fallbackText={followerProfile.display_name?.charAt(0).toUpperCase() || "U"}
                          className="shadow-md"
                          size="lg"
                          userId={followerProfile.clerk_id}
                        />
                        {isConnected && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                            <UserPlus className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                            {followerProfile.display_name}
                          </h3>
                          {followerProfile.is_verified && (
                            <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          )}
                          {followerProfile.profile_type === "business" && (
                            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          )}
                          {isConnected && (
                            <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">
                              Connected
                            </span>
                          )}
                        </div>
                        {followerProfile.bio && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                            {followerProfile.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{follow.stats.followersCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{follow.stats.postsCount} posts</span>
                          </div>
                          {follow.stats.avgRating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span>{follow.stats.avgRating.toFixed(1)}</span>
                            </div>
                          )}
                          {followerProfile.location && (
                            <span className="truncate">{followerProfile.location}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                    {currentUserId && !isCurrentUser && (
                      <FollowButtonWrapper
                        followerId={currentUserId}
                        followingId={follow.follower_id}
                        isFollowing={isCurrentUserFollowing || false}
                        compact={false}
                        showConnectionStatus={true}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No followers yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                When people follow {profile.display_name}, they'll appear here.
              </p>
              {currentUserId === userId && (
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Discover People
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

