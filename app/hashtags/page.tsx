import { createClient } from "@/lib/supabase/server";
import { Hash, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function AllHashtagsPage() {
  const supabase = await createClient();

  // Get all posts with hashtags
  const { data: posts, error } = await supabase
    .from("posts")
    .select("hashtags, id")
    .not("hashtags", "is", null);

  if (error) {
    console.error("Error fetching posts:", error);
    // Return empty state if there's an error
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error loading hashtags
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Count hashtag occurrences across all posts
  const hashtagCounts: { [key: string]: number } = {};
  
  posts?.forEach((post: any) => {
    if (post.hashtags && Array.isArray(post.hashtags)) {
      post.hashtags.forEach((tag: string) => {
        // Normalize hashtag (remove # and lowercase)
        const cleanTag = tag.replace(/^#/, "").toLowerCase();
        hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
      });
    }
  });

  // Sort by count (descending) and then alphabetically
  const sortedHashtags = Object.entries(hashtagCounts)
    .sort(([tagA, countA], [tagB, countB]) => {
      // First sort by count (descending)
      if (countB !== countA) {
        return countB - countA;
      }
      // Then sort alphabetically
      return tagA.localeCompare(tagB);
    })
    .map(([tag, count]) => ({ tag, count }));

  const totalHashtags = sortedHashtags.length;
  const totalPosts = posts?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Hash className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">
                All Hashtags
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {totalHashtags} {totalHashtags === 1 ? 'hashtag' : 'hashtags'} across {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </div>
        </div>

        {sortedHashtags.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Hashtags by Popularity
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedHashtags.map((hashtag, index) => (
                <Link
                  key={hashtag.tag}
                  href={`/hashtag/${encodeURIComponent(hashtag.tag)}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-6 flex-shrink-0">
                      #{index + 1}
                    </span>
                    <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                      #{hashtag.tag}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {hashtag.count} {hashtag.count === 1 ? "post" : "posts"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hashtags yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Start using hashtags in your posts to see them here!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

