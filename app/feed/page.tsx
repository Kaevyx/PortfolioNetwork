"use client";

import { useState } from "react";
import { PostsFeed } from "@/components/PostsFeed";
import { CreatePost } from "@/components/CreatePost";
import { PostFilters } from "@/components/PostFilters";
import { TrendingHashtags } from "@/components/TrendingTopics";

export default function FeedPage() {
  const [filters, setFilters] = useState<{ sortBy: string; timeRange: string }>({
    sortBy: "recent",
    timeRange: "all",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostCreated = () => {
    // Trigger refresh by updating key
    setRefreshKey(prev => prev + 1);
    // Also trigger window event for real-time updates
    window.dispatchEvent(new CustomEvent('post-created'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold gradient-text mb-2">News Feed</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Stay updated with posts from professionals you follow
                  </p>
                </div>
                <PostFilters onFilterChange={setFilters} />
              </div>
            </div>

            <div className="space-y-6">
              <CreatePost onPostCreated={handlePostCreated} />
              <PostsFeed key={refreshKey} showCreatePost={false} filters={filters} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <TrendingHashtags limit={6} timeRange={7} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

