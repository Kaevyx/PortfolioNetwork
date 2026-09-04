"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { TrendingUp, Hash } from "lucide-react";

interface TrendingHashtagsProps {
  limit?: number;
  timeRange?: number; // Days to look back (default: 7)
  showAll?: boolean; // If true, show all hashtags across platform
}

export function TrendingHashtags({ limit = 6, timeRange = 7, showAll = false }: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<Array<{ tag: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadTrendingHashtags = async () => {
      try {
        let query = supabase
          .from("posts")
          .select("hashtags, id");

        // If not showing all, filter by time range
        if (!showAll && timeRange > 0) {
          const dateThreshold = new Date();
          dateThreshold.setDate(dateThreshold.getDate() - timeRange);
          query = query.gte("created_at", dateThreshold.toISOString());
        }

        const { data: posts } = await query;

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

        // Sort by count and get top N
        const sorted = Object.entries(hashtagCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, showAll ? undefined : limit)
          .map(([tag, count]) => ({ tag, count }));

        setHashtags(sorted);
      } catch (error) {
        console.error("Error loading trending hashtags:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTrendingHashtags();
  }, [supabase, limit, timeRange, showAll]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Trending Hashtags</h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (hashtags.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Trending Hashtags</h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">No hashtags yet</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Trending Hashtags</h2>
      </div>
      <div className="space-y-2">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag.tag}
            href={`/hashtag/${encodeURIComponent(hashtag.tag)}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-4 flex-shrink-0">
                {index + 1}
              </span>
              <Hash className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                #{hashtag.tag}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {hashtag.count} {hashtag.count === 1 ? "post" : "posts"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}






