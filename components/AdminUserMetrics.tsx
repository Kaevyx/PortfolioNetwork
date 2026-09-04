"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import {
  Users,
  MapPin,
  TrendingUp,
  Activity,
  UserPlus,
  Globe,
  BarChart3,
  Calendar,
  Zap,
  Crown,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  Download,
  Info,
  Eye,
  MessageSquare,
  FileText,
  Heart,
  DollarSign,
  Award,
  Trophy,
  Target,
  TrendingDown,
} from "lucide-react";

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  premiumUsers: number;
  freeUsers: number;
  proUsers: number;
  ultimateUsers: number;
  suspendedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersWithConnections: number;
  averageConnections: number;
  usersWithLocation: number;
  topCountries: Array<{ country: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  registrationTrend: Array<{ date: string; count: number }>;
  planDistribution: Array<{ plan: string; count: number; percentage: number }>;
  activityDistribution: Array<{ period: string; active: number; inactive: number }>;
  usersWithPosts: number;
  totalPosts: number;
  averagePostsPerUser: number;
  usersWithMessages: number;
  totalMessages: number;
  usersWithSkills: number;
  totalSkills: number;
  averageSkillsPerUser: number;
}

interface TopUser {
  clerk_id: string;
  username?: string | null;
  display_name: string;
  email: string;
  connection_count: number;
  follower_count: number;
  following_count: number;
  subscription_plan: string;
  is_verified: boolean;
  created_at: string;
  last_active?: string;
  posts_count?: number;
  messages_count?: number;
  total_revenue?: number; // Placeholder for Stripe integration
  account_age_days?: number;
  activity_score?: number;
}

interface RevenueMetrics {
  highestPayingUser: TopUser | null;
  lowestPayingUser: TopUser | null;
  averageRevenuePerUser: number;
  totalRevenue: number;
  revenueByPlan: Array<{ plan: string; revenue: number; userCount: number }>;
  topRevenueUsers: TopUser[];
}

// Helper function to format hour as time window in 24-hour format with AM/PM (e.g., "12:00 PM - 13:00 PM")
// Posts are grouped by hour (00-59 minutes), so hour 12 includes posts from 12:00 to 12:59
const formatHourWindow = (hour: number): string => {
  const formatHour24 = (h: number): string => {
    const hour24 = String(h).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    return `${hour24}:00 ${period}`;
  };
  
  const startHour = formatHour24(hour);
  const endHour = formatHour24((hour + 1) % 24);
  
  return `${startHour} - ${endHour}`;
};

export default function AdminUserMetrics() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "revenue" | "insights">("overview");
  const [platformInsights, setPlatformInsights] = useState<{
    bestDay: { day: string; count: number };
    bestHour: { hour: number; count: number };
    postsByDay: Array<{ day: string; count: number }>;
    postsByHour: Array<{ hour: number; count: number }>;
    peakPostingTimes: Array<{ day: string; hour: number; count: number }>;
  } | null>(null);

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const currentTime = new Date();
      let periodStart: Date | null = null;
      
      if (selectedPeriod !== "all") {
        periodStart = new Date();
        switch (selectedPeriod) {
          case "7d":
            periodStart.setDate(currentTime.getDate() - 7);
            break;
          case "30d":
            periodStart.setDate(currentTime.getDate() - 30);
            break;
          case "90d":
            periodStart.setDate(currentTime.getDate() - 90);
            break;
        }
      }

      // Get all users
      const { data: allUsers, error: usersError } = await supabase
        .from("profiles")
        .select("*");

      if (usersError) throw usersError;

      // Get connection counts
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("follower_id, following_id");

      if (followsError) throw followsError;

      // Get posts data with timestamps for insights
      // Fetch all posts - we'll filter in JavaScript to handle published_at vs created_at logic
      // Start with basic columns that definitely exist
      let posts: any[] = [];
      let postsError: any = null;
      
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, profile_id, created_at")
          .order("created_at", { ascending: false });
        
        if (error) {
          postsError = error;
          throw error;
        }
        
        posts = data || [];
        console.log(`Loaded ${posts.length} total posts from database`);
        
        // Try to fetch optional columns (published_at, is_scheduled) if they exist
        // These are added by the add-post-scheduling.sql migration
        if (posts.length > 0) {
          try {
            const { data: postsWithExtras, error: extrasError } = await supabase
              .from("posts")
              .select("id, published_at, is_scheduled")
              .in("id", posts.slice(0, 1000).map((p: any) => p.id)); // Get extras for all posts
            
            if (!extrasError && postsWithExtras) {
              // Merge the extra fields into posts
              const extrasMap = new Map(postsWithExtras.map((p: any) => [p.id, {
                published_at: p.published_at || null,
                is_scheduled: p.is_scheduled || false
              }]));
              
              posts = posts.map((p: any) => ({
                ...p,
                published_at: extrasMap.get(p.id)?.published_at || null,
                is_scheduled: extrasMap.get(p.id)?.is_scheduled || false
              }));
            } else {
              // If extra columns don't exist, set defaults
              posts = posts.map((p: any) => ({
                ...p,
                published_at: null,
                is_scheduled: false
              }));
            }
          } catch (extrasErr) {
            // If fetching extras fails, just use defaults
            console.warn("Could not fetch optional post columns (published_at, is_scheduled), using defaults:", extrasErr);
            posts = posts.map((p: any) => ({
              ...p,
              published_at: null,
              is_scheduled: false
            }));
          }
        }
      } catch (err: any) {
        postsError = err;
        console.error("Error loading posts:", {
          error: err,
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          code: err?.code
        });
        // Set posts to empty array on error to prevent crashes
        posts = [];
      }

      // Get messages data
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("sender_id, recipient_id");

      if (messagesError) console.warn("Error loading messages:", messagesError);

      // Calculate connection counts per user
      const connectionCounts: Record<string, number> = {};
      const followerCounts: Record<string, number> = {};
      const followingCounts: Record<string, number> = {};
      const processedPairs = new Set<string>(); // Track processed connection pairs to avoid double counting

      follows?.forEach((follow) => {
        const follower = follow.follower_id;
        const following = follow.following_id;

        // Count connections (mutual follows) - only count each pair once
        const isMutual = follows?.some((f) => f.follower_id === following && f.following_id === follower);
        if (isMutual) {
          // Create a normalized key for the pair (smaller ID first to avoid duplicates)
          const pairKey = follower < following ? `${follower}_${following}` : `${following}_${follower}`;
          
          // Only count this pair if we haven't processed it yet
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            connectionCounts[follower] = (connectionCounts[follower] || 0) + 1;
            connectionCounts[following] = (connectionCounts[following] || 0) + 1;
          }
        }

        followerCounts[following] = (followerCounts[following] || 0) + 1;
        followingCounts[follower] = (followingCounts[follower] || 0) + 1;
      });

      // Calculate metrics
      const metricsNow = new Date();
      const today = new Date(metricsNow.getFullYear(), metricsNow.getMonth(), metricsNow.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalUsers = allUsers?.length || 0;
      const activeUsers = allUsers?.filter((u) => !u.is_suspended && u.profile_status === "approved").length || 0;
      const inactiveUsers = totalUsers - activeUsers;
      const verifiedUsers = allUsers?.filter((u) => u.is_verified).length || 0;
      const suspendedUsers = allUsers?.filter((u) => u.is_suspended).length || 0;

      // Plan distribution
      const freeUsers = allUsers?.filter((u) => u.subscription_plan === "free" || !u.subscription_plan).length || 0;
      const proUsers = allUsers?.filter((u) => u.subscription_plan === "pro").length || 0;
      const ultimateUsers = allUsers?.filter((u) => u.subscription_plan === "ultimate").length || 0;
      const premiumUsers = proUsers + ultimateUsers;

      // New users
      const newUsersToday = allUsers?.filter((u) => new Date(u.created_at) >= today).length || 0;
      const newUsersThisWeek = allUsers?.filter((u) => new Date(u.created_at) >= weekAgo).length || 0;
      const newUsersThisMonth = allUsers?.filter((u) => new Date(u.created_at) >= monthAgo).length || 0;

      // Users with connections
      const usersWithConnections = Object.keys(connectionCounts).length;
      const totalConnections = Object.values(connectionCounts).reduce((a, b) => a + b, 0);
      const averageConnections = usersWithConnections > 0 ? totalConnections / usersWithConnections : 0;

      // Location data
      const usersWithLocation = allUsers?.filter((u) => u.latitude && u.longitude).length || 0;
      const countryCounts: Record<string, number> = {};
      const cityCounts: Record<string, { city: string; country: string; count: number }> = {};

      allUsers?.forEach((user) => {
        if (user.country) {
          countryCounts[user.country] = (countryCounts[user.country] || 0) + 1;
        }
        if (user.city && user.country) {
          const key = `${user.city},${user.country}`;
          if (!cityCounts[key]) {
            cityCounts[key] = { city: user.city, country: user.country, count: 0 };
          }
          cityCounts[key].count++;
        }
      });

      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topCities = Object.values(cityCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Registration trend
      const registrationTrend: Record<string, number> = {};
      allUsers?.forEach((user) => {
        const date = new Date(user.created_at).toISOString().split("T")[0];
        registrationTrend[date] = (registrationTrend[date] || 0) + 1;
      });

      const trendData = Object.entries(registrationTrend)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      // Plan distribution
      const planDistribution = [
        { plan: "Free", count: freeUsers, percentage: totalUsers > 0 ? (freeUsers / totalUsers) * 100 : 0 },
        { plan: "Pro", count: proUsers, percentage: totalUsers > 0 ? (proUsers / totalUsers) * 100 : 0 },
        { plan: "Ultimate", count: ultimateUsers, percentage: totalUsers > 0 ? (ultimateUsers / totalUsers) * 100 : 0 },
      ];

      // Activity distribution (last 7, 30, 90 days)
      const activityDistribution = [
        {
          period: "Last 7 days",
          active: allUsers?.filter((u) => {
            if (!u.updated_at) return false;
            const updated = new Date(u.updated_at);
            return updated >= weekAgo && !u.is_suspended;
          }).length || 0,
          inactive: allUsers?.filter((u) => {
            if (!u.updated_at) return true;
            const updated = new Date(u.updated_at);
            return updated < weekAgo || u.is_suspended;
          }).length || 0,
        },
        {
          period: "Last 30 days",
          active: allUsers?.filter((u) => {
            if (!u.updated_at) return false;
            const updated = new Date(u.updated_at);
            return updated >= monthAgo && !u.is_suspended;
          }).length || 0,
          inactive: allUsers?.filter((u) => {
            if (!u.updated_at) return true;
            const updated = new Date(u.updated_at);
            return updated < monthAgo || u.is_suspended;
          }).length || 0,
        },
      ];

      // Calculate user activity scores and additional data
      // Filter posts by time period and ensure they're published
      const filteredPosts = posts?.filter((p: any) => {
        // Exclude unpublished scheduled posts
        if (p.is_scheduled === true && !p.published_at) {
          return false;
        }
        
        // Ensure we have a valid date
        if (!p.created_at && !p.published_at) {
          console.warn("Post without created_at or published_at:", p.id);
          return false;
        }
        
        // Use published_at if available, otherwise created_at for date comparison
        const postDateStr = p.published_at || p.created_at;
        const postDate = new Date(postDateStr);
        
        // Validate date
        if (isNaN(postDate.getTime())) {
          console.warn("Invalid post date:", p.id, postDateStr);
          return false;
        }
        
        // If no period filter, include all published posts
        if (!periodStart) return true;
        
        // Filter by time period - compare full timestamps
        return postDate >= periodStart;
      }) || [];
      
      console.log(`Filtered to ${filteredPosts.length} posts after applying filters (period: ${selectedPeriod}, periodStart: ${periodStart?.toISOString() || 'all'})`);
      
      const userPostsCount: Record<string, number> = {};
      const userMessagesCount: Record<string, number> = {};
      
      filteredPosts.forEach((p: any) => {
        if (p.profile_id) {
          userPostsCount[p.profile_id] = (userPostsCount[p.profile_id] || 0) + 1;
        } else {
          console.warn("Post without profile_id:", p.id);
        }
      });
      
      console.log(`User posts count:`, Object.keys(userPostsCount).length, "users with posts");

      messages?.forEach((m: any) => {
        if (m.sender_id) {
          userMessagesCount[m.sender_id] = (userMessagesCount[m.sender_id] || 0) + 1;
        }
        if (m.recipient_id) {
          userMessagesCount[m.recipient_id] = (userMessagesCount[m.recipient_id] || 0) + 1;
        }
      });

      // Calculate account age in days
      const currentDate = new Date();
      
      // Top users by connections with additional metrics
      const topUsersList: TopUser[] = allUsers
        ?.map((user) => {
          const createdDate = new Date(user.created_at);
          const accountAgeDays = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          const postsCount = userPostsCount[user.clerk_id] || 0;
          const messagesCount = userMessagesCount[user.clerk_id] || 0;
          const activityScore = (connectionCounts[user.clerk_id] || 0) * 2 + postsCount * 3 + messagesCount * 1;
          
          return {
            clerk_id: user.clerk_id,
            username: user.username || null,
            display_name: user.display_name || user.email || "Unknown",
            email: user.email || "",
            connection_count: connectionCounts[user.clerk_id] || 0,
            follower_count: followerCounts[user.clerk_id] || 0,
            following_count: followingCounts[user.clerk_id] || 0,
            subscription_plan: user.subscription_plan || "free",
            is_verified: user.is_verified || false,
            created_at: user.created_at,
            last_active: user.updated_at,
            posts_count: postsCount,
            messages_count: messagesCount,
            account_age_days: accountAgeDays,
            activity_score: activityScore,
            total_revenue: 0, // Placeholder - will be populated from Stripe
          };
        })
        .sort((a, b) => b.connection_count - a.connection_count)
        .slice(0, 20) || [];

      // Calculate additional metrics using filtered posts
      const uniqueUsersWithPosts = new Set(filteredPosts.map((p: any) => p.profile_id).filter(Boolean));
      const usersWithPosts = uniqueUsersWithPosts.size;
      const totalPosts = filteredPosts.length;
      // Calculate average posts per user (only for users who have posts in this period)
      const averagePostsPerUser = usersWithPosts > 0 ? totalPosts / usersWithPosts : 0;
      
      console.log(`Post metrics: ${usersWithPosts} users with posts, ${totalPosts} total posts, ${averagePostsPerUser.toFixed(2)} avg per user`);

      const usersWithMessages = new Set([
        ...(messages?.map((m: any) => m.sender_id) || []),
        ...(messages?.map((m: any) => m.recipient_id) || []),
      ]).size;
      const totalMessages = messages?.length || 0;

      const usersWithSkills = allUsers?.filter((u) => u.skills && Array.isArray(u.skills) && u.skills.length > 0).length || 0;
      const totalSkills = allUsers?.reduce((sum, u) => sum + (Array.isArray(u.skills) ? u.skills.length : 0), 0) || 0;
      const averageSkillsPerUser = usersWithSkills > 0 ? Math.round((totalSkills / usersWithSkills) * 10) / 10 : 0;

      setMetrics({
        totalUsers,
        activeUsers,
        inactiveUsers,
        verifiedUsers,
        premiumUsers,
        freeUsers,
        proUsers,
        ultimateUsers,
        suspendedUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersWithConnections,
        averageConnections: Math.round(averageConnections * 10) / 10,
        usersWithLocation,
        topCountries,
        topCities,
        registrationTrend: trendData,
        planDistribution,
        activityDistribution,
        usersWithPosts,
        totalPosts,
        averagePostsPerUser: Math.round(averagePostsPerUser * 10) / 10,
        usersWithMessages,
        totalMessages,
        usersWithSkills,
        totalSkills,
        averageSkillsPerUser,
      });

      // Calculate revenue metrics (placeholder for Stripe integration)
      const premiumUsersList = allUsers?.filter((u) => 
        u.subscription_plan === "pro" || u.subscription_plan === "ultimate"
      ) || [];
      
      // TODO: Replace with actual Stripe revenue data
      // For now, calculate estimated revenue based on plan prices
      const planPrices: Record<string, { monthly: number; yearly: number }> = {
        pro: { monthly: 9.99, yearly: 99.99 },
        ultimate: { monthly: 19.99, yearly: 199.99 },
      };
      
      const usersWithRevenue = topUsersList
        .filter((u) => u.subscription_plan === "pro" || u.subscription_plan === "ultimate")
        .map((u) => {
          // Placeholder: Assume monthly billing for now
          const price = planPrices[u.subscription_plan as keyof typeof planPrices]?.monthly || 0;
          // Estimate revenue (will be replaced with actual Stripe data)
          return {
            ...u,
            total_revenue: price * 12, // Placeholder: 12 months
          };
        });

      const revenueMetrics: RevenueMetrics = {
        highestPayingUser: usersWithRevenue.length > 0 
          ? usersWithRevenue.reduce((max, u) => (u.total_revenue || 0) > (max.total_revenue || 0) ? u : max, usersWithRevenue[0])
          : null,
        lowestPayingUser: usersWithRevenue.length > 0
          ? usersWithRevenue.reduce((min, u) => (u.total_revenue || 0) < (min.total_revenue || 0) ? u : min, usersWithRevenue[0])
          : null,
        averageRevenuePerUser: premiumUsersList.length > 0
          ? usersWithRevenue.reduce((sum, u) => sum + (u.total_revenue || 0), 0) / premiumUsersList.length
          : 0,
        totalRevenue: usersWithRevenue.reduce((sum, u) => sum + (u.total_revenue || 0), 0),
        revenueByPlan: [
          {
            plan: "pro",
            revenue: usersWithRevenue.filter((u) => u.subscription_plan === "pro").reduce((sum, u) => sum + (u.total_revenue || 0), 0),
            userCount: premiumUsersList.filter((u) => u.subscription_plan === "pro").length,
          },
          {
            plan: "ultimate",
            revenue: usersWithRevenue.filter((u) => u.subscription_plan === "ultimate").reduce((sum, u) => sum + (u.total_revenue || 0), 0),
            userCount: premiumUsersList.filter((u) => u.subscription_plan === "ultimate").length,
          },
        ],
        topRevenueUsers: [...usersWithRevenue].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)).slice(0, 10),
      };

      // Calculate platform insights using filtered posts
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const postsByDay: Record<string, number> = {};
      const postsByHour: Record<number, number> = {};
      const postsByDayHour: Record<string, number> = {};
      
      filteredPosts.forEach((post: any) => {
        if (post.created_at) {
          const postDate = new Date(post.created_at);
          // Ensure post is within the selected period
          if (periodStart && postDate < periodStart) return;
          
          const dayName = dayNames[postDate.getDay()];
          const hour = postDate.getHours();
          const dayHourKey = `${dayName}-${hour}`;
          
          // Count by day
          postsByDay[dayName] = (postsByDay[dayName] || 0) + 1;
          
          // Count by hour
          postsByHour[hour] = (postsByHour[hour] || 0) + 1;
          
          // Count by day and hour combination
          postsByDayHour[dayHourKey] = (postsByDayHour[dayHourKey] || 0) + 1;
        }
      });
      
      // Find best day
      const bestDayEntry = Object.entries(postsByDay).reduce((max, [day, count]) => 
        count > max.count ? { day, count } : max, 
        { day: "Monday", count: 0 }
      );
      
      // Find best hour
      const bestHourEntry = Object.entries(postsByHour).reduce((max, [hour, count]) => 
        count > max.count ? { hour: parseInt(hour), count } : max, 
        { hour: 12, count: 0 }
      );
      
      // Get top posting times (day + hour combinations)
      const peakPostingTimes = Object.entries(postsByDayHour)
        .map(([key, count]) => {
          const [day, hour] = key.split("-");
          return { day, hour: parseInt(hour), count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Format posts by day array
      const postsByDayArray = dayNames.map(day => ({
        day,
        count: postsByDay[day] || 0
      }));
      
      // Format posts by hour array (0-23)
      const postsByHourArray = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: postsByHour[i] || 0
      }));
      
      setPlatformInsights({
        bestDay: bestDayEntry,
        bestHour: bestHourEntry,
        postsByDay: postsByDayArray,
        postsByHour: postsByHourArray,
        peakPostingTimes,
      });

      setTopUsers(topUsersList);
      setRevenueMetrics(revenueMetrics);
    } catch (error: any) {
      console.error("Error loading user metrics:", error);
      // Set empty metrics to prevent UI errors
      setMetrics({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        verifiedUsers: 0,
        premiumUsers: 0,
        freeUsers: 0,
        proUsers: 0,
        ultimateUsers: 0,
        suspendedUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        usersWithConnections: 0,
        averageConnections: 0,
        usersWithLocation: 0,
        topCountries: [],
        topCities: [],
        registrationTrend: [],
        planDistribution: [],
        activityDistribution: [],
        usersWithPosts: 0,
        totalPosts: 0,
        averagePostsPerUser: 0,
        usersWithMessages: 0,
        totalMessages: 0,
        usersWithSkills: 0,
        totalSkills: 0,
        averageSkillsPerUser: 0,
      });
      setTopUsers([]);
      setRevenueMetrics({
        highestPayingUser: null,
        lowestPayingUser: null,
        averageRevenuePerUser: 0,
        totalRevenue: 0,
        revenueByPlan: [],
        topRevenueUsers: [],
      });
      setPlatformInsights(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Failed to load user metrics</p>
        <button
          onClick={loadMetrics}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Metrics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive insights into your user base</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Fixed Metrics (Not affected by time period) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            Fixed metrics - These values represent all-time totals and are not affected by the selected time period filter.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          trend={metrics.newUsersThisMonth}
          trendLabel="This month"
          color="indigo"
          tooltip="Total number of user accounts registered on the platform (all-time). Includes all users regardless of status (active, inactive, suspended). This is a fixed metric not affected by time period filter."
        />
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers.toLocaleString()}
          icon={<Activity className="w-6 h-6" />}
          percentage={metrics.totalUsers > 0 ? (metrics.activeUsers / metrics.totalUsers) * 100 : 0}
          color="green"
          tooltip="Users who are not suspended and have an approved profile status (all-time). This is a fixed metric not affected by time period filter."
        />
        <MetricCard
          title="Premium Users"
          value={metrics.premiumUsers.toLocaleString()}
          icon={<Crown className="w-6 h-6" />}
          percentage={metrics.totalUsers > 0 ? (metrics.premiumUsers / metrics.totalUsers) * 100 : 0}
          color="purple"
          tooltip="Users with Pro or Ultimate subscription plans (all-time). This is a fixed metric not affected by time period filter."
        />
        <MetricCard
          title="Verified Users"
          value={metrics.verifiedUsers.toLocaleString()}
          icon={<CheckCircle2 className="w-6 h-6" />}
          percentage={metrics.totalUsers > 0 ? (metrics.verifiedUsers / metrics.totalUsers) * 100 : 0}
          color="blue"
          tooltip="Users who have completed the verification process (all-time). This is a fixed metric not affected by time period filter."
        />
      </div>

      {/* Secondary Fixed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Users with Connections"
          value={metrics.usersWithConnections.toLocaleString()}
          icon={<UserPlus className="w-5 h-5" />}
          subtitle={`Avg: ${metrics.averageConnections} connections`}
          color="teal"
          tooltip="Users who have at least one mutual connection (all-time). This is a fixed metric not affected by time period filter."
        />
        <MetricCard
          title="Users with Location"
          value={metrics.usersWithLocation.toLocaleString()}
          icon={<MapPin className="w-5 h-5" />}
          percentage={metrics.totalUsers > 0 ? (metrics.usersWithLocation / metrics.totalUsers) * 100 : 0}
          color="orange"
          tooltip="Users who have provided location data (all-time). This is a fixed metric not affected by time period filter."
        />
        <MetricCard
          title="Users with Skills"
          value={metrics.usersWithSkills.toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          subtitle={`Avg: ${metrics.averageSkillsPerUser} skills`}
          color="purple"
          tooltip="Users who have added at least one skill (all-time). This is a fixed metric not affected by time period filter."
        />
      </div>

      {/* Time-Period Specific Metrics */}
      <div className="mt-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time-Period Metrics - Filtered by: {selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="New Users (This Week)"
          value={metrics.newUsersThisWeek.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={metrics.newUsersToday}
          trendLabel="Today"
          color="pink"
          tooltip={`Number of users who registered in the last 7 days. Filtered by selected time period: ${selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}.`}
        />
        <MetricCard
          title="Users with Posts"
          value={metrics.usersWithPosts.toLocaleString()}
          icon={<FileText className="w-5 h-5" />}
          subtitle={`${metrics.totalPosts} total posts`}
          color="blue"
          tooltip={`Number of unique users who have created at least one post in the selected time period (${selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}).`}
        />
        <MetricCard
          title="Avg Posts per User"
          value={metrics.averagePostsPerUser.toFixed(1)}
          icon={<BarChart3 className="w-5 h-5" />}
          subtitle="Active posters only"
          color="indigo"
          tooltip={`Average number of posts per user who has created at least one post in the selected time period (${selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}). Calculated as: Total Posts ÷ Users with Posts.`}
        />
      </div>

      {/* Tabs for different metric views */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 p-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "overview"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "activity"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Activity & Engagement
            </button>
            <button
              onClick={() => setActiveTab("revenue")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "revenue"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Revenue & Spending
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "insights"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Platform Insights
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Top Users by Connections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5" />
                    Top Users by Connections
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {topUsers.slice(0, 10).map((user, index) => (
                      <div
                        key={user.clerk_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={getProfileUrl({ username: user.username, clerk_id: user.clerk_id })}
                                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline truncate"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {user.display_name}
                              </Link>
                              {user.is_verified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                              {user.subscription_plan === "pro" && (
                                <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              )}
                              {user.subscription_plan === "ultimate" && (
                                <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">{user.connection_count}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">connections</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {topUsers.length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">No users with connections yet</p>
                    )}
                  </div>
                </div>

                {/* Longest User (Oldest Account) */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5" />
                    Longest Active Users
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {[...topUsers].sort((a, b) => (b.account_age_days || 0) - (a.account_age_days || 0)).slice(0, 10).map((user, index) => (
                      <div
                        key={user.clerk_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={getProfileUrl({ username: user.username, clerk_id: user.clerk_id })}
                                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline truncate"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {user.display_name}
                              </Link>
                              {user.is_verified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-gray-900 dark:text-white">{user.account_age_days || 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Registration Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5" />
                    Registration Trend (Last 30 Days)
                  </h2>
                  <div className="h-64">
                    <SimpleLineChart data={metrics.registrationTrend} />
                  </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5" />
                    Plan Distribution
                  </h2>
                  <div className="space-y-4">
                    {metrics.planDistribution.map((plan) => (
                      <div key={plan.plan}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{plan.plan}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {plan.count} ({plan.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              plan.plan.toLowerCase() === "free"
                                ? "bg-gray-400"
                                : plan.plan.toLowerCase() === "pro"
                                ? "bg-yellow-500"
                                : "bg-purple-500"
                            }`}
                            style={{ width: `${plan.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Countries and Cities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5" />
                    Top Countries
                  </h2>
                  <div className="space-y-2">
                    {metrics.topCountries.map((country, index) => (
                      <div key={country.country} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6">{index + 1}</span>
                          <span className="text-sm text-gray-900 dark:text-white">{country.country}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{country.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5" />
                    Top Cities
                  </h2>
                  <div className="space-y-2">
                    {metrics.topCities.map((city, index) => (
                      <div key={`${city.city}-${city.country}`} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6">{index + 1}</span>
                          <div>
                            <span className="text-sm text-gray-900 dark:text-white">{city.city}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{city.country}</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{city.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-6">
              {/* Time-Period Notice */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    <strong>Time-Period Filter Active:</strong> All metrics below are filtered by {selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}
                  </p>
                </div>
              </div>

              {/* Additional Engagement Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Users with Posts"
                  value={metrics.usersWithPosts.toLocaleString()}
                  icon={<FileText className="w-5 h-5" />}
                  subtitle={`${metrics.totalPosts} total posts`}
                  color="blue"
                  tooltip={`Number of unique users who have created at least one post in the selected time period (${selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}). Shows total posts count as subtitle.`}
                />
                <MetricCard
                  title="Avg Posts per User"
                  value={metrics.averagePostsPerUser.toFixed(1)}
                  icon={<BarChart3 className="w-5 h-5" />}
                  subtitle="Active posters only"
                  color="indigo"
                  tooltip={`Average number of posts per user who has created at least one post in the selected time period. Calculated as: ${metrics.totalPosts} posts ÷ ${metrics.usersWithPosts} users = ${metrics.averagePostsPerUser.toFixed(1)} posts per user.`}
                />
                <MetricCard
                  title="Users with Messages"
                  value={metrics.usersWithMessages.toLocaleString()}
                  icon={<MessageSquare className="w-5 h-5" />}
                  subtitle={`${metrics.totalMessages} total messages`}
                  color="green"
                  tooltip="Number of unique users who have sent or received at least one message. Shows total message count as subtitle."
                />
                <MetricCard
                  title="Users with Skills"
                  value={metrics.usersWithSkills.toLocaleString()}
                  icon={<Zap className="w-5 h-5" />}
                  subtitle={`Avg: ${metrics.averageSkillsPerUser} skills`}
                  color="purple"
                  tooltip="Users who have added at least one skill to their profile. Shows average number of skills per user with skills."
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Active Users */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5" />
                    Most Active Users
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {[...topUsers].sort((a, b) => (b.activity_score || 0) - (a.activity_score || 0)).slice(0, 10).map((user, index) => (
                      <div
                        key={user.clerk_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {index + 1}
                          </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${user.clerk_id}`}
                              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline truncate"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {user.display_name}
                            </Link>
                            {user.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{user.posts_count || 0} posts</span>
                            <span>•</span>
                            <span>{user.messages_count || 0} messages</span>
                            <span>•</span>
                            <span>{user.connection_count || 0} connections</span>
                          </div>
                        </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-gray-900 dark:text-white">{user.activity_score || 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Users by Posts */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Top Users by Posts
                    </h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {[...topUsers]
                      .filter((u) => (u.posts_count || 0) > 0)
                      .sort((a, b) => (b.posts_count || 0) - (a.posts_count || 0))
                      .slice(0, 10)
                      .map((user, index) => (
                      <div
                        key={user.clerk_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={getProfileUrl({ username: user.username, clerk_id: user.clerk_id })}
                                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline truncate"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {user.display_name}
                              </Link>
                              {user.is_verified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-gray-900 dark:text-white">{user.posts_count || 0}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">posts</p>
                        </div>
                      </div>
                    ))}
                    {[...topUsers].filter((u) => (u.posts_count || 0) > 0).length === 0 && (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No users with posts in the selected time period
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "revenue" && revenueMetrics && (
            <div className="space-y-6">
              {/* Revenue Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Revenue"
                  value={new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(revenueMetrics.totalRevenue)}
                  icon={<DollarSign className="w-5 h-5" />}
                  color="green"
                  tooltip="Total estimated revenue from all premium users. This is a placeholder value - actual revenue will be calculated from Stripe data."
                />
                <MetricCard
                  title="Average Revenue Per User"
                  value={new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(revenueMetrics.averageRevenuePerUser)}
                  icon={<Target className="w-5 h-5" />}
                  color="blue"
                  tooltip="Average revenue per premium user. Calculated by dividing total revenue by the number of premium users."
                />
                <MetricCard
                  title="Pro Plan Revenue"
                  value={new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(revenueMetrics.revenueByPlan.find((p) => p.plan === "pro")?.revenue || 0)}
                  icon={<Zap className="w-5 h-5" />}
                  subtitle={`${revenueMetrics.revenueByPlan.find((p) => p.plan === "pro")?.userCount || 0} users`}
                  color="yellow"
                  tooltip="Total estimated revenue from Pro plan users."
                />
                <MetricCard
                  title="Ultimate Plan Revenue"
                  value={new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    minimumFractionDigits: 2,
                  }).format(revenueMetrics.revenueByPlan.find((p) => p.plan === "ultimate")?.revenue || 0)}
                  icon={<Crown className="w-5 h-5" />}
                  subtitle={`${revenueMetrics.revenueByPlan.find((p) => p.plan === "ultimate")?.userCount || 0} users`}
                  color="purple"
                  tooltip="Total estimated revenue from Ultimate plan users."
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Highest Paying User */}
                {revenueMetrics.highestPayingUser && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Highest Paying User
                    </h2>
                    <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/profile/${revenueMetrics.highestPayingUser.clerk_id}`}
                            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline text-lg block"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {revenueMetrics.highestPayingUser.display_name}
                          </Link>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{revenueMetrics.highestPayingUser.email}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize">
                            {revenueMetrics.highestPayingUser.subscription_plan} Plan
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: "GBP",
                              minimumFractionDigits: 2,
                            }).format(revenueMetrics.highestPayingUser.total_revenue || 0)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                      * Revenue values are estimated placeholders. Actual Stripe integration pending.
                    </p>
                  </div>
                )}

                {/* Lowest Paying User */}
                {revenueMetrics.lowestPayingUser && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <TrendingDown className="w-5 h-5 text-gray-500" />
                      Lowest Paying User
                    </h2>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/profile/${revenueMetrics.lowestPayingUser.clerk_id}`}
                            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline text-lg block"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {revenueMetrics.lowestPayingUser.display_name}
                          </Link>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{revenueMetrics.lowestPayingUser.email}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize">
                            {revenueMetrics.lowestPayingUser.subscription_plan} Plan
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: "GBP",
                              minimumFractionDigits: 2,
                            }).format(revenueMetrics.lowestPayingUser.total_revenue || 0)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                      * Revenue values are estimated placeholders. Actual Stripe integration pending.
                    </p>
                  </div>
                )}
              </div>

              {/* Top Revenue Users */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5" />
                  Top Revenue Users
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {revenueMetrics.topRevenueUsers.map((user, index) => (
                    <div
                      key={user.clerk_id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${user.clerk_id}`}
                              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline truncate"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {user.display_name}
                            </Link>
                            {user.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            {user.subscription_plan === "pro" && (
                              <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                            {user.subscription_plan === "ultimate" && (
                              <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                            {user.subscription_plan} Plan
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: "GBP",
                            minimumFractionDigits: 2,
                          }).format(user.total_revenue || 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">revenue</p>
                      </div>
                    </div>
                  ))}
                  {revenueMetrics.topRevenueUsers.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No revenue data available</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
                  * Revenue values are estimated placeholders. Actual Stripe integration pending.
                </p>
              </div>
            </div>
          )}

          {activeTab === "insights" && platformInsights && (
            <div className="space-y-6">
              {/* Time-Period Notice */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    <strong>Time-Period Filter Active:</strong> All insights below are based on posts from {selectedPeriod === "7d" ? "Last 7 days" : selectedPeriod === "30d" ? "Last 30 days" : selectedPeriod === "90d" ? "Last 90 days" : "All time"}
                  </p>
                </div>
              </div>

              {/* Key Insights Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Best Day for Posting</h3>
                  </div>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    {platformInsights.bestDay.day}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {platformInsights.bestDay.count} {platformInsights.bestDay.count === 1 ? "post" : "posts"} in selected period
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Best Time for Posting</h3>
                  </div>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                    {formatHourWindow(platformInsights.bestHour.hour)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {platformInsights.bestHour.count} posts during this time window
                  </p>
                </div>
              </div>

              {/* Posts by Day Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5" />
                  Posts by Day of Week
                </h2>
                <div className="space-y-3">
                  {platformInsights.postsByDay.map((dayData) => {
                    const maxCount = Math.max(...platformInsights.postsByDay.map(d => d.count), 1);
                    const percentage = (dayData.count / maxCount) * 100;
                    const isBestDay = dayData.day === platformInsights.bestDay.day;
                    
                    return (
                      <div key={dayData.day}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24">
                              {dayData.day}
                            </span>
                            {isBestDay && (
                              <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
                                Best
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {dayData.count} posts
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              isBestDay
                                ? "bg-indigo-600 dark:bg-indigo-500"
                                : "bg-gray-400 dark:bg-gray-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Posts by Hour Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5" />
                  Posts by Hour of Day
                </h2>
                <div className="grid grid-cols-12 gap-2">
                  {platformInsights.postsByHour.map((hourData) => {
                    const maxCount = Math.max(...platformInsights.postsByHour.map(h => h.count), 1);
                    const percentage = (hourData.count / maxCount) * 100;
                    const isBestHour = hourData.hour === platformInsights.bestHour.hour;
                    const hourLabel = formatHourWindow(hourData.hour);
                    
                    return (
                      <div key={hourData.hour} className="flex flex-col items-center">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg h-32 relative overflow-hidden">
                          <div
                            className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                              isBestHour
                                ? "bg-yellow-500 dark:bg-yellow-400"
                                : hourData.count > 0
                                ? "bg-gray-400 dark:bg-gray-500"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                            style={{ height: `${percentage}%` }}
                            title={`${hourData.count} posts during ${hourLabel}`}
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
                            {hourLabel}
                          </p>
                          {hourData.count > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {hourData.count}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peak Posting Times */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  Peak Posting Times
                </h2>
                <div className="space-y-2">
                  {platformInsights.peakPostingTimes.map((time, index) => {
                    const hourLabel = formatHourWindow(time.hour);
                    
                    return (
                      <div
                        key={`${time.day}-${time.hour}`}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {time.day} at {hourLabel}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {time.count} {time.count === 1 ? "post" : "posts"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {time.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {platformInsights.peakPostingTimes.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No posting data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tooltip component for metric explanations
const MetricTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-help"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }
        }}
      >
        <Info className="w-4 h-4" />
      </span>
      {showTooltip && (
        <div 
          className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-auto"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="whitespace-normal leading-relaxed">{text}</p>
          <div className="absolute top-full left-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      )}
    </span>
  );
};

// Simple Metric Card Component
function MetricCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  percentage,
  subtitle,
  color = "indigo",
  tooltip,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  percentage?: number;
  subtitle?: string;
  color?: string;
  tooltip?: string;
}) {
  const colorClasses = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>{icon}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span>{trend}</span>
            {trendLabel && <span className="text-xs">({trendLabel})</span>}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
        {tooltip ? (
          <MetricTooltip text={tooltip}>
            <p className="text-sm text-gray-600 dark:text-gray-400 inline">{title}</p>
          </MetricTooltip>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        )}
        {percentage !== undefined && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{percentage.toFixed(1)}% of total</p>
        )}
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}


// Country Distribution Component
function CountryDistribution({ countries }: { countries: Array<{ country: string; count: number }> }) {
  const maxCount = countries[0]?.count || 1;
  
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="space-y-3">
        {countries.map((country, index) => (
          <div key={country.country}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{country.country}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{country.count} users</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${(country.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple Line Chart Component
function SimpleLineChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const width = 800;
  const height = 200;
  const padding = 40;

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (d.count / maxCount) * (height - padding * 2);
    return { x, y, ...d };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding + ratio * (height - padding * 2);
        return (
          <line
            key={ratio}
            x1={padding}
            y1={height - y}
            x2={width - padding}
            y2={height - y}
            stroke="#e5e7eb"
            strokeWidth={1}
            className="dark:stroke-gray-700"
          />
        );
      })}

      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        className="dark:stroke-indigo-400"
      />

      {/* Points */}
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#6366f1"
          className="dark:fill-indigo-400"
        />
      ))}

      {/* Labels */}
      {points.map((point, index) => {
        if (index % Math.ceil(data.length / 5) !== 0 && index !== data.length - 1) return null;
        const date = new Date(point.date);
        return (
          <text
            key={index}
            x={point.x}
            y={height - padding / 2}
            textAnchor="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            {date.getDate()}/{date.getMonth() + 1}
          </text>
        );
      })}
    </svg>
  );
}

