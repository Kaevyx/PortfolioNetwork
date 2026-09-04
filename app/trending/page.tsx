import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { PostsFeed } from "@/components/PostsFeed";
import { TrendingUp, Flame } from "lucide-react";

export default async function TrendingPage() {
  const { userId } = await auth();
  const supabase = await createClient();

  // Get trending posts (most liked in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  if (!recentPosts || recentPosts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No trending posts yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for trending content!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get likes count for each post
  const postsWithLikes = await Promise.all(
    recentPosts.map(async (post: any) => {
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);

      return {
        id: post.id,
        likesCount: count || 0,
      };
    })
  );

  // Sort by likes count and get top 20
  const sortedPosts = postsWithLikes
    .sort((a, b) => b.likesCount - a.likesCount)
    .slice(0, 20)
    .map((p) => p.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Trending</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Most popular posts in the last 7 days
              </p>
            </div>
          </div>
        </div>

        {sortedPosts.length > 0 ? (
          <PostsFeed profileId={undefined} showCreatePost={false} trendingPostIds={sortedPosts} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No trending posts yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for trending content!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

