import { createClient } from "@/lib/supabase/server";
import { PostsFeed } from "@/components/PostsFeed";
import { TrendingHashtags } from "@/components/TrendingTopics";
import { Hash, TrendingUp, Link as LinkIcon } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const supabase = await createClient();
  const { tag: tagParam } = await params;
  const tag = decodeURIComponent(tagParam).toLowerCase();
  
  // Normalize hashtag - ensure it has # prefix for matching
  const hashtagWithHash = tag.startsWith('#') ? tag : `#${tag}`;
  const hashtagLower = hashtagWithHash.toLowerCase();

  // Query posts that contain this hashtag using PostgreSQL array contains operator
  // This is more efficient than fetching all posts and filtering in JavaScript
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, hashtags, created_at")
    .not("hashtags", "is", null) // Only posts with hashtags
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching posts:", error);
    return notFound();
  }

  // Filter posts that contain the hashtag
  // Check both with and without # prefix for compatibility
  const matchingPostIds = (posts || [])
    .filter((post: any) => {
      if (!post.hashtags || !Array.isArray(post.hashtags)) return false;
      return post.hashtags.some((h: string) => {
        const normalized = h.toLowerCase();
        // Match with or without # prefix
        return normalized === hashtagLower || 
               normalized === tag || 
               normalized.replace(/^#/, '') === tag ||
               normalized === `#${tag}`;
      });
    })
    .map((post: any) => post.id);

  // Get hashtag stats
  const totalPosts = matchingPostIds.length;
  const recentPosts = matchingPostIds.slice(0, 20);


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <Hash className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold gradient-text">
                    #{tag}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {totalPosts} {totalPosts === 1 ? 'post' : 'posts'} with this hashtag
                  </p>
                </div>
              </div>
            </div>

            {recentPosts.length > 0 ? (
              <PostsFeed 
                profileId={undefined} 
                showCreatePost={false} 
                trendingPostIds={recentPosts}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
                <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No posts found
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  No posts have been tagged with #{tag} yet.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4 sticky top-4">
              <TrendingHashtags limit={6} timeRange={7} />
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <Link
                  href="/hashtags"
                  className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-sm font-medium group-hover:underline">
                    View All Hashtags
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

