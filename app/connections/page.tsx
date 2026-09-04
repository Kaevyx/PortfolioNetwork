import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { UserPlus, CheckCircle2, Users, Sparkles, BarChart3 } from "lucide-react";
import { ConnectionsLeaderboard } from "@/components/ConnectionsLeaderboard";
import { AvatarImage } from "@/components/AvatarImage";
import { OnlineStatus } from "@/components/OnlineStatus";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import { SuspendedConnectionsRedirect } from "./suspended-check";

export default async function ConnectionsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get connections (mutual follows)
  const { data: followingMe } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);

  const { data: iAmFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
  const iAmFollowingIds = new Set(iAmFollowing?.map((f: any) => f.following_id) || []);
  
  // Connections = mutual follows
  const connectionIds = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id));
  const connectionsCount = connectionIds.length;

  // Get all connections with profile data (only approved)
  let connections: any[] = [];
  if (connectionIds.length > 0) {
    const { data: connectionProfiles } = await supabase
      .from("profiles")
      .select("display_name, clerk_id, bio, profile_type, is_verified, avatar_url")
      .eq("profile_status", "approved") // Only show approved profiles
      .in("clerk_id", connectionIds);
    
    connections = connectionProfiles?.map((p: any) => ({
      user1_id: userId,
      user2_id: p.clerk_id,
      user2: p,
    })) || [];
  }

  // Get pending connections (people who follow you but you don't follow back)
  const { data: pendingConnections } = await supabase
    .from("follows")
    .select(`
      *,
      profiles!follows_follower_id_fkey(display_name, clerk_id, bio, profile_type, is_verified, avatar_url)
    `)
    .eq("following_id", userId);

  const { data: followingList } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = new Set(followingList?.map((f: any) => f.following_id) || []);
  const pending = pendingConnections?.filter((f: any) => !followingIds.has(f.follower_id)) || [];

  // Calculate network growth (current month vs previous month)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get connections made in current month
  const { data: currentMonthFollowingMe } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .gte("created_at", currentMonthStart.toISOString());

  const { data: currentMonthIAmFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .gte("created_at", currentMonthStart.toISOString());

  const currentMonthFollowingMeIds = new Set(currentMonthFollowingMe?.map((f: any) => f.follower_id) || []);
  const currentMonthIAmFollowingIds = new Set(currentMonthIAmFollowing?.map((f: any) => f.following_id) || []);
  const currentMonthConnections = Array.from(currentMonthFollowingMeIds).filter((id: string) => currentMonthIAmFollowingIds.has(id)).length;

  // Get connections made in previous month
  const { data: previousMonthFollowingMe } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .gte("created_at", previousMonthStart.toISOString())
    .lt("created_at", previousMonthEnd.toISOString());

  const { data: previousMonthIAmFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .gte("created_at", previousMonthStart.toISOString())
    .lt("created_at", previousMonthEnd.toISOString());

  const previousMonthFollowingMeIds = new Set(previousMonthFollowingMe?.map((f: any) => f.follower_id) || []);
  const previousMonthIAmFollowingIds = new Set(previousMonthIAmFollowing?.map((f: any) => f.following_id) || []);
  const previousMonthConnections = Array.from(previousMonthFollowingMeIds).filter((id: string) => previousMonthIAmFollowingIds.has(id)).length;

  // Calculate growth percentage
  let growthPercentage = 0;
  if (previousMonthConnections > 0) {
    growthPercentage = Math.round(((currentMonthConnections - previousMonthConnections) / previousMonthConnections) * 100);
  } else if (currentMonthConnections > 0) {
    growthPercentage = 100; // 100% growth if no previous connections
  }

  return (
    <>
      <SuspendedConnectionsRedirect />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">My Connections</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Build your professional network through mutual connections
              </p>
            </div>
          </div>
        </div>

        {/* Connection Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-100 mb-1">Total Connections</p>
                <p className="text-4xl font-bold">{connectionsCount || 0}</p>
                <p className="text-xs text-indigo-100 mt-1">Mutual follows</p>
              </div>
              <Users className="w-12 h-12 text-white/30" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{pending.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Follow you back</p>
              </div>
              <UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Network Growth</p>
                <p className={`text-4xl font-bold ${
                  growthPercentage > 0 
                    ? "text-green-600 dark:text-green-400" 
                    : growthPercentage < 0 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-gray-600 dark:text-gray-400"
                }`}>
                  {growthPercentage > 0 ? "+" : ""}{growthPercentage}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {currentMonthConnections} new {currentMonthConnections === 1 ? "connection" : "connections"} this month
                  {previousMonthConnections > 0 && (
                    <span className="block mt-0.5">
                      vs {previousMonthConnections} last month
                    </span>
                  )}
                </p>
              </div>
              <Sparkles className={`w-12 h-12 ${
                growthPercentage > 0 
                  ? "text-green-400" 
                  : growthPercentage < 0 
                  ? "text-red-400" 
                  : "text-yellow-400"
              }`} />
            </div>
          </div>
        </div>

        {/* Connections Leaderboard */}
        {connectionsCount > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Connections Leaderboard
            </h2>
            <ConnectionsLeaderboard />
          </div>
        )}

        {/* Pending Connections */}
        {pending.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg shadow-sm p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Complete Your Connections
              </h2>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              {pending.length} {pending.length === 1 ? "person" : "people"} {pending.length === 1 ? "follows" : "follow"} you. Follow them back to create a connection!
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pending.slice(0, 6).map((follow: any) => (
                  <Link
                    key={follow.id}
                    href={follow.profiles ? getProfileUrl({ username: follow.profiles.username, clerk_id: follow.follower_id }) : `/profile/${follow.follower_id}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600 transition-colors"
                  >
                  <div className="relative flex-shrink-0">
                    <AvatarImage
                      src={follow.profiles?.avatar_url}
                      alt={follow.profiles?.display_name || "User"}
                      fallbackText={follow.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
                      className="border-2 border-indigo-500"
                      size="md"
                      userId={follow.follower_id}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineStatus userId={follow.follower_id} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {follow.profiles?.display_name}
                      </p>
                      {follow.profiles?.is_verified && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {follow.profiles?.bio || "Follows you"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {pending.length > 6 && (
              <Link
                href="/explore"
                className="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-4 font-semibold"
              >
                View all {pending.length} pending connections →
              </Link>
            )}
          </div>
        )}

        {/* All Connections */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Connections</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {connections?.length || 0} {connections?.length === 1 ? "connection" : "connections"}
            </span>
          </div>

          {connections && connections.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((conn: any) => {
                const otherUser = conn.user1_id === userId ? conn.user2 : conn.user1;
                return (
                  <Link
                    key={conn.user1_id + conn.user2_id}
                    href={otherUser ? getProfileUrl({ username: otherUser.username, clerk_id: otherUser.clerk_id }) : `/profile/${otherUser?.clerk_id}`}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all card-hover"
                  >
                    <div className="relative flex-shrink-0">
                      <AvatarImage
                        src={otherUser?.avatar_url}
                        alt={otherUser?.display_name || "User"}
                        fallbackText={otherUser?.display_name?.charAt(0).toUpperCase() || "U"}
                        className="border-2 border-indigo-500"
                        size="md"
                        userId={otherUser?.clerk_id}
                      />
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <OnlineStatus userId={otherUser?.clerk_id} size="sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {otherUser?.display_name}
                        </p>
                        {otherUser?.is_verified && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {otherUser?.bio || otherUser?.profile_type || "Professional"}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                        Connected
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No connections yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Start building your network! Follow people and they follow you back to create connections.
              </p>
              <Link
                href="/explore"
                className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
              >
                Explore Network
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

