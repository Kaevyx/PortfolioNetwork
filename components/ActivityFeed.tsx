"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { 
  UserPlus, 
  Star, 
  MessageSquare, 
  Heart, 
  Briefcase,
  Clock,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: 'follow' | 'review' | 'portfolio' | 'like';
  user_id: string;
  user_name: string;
  target_id?: string;
  target_name?: string;
  message: string;
  created_at: string;
  metadata?: any;
}

export function ActivityFeed() {
  const { user, isLoaded } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setLoading(false);
      return;
    }

    const loadActivities = async () => {
      try {
        // Get recent follows
        const { data: follows } = await supabase
          .from("follows")
          .select("*, profiles!follows_follower_id_fkey(display_name)")
          .eq("following_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        // Get recent reviews
        const { data: reviews } = await supabase
          .from("reviews")
          .select("*, profiles!reviews_reviewer_id_fkey(display_name)")
          .eq("reviewee_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        const activitiesList: Activity[] = [];

        follows?.forEach((follow: any) => {
          activitiesList.push({
            id: follow.id,
            type: 'follow',
            user_id: follow.follower_id,
            user_name: follow.profiles?.display_name || "Someone",
            message: `${follow.profiles?.display_name || "Someone"} started following you`,
            created_at: follow.created_at,
          });
        });

        reviews?.forEach((review: any) => {
          activitiesList.push({
            id: review.id,
            type: 'review',
            user_id: review.reviewer_id,
            user_name: review.profiles?.display_name || "Someone",
            message: `${review.profiles?.display_name || "Someone"} left you a ${review.rating}-star review`,
            created_at: review.created_at,
            metadata: { rating: review.rating },
          });
        });

        // Sort by date
        activitiesList.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setActivities(activitiesList.slice(0, 10));
      } catch (error) {
        console.error("Error loading activities:", error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` },
        (payload) => {
          // Handle new follow
          loadActivities();
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reviews', filter: `reviewee_id=eq.${user.id}` },
        (payload) => {
          // Handle new review
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case 'portfolio':
        return <Briefcase className="w-4 h-4 text-green-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 5).map((activity) => (
        <Link
          key={activity.id}
          href={`/profile/${activity.user_id}`}
          className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {activity.message}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

