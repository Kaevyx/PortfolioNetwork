"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Stat {
  id: string;
  label: string;
  value: number;
  lastUpdated: Date;
  change?: number; // Percentage change
}

interface HomepageStatsState {
  stats: Stat[];
  reactionBreakdown?: Record<string, number>;
  employmentBreakdown?: Record<string, { current: number; previous: number; change?: number; previousTotal?: number }>;
}

type TimePeriod = "1h" | "24h" | "7d" | "30d" | "all";

// Calculate percentage changes helper function
const calculateChange = (current: number, previous: number): number | undefined => {
  // If both are 0, no change
  if (current === 0 && previous === 0) {
    return undefined;
  }
  
  // If previous is 0 but current has data, it's new data (infinite growth)
  // Show as 100% to indicate new activity (could be higher but 100% is clear)
  if (previous === 0) {
    return current > 0 ? 100 : undefined;
  }
  
  // Calculate percentage change - allow values to go past 100%
  const change = ((current - previous) / previous) * 100;
  
  // Round to nearest integer
  const rounded = Math.round(change);
  
  // Only cap at -100% (can't decrease more than 100%)
  // Allow increases to go past 100% (e.g., 200%, 500%, etc.)
  if (rounded < -100) {
    return -100;
  }
  
  return rounded;
};

export function HomepageStats() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [userMetrics, setUserMetrics] = useState<Stat[]>([]);
  const [storageStats, setStorageStats] = useState<Stat[]>([]);
  const [reactionBreakdown, setReactionBreakdown] = useState<Record<string, number>>({});
  const [employmentBreakdown, setEmploymentBreakdown] = useState<Record<string, { current: number; previous: number; change?: number; previousTotal?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [storageLoading, setStorageLoading] = useState(false);
  const [employmentLoading, setEmploymentLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");
  const [storageTimePeriod, setStorageTimePeriod] = useState<TimePeriod>("7d");
  const [employmentTimePeriod, setEmploymentTimePeriod] = useState<TimePeriod>("7d");
  const supabase = createClient();

  // Verify Supabase client on mount
  useEffect(() => {
    console.log("HomepageStats: Component mounted", {
      hasSupabase: !!supabase,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }, [supabase]);

  // Update "last updated" display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate date ranges for any time period
  const calculateDateRanges = (period: TimePeriod) => {
    const now = new Date();
    let periodStart: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    if (period === "1h") {
      // For 1 hour, use current time (not midnight)
      periodStart = new Date();
      periodStart.setHours(periodStart.getHours() - 1);
      previousPeriodStart = new Date(periodStart);
      previousPeriodStart.setHours(previousPeriodStart.getHours() - 1);
      previousPeriodEnd = new Date(periodStart);
    } else {
      // For other periods, use midnight as baseline
      const nowMidnight = new Date(now);
      nowMidnight.setHours(0, 0, 0, 0);
      
      if (period === "24h") {
        periodStart = new Date(nowMidnight);
        periodStart.setHours(periodStart.getHours() - 24);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setHours(previousPeriodStart.getHours() - 24);
        previousPeriodEnd = new Date(periodStart);
      } else if (period === "7d") {
        periodStart = new Date(nowMidnight);
        periodStart.setDate(periodStart.getDate() - 7);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        previousPeriodEnd = new Date(periodStart);
      } else if (period === "30d") {
        periodStart = new Date(nowMidnight);
        periodStart.setDate(periodStart.getDate() - 30);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
        previousPeriodEnd = new Date(periodStart);
      } else {
        // All time - compare last 30 days vs previous 30 days
        periodStart = new Date(nowMidnight);
        periodStart.setDate(periodStart.getDate() - 30);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
        previousPeriodEnd = new Date(periodStart);
      }
      
      periodStart.setHours(0, 0, 0, 0);
      previousPeriodStart.setHours(0, 0, 0, 0);
      previousPeriodEnd.setHours(0, 0, 0, 0);
    }

    return { periodStart, previousPeriodStart, previousPeriodEnd };
  };

  const fetchStats = async (mainPeriod?: TimePeriod, storagePeriod?: TimePeriod, employmentPeriod?: TimePeriod) => {
    console.log("HomepageStats: Starting fetchStats");
    try {
      setLoading(true);
      
      // Verify Supabase client is initialized
      if (!supabase) {
        console.error("HomepageStats: Supabase client is not initialized");
        throw new Error("Supabase client not initialized");
      }
      
      // Use provided periods or fall back to state
      const mainTimePeriod = mainPeriod || timePeriod;
      const storageTimePeriodValue = storagePeriod || storageTimePeriod;
      const employmentTimePeriodValue = employmentPeriod || employmentTimePeriod;
      
      // Calculate date ranges for main stats
      const { periodStart, previousPeriodStart, previousPeriodEnd } = calculateDateRanges(mainTimePeriod);
      
      // Calculate date ranges for storage stats
      const storageRanges = calculateDateRanges(storageTimePeriodValue);
      
      // Calculate date ranges for employment stats
      const employmentRanges = calculateDateRanges(employmentTimePeriodValue);

      // Log date ranges for debugging
      console.log("HomepageStats: Date ranges calculated", {
        mainTimePeriod,
        storageTimePeriodValue,
        employmentTimePeriodValue,
        mainPeriodStart: periodStart.toISOString(),
        storagePeriodStart: storageRanges.periodStart.toISOString(),
        employmentPeriodStart: employmentRanges.periodStart.toISOString(),
      });

      // Get total accounts (all profiles)
      console.log("HomepageStats: Fetching total accounts...");
      const { count: totalAccountsCount, error: accountsError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      console.log("HomepageStats: Total accounts query result", { count: totalAccountsCount, error: accountsError });
      
      if (accountsError) {
        console.error("Error fetching total accounts:", accountsError);
      }

      // Get active users (users who have been active based on last_seen in online_status)
      // Active = users who have last_seen within the time period
      let activeUsersCount = 0;
      let recentActiveUsersCount = 0;
      let previousActiveUsersCount = 0;
      
      try {
        // For "all" time, count all users who have ever been active (have a last_seen)
        if (timePeriod === "all") {
          const { count: allActiveCount } = await supabase
            .from("online_status")
            .select("*", { count: "exact", head: true })
            .not("last_seen", "is", null);
          activeUsersCount = allActiveCount || 0;
        } else {
          // For time periods, count users active in that period
          const { count: recentActiveCount } = await supabase
            .from("online_status")
            .select("*", { count: "exact", head: true })
            .gte("last_seen", periodStart.toISOString());
          recentActiveUsersCount = recentActiveCount || 0;
          
          // Previous period active users
          const { count: previousActiveCount } = await supabase
            .from("online_status")
            .select("*", { count: "exact", head: true })
            .gte("last_seen", previousPeriodStart.toISOString())
            .lt("last_seen", previousPeriodEnd.toISOString());
          previousActiveUsersCount = previousActiveCount || 0;
          
          activeUsersCount = recentActiveUsersCount;
        }
        
        console.log("HomepageStats: Active users", {
          period: timePeriod,
          activeUsersCount,
          recentActiveUsersCount,
          previousActiveUsersCount,
        });
      } catch (activeError) {
        console.error("Error fetching active users:", activeError);
      }

      // Get verified users count (total)
      const { count: verifiedUsersCount, error: verifiedError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", true);
      
      if (verifiedError) {
        console.error("Error fetching verified users:", verifiedError);
      }

      // Calculate verified percentage (for "all" time period)
      const verifiedPercentage = totalAccountsCount && totalAccountsCount > 0
        ? (verifiedUsersCount || 0) / totalAccountsCount * 100
        : 0;

      // Get users verified in current period (for time-period specific display)
      // Note: Some users might have is_verified=true but null verification_approved_at (verified before column was added)
      // For those cases, we can't accurately track when they were verified, so we only count those with a timestamp
      const { count: recentVerifiedCount, error: recentVerifiedError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", true)
        .not("verification_approved_at", "is", null)
        .gte("verification_approved_at", periodStart.toISOString());
      
      if (recentVerifiedError) {
        console.error("Error fetching recent verified users:", recentVerifiedError);
      } else {
        console.log("HomepageStats: Verified users in period", {
          period: mainTimePeriod,
          periodStart: periodStart.toISOString(),
          count: recentVerifiedCount || 0,
        });
      }

      // Get users verified in previous period (for comparison)
      const { count: previousVerifiedCount, error: previousVerifiedError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", true)
        .not("verification_approved_at", "is", null)
        .gte("verification_approved_at", previousPeriodStart.toISOString())
        .lt("verification_approved_at", previousPeriodEnd.toISOString());
      
      if (previousVerifiedError) {
        console.error("Error fetching previous verified users:", previousVerifiedError);
      }

      // Get recent users (current period)
      const { count: recentUsersCount, error: recentUsersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", periodStart.toISOString());
      
      if (recentUsersError) {
        console.error("Error fetching recent users:", recentUsersError);
      }

      // Get previous period users
      const { count: previousUsersCount, error: previousUsersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", previousPeriodEnd.toISOString());
      
      if (previousUsersError) {
        console.error("Error fetching previous users:", previousUsersError);
      }

      // Helper function to count connections
      const countConnections = async (startDate: Date, endDate?: Date) => {
        let query = supabase
          .from("follows")
          .select("follower_id, following_id");
        
        if (endDate) {
          query = query.gte("created_at", startDate.toISOString())
                      .lt("created_at", endDate.toISOString());
        } else {
          query = query.gte("created_at", startDate.toISOString());
        }

        const { data: allFollows } = await query.limit(10000);

        let count = 0;
        if (allFollows && allFollows.length > 0) {
          const followSet = new Set<string>();
          allFollows.forEach((follow: any) => {
            followSet.add(`${follow.follower_id}-${follow.following_id}`);
          });

          const countedPairs = new Set<string>();
          allFollows.forEach((follow: any) => {
            const followerId = follow.follower_id;
            const followingId = follow.following_id;
            
            if (followSet.has(`${followingId}-${followerId}`)) {
              const pairKey = followerId < followingId 
                ? `${followerId}-${followingId}` 
                : `${followingId}-${followerId}`;
              
              if (!countedPairs.has(pairKey)) {
                countedPairs.add(pairKey);
                count++;
              }
            }
          });
        }
        return count;
      };

      // Get connections for the selected time period
      // For "all" time, show all connections, otherwise show connections in the current period
      const connectionsCount = timePeriod === "all" 
        ? await countConnections(new Date(0))
        : await countConnections(periodStart);

      // Recent connections (current period) - this is what we'll display for non-"all" periods
      const recentConnections = await countConnections(periodStart);

      // Previous period connections (for comparison)
      const previousConnections = await countConnections(previousPeriodStart, previousPeriodEnd);
      
      // For display, use recentConnections for non-"all" periods, total for "all"
      const displayConnectionsCount = timePeriod === "all" ? connectionsCount : recentConnections;

      // Get total posts count
      console.log("HomepageStats: Fetching posts...");
      const { count: postsCount, error: postsError, data: postsData } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });
      
      console.log("HomepageStats: Posts query result", { count: postsCount, error: postsError, hasData: !!postsData });
      
      if (postsError) {
        console.error("Error fetching posts:", postsError);
      }

      // Get recent posts (current period)
      const { count: recentPostsCount, error: recentPostsError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", periodStart.toISOString());
      
      if (recentPostsError) {
        console.error("Error fetching recent posts:", recentPostsError);
      }

      // Get previous period posts
      const { count: previousPostsCount, error: previousPostsError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", previousPeriodEnd.toISOString());
      
      if (previousPostsError) {
        console.error("Error fetching previous posts:", previousPostsError);
      }

      // Get total reactions (try post_reactions first, fallback to post_likes)
      let reactionsCount = 0;
      let recentReactionsCount = 0;
      let previousReactionsCount = 0;
      try {
        const { count } = await supabase
          .from("post_reactions")
          .select("*", { count: "exact", head: true });
        reactionsCount = count || 0;

        const { count: recent } = await supabase
          .from("post_reactions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", periodStart.toISOString());
        recentReactionsCount = recent || 0;

        const { count: previous } = await supabase
          .from("post_reactions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", previousPeriodStart.toISOString())
          .lt("created_at", previousPeriodEnd.toISOString());
        previousReactionsCount = previous || 0;
      } catch (error) {
        // Fallback to post_likes
        const { count } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true });
        reactionsCount = count || 0;

        const { count: recent } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .gte("created_at", periodStart.toISOString());
        recentReactionsCount = recent || 0;

        const { count: previous } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .gte("created_at", previousPeriodStart.toISOString())
          .lt("created_at", previousPeriodEnd.toISOString());
        previousReactionsCount = previous || 0;
      }

      // Get reaction type breakdown
      let reactionBreakdown: Record<string, number> = {};
      try {
        const { data: reactions } = await supabase
          .from("post_reactions")
          .select("reaction_type");
        
        if (reactions) {
          reactions.forEach((r: any) => {
            reactionBreakdown[r.reaction_type] = (reactionBreakdown[r.reaction_type] || 0) + 1;
          });
        }
      } catch (error) {
        // Ignore if table doesn't exist
      }

      // Get total comments
      const { count: commentsCount } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true });

      // Get recent comments (current period)
      const { count: recentCommentsCount } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", periodStart.toISOString());

      // Get previous period comments
      const { count: previousCommentsCount } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", previousPeriodEnd.toISOString());

      // Get total shares
      let sharesCount = 0;
      let recentSharesCount = 0;
      let previousSharesCount = 0;
      try {
        const { count } = await supabase
          .from("reposts")
          .select("*", { count: "exact", head: true });
        sharesCount = count || 0;

        const { count: recent } = await supabase
          .from("reposts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", periodStart.toISOString());
        recentSharesCount = recent || 0;

        const { count: previous } = await supabase
          .from("reposts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", previousPeriodStart.toISOString())
          .lt("created_at", previousPeriodEnd.toISOString());
        previousSharesCount = previous || 0;
      } catch (error) {
        // Ignore if table doesn't exist
      }

      // Get total views
      const { count: viewsCount } = await supabase
        .from("post_views")
        .select("*", { count: "exact", head: true });

      // Get recent views (current period)
      const { count: recentViewsCount } = await supabase
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", periodStart.toISOString());

      // Get previous period views
      const { count: previousViewsCount } = await supabase
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", previousPeriodStart.toISOString())
        .lt("viewed_at", previousPeriodEnd.toISOString());

      // Get portfolio metrics
      // Count portfolios (users with portfolio data AND showPortfolio enabled in settings)
      let portfoliosCount = 0;
      let recentPortfoliosCount = 0;
      let previousPortfoliosCount = 0;
      try {
        // Get all profiles with their settings
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("clerk_id, settings, created_at");
        
        // Get all unique profile IDs that have portfolio items
        const { data: portfolioItems } = await supabase
          .from("portfolio_items")
          .select("profile_id, created_at");
        
        // Get all unique profile IDs that have portfolio skills
        const { data: portfolioSkills } = await supabase
          .from("portfolio_skills")
          .select("profile_id, created_at");
        
        // Get all unique profile IDs that have education entries
        const { data: portfolioEducation } = await supabase
          .from("portfolio_education")
          .select("profile_id, created_at");
        
        // Get all unique profile IDs that have experience
        const { data: portfolioExperience } = await supabase
          .from("portfolio_experience")
          .select("profile_id, created_at");
        
        // Get all unique profile IDs that have certifications
        const { data: portfolioCertifications } = await supabase
          .from("portfolio_certifications")
          .select("profile_id, created_at");
        
        // Combine all portfolio data sources
        const allPortfolioData: Array<{ profile_id: string; created_at: string }> = [
          ...(portfolioItems || []),
          ...(portfolioSkills || []),
          ...(portfolioEducation || []),
          ...(portfolioExperience || []),
          ...(portfolioCertifications || []),
        ];
        
        // Fallback to alternative table names if primary ones don't exist
        if (!portfolioSkills || portfolioSkills.length === 0) {
          const { data: profileSkills } = await supabase
            .from("profile_skills")
            .select("profile_id, created_at");
          if (profileSkills) allPortfolioData.push(...profileSkills);
        }
        
        if (!portfolioEducation || portfolioEducation.length === 0) {
          const { data: eduEntries } = await supabase
            .from("education_entries")
            .select("profile_id, created_at");
          if (eduEntries) allPortfolioData.push(...eduEntries);
        }
        
        if (!portfolioExperience || portfolioExperience.length === 0) {
          const { data: workExp } = await supabase
            .from("work_experience")
            .select("profile_id, created_at");
          if (workExp) allPortfolioData.push(...workExp);
        }
        
        if (!portfolioCertifications || portfolioCertifications.length === 0) {
          const { data: certs } = await supabase
            .from("certifications")
            .select("profile_id, created_at");
          if (certs) allPortfolioData.push(...certs);
        }
        
        if (allPortfolioData.length > 0 && allProfiles) {
          // Get unique profile IDs that have portfolio data
          const uniquePortfolioProfileIds = new Set(allPortfolioData.map((p: any) => p.profile_id));
          
          // Filter to only include profiles where showPortfolio is enabled (defaults to true if not set)
          const activatedPortfolios = Array.from(uniquePortfolioProfileIds).filter((profileId: string) => {
            const profile = allProfiles.find((p: any) => p.clerk_id === profileId);
            if (!profile) return false;
            
            // Check if showPortfolio is enabled (defaults to true)
            const showPortfolio = profile.settings?.profile?.showPortfolio !== false;
            return showPortfolio;
          });
          
          portfoliosCount = activatedPortfolios.length;

          // Count recent portfolios (current period) - only those with showPortfolio enabled
          const recentPortfolios = allPortfolioData.filter((p: any) => 
            new Date(p.created_at) >= periodStart
          );
          const recentUnique = new Set(recentPortfolios.map((p: any) => p.profile_id));
          const recentActivated = Array.from(recentUnique).filter((profileId: string) => {
            const profile = allProfiles.find((p: any) => p.clerk_id === profileId);
            if (!profile) return false;
            const showPortfolio = profile.settings?.profile?.showPortfolio !== false;
            return showPortfolio;
          });
          recentPortfoliosCount = recentActivated.length;

          // Count previous period portfolios - only those with showPortfolio enabled
          const previousPortfolios = allPortfolioData.filter((p: any) => 
            new Date(p.created_at) >= previousPeriodStart && 
            new Date(p.created_at) < previousPeriodEnd
          );
          const previousUnique = new Set(previousPortfolios.map((p: any) => p.profile_id));
          const previousActivated = Array.from(previousUnique).filter((profileId: string) => {
            const profile = allProfiles.find((p: any) => p.clerk_id === profileId);
            if (!profile) return false;
            const showPortfolio = profile.settings?.profile?.showPortfolio !== false;
            return showPortfolio;
          });
          previousPortfoliosCount = previousActivated.length;
        }
      } catch (error) {
        console.error("Error loading portfolio metrics:", error);
        // Ignore if tables don't exist
      }

      // Get portfolio views/seens
      let portfolioSeensCount = 0;
      let recentPortfolioSeensCount = 0;
      let previousPortfolioSeensCount = 0;
      try {
        const { count } = await supabase
          .from("portfolio_views")
          .select("*", { count: "exact", head: true })
          .eq("marked_seen", true);
        portfolioSeensCount = count || 0;

        const { count: recent } = await supabase
          .from("portfolio_views")
          .select("*", { count: "exact", head: true })
          .eq("marked_seen", true)
          .gte("seen_at", periodStart.toISOString());
        recentPortfolioSeensCount = recent || 0;

        const { count: previous } = await supabase
          .from("portfolio_views")
          .select("*", { count: "exact", head: true })
          .eq("marked_seen", true)
          .gte("seen_at", previousPeriodStart.toISOString())
          .lt("seen_at", previousPeriodEnd.toISOString());
        previousPortfolioSeensCount = previous || 0;
      } catch (error) {
        // Ignore if table doesn't exist
      }

      // Get storage metrics
      let totalStorageUsed = 0;
      let recentStorageUsed = 0;
      let previousStorageUsed = 0;
      let totalFilesCount = 0;
      let recentFilesCount = 0;
      let previousFilesCount = 0;
      let averageStoragePerUser = 0;
      let usersWithFiles = 0;
      let recentAvgStoragePerUser = 0;
      let previousAvgStoragePerUser = 0;
      
      try {
      // Get all storage_files - count ALL files for accurate storage stats
      // Profile pictures and post images are auto-approved and should always be counted
      // Other files (CVs, portfolios) require approval, but we count all for accurate totals
      console.log("HomepageStats: Fetching storage files...");
      const { data: allFiles, error: storageFilesError } = await supabase
        .from("storage_files")
        .select("file_size, created_at, user_id, moderation_status, file_type");
      
      console.log("HomepageStats: Storage files query result", { 
        fileCount: allFiles?.length || 0, 
        error: storageFilesError,
        totalSize: allFiles?.reduce((sum: number, f: any) => sum + (f.file_size || 0), 0) || 0
      });
      
      if (storageFilesError) {
        console.error("Error fetching storage files:", storageFilesError);
      }
      
      if (allFiles) {
        // Count ALL files for storage usage (not just approved)
        // This ensures profile pictures and post images (which are auto-approved) are always counted
        // and matches the user's storage-usage API which counts all files
        totalStorageUsed = allFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
        
        // Get unique users with files
        const uniqueUsers = new Set(allFiles.map((f: any) => f.user_id));
        usersWithFiles = uniqueUsers.size;
        
        // Calculate average storage per user
        if (usersWithFiles > 0) {
          averageStoragePerUser = totalStorageUsed / usersWithFiles;
        }
        
        // Get files created in current period (using storage time period)
        const recentFiles = allFiles.filter((f: any) => 
          new Date(f.created_at) >= storageRanges.periodStart
        );
        recentStorageUsed = recentFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
        recentFilesCount = recentFiles.length;
        
        // Calculate recent average storage per user
        const recentUniqueUsers = new Set(recentFiles.map((f: any) => f.user_id));
        const recentUsersWithFiles = recentUniqueUsers.size;
        if (recentUsersWithFiles > 0) {
          recentAvgStoragePerUser = recentStorageUsed / recentUsersWithFiles;
        }
        
        // Get files created in previous period (using storage time period)
        const previousFiles = allFiles.filter((f: any) => 
          new Date(f.created_at) >= storageRanges.previousPeriodStart && 
          new Date(f.created_at) < storageRanges.previousPeriodEnd
        );
        previousStorageUsed = previousFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
        previousFilesCount = previousFiles.length;
        
        // Calculate previous average storage per user
        const previousUniqueUsers = new Set(previousFiles.map((f: any) => f.user_id));
        const previousUsersWithFiles = previousUniqueUsers.size;
        if (previousUsersWithFiles > 0) {
          previousAvgStoragePerUser = previousStorageUsed / previousUsersWithFiles;
        }
        
        totalFilesCount = allFiles.length;
      }
      } catch (error) {
        console.error("Error loading storage metrics:", error);
      }

      // Get link clicks - use click_count from user_links (only valid clicks are counted)
      let linkClicksCount = 0;
      let recentLinkClicksCount = 0;
      let previousLinkClicksCount = 0;
      try {
        // Sum all click_count from active user_links (this is the accurate total count)
        const { data: allLinks } = await supabase
          .from("user_links")
          .select("id, profile_id, click_count")
          .eq("is_active", true);
        
        if (allLinks) {
          linkClicksCount = allLinks.reduce((sum: number, link: any) => sum + (link.click_count || 0), 0);
          
          // For recent/previous period counts, we need to query link_clicks but filter out invalid ones
          // Get all link IDs
          const linkIds = allLinks.map((l: any) => l.id);
          const ownerIds = new Set(allLinks.map((l: any) => l.profile_id));
          
          if (linkIds.length > 0) {
            // Get recent clicks (excluding owner clicks and duplicates)
            const { data: recentClicks } = await supabase
              .from("link_clicks")
              .select("link_id, user_id, ip_address")
              .in("link_id", linkIds)
              .gte("clicked_at", periodStart.toISOString());
            
            if (recentClicks) {
              // Filter: exclude owner clicks, and only count first click per user/IP per link
              const validRecentClicks = new Set<string>();
              recentClicks.forEach((click: any) => {
                // Skip if clicked by owner
                if (click.user_id && ownerIds.has(click.user_id)) return;
                
                // Create unique key: link_id + (user_id or ip_address)
                const key = `${click.link_id}-${click.user_id || click.ip_address}`;
                validRecentClicks.add(key);
              });
              recentLinkClicksCount = validRecentClicks.size;
            }
            
            // Get previous period clicks
            const { data: previousClicks } = await supabase
              .from("link_clicks")
              .select("link_id, user_id, ip_address")
              .in("link_id", linkIds)
              .gte("clicked_at", previousPeriodStart.toISOString())
              .lt("clicked_at", previousPeriodEnd.toISOString());
            
            if (previousClicks) {
              const validPreviousClicks = new Set<string>();
              previousClicks.forEach((click: any) => {
                if (click.user_id && ownerIds.has(click.user_id)) return;
                const key = `${click.link_id}-${click.user_id || click.ip_address}`;
                validPreviousClicks.add(key);
              });
              previousLinkClicksCount = validPreviousClicks.size;
            }
          }
        }
      } catch (error) {
        // Ignore if table doesn't exist
      }


      // Get employment status breakdown
      // Note: This is calculated in fetchEmploymentStats, not here
      // We'll use the employmentBreakdown state which is updated separately
      console.log("HomepageStats: Employment breakdown will be fetched separately");

      const currentTime = new Date();
      
      // User-based metrics (will be in separate section)
      const newUserMetrics: Stat[] = [
        {
          id: "active-users",
          label: "Active Users",
          // Users who have been active (last_seen) in the selected period
          value: activeUsersCount,
          lastUpdated: currentTime,
          change: timePeriod === "all" 
            ? undefined 
            : calculateChange(recentActiveUsersCount, previousActiveUsersCount),
        },
        {
          id: "active-accounts",
          label: "Active Accounts",
          // Total number of accounts (profiles)
          value: totalAccountsCount || 0,
          lastUpdated: currentTime,
          change: undefined, // Total accounts don't change by period
        },
        {
          id: "new-users",
          label: "New Users",
          // Users created in the selected period
          value: timePeriod === "all" ? (totalAccountsCount || 0) : (recentUsersCount || 0),
          lastUpdated: currentTime,
          change: (() => {
            const recent = recentUsersCount || 0;
            const previous = previousUsersCount || 0;
            const change = calculateChange(recent, previous);
            console.log("HomepageStats: New users change calculation", { recent, previous, change, timePeriod });
            return change;
          })(),
        },
        {
          id: "verified-users",
          label: "Verified Users",
          // For "all" time: show percentage, for other periods: show count verified in that period
          value: timePeriod === "all" 
            ? verifiedPercentage 
            : (recentVerifiedCount || 0),
          lastUpdated: currentTime,
          change: timePeriod === "all" 
            ? undefined // No change for percentage
            : calculateChange(recentVerifiedCount || 0, previousVerifiedCount || 0),
        },
      ];
      
      const newStats: Stat[] = [
        {
          id: "connections",
          label: "Connections Made",
          // Show connections made in the selected period (or all connections for "all" time)
          value: displayConnectionsCount,
          lastUpdated: currentTime,
          change: calculateChange(recentConnections, previousConnections),
        },
        {
          id: "posts",
          label: "Posts Created",
          // Show posts created in the selected period (or all posts for "all" time)
          value: timePeriod === "all" ? (postsCount || 0) : (recentPostsCount || 0),
          lastUpdated: currentTime,
          change: (() => {
            const recent = recentPostsCount || 0;
            const previous = previousPostsCount || 0;
            const change = calculateChange(recent, previous);
            console.log("HomepageStats: Posts change calculation", { recent, previous, change, timePeriod, total: postsCount });
            return change;
          })(),
        },
        {
          id: "reactions",
          label: "Total Reactions",
          // Show reactions in the selected period (or all reactions for "all" time)
          value: timePeriod === "all" ? reactionsCount : recentReactionsCount,
          lastUpdated: currentTime,
          change: calculateChange(recentReactionsCount, previousReactionsCount),
        },
        {
          id: "comments",
          label: "Comments Made",
          // Show comments in the selected period (or all comments for "all" time)
          value: timePeriod === "all" ? (commentsCount || 0) : (recentCommentsCount || 0),
          lastUpdated: currentTime,
          change: calculateChange(recentCommentsCount || 0, previousCommentsCount || 0),
        },
        {
          id: "shares",
          label: "Posts Shared",
          // Show shares in the selected period (or all shares for "all" time)
          value: timePeriod === "all" ? sharesCount : recentSharesCount,
          lastUpdated: currentTime,
          change: calculateChange(recentSharesCount, previousSharesCount),
        },
            {
              id: "views",
              label: "Post Views",
              // Show views in the selected period (or all views for "all" time)
              value: timePeriod === "all" ? (viewsCount || 0) : (recentViewsCount || 0),
              lastUpdated: currentTime,
              change: calculateChange(recentViewsCount || 0, previousViewsCount || 0),
            },
            {
              id: "portfolios",
              label: "Portfolios Activated",
              // Show portfolios activated in the selected period (or all for "all" time)
              value: timePeriod === "all" ? portfoliosCount : recentPortfoliosCount,
              lastUpdated: currentTime,
              change: calculateChange(recentPortfoliosCount, previousPortfoliosCount),
            },
            {
              id: "portfolio-seens",
              label: "Portfolios Seen",
              // Show portfolio views in the selected period (or all for "all" time)
              value: timePeriod === "all" ? portfolioSeensCount : recentPortfolioSeensCount,
              lastUpdated: currentTime,
              change: calculateChange(recentPortfolioSeensCount, previousPortfolioSeensCount),
            },
            {
              id: "link-clicks",
              label: "Link Clicks",
              // Show link clicks in the selected period (or all for "all" time)
              value: timePeriod === "all" ? linkClicksCount : recentLinkClicksCount,
              lastUpdated: currentTime,
              change: calculateChange(recentLinkClicksCount, previousLinkClicksCount),
            },
          ];

      // Add storage metrics to stats
      // Calculate storage in MB with precision (preserve decimals for accurate display)
      const totalStorageMB = totalStorageUsed / (1024 * 1024);
      const recentStorageMB = recentStorageUsed / (1024 * 1024);
      const previousStorageMB = previousStorageUsed / (1024 * 1024);
      const avgStorageMB = averageStoragePerUser / (1024 * 1024);
      const recentAvgStorageMB = recentAvgStoragePerUser / (1024 * 1024);
      const previousAvgStorageMB = previousAvgStoragePerUser / (1024 * 1024);
      
      const storageStats: Stat[] = [
        {
          id: "total-files",
          label: "Total Files",
          // Show files created in the selected period (or all files for "all" time)
          value: storageTimePeriodValue === "all" ? totalFilesCount : recentFilesCount,
          lastUpdated: currentTime,
          change: calculateChange(recentFilesCount, previousFilesCount),
        },
        {
          id: "storage-used",
          label: "Storage Used",
          // Show storage added in the selected period (or all storage for "all" time)
          // Note: For period-specific, this shows storage added in that period, not total storage
          value: storageTimePeriodValue === "all" ? totalStorageMB : (recentStorageMB || 0),
          lastUpdated: currentTime,
          change: calculateChange(recentStorageMB, previousStorageMB),
        },
        {
          id: "avg-storage-per-user",
          label: "Avg Storage per User",
          // For period-specific, show average storage per user for files in that period
          // For "all" time, show overall average
          value: storageTimePeriodValue === "all" ? avgStorageMB : (recentAvgStorageMB || 0),
          lastUpdated: currentTime,
          change: calculateChange(recentAvgStorageMB, previousAvgStorageMB),
        },
      ];

      // Combine all stats (excluding storage metrics from main section)
      const allStats = [...newStats];

      console.log("HomepageStats: Stats fetched successfully", {
        statsCount: allStats.length,
        storageStatsCount: storageStats.length,
        employmentKeys: Object.keys(employmentBreakdown).length,
        sampleStats: allStats.slice(0, 5).map(s => ({ id: s.id, label: s.label, value: s.value })),
        allStatIds: allStats.map(s => s.id),
        storageStatIds: storageStats.map(s => s.id),
        employmentStatuses: Object.keys(employmentBreakdown),
      });
      
      // Always update state, even if some stats are 0 (they might be valid zeros)
      // Only warn if we have absolutely no stats at all
      if (allStats.length === 0 && storageStats.length === 0 && Object.keys(employmentBreakdown).length === 0) {
        console.warn("HomepageStats: No stats to display - all queries returned empty");
      } else {
        console.log("HomepageStats: Setting stats", {
          mainStats: allStats.length,
          storageStats: storageStats.length,
          employmentBreakdown: Object.keys(employmentBreakdown).length,
          firstStat: allStats[0] ? { id: allStats[0].id, label: allStats[0].label, value: allStats[0].value } : null,
        });
      }
      
      // Always set the state, even if arrays are empty (they might be valid zeros)
      setStats(allStats);
      setUserMetrics(newUserMetrics);
      setStorageStats(storageStats);
      setReactionBreakdown(reactionBreakdown);
      setEmploymentBreakdown(employmentBreakdown);
      setLoading(false);
      
      console.log("HomepageStats: State updated", {
        statsLength: allStats.length,
        storageStatsLength: storageStats.length,
        reactionKeys: Object.keys(reactionBreakdown).length,
        employmentKeys: Object.keys(employmentBreakdown).length,
      });
    } catch (error: any) {
      console.error("Error fetching homepage stats:", {
        message: error?.message || "Unknown error",
        details: error?.details || error?.toString(),
        stack: error?.stack,
      });
      // Try to set at least some default stats so the UI doesn't look broken
      // This ensures users see something even if there's a connection issue
      const defaultStats: Stat[] = [
        {
          id: "users",
          label: "Active Users",
          value: 0,
          lastUpdated: new Date(),
        },
        {
          id: "posts",
          label: "Posts Created",
          value: 0,
          lastUpdated: new Date(),
        },
        {
          id: "connections",
          label: "Connections Made",
          value: 0,
          lastUpdated: new Date(),
        },
      ];
      
      setStats(defaultStats);
      setUserMetrics([]);
      setStorageStats([]);
      setReactionBreakdown({});
      setEmploymentBreakdown({});
      setLoading(false);
    }
  };

  // Fetch only storage stats
  const fetchStorageStats = async (period?: TimePeriod) => {
    const storagePeriod = period || storageTimePeriod;
    setStorageLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const storageRanges = calculateDateRanges(storagePeriod);

      // Get storage metrics
      let totalStorageUsed = 0;
      let recentStorageUsed = 0;
      let previousStorageUsed = 0;
      let totalFilesCount = 0;
      let recentFilesCount = 0;
      let previousFilesCount = 0;
      let averageStoragePerUser = 0;
      let usersWithFiles = 0;
      let recentAvgStoragePerUser = 0;
      let previousAvgStoragePerUser = 0;
      
      try {
        const { data: allFiles, error: storageFilesError } = await supabase
          .from("storage_files")
          .select("file_size, created_at, user_id, moderation_status, file_type");
        
        if (storageFilesError) {
          console.error("Error fetching storage files:", storageFilesError);
        }
        
        if (allFiles) {
          totalStorageUsed = allFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
          const uniqueUsers = new Set(allFiles.map((f: any) => f.user_id));
          usersWithFiles = uniqueUsers.size;
          
          if (usersWithFiles > 0) {
            averageStoragePerUser = totalStorageUsed / usersWithFiles;
          }
          
          const recentFiles = allFiles.filter((f: any) => 
            new Date(f.created_at) >= storageRanges.periodStart
          );
          recentStorageUsed = recentFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
          recentFilesCount = recentFiles.length;
          
          const recentUniqueUsers = new Set(recentFiles.map((f: any) => f.user_id));
          const recentUsersWithFiles = recentUniqueUsers.size;
          if (recentUsersWithFiles > 0) {
            recentAvgStoragePerUser = recentStorageUsed / recentUsersWithFiles;
          }
          
          const previousFiles = allFiles.filter((f: any) => 
            new Date(f.created_at) >= storageRanges.previousPeriodStart && 
            new Date(f.created_at) < storageRanges.previousPeriodEnd
          );
          previousStorageUsed = previousFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
          previousFilesCount = previousFiles.length;
          
          const previousUniqueUsers = new Set(previousFiles.map((f: any) => f.user_id));
          const previousUsersWithFiles = previousUniqueUsers.size;
          if (previousUsersWithFiles > 0) {
            previousAvgStoragePerUser = previousStorageUsed / previousUsersWithFiles;
          }
          
          totalFilesCount = allFiles.length;
        }
      } catch (error) {
        console.error("Error loading storage metrics:", error);
      }

      const currentTime = new Date();
      const totalStorageMB = totalStorageUsed / (1024 * 1024);
      const recentStorageMB = recentStorageUsed / (1024 * 1024);
      const previousStorageMB = previousStorageUsed / (1024 * 1024);
      const avgStorageMB = averageStoragePerUser / (1024 * 1024);
      const recentAvgStorageMB = recentAvgStoragePerUser / (1024 * 1024);
      const previousAvgStorageMB = previousAvgStoragePerUser / (1024 * 1024);
      
      const newStorageStats: Stat[] = [
        {
          id: "total-files",
          label: "Total Files",
          value: storagePeriod === "all" ? totalFilesCount : recentFilesCount,
          lastUpdated: currentTime,
          change: calculateChange(recentFilesCount, previousFilesCount),
        },
        {
          id: "storage-used",
          label: "Storage Used",
          value: storagePeriod === "all" ? totalStorageMB : (recentStorageMB || 0),
          lastUpdated: currentTime,
          change: calculateChange(recentStorageMB, previousStorageMB),
        },
        {
          id: "avg-storage-per-user",
          label: "Avg Storage per User",
          value: storagePeriod === "all" ? avgStorageMB : (recentAvgStorageMB || 0),
          lastUpdated: currentTime,
          change: calculateChange(recentAvgStorageMB, previousAvgStorageMB),
        },
      ];

      setStorageStats(newStorageStats);
    } catch (error: any) {
      console.error("Error fetching storage stats:", error);
    } finally {
      setStorageLoading(false);
    }
  };

  // Fetch only employment stats
  const fetchEmploymentStats = async (period?: TimePeriod) => {
    const employmentPeriod = period || employmentTimePeriod;
    setEmploymentLoading(true);
    
    // Add a small delay to prevent race conditions on initial load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const employmentRanges = calculateDateRanges(employmentPeriod);
      
      console.log("HomepageStats: Starting employment stats fetch", {
        employmentPeriod,
        periodStart: employmentRanges.periodStart.toISOString()
      });

      // Get employment breakdown
      // For employment status, we track changes in status, not just new profile creation
      // We compare current totals vs previous period totals to show net changes
      const newEmploymentBreakdown: Record<string, { current: number; previous: number; change?: number; previousTotal?: number }> = {};
      
      try {
        // Use COUNT queries instead of fetching all profiles - much faster!
        const statusTypes = [
          "looking_for_job",
          "employed",
          "business_owner",
          "freelancer",
          "student",
          "unemployed",
          "retired",
          "not_specified"
        ];
        
        const currentTotals: Record<string, number> = {};
        const previousPeriodTotals: Record<string, number> = {};
        
        console.log("HomepageStats: Fetching employment stats using COUNT queries", {
          employmentPeriod,
          periodStart: employmentRanges.periodStart
        });
        
        // Get current totals using COUNT queries (much faster than fetching all profiles)
        // Run queries sequentially to prevent overwhelming the database on initial load
        for (const status of statusTypes) {
          try {
            // Current count - handle NULL values for not_specified
            let currentQuery = supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .eq("profile_type", "individual");
            
            if (status === "not_specified") {
              currentQuery = currentQuery.is("employment_status", null);
            } else {
              currentQuery = currentQuery.eq("employment_status", status);
            }
            
            const { count: currentCount, error: currentError } = await currentQuery;
            
            if (currentError) {
              console.error(`HomepageStats: Error counting ${status}:`, currentError);
              currentTotals[status] = 0;
            } else {
              currentTotals[status] = currentCount || 0;
            }
            
            // Previous period count (profiles that existed before periodStart with this status)
            if (employmentPeriod !== "all") {
              let previousQuery = supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("profile_type", "individual")
                .lt("created_at", employmentRanges.periodStart.toISOString());
              
              if (status === "not_specified") {
                previousQuery = previousQuery.is("employment_status", null);
              } else {
                previousQuery = previousQuery.eq("employment_status", status);
              }
              
              const { count: previousCount, error: previousError } = await previousQuery;
              
              if (previousError) {
                console.error(`HomepageStats: Error counting previous ${status}:`, previousError);
                previousPeriodTotals[status] = 0;
              } else {
                previousPeriodTotals[status] = previousCount || 0;
              }
            } else {
              // For "all time", previous is same as current
              previousPeriodTotals[status] = currentTotals[status] || 0;
            }
          } catch (error) {
            console.error(`HomepageStats: Error processing ${status}:`, error);
            currentTotals[status] = 0;
            previousPeriodTotals[status] = 0;
          }
        }
        
        console.log("HomepageStats: Employment stats calculated", {
          currentTotals,
          previousPeriodTotals
        });

        // Build breakdown from the counts we already calculated
        statusTypes.forEach((status) => {
          const current = currentTotals[status] || 0;
          const previous = previousPeriodTotals[status] || 0;
          
          // Calculate change: current vs previous
          const change = (employmentPeriod as TimePeriod) === "all" 
            ? undefined 
            : calculateChange(current, previous);
          
          newEmploymentBreakdown[status] = {
            current,
            previous,
            previousTotal: previous,
            change,
          };
        });
      } catch (error) {
        console.error("HomepageStats: Error loading employment breakdown:", error);
        // Set empty breakdown on error so UI doesn't hang
        setEmploymentBreakdown({});
        setEmploymentLoading(false);
        return; // Exit early on error
      }

      setEmploymentBreakdown(newEmploymentBreakdown);
      console.log("HomepageStats: Employment breakdown set", newEmploymentBreakdown);
    } catch (error: any) {
      console.error("HomepageStats: Error fetching employment stats:", error);
      // Set empty breakdown on error
      setEmploymentBreakdown({});
    } finally {
      setEmploymentLoading(false);
      console.log("HomepageStats: Employment stats loading complete");
    }
  };

  // Initial load - fetch all stats
  useEffect(() => {
    fetchStats();
    fetchStorageStats();
    // Delay employment stats slightly to prevent initial hang
    setTimeout(() => {
      fetchEmploymentStats();
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update main stats when time period changes
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod]);
  
  // Update storage stats when storage time period changes
  useEffect(() => {
    fetchStorageStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageTimePeriod]);
  
  // Update employment stats when employment time period changes
  useEffect(() => {
    fetchEmploymentStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employmentTimePeriod]);

  // Periodic refresh for all stats (every 2 minutes)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchStats();
      fetchStorageStats();
      fetchEmploymentStats();
    }, 120000); // 2 minutes

    // Set up real-time subscriptions
    const channel = supabase
      .channel("homepage-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("HomepageStats: Profiles table changed", payload);
          // Refresh stats when profiles change (including verification updates and employment status changes)
          // Check if employment_status was changed
          const oldStatus = (payload.old as any)?.employment_status;
          const newStatus = (payload.new as any)?.employment_status;
          if (oldStatus !== newStatus) {
            console.log("HomepageStats: Employment status changed detected", { oldStatus, newStatus });
            // Immediately refresh employment stats when status changes
            setTimeout(() => {
              fetchEmploymentStats();
            }, 100);
          }
          setTimeout(() => {
            console.log("HomepageStats: Refreshing stats after profiles change");
            fetchStats();
          }, 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_account_history",
          filter: "action_type=eq.employment_status_changed",
        },
        (payload) => {
          console.log("HomepageStats: Employment status change logged", payload);
          // Refresh employment stats when a status change is logged
          setTimeout(() => {
            fetchEmploymentStats();
          }, 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_status",
        },
        (payload) => {
          console.log("HomepageStats: Online status changed", payload);
          // Refresh stats when user activity changes
          setTimeout(() => {
            console.log("HomepageStats: Refreshing stats after activity change");
            fetchStats();
          }, 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follows",
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
          table: "reposts",
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
          table: "portfolio_views",
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
          event: "*",
          schema: "public",
          table: "storage_files",
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
          table: "storage_usage",
        },
        () => {
          setTimeout(() => fetchStats(), 500);
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod]);

  // Format number with K, M, etc.
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M+`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K+`;
    }
    return num.toString();
  };

  // Format storage values (MB, GB, TB) - always show MB as minimum, round to 2 decimal places
  const formatStorage = (mb: number): { value: string; unit: string } => {
    if (mb < 0.01) {
      return { value: "0.00", unit: "MB" };
    } else if (mb < 1024) {
      return { value: mb.toFixed(2), unit: "MB" };
    } else if (mb < 1024 * 1024) {
      return { value: (mb / 1024).toFixed(2), unit: "GB" };
    } else {
      return { value: (mb / (1024 * 1024)).toFixed(2), unit: "TB" };
    }
  };

  // Get tooltip text for each metric
  const getMetricTooltip = (statId: string, timePeriod: TimePeriod): string => {
    const periodLabel = timePeriod === "1h" ? "last hour" 
      : timePeriod === "24h" ? "last 24 hours"
      : timePeriod === "7d" ? "last 7 days"
      : timePeriod === "30d" ? "last 30 days"
      : "all time";
    
    const isAllTime = timePeriod === "all";
    
    // Get verified percentage for tooltip (find it from stats)
    const verifiedStat = stats.find(s => s.id === "verified-users");
    const verifiedPercentage = verifiedStat?.value || 0;
    
    const tooltips: Record<string, string> = {
      "active-users": timePeriod === "all"
        ? `Total number of users who have been active on the platform (have logged in or had activity). This shows how many users have engaged with the platform at least once.`
        : `Number of users who were active (logged in or had activity) in the ${periodLabel}. This shows user engagement for the selected time period compared to the previous period.`,
      "active-accounts": `Total number of user accounts (profiles) on the platform. This represents all registered accounts regardless of activity.`,
      "new-users": `Number of new user accounts created in the ${periodLabel}. This shows user growth for the selected time period compared to the previous period.`,
      "connections": `Number of new connections (mutual follows) made in the ${periodLabel}. Connections represent two-way relationships between users.`,
      "posts": `Number of new posts created in the ${periodLabel}. This includes all posts shared by users during the selected time period.`,
      "reactions": `Total number of reactions (likes, etc.) given to posts in the ${periodLabel}. This shows overall engagement with content.`,
      "comments": `Number of comments made on posts in the ${periodLabel}. This indicates how actively users are discussing content.`,
      "shares": `Number of times posts were shared/reposted in the ${periodLabel}. This shows how content is being distributed across the platform.`,
      "views": `Total number of post views in the ${periodLabel}. This tracks how many times users have viewed posts.`,
      "portfolios": `Number of portfolios activated by users in the ${periodLabel}. Portfolios allow users to showcase their work.`,
      "portfolio-seens": `Number of times portfolios were viewed in the ${periodLabel}. This shows interest in user portfolios.`,
      "link-clicks": `Total number of link clicks in the ${periodLabel}. This tracks clicks on links shared in posts or profiles.`,
      "verified-users": timePeriod === "all"
        ? `Percentage of users who have been verified on the platform. Verified users have a verified badge on their profile, indicating they've been authenticated and verified by administrators. This shows the current overall verification rate across all users.`
        : `Number of users who were verified in the ${periodLabel}. This shows how many users received verification badges during the selected time period, compared to the previous period. Verified users have been authenticated and verified by administrators.`,
      "total-files": isAllTime 
        ? `Total number of files currently stored on the platform. This includes all existing profile pictures, post images, CVs, and portfolio files, regardless of when they were uploaded.`
        : `Number of files uploaded in the ${periodLabel}. This includes profile pictures, post images, CVs, and portfolio files created during the selected time period.`,
      "storage-used": isAllTime
        ? `Total storage space currently used by all files on the platform. This represents the current total data stored, including all existing files regardless of when they were uploaded.`
        : `Total storage space used by files uploaded in the ${periodLabel}. This shows how much data was added during the selected time period.`,
      "avg-storage-per-user": isAllTime
        ? `Average storage space per user across all files currently stored on the platform. This is calculated by dividing the total storage used by the number of users who have uploaded files.`
        : `Average storage space per user for files uploaded in the ${periodLabel}. This helps understand typical storage usage patterns during the selected time period.`,
    };
    
    return tooltips[statId] || `Statistics for ${statId} in the ${periodLabel}.`;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-12 text-white text-center shadow-2xl">
        <h2 className="text-3xl font-bold mb-8">Join a Network of Professionals</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-white/20 rounded mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-24 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const reactionLabels: Record<string, string> = {
    like: "👍 Likes",
    love: "❤️ Love",
    laugh: "😂 Haha",
    wow: "😮 Wow",
    sad: "😢 Sad",
    angry: "😠 Angry",
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "1h": return "Last 1 Hour";
      case "24h": return "Last 24 Hours";
      case "7d": return "Last 7 Days";
      case "30d": return "Last 30 Days";
      case "all": return "All Time";
      default: return "Last 7 Days";
    }
  };

  return (
    <div className="space-y-8">
      {/* User Based Metrics */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-12 text-white text-center shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Join a Network of Professionals</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log("HomepageStats: Manual refresh triggered");
                fetchStats();
                fetchStorageStats();
                fetchEmploymentStats();
              }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg border border-white/30 transition-colors"
              title="Refresh statistics"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
            <label className="text-sm font-medium text-indigo-100">Time Period:</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="px-4 py-2 bg-white/20 dark:bg-gray-800/50 text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-semibold cursor-pointer"
            >
              <option value="1h" className="bg-gray-800 text-white">Last 1 Hour</option>
              <option value="24h" className="bg-gray-800 text-white">Last 24 Hours</option>
              <option value="7d" className="bg-gray-800 text-white">Last 7 Days</option>
              <option value="30d" className="bg-gray-800 text-white">Last 30 Days</option>
              <option value="all" className="bg-gray-800 text-white">All Time</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {userMetrics.length > 0 ? (
            userMetrics.map((stat) => (
              <div 
                key={stat.id} 
                className="bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 relative group"
                title={getMetricTooltip(stat.id, timePeriod)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <HelpCircle className="w-4 h-4 text-indigo-200/60" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-5xl font-bold text-white">
                    {stat.id === "verified-users" 
                      ? (timePeriod === "all"
                          ? `${stat.value.toFixed(2)}%`
                          : formatNumber(stat.value))
                      : formatNumber(stat.value)}
                  </div>
                  {stat.change !== undefined && (
                    <div className="flex flex-col items-end gap-1">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${
                        stat.change > 0 
                          ? "bg-green-500/20 text-green-100" 
                          : stat.change < 0 
                          ? "bg-red-500/20 text-red-100" 
                          : "bg-gray-500/20 text-gray-100"
                      }`}>
                        {stat.change > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : stat.change < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : null}
                        {stat.change > 0 ? "+" : ""}{stat.change}%
                      </div>
                      <span className="text-xs text-indigo-200/80">
                        vs previous {timePeriod === "1h" ? "1h" : timePeriod === "24h" ? "24h" : timePeriod === "7d" ? "7d" : timePeriod === "30d" ? "30d" : "30d"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-indigo-100 mb-2 font-medium flex items-center gap-1">
                  {stat.label}
                  <HelpCircle className="w-3 h-3 text-indigo-200/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-indigo-200 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Updated {formatDistanceToNow(stat.lastUpdated, { addSuffix: true })} • {getTimePeriodLabel()}
                </div>
              </div>
            ))
          ) : loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-indigo-100 text-lg">Loading user metrics...</p>
            </div>
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-indigo-100 text-lg">Unable to load user metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Platform Content Stats */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-12 text-white text-center shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Platform Content Stats</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log("HomepageStats: Manual refresh triggered");
                fetchStats();
                fetchStorageStats();
                fetchEmploymentStats();
              }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg border border-white/30 transition-colors"
              title="Refresh statistics"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
            <label className="text-sm font-medium text-indigo-100">Time Period:</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="px-4 py-2 bg-white/20 dark:bg-gray-800/50 text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm font-semibold cursor-pointer"
            >
              <option value="1h" className="bg-gray-800 text-white">Last 1 Hour</option>
              <option value="24h" className="bg-gray-800 text-white">Last 24 Hours</option>
              <option value="7d" className="bg-gray-800 text-white">Last 7 Days</option>
              <option value="30d" className="bg-gray-800 text-white">Last 30 Days</option>
              <option value="all" className="bg-gray-800 text-white">All Time</option>
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {stats.filter(s => s.id !== "total-files" && s.id !== "storage-used" && s.id !== "avg-storage-per-user").length > 0 ? (
            stats.filter(s => s.id !== "total-files" && s.id !== "storage-used" && s.id !== "avg-storage-per-user").map((stat) => (
            <div 
              key={stat.id} 
              className="bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 relative group"
              title={getMetricTooltip(stat.id, timePeriod)}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <HelpCircle className="w-4 h-4 text-indigo-200/60" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-5xl font-bold text-white">
                  {stat.id === "verified-users" 
                    ? (timePeriod === "all"
                        ? `${stat.value.toFixed(2)}%`
                        : formatNumber(stat.value))
                    : formatNumber(stat.value)}
                </div>
                {stat.change !== undefined && (
                  <div className="flex flex-col items-end gap-1">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${
                      stat.change > 0 
                        ? "bg-green-500/20 text-green-100" 
                        : stat.change < 0 
                        ? "bg-red-500/20 text-red-100" 
                        : "bg-gray-500/20 text-gray-100"
                    }`}>
                      {stat.change > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : stat.change < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : null}
                      {stat.change > 0 ? "+" : ""}{stat.change}%
                    </div>
                    <span className="text-xs text-indigo-200/80">
                      vs previous {timePeriod === "1h" ? "1h" : timePeriod === "24h" ? "24h" : timePeriod === "7d" ? "7d" : timePeriod === "30d" ? "30d" : "30d"}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-indigo-100 mb-2 font-medium flex items-center gap-1">
                {stat.label}
                <HelpCircle className="w-3 h-3 text-indigo-200/60 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xs text-indigo-200 flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Updated {formatDistanceToNow(stat.lastUpdated, { addSuffix: true })} • {getTimePeriodLabel()}
              </div>
            </div>
          ))
          ) : loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-indigo-100 text-lg">Loading statistics...</p>
              <p className="text-indigo-200/80 text-sm mt-2">Please wait while we fetch the latest data.</p>
            </div>
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-indigo-100 text-lg">Unable to load statistics</p>
              <p className="text-indigo-200/80 text-sm mt-2">Please check your connection and try refreshing the page.</p>
              <button
                onClick={() => fetchStats()}
                className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reaction Breakdown */}
      {Object.keys(reactionBreakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
            Reaction Types Across the Platform
          </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(reactionBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div
                  key={type}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 text-center border border-indigo-200 dark:border-indigo-800"
                >
                  <div className="text-3xl mb-2">
                    {type === "like" && "👍"}
                    {type === "love" && "❤️"}
                    {type === "laugh" && "😂"}
                    {type === "wow" && "😮"}
                    {type === "sad" && "😢"}
                    {type === "angry" && "😠"}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatNumber(count)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {reactionLabels[type] || type}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Employment Status Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Employment Status Across the Platform
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</label>
            <select
              value={employmentTimePeriod}
              onChange={(e) => {
                const newPeriod = e.target.value as TimePeriod;
                setEmploymentTimePeriod(newPeriod);
                fetchEmploymentStats(newPeriod);
              }}
              disabled={employmentLoading}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold cursor-pointer"
            >
              <option value="1h" className="bg-white dark:bg-gray-800">Last 1 Hour</option>
              <option value="24h" className="bg-white dark:bg-gray-800">Last 24 Hours</option>
              <option value="7d" className="bg-white dark:bg-gray-800">Last 7 Days</option>
              <option value="30d" className="bg-white dark:bg-gray-800">Last 30 Days</option>
              <option value="all" className="bg-white dark:bg-gray-800">All Time</option>
            </select>
          </div>
        </div>
        {employmentLoading || Object.keys(employmentBreakdown).length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-2">Please select a time period to view our platform employment statistics</p>
            <p className="text-sm">Use the dropdown above to choose a time period (1 hour, 24 hours, 7 days, 30 days, or all time)</p>
          </div>
        ) : (
          <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(() => {
              // Calculate total for percentage calculations
              const total = Object.values(employmentBreakdown)
                .reduce((sum, data) => sum + data.current, 0);
              
              return Object.entries(employmentBreakdown)
                .sort(([, a], [, b]) => b.current - a.current)
                .map(([status, data]) => {
                  const percentage = total > 0 ? ((data.current / total) * 100).toFixed(1) : "0.0";
                  const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
                    looking_for_job: {
                      label: "Looking for Job",
                      color: "text-blue-700 dark:text-blue-300",
                      bgColor: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                      icon: "🔍",
                    },
                    employed: {
                      label: "Employed",
                      color: "text-green-700 dark:text-green-300",
                      bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                      icon: "💼",
                    },
                    business_owner: {
                      label: "Business Owner",
                      color: "text-purple-700 dark:text-purple-300",
                      bgColor: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
                      icon: "🏢",
                    },
                    freelancer: {
                      label: "Freelancer",
                      color: "text-orange-700 dark:text-orange-300",
                      bgColor: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
                      icon: "👤",
                    },
                    student: {
                      label: "Student",
                      color: "text-indigo-700 dark:text-indigo-300",
                      bgColor: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
                      icon: "🎓",
                    },
                    unemployed: {
                      label: "Unemployed",
                      color: "text-gray-700 dark:text-gray-300",
                      bgColor: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                      icon: "☕",
                    },
                    retired: {
                      label: "Retired",
                      color: "text-amber-700 dark:text-amber-300",
                      bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                      icon: "🏠",
                    },
                    not_specified: {
                      label: "Not Specified",
                      color: "text-gray-600 dark:text-gray-400",
                      bgColor: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                      icon: "❓",
                    },
                  };
                  
                  const config = statusConfig[status] || {
                    label: status,
                    color: "text-gray-700 dark:text-gray-300",
                    bgColor: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                    icon: "👤",
                  };
                
                  // Get tooltip text for this employment status
                  const periodLabel = employmentTimePeriod === "1h" ? "last hour" 
                    : employmentTimePeriod === "24h" ? "last 24 hours"
                    : employmentTimePeriod === "7d" ? "last 7 days"
                    : employmentTimePeriod === "30d" ? "last 30 days"
                    : "all time";
                  
                  const tooltipText = `Current percentage of users with "${config.label}" employment status. ${data.change !== undefined ? `This has ${data.change > 0 ? 'increased' : data.change < 0 ? 'decreased' : 'remained the same'} by ${Math.abs(data.change)}% compared to the ${periodLabel}.` : 'This shows the current distribution across all users.'}`;

                  return (
                    <div
                      key={status}
                      className={`${config.bgColor} rounded-xl p-4 text-center border ${config.color} relative group`}
                      title={tooltipText}
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="text-3xl mb-2">{config.icon}</div>
                      <div className="text-2xl font-bold mb-1">
                        {percentage}%
                      </div>
                      <div className="text-sm font-medium mb-1">{config.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {formatNumber(data.current)} {data.current === 1 ? "user" : "users"}
                      </div>
                      {data.change !== undefined && (
                        <div className={`flex items-center justify-center gap-1 text-xs ${
                          data.change > 0 
                            ? "text-green-600 dark:text-green-400" 
                            : data.change < 0 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {data.change > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : data.change < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {data.change > 0 ? "+" : ""}{data.change}%
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            vs prev {employmentTimePeriod === "1h" ? "1h" : employmentTimePeriod === "24h" ? "24h" : employmentTimePeriod === "7d" ? "7d" : employmentTimePeriod === "30d" ? "30d" : "30d"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                });
            })()}
          </div>
          
          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid md:grid-cols-3 gap-4">
              {(() => {
                // Total includes all statuses (including not_specified)
                const total = Object.values(employmentBreakdown)
                  .reduce((sum, data) => sum + data.current, 0);
                
                const lookingForJob = employmentBreakdown.looking_for_job?.current || 0;
                const employed = employmentBreakdown.employed?.current || 0;
                const businessOwner = employmentBreakdown.business_owner?.current || 0;
                const freelancer = employmentBreakdown.freelancer?.current || 0;
                const student = employmentBreakdown.student?.current || 0;
                const unemployed = employmentBreakdown.unemployed?.current || 0;
                const retired = employmentBreakdown.retired?.current || 0;
                const notSpecified = employmentBreakdown.not_specified?.current || 0;
                
                // Active workforce and job seekers exclude "not_specified" for meaningful metrics
                const activeWorkforce = employed + businessOwner + freelancer;
                const jobSeekers = lookingForJob + unemployed;
                // For employment rate, calculate as percentage of users who specified their status
                const specifiedTotal = total - notSpecified;
                const employmentRate = specifiedTotal > 0 ? ((activeWorkforce / specifiedTotal) * 100).toFixed(1) : "0.0";
                
                // Calculate previous period totals for percentage change
                // Use previousTotal which represents total counts at the start of current period
                const lookingForJobPrevious = employmentBreakdown.looking_for_job?.previousTotal || 0;
                const employedPrevious = employmentBreakdown.employed?.previousTotal || 0;
                const businessOwnerPrevious = employmentBreakdown.business_owner?.previousTotal || 0;
                const freelancerPrevious = employmentBreakdown.freelancer?.previousTotal || 0;
                const unemployedPrevious = employmentBreakdown.unemployed?.previousTotal || 0;
                const notSpecifiedPrevious = employmentBreakdown.not_specified?.previousTotal || 0;
                
                const activeWorkforcePrevious = employedPrevious + businessOwnerPrevious + freelancerPrevious;
                const jobSeekersPrevious = lookingForJobPrevious + unemployedPrevious;
                
                // Calculate previous period total
                const totalPrevious = Object.values(employmentBreakdown)
                  .reduce((sum, data) => sum + (data.previousTotal || 0), 0);
                const specifiedTotalPrevious = totalPrevious - notSpecifiedPrevious;
                
                // Calculate percentage changes
                const activeWorkforceChange = calculateChange(activeWorkforce, activeWorkforcePrevious);
                const jobSeekersChange = calculateChange(jobSeekers, jobSeekersPrevious);
                
                // Calculate previous employment rate
                const previousEmploymentRate = specifiedTotalPrevious > 0 
                  ? ((activeWorkforcePrevious / specifiedTotalPrevious) * 100) 
                  : 0;
                const currentEmploymentRateNum = parseFloat(employmentRate);
                const employmentRateChange = previousEmploymentRate > 0
                  ? Math.round(((currentEmploymentRateNum - previousEmploymentRate) / previousEmploymentRate) * 100)
                  : (currentEmploymentRateNum > 0 ? 100 : undefined);
                
                return (
                  <>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Workforce</div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {specifiedTotal > 0 ? ((activeWorkforce / specifiedTotal) * 100).toFixed(1) : "0.0"}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatNumber(activeWorkforce)} {activeWorkforce === 1 ? "user" : "users"}
                      </div>
                      {activeWorkforceChange !== undefined && (
                        <div className={`flex items-center gap-1 text-xs mt-2 ${
                          activeWorkforceChange > 0 
                            ? "text-green-600 dark:text-green-400" 
                            : activeWorkforceChange < 0 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {activeWorkforceChange > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : activeWorkforceChange < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {activeWorkforceChange > 0 ? "+" : ""}{activeWorkforceChange}%
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            vs prev {timePeriod === "1h" ? "1h" : timePeriod === "24h" ? "24h" : timePeriod === "7d" ? "7d" : timePeriod === "30d" ? "30d" : "30d"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Job Seekers</div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {specifiedTotal > 0 ? ((jobSeekers / specifiedTotal) * 100).toFixed(1) : "0.0"}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatNumber(jobSeekers)} {jobSeekers === 1 ? "user" : "users"}
                      </div>
                      {jobSeekersChange !== undefined && (
                        <div className={`flex items-center gap-1 text-xs mt-2 ${
                          jobSeekersChange > 0 
                            ? "text-green-600 dark:text-green-400" 
                            : jobSeekersChange < 0 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {jobSeekersChange > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : jobSeekersChange < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {jobSeekersChange > 0 ? "+" : ""}{jobSeekersChange}%
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            vs prev {timePeriod === "1h" ? "1h" : timePeriod === "24h" ? "24h" : timePeriod === "7d" ? "7d" : timePeriod === "30d" ? "30d" : "30d"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Employment Rate</div>
                      <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        {employmentRate}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getTimePeriodLabel()} • {specifiedTotal > 0 ? ((specifiedTotal / total) * 100).toFixed(1) : "0"}% specified
                      </div>
                      {employmentRateChange !== undefined && (
                        <div className={`flex items-center gap-1 text-xs mt-2 ${
                          employmentRateChange > 0 
                            ? "text-green-600 dark:text-green-400" 
                            : employmentRateChange < 0 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {employmentRateChange > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : employmentRateChange < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {employmentRateChange > 0 ? "+" : ""}{employmentRateChange}%
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            vs prev {employmentTimePeriod === "1h" ? "1h" : employmentTimePeriod === "24h" ? "24h" : employmentTimePeriod === "7d" ? "7d" : employmentTimePeriod === "30d" ? "30d" : "30d"}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Storage Metrics Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Storage Metrics Across the Platform
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</label>
            <select
              value={storageTimePeriod}
              onChange={(e) => {
                const newPeriod = e.target.value as TimePeriod;
                setStorageTimePeriod(newPeriod);
                fetchStorageStats(newPeriod);
              }}
              disabled={storageLoading}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold cursor-pointer"
            >
              <option value="1h" className="bg-white dark:bg-gray-800">Last 1 Hour</option>
              <option value="24h" className="bg-white dark:bg-gray-800">Last 24 Hours</option>
              <option value="7d" className="bg-white dark:bg-gray-800">Last 7 Days</option>
              <option value="30d" className="bg-white dark:bg-gray-800">Last 30 Days</option>
              <option value="all" className="bg-white dark:bg-gray-800">All Time</option>
            </select>
          </div>
        </div>
        {storageLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Loading storage metrics...</p>
          </div>
        ) : storageStats.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {storageStats.map((stat) => (
                <div
                  key={stat.id}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 text-center border border-indigo-200 dark:border-indigo-800 relative group"
                  title={getMetricTooltip(stat.id, storageTimePeriod)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <HelpCircle className="w-4 h-4 text-indigo-400/60" />
                  </div>
                  <div className="text-3xl mb-2">
                    {stat.id === "total-files" && "📁"}
                    {stat.id === "storage-used" && "💾"}
                    {stat.id === "avg-storage-per-user" && "📊"}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.id === "storage-used" || stat.id === "avg-storage-per-user" 
                      ? (() => {
                          const formatted = formatStorage(stat.value);
                          return `${formatted.value} ${formatted.unit}`;
                        })()
                      : formatNumber(stat.value)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center justify-center gap-1">
                    {stat.label}
                    <HelpCircle className="w-3 h-3 text-indigo-400/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {stat.change !== undefined && (
                    <div className={`flex items-center justify-center gap-1 text-xs ${
                      stat.change > 0 
                        ? "text-green-600 dark:text-green-400" 
                        : stat.change < 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {stat.change > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : stat.change < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {stat.change > 0 ? "+" : ""}{stat.change}%
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        vs prev {storageTimePeriod === "1h" ? "1h" : storageTimePeriod === "24h" ? "24h" : storageTimePeriod === "7d" ? "7d" : storageTimePeriod === "30d" ? "30d" : "30d"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Loading storage metrics...</p>
          </div>
        )}
      </div>
    </div>
  );
}

