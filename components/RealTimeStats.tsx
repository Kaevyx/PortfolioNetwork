"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CheckCircle2, UserPlus, Star, Briefcase, TrendingUp, MessageSquare, Eye, ThumbsUp, Share2, RefreshCw, Info, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StatCard {
  id: string;
  label: string;
  value: number | string;
  icon: any;
  iconColor: string;
  bgColor: string;
  href?: string;
  lastUpdated: Date;
}

export function RealTimeStats() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();

  // Update "last updated" display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    if (!isLoaded || !user?.id) return;

    try {
      // Get followers and following counts
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);

      // Get connections count (mutual follows)
      const { data: followingMe } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      const { data: iAmFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingMeIds = new Set(followingMe?.map((f: any) => f.follower_id) || []);
      const iAmFollowingIds = new Set(iAmFollowing?.map((f: any) => f.following_id) || []);
      const connectionIds = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id));
      const connectionsCount = connectionIds.length;

      // Get reviews and average rating
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewee_id", user.id);

      const reviewsCount = reviews?.length || 0;
      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
        : 0;

      // Get portfolio items count - include all portfolio data
      let portfolioCount = 0;
      
      // Count portfolio items
      const { count: itemsCount } = await supabase
        .from("portfolio_items")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id);
      portfolioCount += itemsCount || 0;

      // Count portfolio skills
      try {
        const { count: skillsCount } = await supabase
          .from("portfolio_skills")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id);
        portfolioCount += skillsCount || 0;
      } catch (error) {
        try {
          const { count: skillsCount } = await supabase
            .from("profile_skills")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          portfolioCount += skillsCount || 0;
        } catch (err) {
          // Ignore
        }
      }

      // Count education, experience, certifications
      try {
        const { count: eduCount } = await supabase
          .from("portfolio_education")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id);
        portfolioCount += eduCount || 0;
      } catch (error) {
        try {
          const { count: eduCount } = await supabase
            .from("education_entries")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          portfolioCount += eduCount || 0;
        } catch (err) {}
      }

      try {
        const { count: expCount } = await supabase
          .from("portfolio_experience")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id);
        portfolioCount += expCount || 0;
      } catch (error) {
        try {
          const { count: expCount } = await supabase
            .from("work_experience")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          portfolioCount += expCount || 0;
        } catch (err) {}
      }

      try {
        const { count: certCount } = await supabase
          .from("portfolio_certifications")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id);
        portfolioCount += certCount || 0;
      } catch (error) {
        try {
          const { count: certCount } = await supabase
            .from("certifications")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          portfolioCount += certCount || 0;
        } catch (err) {}
      }

      // Get portfolio views and seens
      let portfolioViewsCount = 0;
      let portfolioSeensCount = 0;
      try {
        const { count: views } = await supabase
          .from("portfolio_views")
          .select("*", { count: "exact", head: true })
          .eq("portfolio_owner_id", user.id);
        portfolioViewsCount = views || 0;

        const { count: seens } = await supabase
          .from("portfolio_views")
          .select("*", { count: "exact", head: true })
          .eq("portfolio_owner_id", user.id)
          .eq("marked_seen", true);
        portfolioSeensCount = seens || 0;
      } catch (error) {
        // Ignore if table doesn't exist
      }

      // Get link clicks count - use click_count from user_links (only valid clicks are counted)
      let linkClicksCount = 0;
      try {
        const { data: userLinks } = await supabase
          .from("user_links")
          .select("click_count")
          .eq("profile_id", user.id)
          .eq("is_active", true);
        
        if (userLinks && userLinks.length > 0) {
          // Sum the click_count from all user's links (this is the accurate count)
          linkClicksCount = userLinks.reduce((sum: number, link: any) => sum + (link.click_count || 0), 0);
        }
      } catch (error) {
        // Ignore if table doesn't exist
      }

      // Get posts statistics
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id);

      // Get post engagement stats
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("profile_id", user.id);

      let totalPostViews = 0;
      let totalPostLikes = 0;
      let totalPostComments = 0;

      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map((p: any) => p.id);
        
        const { count: viewsCount } = await supabase
          .from("post_views")
          .select("*", { count: "exact", head: true })
          .in("post_id", postIds);

        // Get reactions count (try post_reactions first, fallback to post_likes)
        let reactionsCount = 0;
        try {
          const { count } = await supabase
            .from("post_reactions")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds);
          reactionsCount = count || 0;
        } catch (error) {
          const { count } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds);
          reactionsCount = count || 0;
        }

        const { count: commentsCount } = await supabase
          .from("post_comments")
          .select("*", { count: "exact", head: true })
          .in("post_id", postIds);

        totalPostViews = viewsCount || 0;
        totalPostLikes = reactionsCount || 0;
        totalPostComments = commentsCount || 0;
      }

      const now = new Date();
      const newStats: StatCard[] = [
        {
          id: "connections",
          label: "Connections",
          value: connectionsCount || 0,
          icon: UserPlus,
          iconColor: "text-white",
          bgColor: "bg-gradient-to-br from-indigo-500 to-purple-600",
          href: `/connections`,
          lastUpdated: now,
        },
        {
          id: "followers",
          label: "Followers",
          value: followersCount || 0,
          icon: UserPlus,
          iconColor: "text-indigo-600 dark:text-indigo-400",
          bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
          href: `/profile/${user.id}/followers`,
          lastUpdated: now,
        },
        {
          id: "rating",
          label: "Rating",
          value: avgRating > 0 ? `${avgRating.toFixed(1)} (${reviewsCount})` : "—",
          icon: Star,
          iconColor: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          lastUpdated: now,
        },
        {
          id: "portfolio",
          label: "Portfolio Items",
          value: portfolioCount || 0,
          icon: Briefcase,
          iconColor: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-100 dark:bg-green-900/30",
          href: "/portfolio",
          lastUpdated: now,
        },
        {
          id: "portfolio-views",
          label: "Portfolio Views",
          value: portfolioViewsCount || 0,
          icon: Eye,
          iconColor: "text-indigo-600 dark:text-indigo-400",
          bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
          href: "/portfolio",
          lastUpdated: now,
        },
        {
          id: "portfolio-seens",
          label: "Portfolio Seens",
          value: portfolioSeensCount || 0,
          icon: CheckCircle2,
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          href: "/portfolio",
          lastUpdated: now,
        },
        {
          id: "link-clicks",
          label: "Link Clicks",
          value: linkClicksCount || 0,
          icon: Link2,
          iconColor: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-100 dark:bg-purple-900/30",
          href: "/profile/edit",
          lastUpdated: now,
        },
        {
          id: "following",
          label: "Following",
          value: followingCount || 0,
          icon: TrendingUp,
          iconColor: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-100 dark:bg-purple-900/30",
          href: `/profile/${user.id}/following`,
          lastUpdated: now,
        },
        {
          id: "posts",
          label: "Posts",
          value: postsCount || 0,
          icon: Share2,
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          href: "/feed",
          lastUpdated: now,
        },
        {
          id: "views",
          label: "Post Views",
          value: totalPostViews || 0,
          icon: Eye,
          iconColor: "text-indigo-600 dark:text-indigo-400",
          bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
          lastUpdated: now,
        },
        {
          id: "reactions",
          label: "Reactions",
          value: totalPostLikes || 0,
          icon: ThumbsUp,
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          lastUpdated: now,
        },
        {
          id: "comments",
          label: "Comments",
          value: totalPostComments || 0,
          icon: MessageSquare,
          iconColor: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-100 dark:bg-green-900/30",
          lastUpdated: now,
        },
      ];

      setStats(newStats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    fetchStats();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("dashboard-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
        },
        () => {
          // Debounce updates
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_items",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_views",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_reactions",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_views",
          filter: `portfolio_owner_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_items",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_skills",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "link_clicks",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_links",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded, user?.id]);

  if (!isLoaded || !user) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700 animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const StatCardContent = ({ stat }: { stat: StatCard }) => {
    const Icon = stat.icon;
    const content = (
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-xs mb-0.5 ${stat.id === "connections" ? "text-indigo-100" : "text-gray-600 dark:text-gray-400"}`}>
              {stat.label}
            </p>
            <p className={`${typeof stat.value === "string" && stat.value.length > 6 ? "text-lg" : "text-2xl"} font-bold ${stat.id === "connections" ? "text-white" : "text-gray-900 dark:text-white"} truncate`}>
              {stat.value}
            </p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${stat.id === "connections" ? "text-indigo-100" : "text-gray-500 dark:text-gray-400"}`}>
              <RefreshCw className="w-3 h-3" />
              Updated {formatDistanceToNow(stat.lastUpdated, { addSuffix: true })}
            </p>
          </div>
          <div className={`${stat.bgColor} p-2 rounded-lg ${stat.id === "connections" ? "bg-white/20 backdrop-blur-sm" : ""}`}>
            <Icon className={`w-5 h-5 ${stat.iconColor} ${stat.id === "connections" ? "text-white" : ""}`} />
          </div>
        </div>
        {stat.id === "connections" && (
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
        )}
      </div>
    );

    if (stat.href) {
      return (
        <Link
          href={stat.href}
          className={`block rounded-lg shadow-sm p-4 card-hover border ${
            stat.id === "connections"
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white relative overflow-hidden"
              : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
          }`}
        >
          {content}
        </Link>
      );
    }

    return (
      <div
        className={`rounded-lg shadow-sm p-4 border ${
          stat.id === "connections"
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white relative overflow-hidden"
            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
        }`}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-4">
      {stats.map((stat) => (
        <StatCardContent key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

