import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostsFeed } from "@/components/PostsFeed";
import { Bookmark } from "lucide-react";

export default async function BookmarksPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get bookmarked posts
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const postIds = bookmarks?.map((b: any) => b.post_id) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Bookmark className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-4xl font-bold gradient-text">Saved Posts</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Posts you've bookmarked for later
          </p>
        </div>

        {postIds.length > 0 ? (
          <PostsFeed profileId={undefined} showCreatePost={false} bookmarkedPostIds={postIds} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <Bookmark className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No bookmarks yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Start bookmarking posts to save them for later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}






