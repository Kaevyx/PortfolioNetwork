"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import { CheckCircle2, UserPlus, Star, Briefcase, TrendingUp, MessageSquare, ExternalLink, Eye, ThumbsUp, Share2, Rss, User, BarChart3, Shield, Clock, Bell, CreditCard } from "lucide-react";
import { PeopleYouMayKnow } from "@/components/PeopleYouMayKnow";
import { ConnectionEncouragement } from "@/components/ConnectionEncouragement";
import { TrendingHashtags } from "@/components/TrendingTopics";
import { QuickStats } from "@/components/QuickStats";
import { NetworkRecommendations } from "@/components/NetworkRecommendations";
import { UsersNearYou } from "@/components/UsersNearYou";
import { RealTimeStats } from "@/components/RealTimeStats";
import { PeopleWithSimilarSkills } from "@/components/PeopleWithSimilarSkills";
import { SkillsAnalytics } from "@/components/SkillsAnalytics";
import { BriefAnalytics } from "@/components/BriefAnalytics";
import { TopConnectionCard } from "@/components/TopConnectionCard";
import { StorageUsage } from "@/components/StorageUsage";
import { AdminDashboardCard } from "@/components/AdminDashboardCard";
import { AccountHistory } from "@/components/AccountHistory";
import { NotificationsHistory } from "@/components/NotificationsHistory";
import { ProfileStatusBadge } from "@/components/ProfileStatusBadge";
import { SuspensionWarning } from "@/components/SuspensionWarning";
import { VerificationPromotionCard } from "@/components/VerificationPromotionCard";
import { PrivacyTermsBanner } from "@/components/PrivacyTermsBanner";
import { AnnouncementsDisplay } from "@/components/AnnouncementsDisplay";
import { ContentWarningBanner } from "@/components/ContentWarningBanner";
import { PlanSummary } from "@/components/PlanSummary";
import { UserBilling } from "@/components/UserBilling";
import { StatusBanner } from "@/components/StatusBanner";
import { StatusCard } from "@/components/StatusCard";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "admin" | "feed" | "profile" | "history" | "notifications" | "billing">("overview");
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentPortfolio, setRecentPortfolio] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [recentConnections, setRecentConnections] = useState<any[]>([]);
  const [recentFollowers, setRecentFollowers] = useState<any[]>([]);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user?.id) {
      router.push("/sign-in");
      return;
    }

    const loadData = async () => {
      try {
        // Get user profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_id", user.id)
          .single();

        if (!profileData) {
          router.push("/profile/setup");
          return;
        }

        setProfile(profileData);

        // Check if user is admin
        if (profileData?.is_admin || profileData?.is_super_admin) {
          setIsAdmin(true);
          
          // Load user permissions to only count items they have access to
          let permissions: Set<string> = new Set();
          if (profileData?.is_super_admin) {
            // Super admins get all permissions
            const { data: allPerms } = await supabase
              .from("admin_permissions")
              .select("name");
            if (allPerms) {
              permissions = new Set(allPerms.map((p: any) => p.name));
            }
          } else {
            // Regular admins get permissions from roles
            const { data: permsData } = await supabase.rpc("get_user_permissions", {
              p_clerk_id: user.id,
            });
            if (permsData) {
              permissions = new Set(permsData.map((p: any) => p.permission_name));
            }
          }

          // Get pending counts only for sections the user has permission for
          let totalPending = 0;
          
          if (permissions.has("profiles.approve")) {
            const { count } = await supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("profile_status", "pending");
            totalPending += count || 0;
          }
          if (permissions.has("verifications.manage")) {
            const { count } = await supabase
              .from("verification_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending");
            totalPending += count || 0;
          }
          if (permissions.has("files.moderate")) {
            const { count } = await supabase
              .from("storage_files")
              .select("id", { count: "exact", head: true })
              .eq("moderation_status", "pending");
            totalPending += count || 0;
          }
          if (permissions.has("reports.manage")) {
            const { count } = await supabase
              .from("reports")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending");
            totalPending += count || 0;
          }
          if (permissions.has("support.manage")) {
            const { count } = await supabase
              .from("support_tickets")
              .select("id", { count: "exact", head: true })
              .in("status", ["open", "pending"]);
            totalPending += count || 0;
          }
          if (permissions.has("reviews.manage")) {
            const { count } = await supabase
              .from("reviews")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending");
            totalPending += count || 0;
          }
          if (permissions.has("content.moderate")) {
            const { count } = await supabase
              .from("posts")
              .select("id", { count: "exact", head: true })
              .eq("moderation_status", "pending");
            totalPending += count || 0;
          }

          setPendingCount(totalPending);
        }

        // Get recent portfolio items
        const { data: portfolioData } = await supabase
          .from("portfolio_items")
          .select("*")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        setRecentPortfolio(portfolioData || []);

        // Get portfolio count - include all portfolio data (items, skills, education, experience, certifications)
        let totalPortfolioCount = 0;
        
        // Count portfolio items
        const { count: itemsCount } = await supabase
          .from("portfolio_items")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id);
        totalPortfolioCount += itemsCount || 0;

        // Count portfolio skills (try portfolio_skills first, fallback to profile_skills)
        try {
          const { count: skillsCount } = await supabase
            .from("portfolio_skills")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          totalPortfolioCount += skillsCount || 0;
        } catch (error) {
          try {
            const { count: skillsCount } = await supabase
              .from("profile_skills")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", user.id);
            totalPortfolioCount += skillsCount || 0;
          } catch (err) {
            // If both fail, check profiles.skills array
            if (profileData?.skills && Array.isArray(profileData.skills) && profileData.skills.length > 0) {
              totalPortfolioCount += profileData.skills.length;
            }
          }
        }

        // Count education entries
        try {
          const { count: eduCount } = await supabase
            .from("portfolio_education")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          totalPortfolioCount += eduCount || 0;
        } catch (error) {
          try {
            const { count: eduCount } = await supabase
              .from("education_entries")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", user.id);
            totalPortfolioCount += eduCount || 0;
          } catch (err) {
            // Ignore
          }
        }

        // Count experience entries
        try {
          const { count: expCount } = await supabase
            .from("portfolio_experience")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          totalPortfolioCount += expCount || 0;
        } catch (error) {
          try {
            const { count: expCount } = await supabase
              .from("work_experience")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", user.id);
            totalPortfolioCount += expCount || 0;
          } catch (err) {
            // Ignore
          }
        }

        // Count certifications
        try {
          const { count: certCount } = await supabase
            .from("portfolio_certifications")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", user.id);
          totalPortfolioCount += certCount || 0;
        } catch (error) {
          try {
            const { count: certCount } = await supabase
              .from("certifications")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", user.id);
            totalPortfolioCount += certCount || 0;
          } catch (err) {
            // Ignore
          }
        }

        setPortfolioCount(totalPortfolioCount);

        // Get recent reviews
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*, profiles!reviews_reviewer_id_fkey(*)")
          .eq("reviewee_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setRecentReviews(reviewsData || []);

        // Get connections
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

        if (connectionIds.length > 0) {
          const { data: connectionProfiles } = await supabase
            .from("profiles")
            .select("display_name, clerk_id, username, bio, is_verified")
            .in("clerk_id", connectionIds.slice(0, 5));

          setRecentConnections(
            (connectionProfiles || []).map((p: any) => ({
              user1_id: user.id,
              user2_id: p.clerk_id,
              user2: p,
            }))
          );
        }

        // Get recent followers
        const { data: followersData } = await supabase
          .from("follows")
          .select("*, profiles!follows_follower_id_fkey(display_name, clerk_id, username, avatar_url)")
          .eq("following_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setRecentFollowers(followersData || []);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isLoaded, user?.id, router, supabase]);

  // Handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && ["overview", "admin", "feed", "profile", "history", "notifications", "billing"].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [searchParams]);

  if (!isLoaded || loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate average rating
  const avgRating = recentReviews && recentReviews.length > 0
    ? recentReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / recentReviews.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Suspension Warning */}
        {profile?.is_suspended && (
          <SuspensionWarning 
            reason={profile.suspension_reason} 
            endsAt={profile.suspension_ends_at} 
          />
        )}
        {/* System Status Banner - Only renders here when display_on_all_pages is false */}
        <StatusBanner key="status-banner" renderLocation="page" />
        {/* Content Warning Banner */}
        <ContentWarningBanner />
        {/* Privacy & Terms Agreement Banner */}
        <PrivacyTermsBanner />
        {/* Announcements Display */}
        <AnnouncementsDisplay displayTypes={['banner', 'card', 'inline']} />
        {/* Welcome Header with Tabs */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome, {profile.display_name?.split(" ")[0] || "there"}!
                </h1>
                {profile.profile_status && (
                  <ProfileStatusBadge status={profile.profile_status} />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Here's what's happening with your network
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </div>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`relative px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === "admin"
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin
                  {pendingCount > 0 && (
                    <span className="ml-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
              </button>
            )}
            <Link
              href="/feed"
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Rss className="w-4 h-4" />
              Feed
            </Link>
            <Link
              href={profile ? getProfileUrl({ username: profile.username, clerk_id: user?.id || "" }) : `/profile/${user?.id}`}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Account History
              </div>
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "notifications"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </div>
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === "billing"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Verification Promotion Card - Show only if user is not verified */}
            {!profile?.is_verified && (
              <VerificationPromotionCard />
            )}

            {/* Real-Time Stats Cards */}
            <RealTimeStats />

            {/* Plan Summary - Collapsible */}
            <PlanSummary profile={profile} />

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-4">
              {/* Left Column - Main Content (8 columns) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Full Width Analytics and Top Connection */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <BriefAnalytics />
                  <TopConnectionCard />
                </div>
                
                {/* Users Near You Section */}
                <UsersNearYou radiusMiles={31} limit={6} showTitle={true} />

                {/* People with Similar Skills */}
                <PeopleWithSimilarSkills limit={6} />

                {/* Skills Analytics */}
                <SkillsAnalytics limit={10} />

                {/* Connection Encouragement */}
                <ConnectionEncouragement />
                
                {/* Recent Portfolio Items */}
                {recentPortfolio.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Portfolio</h2>
                      </div>
                      <Link
                        href="/portfolio"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        Manage →
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {recentPortfolio.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                        >
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {item.description}
                            </p>
                          )}
                          {item.project_url && (
                            <a
                              href={item.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Project
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Reviews */}
                {recentReviews.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Reviews</h2>
                      </div>
                      <Link
                        href={profile ? getProfileUrl({ username: profile.username, clerk_id: user?.id || "" }) : `/profile/${user?.id}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View All →
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {recentReviews.slice(0, 3).map((review: any) => (
                        <div
                          key={review.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {review.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                  {review.profiles?.display_name || "Anonymous"}
                                </p>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3 h-3 ${
                                        i < review.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300 dark:text-gray-600"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar (4 columns) */}
              <div className="lg:col-span-4 space-y-4">
                {/* System Status Card */}
                <StatusCard />
                
                {/* Storage Usage */}
                <StorageUsage />
                
                {/* Quick Stats - Weekly Overview */}
                <QuickStats />

                {/* Network Recommendations */}
                <NetworkRecommendations />

                {/* Trending Hashtags */}
                <TrendingHashtags limit={6} timeRange={7} />

                {/* People You May Know */}
                <PeopleYouMayKnow />

                {/* Recent Connections - Compact */}
                {recentConnections.length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg shadow-sm p-4 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Connections</h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400">People you're connected with</p>
                      </div>
                      <Link
                        href={`/connections`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        All →
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {recentConnections.slice(0, 3).map((conn: any) => {
                        const otherUser = conn.user1_id === user?.id ? conn.user2 : conn.user1;
                        return (
                          <Link
                            key={conn.user1_id + conn.user2_id}
                            href={otherUser ? getProfileUrl({ username: otherUser.username, clerk_id: otherUser.clerk_id }) : `/profile/${otherUser?.clerk_id}`}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-200 dark:border-indigo-800"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {otherUser?.display_name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                                  {otherUser?.display_name || "Unknown"}
                                </p>
                                {otherUser?.is_verified && (
                                  <span className="text-blue-500 text-xs">✓</span>
                                )}
                              </div>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                Connected
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Followers - Compact */}
                {recentFollowers.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Followers</h2>
                      <Link
                        href={profile ? `${getProfileUrl({ username: profile.username, clerk_id: user?.id || "" })}/followers` : `/profile/${user?.id}/followers`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        All
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {recentFollowers.slice(0, 3).map((follow: any) => (
                        <Link
                          key={follow.id}
                          href={follow.profiles ? getProfileUrl({ username: follow.profiles.username, clerk_id: follow.follower_id }) : `/profile/${follow.follower_id}`}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {follow.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                              {follow.profiles?.display_name || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Started following you
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Completion - Compact */}
                <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-lg shadow-sm p-4 text-white">
                  <h3 className="font-semibold text-sm mb-2">Profile Completion</h3>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span>Basic Info</span>
                      <span className={profile.bio ? "text-green-300" : "text-yellow-300"}>
                        {profile.bio ? "✓" : "○"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Portfolio</span>
                      <span className={portfolioCount > 0 ? "text-green-300" : "text-yellow-300"}>
                        {portfolioCount > 0 ? "✓" : "○"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Skills</span>
                      <span className={
                        (profile.profile_type === "individual" && profile.skills && profile.skills.length > 0) ||
                        (profile.profile_type === "business" && profile.services && profile.services.length > 0)
                          ? "text-green-300" : "text-yellow-300"
                      }>
                        {(profile.profile_type === "individual" && profile.skills && profile.skills.length > 0) ||
                        (profile.profile_type === "business" && profile.services && profile.services.length > 0)
                          ? "✓" : "○"}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/profile/edit"
                    className="block w-full bg-white text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 text-center text-xs font-semibold transition-colors"
                  >
                    Complete Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admin" && isAdmin && (
          <div className="mb-4">
            <AdminDashboardCard />
          </div>
        )}

        {activeTab === "history" && (
          <div className="mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account History</h2>
              <AccountHistory />
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notifications History</h2>
              <NotificationsHistory />
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="mb-4">
            <UserBilling />
          </div>
        )}
      </div>
    </div>
  );
}
