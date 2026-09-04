"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { canPerformAction } from "@/lib/utils/subscriptionFeatures";

export default function ScheduledPostsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [canSchedule, setCanSchedule] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user?.id) {
      router.push("/sign-in");
      return;
    }

    loadUserPlan();
    loadScheduledPosts();
    
    // Check immediately when page loads
    checkAndPublishScheduled();
    
    // Check and publish scheduled posts periodically
    const checkInterval = setInterval(async () => {
      await checkAndPublishScheduled();
    }, 30000); // Check every 30 seconds for more responsive publishing

    return () => clearInterval(checkInterval);
  }, [isLoaded, user?.id]);

  const loadUserPlan = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("clerk_id", user?.id)
        .single();

      if (profile) {
        const plan = profile.subscription_plan || "free";
        setUserPlan(plan);
        setCanSchedule(canPerformAction(plan, "schedulePost"));
        
        if (!canPerformAction(plan, "schedulePost")) {
          router.push("/dashboard");
          return;
        }
      }
    } catch (error) {
      console.error("Error loading user plan:", error);
    }
  };

  const checkAndPublishScheduled = async () => {
    try {
      // Call the publish API to check and publish any overdue scheduled posts
      // Using GET method which doesn't require authentication
      const response = await fetch("/api/posts/publish-scheduled", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.published > 0) {
          // Reload scheduled posts if any were published
          await loadScheduledPosts();
        }
      }
    } catch (error) {
      console.error("Error checking scheduled posts:", error);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles(display_name, clerk_id, is_verified, avatar_url)
        `)
        .eq("profile_id", user?.id)
        .eq("is_scheduled", true)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      setScheduledPosts(data || []);
    } catch (error: any) {
      console.error("Error loading scheduled posts:", error);
      alert("Failed to load scheduled posts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this scheduled post? This action cannot be undone.")) {
      return;
    }

    setDeletingId(postId);
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("profile_id", user?.id);

      if (error) throw error;
      await loadScheduledPosts();
    } catch (error: any) {
      console.error("Error deleting scheduled post:", error);
      alert("Failed to delete scheduled post: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!canSchedule) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Post Scheduling Not Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Post scheduling is available for Pro and Ultimate plan users.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-8 h-8 text-indigo-600" />
              Scheduled Posts
            </h1>
            <Link
              href="/feed"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
            >
              Create Post
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your scheduled posts. Posts will be automatically published at the scheduled time.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Scheduled Posts
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have any scheduled posts. Create a post and schedule it for later!
            </p>
            <Link
              href="/feed"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Create Scheduled Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledPosts.map((post) => {
              const scheduledAt = new Date(post.scheduled_at);
              const now = new Date();
              const isPast = scheduledAt < now;
              
              return (
                <div
                  key={post.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border ${
                    isPast
                      ? "border-yellow-500 dark:border-yellow-600"
                      : "border-gray-200 dark:border-gray-700"
                  } p-6`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          Scheduled for {format(scheduledAt, "PPpp")}
                        </span>
                        {isPast && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">
                            Pending Publication
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {formatDistanceToNow(scheduledAt, { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete scheduled post"
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words mb-3">
                      {post.content}
                    </p>
                    {post.image_url && (
                      <div className="mt-3">
                        {Array.isArray(post.image_url) ? (
                          <div className="grid grid-cols-2 gap-2">
                            {post.image_url.slice(0, 4).map((url: string, idx: number) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Post image ${idx + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        ) : (
                          <img
                            src={post.image_url}
                            alt="Post"
                            className="w-full max-w-md h-auto rounded-lg"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

