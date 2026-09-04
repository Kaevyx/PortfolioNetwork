import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsCard } from "@/components/AnalyticsCard";
import { NetworkInsights } from "@/components/NetworkInsights";
import { EngagementMetrics } from "@/components/EngagementMetrics";
import { PostPerformanceChart } from "@/components/PostPerformanceChart";
import { ReactionAnalytics } from "@/components/ReactionAnalytics";
import { hasFeatureAccess } from "@/lib/utils/subscriptionFeatures";
import Link from "next/link";
import { 
  Eye, 
  UserPlus, 
  Star, 
  TrendingUp, 
  MessageSquare,
  Briefcase,
  Share2,
  Clock,
  ThumbsUp,
  BarChart3,
  Users,
  Target
} from "lucide-react";

export default async function AnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createClient();

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    redirect("/profile/setup");
  }

  // Check if user has advanced analytics
  const userPlan = profile.subscription_plan || "free";
  const hasAdvancedAnalytics = hasFeatureAccess(userPlan, "advancedAnalytics");

  // Get statistics
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", userId);

  const { count: portfolioCount } = await supabase
    .from("portfolio_items")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);

  // Get portfolio views/seens
  let portfolioViewsCount = 0;
  let portfolioSeensCount = 0;
  let recentPortfolioViews = 0;
  let previousPortfolioViews = 0;
  let recentPortfolioSeens = 0;
  let previousPortfolioSeens = 0;
  try {
    const { count: views } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_owner_id", userId);
    portfolioViewsCount = views || 0;

    const { count: seens } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_owner_id", userId)
      .eq("marked_seen", true);
    portfolioSeensCount = seens || 0;

    // Recent portfolio views (last 7 days)
    const { count: recentViews } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_owner_id", userId)
      .gte("viewed_at", sevenDaysAgo.toISOString());
    recentPortfolioViews = recentViews || 0;

    // Previous period portfolio views (7-14 days ago)
    const { count: previousViews } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_owner_id", userId)
      .gte("viewed_at", fourteenDaysAgo.toISOString())
      .lt("viewed_at", sevenDaysAgo.toISOString());
    previousPortfolioViews = previousViews || 0;

    // Recent portfolio seens (last 7 days)
    const { count: recentSeens } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_owner_id", userId)
      .eq("marked_seen", true)
      .gte("seen_at", sevenDaysAgo.toISOString());
    recentPortfolioSeens = recentSeens || 0;

    // Previous period portfolio seens (7-14 days ago)
    const { count: previousSeens } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_owner_id", userId)
      .eq("marked_seen", true)
      .gte("seen_at", fourteenDaysAgo.toISOString())
      .lt("seen_at", sevenDaysAgo.toISOString());
    previousPortfolioSeens = previousSeens || 0;
  } catch (error) {
    // Ignore if table doesn't exist
  }

  // Get posts statistics
  const { count: postsCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);

  // Get post views
  const { data: userPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("profile_id", userId);

  let totalPostViews = 0;
  let totalPostLikes = 0;
  let totalPostComments = 0;
  let totalPostShares = 0;

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
      // Fallback to post_likes if post_reactions doesn't exist
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

    // Get shares count
    let sharesCount = 0;
    try {
      const { count } = await supabase
        .from("reposts")
        .select("*", { count: "exact", head: true })
        .in("original_post_id", postIds);
      sharesCount = count || 0;
    } catch (error) {
      // Ignore if table doesn't exist
    }

    totalPostViews = viewsCount || 0;
    totalPostLikes = reactionsCount || 0;
    totalPostComments = commentsCount || 0;
    totalPostShares = sharesCount || 0;
  }

  // Calculate metrics
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const totalReviews = reviews?.length || 0;

  // Get recent activity counts (last 7 days) and previous period (7-14 days ago) for comparison
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  // Recent followers (last 7 days)
  const { count: recentFollowers } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  // Previous period followers (7-14 days ago)
  const { count: previousFollowers } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());

  // Recent reviews (last 7 days)
  const { count: recentReviews } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewee_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  // Previous period reviews
  const { count: previousReviews } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewee_id", userId)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());

  // Recent connections (last 7 days) - mutual follows
  const { data: recentFollowingMe } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const { data: recentIAmFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const recentFollowingMeIds = new Set(recentFollowingMe?.map((f: any) => f.follower_id) || []);
  const recentIAmFollowingIds = new Set(recentIAmFollowing?.map((f: any) => f.following_id) || []);
  const recentConnections = Array.from(recentFollowingMeIds).filter((id: string) => recentIAmFollowingIds.has(id)).length;

  // Previous period connections
  const { data: prevFollowingMe } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());

  const { data: prevIAmFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());

  const prevFollowingMeIds = new Set(prevFollowingMe?.map((f: any) => f.follower_id) || []);
  const prevIAmFollowingIds = new Set(prevIAmFollowing?.map((f: any) => f.following_id) || []);
  const previousConnections = Array.from(prevFollowingMeIds).filter((id: string) => prevIAmFollowingIds.has(id)).length;

  // Recent posts (last 7 days)
  const { count: recentPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  // Previous period posts
  const { count: previousPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .lt("created_at", sevenDaysAgo.toISOString());

  // Recent post views (last 7 days)
  let recentViews = 0;
  let previousViews = 0;
  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map((p: any) => p.id);
    
    const { count: recentViewsCount } = await supabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds)
      .gte("viewed_at", sevenDaysAgo.toISOString());
    recentViews = recentViewsCount || 0;

    const { count: previousViewsCount } = await supabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds)
      .gte("viewed_at", fourteenDaysAgo.toISOString())
      .lt("viewed_at", sevenDaysAgo.toISOString());
    previousViews = previousViewsCount || 0;
  }

  // Recent reactions (last 7 days)
  let recentReactions = 0;
  let previousReactions = 0;
  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map((p: any) => p.id);
    
    try {
      const { count: recentReactionsCount } = await supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds)
        .gte("created_at", sevenDaysAgo.toISOString());
      recentReactions = recentReactionsCount || 0;

      const { count: previousReactionsCount } = await supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());
      previousReactions = previousReactionsCount || 0;
    } catch (error) {
      // Fallback to post_likes
      const { count: recentLikesCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds)
        .gte("created_at", sevenDaysAgo.toISOString());
      recentReactions = recentLikesCount || 0;

      const { count: previousLikesCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());
      previousReactions = previousLikesCount || 0;
    }
  }

  // Recent comments (last 7 days)
  let recentComments = 0;
  let previousComments = 0;
  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map((p: any) => p.id);
    
    const { count: recentCommentsCount } = await supabase
      .from("post_comments")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds)
      .gte("created_at", sevenDaysAgo.toISOString());
    recentComments = recentCommentsCount || 0;

    const { count: previousCommentsCount } = await supabase
      .from("post_comments")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString());
    previousComments = previousCommentsCount || 0;
  }

  // Recent shares (last 7 days)
  let recentShares = 0;
  let previousShares = 0;
  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map((p: any) => p.id);
    
    try {
      const { count: recentSharesCount } = await supabase
        .from("reposts")
        .select("*", { count: "exact", head: true })
        .in("original_post_id", postIds)
        .gte("created_at", sevenDaysAgo.toISOString());
      recentShares = recentSharesCount || 0;

      const { count: previousSharesCount } = await supabase
        .from("reposts")
        .select("*", { count: "exact", head: true })
        .in("original_post_id", postIds)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());
      previousShares = previousSharesCount || 0;
    } catch (error) {
      // Ignore if table doesn't exist
    }
  }

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number): number | undefined => {
    if (previous === 0) {
      return current > 0 ? 100 : undefined;
    }
    return Math.round(((current - previous) / previous) * 100);
  };

  const connectionsChange = calculateChange(recentConnections, previousConnections);
  const followersChange = calculateChange(recentFollowers || 0, previousFollowers || 0);
  const reviewsChange = calculateChange(recentReviews || 0, previousReviews || 0);
  const postsChange = calculateChange(recentPosts || 0, previousPosts || 0);
  const viewsChange = calculateChange(recentViews, previousViews);
  const reactionsChange = calculateChange(recentReactions, previousReactions);
  const commentsChange = calculateChange(recentComments, previousComments);
  const sharesChange = calculateChange(recentShares, previousShares);
  const portfolioViewsChange = calculateChange(recentPortfolioViews, previousPortfolioViews);
  const portfolioSeensChange = calculateChange(recentPortfolioSeens, previousPortfolioSeens);

  // Get total connections count (mutual follows) - using the data we already have
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
  const connectionsCount = Array.from(followingMeIds).filter((id: string) => iAmFollowingIds.has(id)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Analytics Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your profile performance and engagement • Percentage changes compare Last 7 Days vs Previous 7 Days
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</label>
              <select
                disabled
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold cursor-not-allowed opacity-50"
                title="Time period selection coming soon - currently showing Last 7 Days"
              >
                <option value="7d">Last 7 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnalyticsCard
            title="Connections"
            value={connectionsCount}
            change={connectionsChange}
            icon={<Users className="w-6 h-6" />}
            color="indigo"
            subtitle="Mutual follows"
            timePeriod="7d"
          />
          <AnalyticsCard
            title="Total Followers"
            value={followersCount || 0}
            change={followersChange}
            icon={<UserPlus className="w-6 h-6" />}
            color="blue"
            timePeriod="7d"
          />
          <AnalyticsCard
            title="Average Rating"
            value={avgRating}
            icon={<Star className="w-6 h-6" />}
            color="yellow"
          />
          <AnalyticsCard
            title="Total Reviews"
            value={totalReviews}
            change={reviewsChange}
            icon={<MessageSquare className="w-6 h-6" />}
            color="green"
            timePeriod="7d"
          />
        </div>

        {/* Post Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <AnalyticsCard
            title="Total Posts"
            value={postsCount || 0}
            change={postsChange}
            icon={<Share2 className="w-6 h-6" />}
            color="blue"
            timePeriod="7d"
          />
          <AnalyticsCard
            title="Post Views"
            value={totalPostViews}
            change={viewsChange}
            icon={<Eye className="w-6 h-6" />}
            color="indigo"
            timePeriod="7d"
          />
          <AnalyticsCard
            title="Post Reactions"
            value={totalPostLikes}
            change={reactionsChange}
            icon={<ThumbsUp className="w-6 h-6" />}
            color="blue"
            timePeriod="7d"
          />
          <AnalyticsCard
            title="Post Comments"
            value={totalPostComments}
            change={commentsChange}
            icon={<MessageSquare className="w-6 h-6" />}
            color="green"
            timePeriod="7d"
          />
          <AnalyticsCard
            title="Post Shares"
            value={totalPostShares}
            change={sharesChange}
            icon={<Share2 className="w-6 h-6" />}
            color="purple"
            timePeriod="7d"
          />
        </div>

        {/* Portfolio Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AnalyticsCard
            title="Portfolio Views"
            value={portfolioViewsCount}
            change={portfolioViewsChange}
            icon={<Eye className="w-6 h-6" />}
            color="indigo"
            subtitle="Total times your portfolio has been viewed"
            timePeriod="7 days"
            tooltip="This is the total number of times users have viewed your portfolio. Each unique user viewing your portfolio counts as one view."
          />
          <AnalyticsCard
            title="Portfolio Seens"
            value={portfolioSeensCount}
            change={portfolioSeensChange}
            icon={<Briefcase className="w-6 h-6" />}
            color="blue"
            subtitle="Users who marked your portfolio as seen"
            timePeriod="7 days"
            tooltip="This is the number of users who have clicked the 'Mark as Seen' button on your portfolio. Once a user marks your portfolio as seen, they cannot unmark it."
          />
          <AnalyticsCard
            title="Portfolio Items"
            value={portfolioCount || 0}
            icon={<Briefcase className="w-6 h-6" />}
            color="green"
            subtitle="Total portfolio items you've created"
            tooltip="This is the total number of portfolio items (projects, work samples, etc.) you have added to your portfolio."
          />
        </div>

        {/* Advanced Analytics Widgets */}
        {hasAdvancedAnalytics ? (
          <>
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Network Insights */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Network Insights
                </h2>
                <NetworkInsights />
              </div>

              {/* Engagement Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Engagement Metrics
                </h2>
                <EngagementMetrics />
              </div>
            </div>

            {/* Reaction Analytics */}
            <div className="mb-8">
              <ReactionAnalytics timeRange="30d" />
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-lg p-8 border-2 border-indigo-200 dark:border-indigo-800 mb-8">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Unlock Advanced Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                Get detailed insights into your network growth, engagement metrics, and reaction analytics with Pro or Ultimate plans.
              </p>
              <Link
                href="/pricing"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}

        {/* Detailed Stats */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Engagement Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Engagement Overview
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-gray-700 dark:text-gray-300">Following</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {followingCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-700 dark:text-gray-300">5-Star Reviews</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {reviews?.filter((r: any) => r.rating === 5).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Profile Views</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {followersCount ? (followersCount * 3) : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Activity (7 Days)
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-gray-700 dark:text-gray-300">New Followers</span>
                </div>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  +{recentFollowers || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-gray-700 dark:text-gray-300">New Reviews</span>
                </div>
                <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  +{recentReviews || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300">Profile Completion</span>
                </div>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {profile.bio && (portfolioCount || 0) > 0 ? "100%" : "60%"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Post Performance Chart */}
        <div className="mb-8">
          <PostPerformanceChart />
        </div>

        {/* Rating Distribution */}
        {totalReviews > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Rating Distribution
            </h2>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews?.filter((r: any) => r.rating === rating).length || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-4">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {rating}
                      </span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-yellow-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

