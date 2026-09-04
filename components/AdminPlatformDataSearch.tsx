"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Save,
  Loader2,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  User,
  FileText,
  Eye,
  MessageSquare,
  Heart,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Target,
  BarChart3,
  Settings,
  Bookmark,
  BookmarkCheck,
  Percent,
  DollarSign,
  TrendingUp as TrendingUpIcon,
  Info
} from "lucide-react";
import Link from "next/link";

interface AdminPlatformDataSearchProps {
  supabase: any;
  currentUserId: string;
}

interface SearchFilter {
  id: string;
  category: string;
  type: string;
  label: string;
  value: any;
  value2?: any; // Second value for "between" operator
  baseFilterId: string; // Store the original filter ID for parameter mapping
  operator?: 'equals' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'contains' | 'between' | 'any';
  timePeriod?: 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'all_time' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  groupId?: string; // For AND/OR grouping
  logicOperator?: 'AND' | 'OR'; // Logic operator before this filter
}

interface SearchResult {
  clerk_id: string;
  display_name: string;
  email: string;
  created_at: string;
  subscription_plan: string;
  is_suspended: boolean;
  total_posts?: number;
  total_followers?: number;
  profile_views_count?: number;
  days_since_last_login?: number;
  flags_count?: number;
  suspensions_count?: number;
  [key: string]: any;
}

interface SavedPreset {
  id: string;
  name: string;
  description?: string;
  filters: SearchFilter[];
  created_at: string;
}

interface Analytics {
  totalUsers: number;
  matchingUsers: number;
  percentage: number;
  byPlan: Record<string, { count: number; percentage: number }>;
  byStatus: { active: number; suspended: number };
  averagePosts: number;
  averageFollowers: number;
}

const TIME_PERIODS = [
  { id: 'last_7_days', label: 'Last 7 Days', days: 7 },
  { id: 'last_30_days', label: 'Last 30 Days', days: 30 },
  { id: 'this_month', label: 'This Month', months: 0 },
  { id: 'last_month', label: 'Last Month', months: 1 },
  { id: 'last_3_months', label: 'Last 3 Months', months: 3 },
  { id: 'last_6_months', label: 'Last 6 Months', months: 6 },
  { id: 'last_year', label: 'Last Year', months: 12 },
  { id: 'all_time', label: 'All Time' },
  { id: 'custom', label: 'Custom Date Range' }
];

const FILTER_CATEGORIES = {
  activity: {
    label: "Activity & Engagement",
    icon: Activity,
    color: "blue",
    filters: [
      { id: "account_active_days", label: "Account Active Days", type: "number", placeholder: "e.g., 30", hasTimePeriod: false, tooltip: "Finds users who have been active (logged in or had activity) for more than the specified number of days." },
      { id: "account_inactive_days", label: "Account Inactive Days", type: "number", placeholder: "e.g., 30", hasTimePeriod: false, tooltip: "Finds users who haven't logged in or visited the platform for at least the specified number of days." },
      { id: "post_count", label: "Post Count", type: "number", placeholder: "e.g., 10", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have created a specific number of posts in the selected time period." },
      { id: "post_created_date", label: "Post Created Date", type: "number", placeholder: "e.g., 7 days ago", hasTimePeriod: false, tooltip: "Finds users who haven't created a new post in at least the specified number of days." },
      { id: "post_draft_count", label: "Post Draft Count", type: "number", placeholder: "e.g., 3", hasTimePeriod: false, tooltip: "Finds users who have a specific number of draft posts saved." },
      { id: "post_deleted_count", label: "Post Deleted Count", type: "number", placeholder: "e.g., 5", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have deleted a specific number of posts in the selected time period." },
      { id: "post_engagement_rate", label: "Post Engagement Rate", type: "number", placeholder: "e.g., 50%", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose posts have an engagement rate (likes, comments, views) above a certain percentage in the selected time period." },
      { id: "never_posted", label: "Never Posted", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who have created an account but have never published any posts." },
      { id: "has_drafts_no_posts", label: "Has Drafts But No Published Posts", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who have saved draft posts but have never published any." },
      { id: "posting_spike", label: "Posting Spike", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users who have posted significantly more in the selected period compared to their average posting rate." },
      { id: "activity_weekend_only", label: "Activity - Weekend Only", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who only post on weekends (Saturday and Sunday) and never post on weekdays." },
      { id: "activity_weekday_only", label: "Activity - Weekday Only", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who only post on weekdays (Monday to Friday) and never post on weekends." },
      { id: "account_created_never_returned", label: "Account Created But Never Returned", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who created an account but have never logged in again after their initial signup." },
    ]
  },
  views: {
    label: "Views & Visibility",
    icon: Eye,
    color: "cyan",
    filters: [
      { id: "profile_view_count", label: "Profile View Count", type: "number", placeholder: "e.g., 100", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose profile has been viewed a specific number of times in the selected time period." },
      { id: "profile_view_unique_viewers", label: "Profile Unique Viewers", type: "number", placeholder: "e.g., 50", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose profile has been viewed by a specific number of unique users in the selected time period." },
      { id: "post_view_count", label: "Post View Count", type: "number", placeholder: "e.g., 500", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose posts have been viewed a specific number of times in the selected time period." },
      { id: "post_view_unique_viewers", label: "Post Unique Viewers", type: "number", placeholder: "e.g., 200", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose posts have been viewed by a specific number of unique users in the selected time period." },
      { id: "portfolio_view_count", label: "Portfolio View Count", type: "number", placeholder: "e.g., 50", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose portfolio has been viewed a specific number of times in the selected time period." },
      { id: "portfolio_view_unique_viewers", label: "Portfolio Unique Viewers", type: "number", placeholder: "e.g., 30", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose portfolio has been viewed by a specific number of unique users in the selected time period." },
    ]
  },
  comments: {
    label: "Comments & Interactions",
    icon: MessageSquare,
    color: "teal",
    filters: [
      { id: "comment_received_count", label: "Comments Received Count", type: "number", placeholder: "e.g., 20", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users who have received a specific number of comments on their posts in the selected time period." },
      { id: "comment_given_count", label: "Comments Given Count", type: "number", placeholder: "e.g., 30", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users who have commented on posts a specific number of times in the selected time period." },
      { id: "comment_replied_count", label: "Comments Replied To Count", type: "number", placeholder: "e.g., 10", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users who have replied to comments on their posts a specific number of times in the selected time period." },
      { id: "comment_deleted_count", label: "Comments Deleted Count", type: "number", placeholder: "e.g., 5", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have deleted a specific number of their own comments in the selected time period." },
      { id: "never_commented", label: "Never Commented", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who have never commented on any posts." },
      { id: "comments_received_no_response", label: "Comments Received But No Response", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who have received comments but have never responded to any." },
      { id: "comment_engagement_rate", label: "Comment Engagement Rate", type: "number", placeholder: "e.g., 50%", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose comment engagement rate (replies to received comments) is above a certain percentage in the selected time period." },
    ]
  },
  subscription: {
    label: "Subscription & Account",
    icon: Zap,
    color: "purple",
    filters: [
      { id: "plan_name", label: "Subscription Plan", type: "select", options: ["free", "pro", "ultimate"], hasTimePeriod: false, tooltip: "Filters users by their current subscription plan (Free, Pro, or Ultimate)." },
      { id: "account_suspension_status", label: "Account Suspension Status", type: "select", options: ["suspended", "active", "any"], hasTimePeriod: false, tooltip: "Filters users by their account suspension status. Can find suspended users, active users, or all users." },
      { id: "account_suspension_count", label: "Account Suspension Count", type: "number", placeholder: "e.g., 2", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have been suspended a specific number of times in the selected time period." },
      { id: "account_created_date", label: "Account Created Date", type: "number", placeholder: "e.g., 30 days ago", hasTimePeriod: false, tooltip: "Finds users who created their account more than X days ago." },
      { id: "account_last_active", label: "Account Last Active", type: "number", placeholder: "e.g., 7 days ago", hasTimePeriod: false, tooltip: "Finds users who were last active more than X days ago." },
      { id: "subscription_expires_days", label: "Subscription Expires Within X Days", type: "number", placeholder: "e.g., 7", hasTimePeriod: false, tooltip: "Finds users whose subscription will expire within the specified number of days." },
      { id: "subscription_status", label: "Subscription Status", type: "select", options: ["active", "cancelled", "expired", "trial"], hasTimePeriod: false, tooltip: "Filters users by their subscription status." },
      { id: "subscription_renewal_date", label: "Subscription Renewal Date", type: "number", placeholder: "e.g., 7 days", hasTimePeriod: false, tooltip: "Finds users whose subscription renews within X days." },
      { id: "near_usage_limit", label: "Near Usage Limits", type: "boolean", hasTimePeriod: false, tooltip: "Finds free-plan users who are approaching their usage limits (posts, storage, connections, etc.)." },
      { id: "plan_change_downgrade", label: "Plan Changed - Downgraded", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have downgraded their subscription plan in the selected time period." },
      { id: "plan_change_upgrade", label: "Plan Changed - Upgraded", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have upgraded their subscription plan in the selected time period." },
      { id: "plan_change_date", label: "Plan Changed Date", type: "number", placeholder: "e.g., 30 days ago", hasTimePeriod: false, tooltip: "Finds users who changed their plan more than X days ago." },
      { id: "account_verification_status", label: "Account Verification Status", type: "select", options: ["verified", "unverified", "any"], hasTimePeriod: false, tooltip: "Filters users by their account verification status." },
      { id: "account_suspended_date", label: "Account Suspended Date", type: "number", placeholder: "e.g., 7 days ago", hasTimePeriod: false, tooltip: "Finds users who were suspended more than X days ago." },
      { id: "account_unsuspended_date", label: "Account Unsuspended Date", type: "number", placeholder: "e.g., 7 days ago", hasTimePeriod: false, tooltip: "Finds users who were unsuspended more than X days ago." },
      { id: "account_suspended_in_period", label: "Account Suspended In Period", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who were suspended in the selected time period." },
      { id: "account_unsuspended_in_period", label: "Account Unsuspended In Period", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who were unsuspended in the selected time period." },
      { id: "plan_on_date", label: "Plan On Date", type: "number", placeholder: "e.g., 30 days ago", hasTimePeriod: false, tooltip: "Finds users who were on a specific plan X days ago." },
    ]
  },
  billing: {
    label: "Billing & Payments",
    icon: DollarSign,
    color: "orange",
    filters: [
      { id: "has_payment_failed", label: "Has failed payments", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have had failed payment attempts in the selected time period." },
      { id: "min_payment_failures", label: "More than X payment failures", type: "number", placeholder: "e.g., 2", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have had more than the specified number of failed payment attempts in the selected time period." },
      { id: "subscription_status", label: "Subscription status", type: "select", options: ["active", "cancelled", "expired", "trial"], hasTimePeriod: false, tooltip: "Filters users by their subscription status." },
      { id: "on_trial", label: "Currently on trial", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who are currently on a trial subscription." },
      { id: "trial_expiring_days", label: "Trial expiring within X days", type: "number", placeholder: "e.g., 3", hasTimePeriod: false, tooltip: "Finds users whose trial will expire within the specified number of days." },
    ]
  },
  engagement: {
    label: "Engagement & Social",
    icon: Heart,
    color: "pink",
    filters: [
      { id: "min_profile_views", label: "More than X profile views this week", type: "number", placeholder: "e.g., 100", tooltip: "Finds users whose profile has been viewed more than the specified number of times in the last 7 days. Useful for identifying popular or trending profiles." },
      { id: "min_followers", label: "More than X followers", type: "number", placeholder: "e.g., 50", tooltip: "Finds users who have more than the specified number of followers. Useful for identifying influencers or popular users." },
      { id: "max_followers", label: "Less than X followers", type: "number", placeholder: "e.g., 10", tooltip: "Finds users who have fewer than the specified number of followers. Useful for identifying new or less popular users." },
      { id: "follows_many_few_followers", label: "Follows many but has few followers", type: "boolean", tooltip: "Finds users who follow many other users but have relatively few followers themselves. May indicate users who are actively engaging but haven't built their own following yet." },
      { id: "likes_but_no_posts", label: "Liked posts but never created any", type: "boolean", tooltip: "Finds users who have liked/reacted to posts but have never created any posts themselves. Useful for identifying passive users who may need encouragement to create content." },
      { id: "received_messages_no_response", label: "Received messages but never responded", type: "boolean", tooltip: "Finds users who have received direct messages but have never responded to any. May indicate users who need help with messaging or are inactive in conversations." },
      { id: "posting_multiple_categories", label: "Posting in multiple categories/skills", type: "boolean", tooltip: "Finds users who have posted content in multiple different categories or skill areas. Useful for identifying versatile content creators." },
    ]
  },
  profile: {
    label: "Profile & Portfolio",
    icon: User,
    color: "green",
    filters: [
      { id: "profile_view_count", label: "Profile View Count", type: "number", placeholder: "e.g., 100", hasTimePeriod: true, defaultTimePeriod: 'last_7_days', tooltip: "Finds users whose profile has been viewed a specific number of times in the selected time period." },
      { id: "profile_completion_percentage", label: "Profile Completion Percentage", type: "number", placeholder: "e.g., 50%", hasTimePeriod: false, tooltip: "Finds users whose profile completion is below a certain percentage (based on required fields like bio, location, skills, etc.)." },
      { id: "profile_bio_missing", label: "Profile Bio Missing", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who haven't added a bio to their profile." },
      { id: "profile_location_missing", label: "Profile Location Missing", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who haven't added their location to their profile." },
      { id: "profile_skills_missing", label: "Profile Skills Missing", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who haven't added any skills to their profile." },
      { id: "profile_updated", label: "Profile Updated", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have updated their profile information (bio, location, skills, etc.) in the selected time period." },
      { id: "portfolio_item_count", label: "Portfolio Item Count", type: "number", placeholder: "e.g., 5", hasTimePeriod: false, tooltip: "Finds users who have a specific number of portfolio items (uploaded projects)." },
      { id: "portfolio_items_missing", label: "Portfolio Items Missing", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who haven't uploaded any portfolio items or projects." },
      { id: "portfolio_updated_days", label: "Portfolio Updated Within X Days", type: "number", placeholder: "e.g., 30", hasTimePeriod: false, tooltip: "Finds users who have updated their portfolio (added, edited, or removed portfolio items) within the specified number of days." },
      { id: "portfolio_last_updated", label: "Portfolio Last Updated", type: "number", placeholder: "e.g., 6 months ago", hasTimePeriod: false, tooltip: "Finds users whose portfolio was last updated more than X months ago." },
      { id: "portfolio_item_added", label: "Portfolio Item Added", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have added a new portfolio item in the selected time period." },
      { id: "portfolio_item_removed", label: "Portfolio Item Removed", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have removed a portfolio item in the selected time period." },
      { id: "portfolio_item_updated", label: "Portfolio Item Updated", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have updated an existing portfolio item in the selected time period." },
    ]
  },
  moderation: {
    label: "Moderation & Safety",
    icon: Shield,
    color: "red",
    filters: [
      { id: "user_report_count", label: "User Report Count", type: "number", placeholder: "e.g., 3", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have been reported by a specific number of other users in the selected time period." },
      { id: "content_report_count", label: "Content Report Count", type: "number", placeholder: "e.g., 5", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users whose content (posts, comments) has been reported a specific number of times in the selected time period." },
      { id: "account_suspension_count", label: "Account Suspension Count", type: "number", placeholder: "e.g., 2", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have been suspended a specific number of times in the selected time period." },
      { id: "account_warning_count", label: "Account Warning Count", type: "number", placeholder: "e.g., 3", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have received a specific number of warnings in the selected time period." },
      { id: "banned_content_posted", label: "Banned Content Posted", type: "boolean", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have posted content that was flagged as banned or violating platform policies." },
      { id: "content_deleted_count", label: "Content Deleted Count", type: "number", placeholder: "e.g., 5", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have had a specific number of posts or comments deleted by moderators in the selected time period." },
      { id: "failed_login_attempts", label: "Failed Login Attempts", type: "number", placeholder: "e.g., 5", hasTimePeriod: true, defaultTimePeriod: 'last_30_days', tooltip: "Finds users who have had more than the specified number of failed login attempts in the selected time period." },
      { id: "support_ticket_count", label: "Support Ticket Count", type: "number", placeholder: "e.g., 3", hasTimePeriod: true, defaultTimePeriod: 'all_time', tooltip: "Finds users who have opened a specific number of support tickets in the selected time period." },
      { id: "support_ticket_open", label: "Open Support Tickets", type: "boolean", hasTimePeriod: false, tooltip: "Finds users who currently have open support tickets." },
    ]
  },
  general: {
    label: "General",
    icon: Target,
    color: "indigo",
    filters: [
      { id: "joined_last_hours", label: "Joined in last X hours", type: "number", placeholder: "e.g., 24", tooltip: "Finds users who created their account within the specified number of hours. Useful for identifying very new users who may need onboarding support." },
      { id: "returned_after_months", label: "Returned after X months inactivity", type: "number", placeholder: "e.g., 6", tooltip: "Finds users who were inactive for the specified number of months but have returned and been active in the last 7 days. Useful for identifying re-engaged users." },
    ]
  }
};

// Filter Button Component with Tooltip
const FilterButton = ({ filterDef, onClick }: { filterDef: any; onClick: () => void }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {filterDef.label}
            </div>
            {filterDef.placeholder && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filterDef.placeholder}
              </div>
            )}
          </div>
          {filterDef.tooltip && (
            <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          )}
        </div>
      </button>
      {filterDef.tooltip && showTooltip && (
        <div 
          className="absolute z-50 bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl pointer-events-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="whitespace-normal leading-relaxed">{filterDef.tooltip}</p>
          <div className="absolute top-full left-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Template Button Component with Tooltip
const TemplateButton = ({ template, isSelected, onClick }: { template: any; isSelected: boolean; onClick: () => void }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full p-3 rounded-lg border text-left transition-colors ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-white">{template.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.description}</div>
          </div>
          {template.tooltip && (
            <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          )}
        </div>
      </button>
      {template.tooltip && showTooltip && (
        <div 
          className="absolute z-50 bottom-full left-0 mb-2 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl pointer-events-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="whitespace-normal leading-relaxed">{template.tooltip}</p>
          <div className="absolute top-full left-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const PREDEFINED_TEMPLATES = [
  {
    id: "active_users",
    name: "Active Users",
    description: "Users active for more than 30 days",
    tooltip: "Quickly find users who have been active (logged in or had activity) for more than 30 days. Useful for identifying your core engaged user base and understanding long-term user retention.",
    category: "activity",
    filters: [{ id: "min_days_active", value: 30 }]
  },
  {
    id: "inactive_users",
    name: "Inactive Users",
    description: "Users not logged in for 30+ days",
    tooltip: "Find users who haven't logged in or visited the platform for at least 30 days. Perfect for re-engagement campaigns and identifying users at risk of churning.",
    category: "activity",
    filters: [{ id: "max_days_inactive", value: 30 }]
  },
  {
    id: "never_posted",
    name: "Never Posted",
    description: "Users who signed up but never posted",
    tooltip: "Identify users who created an account but have never published any posts. Great for targeting users who may need encouragement to start creating content or onboarding support.",
    category: "activity",
    filters: [{ id: "never_posted", value: true }]
  },
  {
    id: "suspended_premium",
    name: "Suspended Premium Users",
    description: "Premium users with suspended accounts",
    tooltip: "Find Pro or Ultimate plan users who have suspended accounts. Important for customer support to address premium user issues and potential refund/retention efforts.",
    category: "subscription",
    filters: [
      { id: "plan_name", value: "pro" },
      { id: "is_suspended", value: "true" }
    ]
  },
  {
    id: "expiring_subscriptions",
    name: "Expiring Subscriptions",
    description: "Subscriptions expiring within 7 days",
    tooltip: "Identify users whose subscriptions will expire within 7 days. Critical for retention campaigns, renewal reminders, and preventing subscription churn.",
    category: "subscription",
    filters: [{ id: "subscription_expires_days", value: 7 }]
  },
  {
    id: "high_engagement",
    name: "High Engagement Users",
    description: "Users with 100+ profile views this week",
    tooltip: "Find users whose profiles have been viewed 100+ times in the last 7 days. Useful for identifying popular users, potential influencers, or users with trending content.",
    category: "engagement",
    filters: [{ id: "min_profile_views", value: 100 }]
  },
  {
    id: "incomplete_profiles",
    name: "Incomplete Profiles",
    description: "Users with incomplete profile information",
    tooltip: "Find users whose profiles are missing key information (bio, location, etc.). Perfect for profile completion campaigns and improving overall profile quality across the platform.",
    category: "profile",
    filters: [{ id: "incomplete_profile", value: true }]
  },
  {
    id: "problematic_users",
    name: "Problematic Users",
    description: "Users flagged 3+ times",
    tooltip: "Identify users who have been flagged or reported by 3 or more other users. Essential for moderation teams to review potentially problematic accounts and take appropriate action.",
    category: "moderation",
    filters: [{ id: "min_flags", value: 3 }]
  },
  {
    id: "new_users_24h",
    name: "New Users (24h)",
    description: "Users who joined in the last 24 hours",
    tooltip: "Find users who created their account within the last 24 hours. Perfect for onboarding campaigns, welcome messages, and tracking new user acquisition in real-time.",
    category: "general",
    filters: [{ id: "joined_last_hours", value: 24 }]
  },
  {
    id: "returning_users",
    name: "Returning Users",
    description: "Users returning after 6+ months",
    tooltip: "Identify users who were inactive for 6+ months but have returned and been active in the last 7 days. Great for understanding re-engagement success and welcoming back returning users.",
    category: "general",
    filters: [{ id: "returned_after_months", value: 6 }]
  }
];

interface QueryGroup {
  id: string;
  category: string;
  categoryLabel: string;
  filters: SearchFilter[];
  logicOperator?: 'AND' | 'OR'; // Logic operator before this query group
}

export function AdminPlatformDataSearch({ supabase, currentUserId }: AdminPlatformDataSearchProps) {
  const [queryGroups, setQueryGroups] = useState<QueryGroup[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [resultsPerPage] = useState(50);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Modal states
  const [showQueryBuilderModal, setShowQueryBuilderModal] = useState(false);
  const [modalStep, setModalStep] = useState<'category' | 'filters'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentQueryFilters, setCurrentQueryFilters] = useState<SearchFilter[]>([]);
  const [editingQueryGroupId, setEditingQueryGroupId] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  useEffect(() => {
    loadSavedPresets();
  }, []);

  const loadSavedPresets = async () => {
    try {
      const saved = localStorage.getItem('platform_search_presets');
      if (saved) {
        setSavedPresets(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading presets:", error);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    
    // Flatten query groups to filters for saving
    const allFilters: SearchFilter[] = [];
    queryGroups.forEach(group => {
      allFilters.push(...group.filters);
    });
    
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: presetName,
      description: presetDescription,
      filters: allFilters,
      created_at: new Date().toISOString()
    };

    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('platform_search_presets', JSON.stringify(updated));
    setShowSavePreset(false);
    setPresetName("");
    setPresetDescription("");
  };

  const loadPreset = (preset: SavedPreset) => {
    // Convert preset filters to query groups by category
    const groupsByCategory: Record<string, SearchFilter[]> = {};
    preset.filters.forEach(filter => {
      if (!groupsByCategory[filter.category]) {
        groupsByCategory[filter.category] = [];
      }
      groupsByCategory[filter.category].push(filter);
    });
    
    const groups: QueryGroup[] = Object.entries(groupsByCategory).map(([category, filters], index) => {
      const categoryInfo = FILTER_CATEGORIES[category as keyof typeof FILTER_CATEGORIES];
      return {
        id: `query_${Date.now()}_${index}`,
        category,
        categoryLabel: categoryInfo?.label || category,
        filters,
        logicOperator: index > 0 ? 'AND' : undefined
      };
    });
    
    setQueryGroups(groups);
    setSelectedTemplate(preset.id);
  };

  const deletePreset = (presetId: string) => {
    const updated = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updated);
    localStorage.setItem('platform_search_presets', JSON.stringify(updated));
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Helper function to calculate date range from time period
  const getDateRange = (timePeriod: string, customStart?: string, customEnd?: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (timePeriod === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else if (timePeriod === 'last_7_days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timePeriod === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (timePeriod === 'last_3_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (timePeriod === 'last_6_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    } else if (timePeriod === 'last_year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      // all_time
      startDate = new Date(0); // Epoch start
    }

    return { startDate, endDate };
  };

  const addFilter = (categoryId: string, filterId: string) => {
    const category = FILTER_CATEGORIES[categoryId as keyof typeof FILTER_CATEGORIES];
    const filterDef = category.filters.find(f => f.id === filterId);
    
    if (!filterDef) return;

    const newFilter: SearchFilter = {
      id: `${filterId}_${Date.now()}`,
      category: categoryId,
      type: filterDef.type,
      label: filterDef.label,
      baseFilterId: filterId, // Store original ID for parameter mapping
      value: filterDef.type === "boolean" ? true : filterDef.type === "select" ? filterDef.options?.[0] || "" : "",
      operator: filterDef.type === "number" ? "greater_than" : "equals",
      timePeriod: (filterDef as any).hasTimePeriod ? ((filterDef as any).defaultTimePeriod || 'last_7_days') : undefined,
      logicOperator: activeFilters.length > 0 ? 'AND' : undefined
    };

    setActiveFilters([...activeFilters, newFilter]);
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== filterId));
  };

  const updateFilter = (filterId: string, field: string, value: any) => {
    setActiveFilters(activeFilters.map(f => 
      f.id === filterId ? { ...f, [field]: value } : f
    ));
  };

  const loadTemplate = (template: typeof PREDEFINED_TEMPLATES[0]) => {
    const filters: SearchFilter[] = template.filters.map((tf, idx) => {
      const filterDef = FILTER_CATEGORIES[template.category as keyof typeof FILTER_CATEGORIES].filters.find(f => f.id === tf.id);
      return {
        id: `${tf.id}_${Date.now()}_${idx}`,
        category: template.category,
        type: typeof tf.value === "boolean" ? "boolean" : typeof tf.value === "number" ? "number" : "select",
        label: filterDef?.label || "",
        baseFilterId: tf.id, // Store original ID
        value: tf.value,
        operator: typeof tf.value === "number" ? "greater_than" : "equals"
      };
    });
    
    const categoryInfo = FILTER_CATEGORIES[template.category as keyof typeof FILTER_CATEGORIES];
    const group: QueryGroup = {
      id: `query_${Date.now()}`,
      category: template.category,
      categoryLabel: categoryInfo?.label || template.category,
      filters,
      logicOperator: undefined
    };
    
    setQueryGroups([group]);
    setSelectedTemplate(template.id);
  };

  const calculateAnalytics = async (results: SearchResult[]) => {
    try {
      // Get total user count
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const totalUsers = totalCount || 0;
      const matchingUsers = results.length;
      const percentage = totalUsers > 0 ? (matchingUsers / totalUsers) * 100 : 0;

      // Calculate by plan
      const byPlan: Record<string, { count: number; percentage: number }> = {};
      results.forEach(r => {
        const plan = r.subscription_plan || 'free';
        if (!byPlan[plan]) {
          byPlan[plan] = { count: 0, percentage: 0 };
        }
        byPlan[plan].count++;
      });
      
      Object.keys(byPlan).forEach(plan => {
        byPlan[plan].percentage = matchingUsers > 0 ? (byPlan[plan].count / matchingUsers) * 100 : 0;
      });

      // Calculate by status
      const active = results.filter(r => !r.is_suspended).length;
      const suspended = results.filter(r => r.is_suspended).length;

      // Calculate averages
      const totalPosts = results.reduce((sum, r) => sum + (r.total_posts || 0), 0);
      const totalFollowers = results.reduce((sum, r) => sum + (r.total_followers || 0), 0);
      const averagePosts = matchingUsers > 0 ? totalPosts / matchingUsers : 0;
      const averageFollowers = matchingUsers > 0 ? totalFollowers / matchingUsers : 0;

      setAnalytics({
        totalUsers,
        matchingUsers,
        percentage,
        byPlan,
        byStatus: { active, suspended },
        averagePosts,
        averageFollowers
      });
    } catch (error) {
      console.error("Error calculating analytics:", error);
    }
  };

  const executeSearch = async () => {
    if (queryGroups.length === 0) {
      alert("Please add at least one query before searching.");
      return;
    }

    setLoading(true);
    setCurrentPage(1);
    setAnalytics(null);
    setHasSearched(true);
    
    // Clear previous results
    setResults([]);
    setTotalResults(0);
    
    try {
      // Flatten query groups into activeFilters for backward compatibility
      const activeFilters: SearchFilter[] = [];
      queryGroups.forEach((group, groupIndex) => {
        group.filters.forEach((filter, filterIndex) => {
          activeFilters.push({
            ...filter,
            logicOperator: filterIndex === 0 && groupIndex > 0 ? group.logicOperator : filter.logicOperator
          });
        });
      });

      // Build query parameters from active filters
      const params: Record<string, any> = {
        p_limit: resultsPerPage,
        p_offset: 0
      };

      // Map filter IDs to SQL parameter names
      const filterIdToParamMap: Record<string, string> = {
        'profile_view_count': 'min_profile_views',
        'post_view_count': 'min_post_views',
        'portfolio_view_count': 'min_portfolio_views',
        'profile_view_unique_viewers': 'min_profile_unique_viewers',
        'post_view_unique_viewers': 'min_post_unique_viewers',
        'portfolio_view_unique_viewers': 'min_portfolio_unique_viewers',
        'account_active_days': 'min_days_active',
        'account_inactive_days': 'max_days_inactive',
        'post_count': 'min_posts',
        'post_created_date': 'min_days_since_last_post',
        'account_suspension_status': 'is_suspended',
        'plan_name': 'plan_name',
        // Add more mappings as needed
      };

      activeFilters.forEach(filter => {
        // Skip filters with "any" operator
        if (filter.operator === "any") {
          return;
        }

        // Get the SQL parameter name (use mapping if available, otherwise use baseFilterId)
        const paramName = filterIdToParamMap[filter.baseFilterId] || filter.baseFilterId;
        const key = `p_${paramName}`;
        
        if (filter.type === "boolean") {
          params[key] = filter.value === true || filter.value === "true";
        } else if (filter.type === "number") {
          // Handle different operators for number filters
          if (filter.operator === "between" && filter.value && filter.value2) {
            const minValue = parseInt(filter.value);
            const maxValue = parseInt(filter.value2);
            if (!isNaN(minValue) && !isNaN(maxValue)) {
              params[`${key}_min`] = minValue;
              params[`${key}_max`] = maxValue;
            }
          } else if (filter.value) {
            const numValue = parseInt(filter.value);
            if (!isNaN(numValue)) {
              // For profile_view_count and similar, we need to handle operators
              // Store the operator and value - SQL function will handle the comparison
              params[key] = numValue;
              params[`${key}_operator`] = filter.operator || "greater_than_or_equal";
              
              // Also pass time period if available (for all_time, don't pass period params so SQL queries all time)
              if (filter.timePeriod && filter.timePeriod !== 'all_time') {
                const dateRange = getDateRange(filter.timePeriod, filter.customStartDate, filter.customEndDate);
                if (dateRange.startDate) {
                  params[`${key}_period_start`] = dateRange.startDate.toISOString();
                }
                if (dateRange.endDate) {
                  params[`${key}_period_end`] = dateRange.endDate.toISOString();
                }
              }
              // For all_time, we don't pass period_start/period_end, so SQL will query all time (NULL check in SQL)
            }
          }
        } else if (filter.type === "select") {
          if (filter.value === "any" || filter.value === "") {
            params[key] = null;
          } else if (filter.baseFilterId === "is_suspended" || filter.baseFilterId === "account_suspension_status") {
            // Convert string to boolean for is_suspended
            params[key] = filter.value === "true" || filter.value === "suspended" ? true : filter.value === "false" || filter.value === "active" ? false : null;
          } else {
            params[key] = filter.value;
          }
        }
      });

      console.log("Calling search_users_comprehensive with params:", JSON.stringify(params, null, 2));
      console.log("Number of params:", Object.keys(params).length);
      console.log("Param keys:", Object.keys(params));
      
      // Check if we have filters that aren't supported by comprehensive function
      const supportedFilters = [
        'min_days_active', 'max_days_inactive', 'min_posts', 'max_posts', 
        'min_days_since_last_post', 'never_posted', 'plan_name', 'is_suspended',
        'subscription_expires_days', 'min_profile_views', 'min_followers',
        'incomplete_profile', 'no_portfolio_items', 'min_flags', 'min_suspensions',
        'joined_last_hours', 'returned_after_months'
      ];
      
      const unsupportedFilters = activeFilters.filter(f => !supportedFilters.includes(f.baseFilterId));

      if (unsupportedFilters.length > 0) {
        console.log("Some filters not supported by comprehensive function, using fallback:", unsupportedFilters.map(f => f.baseFilterId));
        await executeFallbackSearch(activeFilters);
      } else {
        // Try comprehensive search first
        try {
          // Remove undefined/null values to avoid sending them to SQL
          const cleanParams: Record<string, any> = {};
          Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
              cleanParams[key] = params[key];
            }
          });
          
          console.log("Calling RPC with cleaned params:", Object.keys(cleanParams));
          
          const { data, error } = await supabase.rpc('search_users_comprehensive', cleanParams);

          if (error) {
            // Log error in multiple ways to catch all error structures
            console.error("Comprehensive search error:", error);
            try {
              console.error("Error (stringified):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            } catch (e) {
              console.error("Could not stringify error:", e);
            }
            console.error("Error code:", error?.code);
            console.error("Error message:", error?.message);
            console.error("Error details:", error?.details);
            console.error("Error hint:", error?.hint);
            console.error("Error name:", error?.name);
            console.error("Error stack:", error?.stack);
            
            // Check if function doesn't exist or has wrong parameters
            const errorMessage = error?.message || '';
            const errorCode = error?.code || '';
            if (errorCode === 'PGRST202' || errorCode === '42883' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('function') ||
                errorMessage.includes('parameter')) {
              console.warn("search_users_comprehensive function may not exist or has wrong parameters. Using fallback search.");
              console.warn("This usually means the SQL function needs to be updated in the database.");
            }
            
            // Fallback: Use individual category functions
            await executeFallbackSearch(activeFilters);
          } else {
            console.log("Search successful, results:", data?.length || 0);
            setResults(data || []);
            setTotalResults(data?.length || 0);
            await calculateAnalytics(data || []);
          }
        } catch (rpcError: any) {
          console.error("RPC call exception:", rpcError);
          console.error("Exception message:", rpcError?.message);
          console.error("Exception stack:", rpcError?.stack);
          // Fallback: Use individual category functions
          await executeFallbackSearch(activeFilters);
        }
      }
    } catch (error: any) {
      console.error("Search exception:", error);
      await executeFallbackSearch(activeFilters);
    } finally {
      setLoading(false);
    }
  };

  const executeFallbackSearch = async (activeFilters: SearchFilter[]) => {
    try {
      // Use individual category functions
      const activityFilters = activeFilters.filter(f => 
        FILTER_CATEGORIES.activity.filters.some(af => af.id === f.baseFilterId)
      );
      const subscriptionFilters = activeFilters.filter(f => 
        FILTER_CATEGORIES.subscription.filters.some(sf => sf.id === f.baseFilterId)
      );
      const engagementFilters = activeFilters.filter(f => 
        FILTER_CATEGORIES.engagement.filters.some(ef => ef.id === f.baseFilterId)
      );
      const profileFilters = activeFilters.filter(f => 
        FILTER_CATEGORIES.profile.filters.some(pf => pf.id === f.baseFilterId)
      );
      const moderationFilters = activeFilters.filter(f => 
        FILTER_CATEGORIES.moderation.filters.some(mf => mf.id === f.baseFilterId)
      );
      const generalFilters = activeFilters.filter(f => 
        FILTER_CATEGORIES.general.filters.some(gf => gf.id === f.baseFilterId)
      );

      // Build params for each category
        const buildParams = (filters: SearchFilter[]) => {
        const params: Record<string, any> = {};
        filters.forEach(filter => {
          // Skip filters with "any" operator
          if (filter.operator === "any") {
            return;
          }

          const key = `p_${filter.baseFilterId}`;
          if (filter.type === "boolean") {
            params[key] = filter.value === true || filter.value === "true";
          } else if (filter.type === "number") {
            // Handle different operators for number filters
            if (filter.operator === "between" && filter.value && filter.value2) {
              const minValue = parseInt(filter.value);
              const maxValue = parseInt(filter.value2);
              if (!isNaN(minValue) && !isNaN(maxValue)) {
                params[`${key}_min`] = minValue;
                params[`${key}_max`] = maxValue;
              }
            } else if (filter.value) {
              const numValue = parseInt(filter.value);
              if (!isNaN(numValue)) {
                // Store the operator and value - SQL function will handle the comparison
                params[key] = numValue;
                params[`${key}_operator`] = filter.operator || "greater_than_or_equal";
              }
            }
          } else if (filter.type === "select") {
            if (filter.value === "any" || filter.value === "") {
              params[key] = null;
            } else if (filter.baseFilterId === "is_suspended" || filter.baseFilterId === "account_suspension_status") {
              params[key] = filter.value === "true" || filter.value === "suspended" ? true : filter.value === "false" || filter.value === "active" ? false : null;
            } else {
              params[key] = filter.value;
            }
          }
        });
        return params;
      };

      // Execute searches and combine results
      const promises: Promise<any>[] = [];
      
      if (activityFilters.length > 0) {
        promises.push(supabase.rpc('search_users_by_activity', buildParams(activityFilters)));
      }
      if (subscriptionFilters.length > 0) {
        promises.push(supabase.rpc('search_users_by_subscription', buildParams(subscriptionFilters)));
      }
      if (engagementFilters.length > 0) {
        promises.push(supabase.rpc('search_users_by_engagement', buildParams(engagementFilters)));
      }
      if (profileFilters.length > 0) {
        promises.push(supabase.rpc('search_users_by_profile', buildParams(profileFilters)));
      }
      if (moderationFilters.length > 0) {
        promises.push(supabase.rpc('search_users_by_moderation', buildParams(moderationFilters)));
      }

      if (promises.length === 0) {
        // No supported filters, use basic query
        const { data } = await supabase
          .from('profiles')
          .select('clerk_id, display_name, email, created_at, subscription_plan, is_suspended')
          .limit(resultsPerPage);
        
        const formattedResults = (data || []).map((p: any) => ({
          clerk_id: p.clerk_id,
          display_name: p.display_name,
          email: p.email,
          created_at: p.created_at,
          subscription_plan: p.subscription_plan,
          is_suspended: p.is_suspended,
          total_posts: 0,
          total_followers: 0,
          profile_views_count: 0,
          days_since_last_login: null,
          flags_count: 0,
          suspensions_count: 0
        }));
        
        setResults(formattedResults);
        setTotalResults(formattedResults.length);
        await calculateAnalytics(formattedResults);
        return;
      }

      const results = await Promise.all(promises);
      const allResults = results.flatMap(r => r.data || []);
      
      // Deduplicate by clerk_id and apply intersection logic (AND)
      const userMatches = new Map<string, number>();
      allResults.forEach((r: any) => {
        const count = userMatches.get(r.clerk_id) || 0;
        userMatches.set(r.clerk_id, count + 1);
      });

      // Only include users that match ALL filter categories (intersection)
      const categoryCount = promises.length;
      const matchingUsers = Array.from(userMatches.entries())
        .filter(([_, count]) => count === categoryCount)
        .map(([clerk_id]) => clerk_id);

      // Get full user data for matching users
      if (matchingUsers.length > 0) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('clerk_id, display_name, email, created_at, subscription_plan, is_suspended')
          .in('clerk_id', matchingUsers.slice(0, resultsPerPage));

        // Enrich with stats
        const enrichedResults = await Promise.all((userData || []).map(async (user: any) => {
          // Calculate date for "this week" (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const [postsRes, followersRes, visitsRes, reportsRes, suspensionsRes] = await Promise.all([
            supabase.from('posts').select('id', { count: 'exact', head: true }).eq('profile_id', user.clerk_id),
            supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.clerk_id),
            supabase.from('visits').select('visited_at').eq('user_id', user.clerk_id).order('visited_at', { ascending: false }).limit(1),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reported_type', 'profile').eq('reported_id', user.clerk_id),
            supabase.from('user_account_history').select('id', { count: 'exact', head: true }).eq('user_id', user.clerk_id).eq('action_type', 'user_suspended')
          ]);

          // Profile views this week (last 7 days) - try aggregated first, fallback to raw data
          let viewsRes: any = { count: 0, error: null };
          try {
            const aggRes = await supabase.from('profile_views_aggregated')
              .select('view_count')
              .eq('profile_id', user.clerk_id)
              .eq('period_type', 'daily')
              .gte('period_start', sevenDaysAgo.toISOString());
            
            if (aggRes.data && aggRes.data.length > 0) {
              const total = aggRes.data.reduce((sum: number, row: any) => sum + (row.view_count || 0), 0);
              viewsRes = { count: total, error: null };
            } else {
              // Fallback to raw data
              viewsRes = await supabase.from('profile_views')
                .select('id', { count: 'exact', head: true })
                .eq('profile_id', user.clerk_id)
                .gte('viewed_at', sevenDaysAgo.toISOString());
            }
          } catch (error) {
            // If aggregated table doesn't exist, use raw data
            viewsRes = await supabase.from('profile_views')
              .select('id', { count: 'exact', head: true })
              .eq('profile_id', user.clerk_id)
              .gte('viewed_at', sevenDaysAgo.toISOString());
          }

          const lastVisit = visitsRes.data?.[0]?.visited_at;
          const daysSinceLogin = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : null;

          return {
            clerk_id: user.clerk_id,
            display_name: user.display_name,
            email: user.email,
            created_at: user.created_at,
            subscription_plan: user.subscription_plan,
            is_suspended: user.is_suspended,
            total_posts: postsRes.count || 0,
            total_followers: followersRes.count || 0,
            profile_views_count: viewsRes.count || 0,
            days_since_last_login: daysSinceLogin,
            flags_count: reportsRes.count || 0,
            suspensions_count: suspensionsRes.count || 0
          };
        }));

        setResults(enrichedResults);
        setTotalResults(matchingUsers.length);
        await calculateAnalytics(enrichedResults);
      } else {
        setResults([]);
        setTotalResults(0);
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Fallback search exception:", error);
      setResults([]);
      setTotalResults(0);
      setAnalytics(null);
    }
  };

  const exportResults = (format: 'csv' | 'json') => {
    if (results.length === 0) return;

    if (format === 'csv') {
      const headers = Object.keys(results[0]).join(',');
      const rows = results.map(r => Object.values(r).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(','));
      const csv = [headers, ...rows].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_search_results_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(results, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_search_results_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getFilterOptions = (filter: SearchFilter) => {
    const category = FILTER_CATEGORIES[filter.category as keyof typeof FILTER_CATEGORIES];
    const filterDef = category.filters.find(f => f.id === filter.baseFilterId);
    return filterDef?.options || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Data Search</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search and filter users based on activity, engagement, subscription, and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(queryGroups.length > 0 || results.length > 0 || hasSearched) && (
            <button
              onClick={() => {
                setQueryGroups([]);
                setResults([]);
                setTotalResults(0);
                setAnalytics(null);
                setShowAnalytics(false);
                setHasSearched(false);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              title="Reset all queries and results"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
          {queryGroups.length > 0 && (
            <button
              onClick={() => setShowSavePreset(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Preset
            </button>
          )}
          {results.length > 0 && (
            <>
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportResults('csv')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportResults('json')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Search Analytics
            </h3>
            <button
              onClick={() => setShowAnalytics(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{analytics.totalUsers.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Matching Users</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{analytics.matchingUsers.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Percentage</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                <Percent className="w-5 h-5" />
                {analytics.percentage.toFixed(2)}%
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Avg Posts</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{analytics.averagePosts.toFixed(1)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">By Plan</div>
              <div className="space-y-2">
                {Object.entries(analytics.byPlan).map(([plan, data]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Free'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{data.count}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({data.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">By Status</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{analytics.byStatus.active}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({analytics.matchingUsers > 0 ? ((analytics.byStatus.active / analytics.matchingUsers) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Suspended</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">{analytics.byStatus.suspended}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({analytics.matchingUsers > 0 ? ((analytics.byStatus.suspended / analytics.matchingUsers) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predefined Templates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Templates</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PREDEFINED_TEMPLATES.map(template => (
            <TemplateButton
              key={template.id}
              template={template}
              isSelected={selectedTemplate === template.id}
              onClick={() => loadTemplate(template)}
            />
          ))}
        </div>
      </div>

      {/* Saved Presets */}
      {savedPresets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Saved Presets</h3>
          <div className="flex flex-wrap gap-2">
            {savedPresets.map(preset => (
              <div
                key={preset.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <button
                  onClick={() => loadPreset(preset)}
                  className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Builder Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Query Builder</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Build queries by category and combine multiple queries together
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalStep('category');
                setSelectedCategory(null);
                setCurrentQueryFilters([]);
                setEditingQueryGroupId(null);
                setShowQueryBuilderModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Query
            </button>
            {queryGroups.length > 0 && (
              <button
                onClick={() => {
                  setQueryGroups([]);
                  setResults([]);
                  setTotalResults(0);
                  setAnalytics(null);
                  setShowAnalytics(false);
                  setHasSearched(false);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                title="Clear all queries"
              >
                <Trash2 className="w-4 h-4" />
                Clear Queries
              </button>
            )}
            <button
              onClick={executeSearch}
              disabled={loading || queryGroups.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Query Groups */}
        {queryGroups.length > 0 ? (
          <div className="space-y-3">
            {queryGroups.map((group, index) => {
              const category = FILTER_CATEGORIES[group.category as keyof typeof FILTER_CATEGORIES];
              const Icon = category?.icon || Target;
              
              return (
                <div
                  key={group.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {index > 0 && (
                        <select
                          value={group.logicOperator || 'AND'}
                          onChange={(e) => {
                            const updated = [...queryGroups];
                            updated[index].logicOperator = e.target.value as 'AND' | 'OR';
                            setQueryGroups(updated);
                          }}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1 font-semibold"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}
                      <Icon className={`w-5 h-5 text-${category?.color || 'indigo'}-500`} />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {group.categoryLabel}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({group.filters.length} {group.filters.length === 1 ? 'filter' : 'filters'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCategory(group.category);
                          setCurrentQueryFilters(group.filters);
                          setEditingQueryGroupId(group.id);
                          setModalStep('filters');
                          setShowQueryBuilderModal(true);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setQueryGroups(queryGroups.filter(g => g.id !== group.id))}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.filters.map((filter, filterIndex) => {
                      const getOperatorSymbol = (op?: string) => {
                        switch (op) {
                          case 'equals': return '=';
                          case 'greater_than': return '>';
                          case 'greater_than_or_equal': return '≥';
                          case 'less_than': return '<';
                          case 'less_than_or_equal': return '≤';
                          case 'between': return 'between';
                          case 'any': return 'any';
                          default: return '≥';
                        }
                      };

                      const formatValue = () => {
                        if (filter.operator === "any") {
                          return "Any";
                        }
                        if (filter.type === "boolean") {
                          return filter.value ? "Yes" : "No";
                        }
                        if (filter.type === "number") {
                          if (filter.operator === "between" && filter.value && filter.value2) {
                            return `${filter.value} - ${filter.value2}`;
                          }
                          return `${getOperatorSymbol(filter.operator)} ${filter.value}`;
                        }
                        if (filter.type === "select") {
                          return filter.value?.charAt(0).toUpperCase() + filter.value?.slice(1) || "";
                        }
                        return filter.value || "";
                      };

                      return (
                        <div
                          key={filter.id}
                          className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-xs"
                        >
                          <span className="font-medium text-gray-700 dark:text-gray-300">{filter.label}:</span>
                          <span className="ml-1 text-gray-900 dark:text-white">
                            {formatValue()}
                          </span>
                          {filter.timePeriod && filter.timePeriod !== 'all_time' && (
                            <span className="ml-1 text-gray-500 dark:text-gray-400">
                              ({TIME_PERIODS.find(p => p.id === filter.timePeriod)?.label || filter.timePeriod})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No queries added yet. Click "Add Query" to start building your search.</p>
          </div>
        )}
      </div>

      {/* Query Builder Modal */}
      {showQueryBuilderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {modalStep === 'category' ? 'What is this query about?' : `Build Query: ${FILTER_CATEGORIES[selectedCategory as keyof typeof FILTER_CATEGORIES]?.label}`}
                </h3>
                <button
                  onClick={() => {
                    setShowQueryBuilderModal(false);
                    setModalStep('category');
                    setSelectedCategory(null);
                    setCurrentQueryFilters([]);
                    setEditingQueryGroupId(null);
                    setFilterSearchQuery("");
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Global Search box - available in both steps */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={modalStep === 'category' ? "Search categories and filters..." : "Search filters..."}
                  value={filterSearchQuery}
                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {filterSearchQuery && (
                  <button
                    onClick={() => setFilterSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {modalStep === 'category' ? (
                (() => {
                  // Global search across all categories and filters
                  if (filterSearchQuery) {
                    const searchLower = filterSearchQuery.toLowerCase();
                    const matchingResults: Array<{ type: 'category' | 'filter', categoryId: string, category: any, filter?: any }> = [];
                    
                    Object.entries(FILTER_CATEGORIES).forEach(([categoryId, category]) => {
                      // Check if category matches
                      const categoryMatches = category.label.toLowerCase().includes(searchLower);
                      
                      // Check filters in this category
                      const matchingFilters = category.filters.filter((filter: any) => 
                        filter.label.toLowerCase().includes(searchLower) ||
                        filter.tooltip?.toLowerCase().includes(searchLower) ||
                        filter.id.toLowerCase().includes(searchLower)
                      );
                      
                      if (categoryMatches) {
                        matchingResults.push({ type: 'category', categoryId, category });
                      }
                      
                      matchingFilters.forEach((filter: any) => {
                        matchingResults.push({ type: 'filter', categoryId, category, filter });
                      });
                    });
                    
                    if (matchingResults.length === 0) {
                      return (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No results found</p>
                          <p className="text-sm mt-2">Try searching for "plan", "suspension", "profile", etc.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Found {matchingResults.length} {matchingResults.length === 1 ? 'result' : 'results'}
                        </div>
                        <div className="space-y-3">
                          {matchingResults.map((result, index) => {
                            const Icon = result.category.icon;
                            if (result.type === 'category') {
                              return (
                                <button
                                  key={`category-${result.categoryId}`}
                                  onClick={() => {
                                    setSelectedCategory(result.categoryId);
                                    setCurrentQueryFilters([]);
                                    setModalStep('filters');
                                    setFilterSearchQuery("");
                                  }}
                                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <Icon className={`w-6 h-6 text-${result.category.color}-500`} />
                                    <div>
                                      <span className="font-semibold text-gray-900 dark:text-white">{result.category.label}</span>
                                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Category)</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            } else {
                              return (
                                <button
                                  key={`filter-${result.categoryId}-${result.filter.id}-${index}`}
                                  onClick={() => {
                                    setSelectedCategory(result.categoryId);
                                    const newFilter: SearchFilter = {
                                      id: `${result.filter.id}_${Date.now()}`,
                                      category: result.categoryId,
                                      type: result.filter.type,
                                      label: result.filter.label,
                                      baseFilterId: result.filter.id,
                                      value: result.filter.type === "boolean" ? true : result.filter.type === "select" ? (result.filter.options?.[0] || "") : "",
                                      operator: result.filter.type === "number" ? "greater_than_or_equal" : result.filter.type === "select" && result.filter.options?.includes("any") ? "any" : "equals",
                                      timePeriod: (result.filter as any).hasTimePeriod ? ((result.filter as any).defaultTimePeriod || 'last_7_days') : undefined,
                                      logicOperator: currentQueryFilters.length > 0 ? 'AND' : undefined
                                    };
                                    setCurrentQueryFilters([newFilter]);
                                    setModalStep('filters');
                                    setFilterSearchQuery("");
                                  }}
                                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 text-${result.category.color}-500`} />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {result.filter.label}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {result.category.label}
                                      </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  </div>
                                </button>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  // No search query - show all categories
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(FILTER_CATEGORIES).map(([categoryId, category]) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={categoryId}
                            onClick={() => {
                              setSelectedCategory(categoryId);
                              setCurrentQueryFilters([]);
                              setModalStep('filters');
                            }}
                            className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <Icon className={`w-6 h-6 text-${category.color}-500`} />
                              <span className="font-semibold text-gray-900 dark:text-white">{category.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {category.filters.length} {category.filters.length === 1 ? 'filter' : 'filters'} available
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  
                  {/* Filters for selected category */}
                  {selectedCategory && (() => {
                    const filteredFilters = FILTER_CATEGORIES[selectedCategory as keyof typeof FILTER_CATEGORIES]?.filters.filter(filterDef => {
                      if (!filterSearchQuery) return true;
                      const searchLower = filterSearchQuery.toLowerCase();
                      return filterDef.label.toLowerCase().includes(searchLower) ||
                             filterDef.tooltip?.toLowerCase().includes(searchLower) ||
                             filterDef.id.toLowerCase().includes(searchLower);
                    }) || [];
                    
                    return filteredFilters.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredFilters.map(filterDef => (
                      <button
                        key={filterDef.id}
                        onClick={() => {
                          const newFilter: SearchFilter = {
                            id: `${filterDef.id}_${Date.now()}`,
                            category: selectedCategory,
                            type: filterDef.type,
                            label: filterDef.label,
                            baseFilterId: filterDef.id,
                            value: filterDef.type === "boolean" ? true : filterDef.type === "select" ? (filterDef.options?.[0] || "") : "",
                            operator: filterDef.type === "number" ? "greater_than_or_equal" : filterDef.type === "select" && filterDef.options?.includes("any") ? "any" : "equals",
                            timePeriod: (filterDef as any).hasTimePeriod ? ((filterDef as any).defaultTimePeriod || 'last_7_days') : undefined,
                            logicOperator: currentQueryFilters.length > 0 ? 'AND' : undefined
                          };
                          setCurrentQueryFilters([...currentQueryFilters, newFilter]);
                        }}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {filterDef.label}
                            </div>
                            {filterDef.placeholder && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {filterDef.placeholder}
                              </div>
                            )}
                          </div>
                          <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        </div>
                      </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No filters found matching "{filterSearchQuery}"</p>
                        <p className="text-sm mt-2">Try a different search term</p>
                      </div>
                    );
                  })()}

                  {/* Current Query Filters */}
                  {currentQueryFilters.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Filters in this query ({currentQueryFilters.length})
                      </h4>
                      <div className="space-y-2">
                        {currentQueryFilters.map((filter, index) => {
                          const filterDef = FILTER_CATEGORIES[selectedCategory as keyof typeof FILTER_CATEGORIES]?.filters.find(f => f.id === filter.baseFilterId);
                          const hasTimePeriod = (filterDef as any)?.hasTimePeriod;
                          
                          return (
                            <div
                              key={filter.id}
                              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                {index > 0 && (
                                  <select
                                    value={filter.logicOperator || 'AND'}
                                    onChange={(e) => {
                                      const updated = [...currentQueryFilters];
                                      updated[index].logicOperator = e.target.value as 'AND' | 'OR';
                                      setCurrentQueryFilters(updated);
                                    }}
                                    className="text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1 font-semibold"
                                  >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                  </select>
                                )}
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{filter.label}:</span>
                                {filter.type === "boolean" ? (
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={filter.value === true}
                                      onChange={(e) => {
                                        const updated = [...currentQueryFilters];
                                        updated[index].value = e.target.checked;
                                        setCurrentQueryFilters(updated);
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-900 dark:text-white">Yes</span>
                                  </label>
                                ) : filter.type === "number" ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <select
                                      value={filter.operator || "greater_than_or_equal"}
                                      onChange={(e) => {
                                        const updated = [...currentQueryFilters];
                                        updated[index].operator = e.target.value as any;
                                        if (e.target.value === "any") {
                                          updated[index].value = "";
                                          updated[index].value2 = undefined;
                                        } else if (e.target.value !== "between") {
                                          updated[index].value2 = undefined;
                                        }
                                        setCurrentQueryFilters(updated);
                                      }}
                                      className="text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1"
                                    >
                                      <option value="any">Any</option>
                                      <option value="equals">Equals (=)</option>
                                      <option value="greater_than">Greater Than (&gt;)</option>
                                      <option value="greater_than_or_equal">Greater Than or Equal (≥)</option>
                                      <option value="less_than">Less Than (&lt;)</option>
                                      <option value="less_than_or_equal">Less Than or Equal (≤)</option>
                                      <option value="between">Between</option>
                                    </select>
                                    {filter.operator !== "any" && (
                                      <>
                                        <input
                                          type="number"
                                          value={filter.value || ""}
                                          onChange={(e) => {
                                            const updated = [...currentQueryFilters];
                                            updated[index].value = e.target.value;
                                            setCurrentQueryFilters(updated);
                                          }}
                                          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                          placeholder={filter.operator === "between" ? "Min" : "Value"}
                                        />
                                        {filter.operator === "between" && (
                                          <span className="text-sm text-gray-500 dark:text-gray-400">and</span>
                                        )}
                                        {filter.operator === "between" && (
                                          <input
                                            type="number"
                                            value={filter.value2 || ""}
                                            onChange={(e) => {
                                              const updated = [...currentQueryFilters];
                                              updated[index].value2 = e.target.value;
                                              setCurrentQueryFilters(updated);
                                            }}
                                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                            placeholder="Max"
                                          />
                                        )}
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <select
                                    value={filter.value || ""}
                                    onChange={(e) => {
                                      const updated = [...currentQueryFilters];
                                      updated[index].value = e.target.value;
                                      setCurrentQueryFilters(updated);
                                    }}
                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1"
                                  >
                                    {filterDef?.options?.map(opt => (
                                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                    ))}
                                  </select>
                                )}
                                {hasTimePeriod && (
                                  <>
                                    <select
                                      value={filter.timePeriod || 'last_7_days'}
                                      onChange={(e) => {
                                        const updated = [...currentQueryFilters];
                                        updated[index].timePeriod = e.target.value;
                                        if (e.target.value !== 'custom') {
                                          updated[index].customStartDate = undefined;
                                          updated[index].customEndDate = undefined;
                                        }
                                        setCurrentQueryFilters(updated);
                                      }}
                                      className="text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1"
                                    >
                                      {TIME_PERIODS.map(period => (
                                        <option key={period.id} value={period.id}>{period.label}</option>
                                      ))}
                                    </select>
                                    {filter.timePeriod === 'custom' && (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="date"
                                          value={filter.customStartDate || ""}
                                          onChange={(e) => {
                                            const updated = [...currentQueryFilters];
                                            updated[index].customStartDate = e.target.value;
                                            setCurrentQueryFilters(updated);
                                          }}
                                          className="text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1"
                                        />
                                        <span className="text-sm text-gray-500">to</span>
                                        <input
                                          type="date"
                                          value={filter.customEndDate || ""}
                                          onChange={(e) => {
                                            const updated = [...currentQueryFilters];
                                            updated[index].customEndDate = e.target.value;
                                            setCurrentQueryFilters(updated);
                                          }}
                                          className="text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white px-2 py-1"
                                        />
                                      </div>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={() => setCurrentQueryFilters(currentQueryFilters.filter(f => f.id !== filter.id))}
                                  className="text-red-600 hover:text-red-700 ml-auto"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Modal Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setModalStep('category');
                        setSelectedCategory(null);
                        setCurrentQueryFilters([]);
                        setFilterSearchQuery("");
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      Back
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowQueryBuilderModal(false);
                          setModalStep('category');
                          setSelectedCategory(null);
                          setCurrentQueryFilters([]);
                          setEditingQueryGroupId(null);
                          setFilterSearchQuery("");
                        }}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (currentQueryFilters.length === 0) {
                            alert("Please add at least one filter to this query.");
                            return;
                          }
                          
                          if (editingQueryGroupId) {
                            // Update existing query group
                            const updated = queryGroups.map(g => 
                              g.id === editingQueryGroupId 
                                ? { ...g, filters: currentQueryFilters }
                                : g
                            );
                            setQueryGroups(updated);
                          } else {
                            // Add new query group
                            const category = FILTER_CATEGORIES[selectedCategory as keyof typeof FILTER_CATEGORIES];
                            const newGroup: QueryGroup = {
                              id: `query_${Date.now()}`,
                              category: selectedCategory!,
                              categoryLabel: category?.label || selectedCategory!,
                              filters: currentQueryFilters,
                              logicOperator: queryGroups.length > 0 ? 'AND' : undefined
                            };
                            setQueryGroups([...queryGroups, newGroup]);
                          }
                          
                          setShowQueryBuilderModal(false);
                          setModalStep('category');
                          setSelectedCategory(null);
                          setCurrentQueryFilters([]);
                          setEditingQueryGroupId(null);
                          setFilterSearchQuery("");
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        {editingQueryGroupId ? 'Update Query' : 'Add Query'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {hasSearched && !loading && results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Results Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">
              Your search didn't match any users. Try adjusting your filters or using different criteria.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-w-md w-full">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Suggestions:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 text-left space-y-1 list-disc list-inside">
                <li>Remove or relax some filters</li>
                <li>Check that filter values are correct</li>
                <li>Try using different filter combinations</li>
                <li>Use broader date ranges or lower thresholds</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Results ({totalResults})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">User</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">Posts</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">Followers</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">Views</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.clerk_id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {result.display_name || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {result.email || result.clerk_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.subscription_plan === 'pro' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        result.subscription_plan === 'ultimate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {result.subscription_plan ? result.subscription_plan.charAt(0).toUpperCase() + result.subscription_plan.slice(1) : 'Free'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {result.total_posts || 0}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {result.total_followers || 0}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {result.profile_views_count || 0}
                    </td>
                    <td className="p-3">
                      {result.is_suspended ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin?tab=users&userId=${result.clerk_id}`}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePreset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Filter Preset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Inactive Premium Users"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Describe what this preset searches for..."
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowSavePreset(false);
                    setPresetName("");
                    setPresetDescription("");
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
