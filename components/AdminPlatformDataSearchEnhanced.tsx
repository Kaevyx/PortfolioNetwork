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
  Info,
  CreditCard,
  Receipt,
  Calendar as CalendarIcon,
  GitBranch
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
  baseFilterId: string;
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  timePeriod?: 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'all_time' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  groupId?: string; // For AND/OR grouping
}

interface TimePeriod {
  id: string;
  label: string;
  days?: number;
  months?: number;
}

const TIME_PERIODS: TimePeriod[] = [
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

// Enhanced filter categories with more options
const FILTER_CATEGORIES = {
  activity: {
    label: "Activity & Engagement",
    icon: Activity,
    color: "blue",
    filters: [
      { 
        id: "min_days_active", 
        label: "Active for more than", 
        type: "number", 
        placeholder: "e.g., 30 days",
        hasTimePeriod: false,
        tooltip: "Finds users who have been active (logged in or had activity) for more than the specified number of days." 
      },
      { 
        id: "max_days_inactive", 
        label: "Not logged in for", 
        type: "number", 
        placeholder: "e.g., 30 days",
        hasTimePeriod: false,
        tooltip: "Finds users who haven't logged in or visited the platform for at least the specified number of days." 
      },
      { 
        id: "min_posts", 
        label: "More than X posts", 
        type: "number", 
        placeholder: "e.g., 10",
        hasTimePeriod: true,
        defaultTimePeriod: 'all_time',
        tooltip: "Finds users who have created more than the specified number of posts." 
      },
      { 
        id: "max_posts", 
        label: "Less than X posts", 
        type: "number", 
        placeholder: "e.g., 5",
        hasTimePeriod: true,
        defaultTimePeriod: 'all_time',
        tooltip: "Finds users who have created fewer than the specified number of posts." 
      },
      { 
        id: "min_days_since_last_post", 
        label: "Haven't posted in", 
        type: "number", 
        placeholder: "e.g., 7 days",
        hasTimePeriod: false,
        tooltip: "Finds users who haven't created a new post in at least the specified number of days." 
      },
      { 
        id: "never_posted", 
        label: "Never posted", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have created an account but have never published any posts." 
      },
      { 
        id: "has_drafts_no_posts", 
        label: "Has drafts but no published posts", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have saved draft posts but have never published any." 
      },
      { 
        id: "posting_spike", 
        label: "Posting spike", 
        type: "boolean",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_7_days',
        tooltip: "Finds users who have posted significantly more in the selected period compared to their average." 
      },
      { 
        id: "weekend_only", 
        label: "Active only on weekends", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who only post on weekends (Saturday and Sunday)." 
      },
      { 
        id: "weekday_only", 
        label: "Active only on weekdays", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who only post on weekdays (Monday to Friday)." 
      },
      { 
        id: "signed_up_never_returned", 
        label: "Signed up but never returned", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who created an account but have never logged in again after their initial signup." 
      },
    ]
  },
  views: {
    label: "Views & Visibility",
    icon: Eye,
    color: "cyan",
    filters: [
      { 
        id: "min_profile_views", 
        label: "More than X profile views", 
        type: "number", 
        placeholder: "e.g., 100",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_7_days',
        tooltip: "Finds users whose profile has been viewed more than the specified number of times." 
      },
      { 
        id: "min_post_views", 
        label: "More than X post views", 
        type: "number", 
        placeholder: "e.g., 500",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_7_days',
        tooltip: "Finds users whose posts have been viewed more than the specified number of times." 
      },
      { 
        id: "min_portfolio_views", 
        label: "More than X portfolio views", 
        type: "number", 
        placeholder: "e.g., 50",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_7_days',
        tooltip: "Finds users whose portfolio has been viewed more than the specified number of times." 
      },
    ]
  },
  comments: {
    label: "Comments & Interactions",
    icon: MessageSquare,
    color: "teal",
    filters: [
      { 
        id: "min_comments_received", 
        label: "More than X comments received", 
        type: "number", 
        placeholder: "e.g., 20",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_7_days',
        tooltip: "Finds users who have received more than the specified number of comments on their posts." 
      },
      { 
        id: "min_comments_given", 
        label: "More than X comments given", 
        type: "number", 
        placeholder: "e.g., 30",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_7_days',
        tooltip: "Finds users who have commented on posts more than the specified number of times." 
      },
      { 
        id: "never_commented", 
        label: "Never commented", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have never commented on any posts." 
      },
      { 
        id: "received_comments_no_response", 
        label: "Received comments but never responded", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have received comments but have never responded to any." 
      },
    ]
  },
  engagement: {
    label: "Engagement & Social",
    icon: Heart,
    color: "pink",
    filters: [
      { 
        id: "min_followers", 
        label: "More than X followers", 
        type: "number", 
        placeholder: "e.g., 50",
        hasTimePeriod: false,
        tooltip: "Finds users who have more than the specified number of followers." 
      },
      { 
        id: "max_followers", 
        label: "Less than X followers", 
        type: "number", 
        placeholder: "e.g., 10",
        hasTimePeriod: false,
        tooltip: "Finds users who have fewer than the specified number of followers." 
      },
      { 
        id: "follows_many_few_followers", 
        label: "Follows many but has few followers", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who follow many other users but have relatively few followers themselves." 
      },
      { 
        id: "likes_but_no_posts", 
        label: "Liked posts but never created any", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have liked/reacted to posts but have never created any posts themselves." 
      },
      { 
        id: "received_messages_no_response", 
        label: "Received messages but never responded", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have received direct messages but have never responded to any." 
      },
      { 
        id: "posting_multiple_categories", 
        label: "Posting in multiple categories/skills", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who have posted content in multiple different categories or skill areas." 
      },
    ]
  },
  subscription: {
    label: "Subscription & Account",
    icon: Zap,
    color: "purple",
    filters: [
      { 
        id: "plan_name", 
        label: "On a certain plan", 
        type: "select", 
        options: ["free", "pro", "ultimate"],
        hasTimePeriod: false,
        tooltip: "Filters users by their current subscription plan." 
      },
      { 
        id: "is_suspended", 
        label: "Suspended account", 
        type: "select", 
        options: ["true", "false", "any"],
        hasTimePeriod: false,
        tooltip: "Filters users by their account suspension status." 
      },
      { 
        id: "subscription_expires_days", 
        label: "Subscription expires within", 
        type: "number", 
        placeholder: "e.g., 7 days",
        hasTimePeriod: false,
        tooltip: "Finds users whose subscription will expire within the specified number of days." 
      },
      { 
        id: "near_usage_limit", 
        label: "Free-plan users near usage limits", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds free-plan users who are approaching their usage limits." 
      },
      { 
        id: "recently_downgraded", 
        label: "Recently downgraded plan", 
        type: "boolean",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_30_days',
        tooltip: "Finds users who have downgraded their subscription plan recently." 
      },
      { 
        id: "recently_upgraded", 
        label: "Recently upgraded plan", 
        type: "boolean",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_30_days',
        tooltip: "Finds users who have upgraded their subscription plan recently." 
      },
    ]
  },
  billing: {
    label: "Billing & Payments",
    icon: CreditCard,
    color: "orange",
    filters: [
      { 
        id: "has_payment_failed", 
        label: "Has failed payments", 
        type: "boolean",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_30_days',
        tooltip: "Finds users who have had failed payment attempts." 
      },
      { 
        id: "min_payment_failures", 
        label: "More than X payment failures", 
        type: "number", 
        placeholder: "e.g., 2",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_30_days',
        tooltip: "Finds users who have had more than the specified number of failed payment attempts." 
      },
      { 
        id: "subscription_status", 
        label: "Subscription status", 
        type: "select", 
        options: ["active", "cancelled", "expired", "trial"],
        hasTimePeriod: false,
        tooltip: "Filters users by their subscription status." 
      },
      { 
        id: "on_trial", 
        label: "Currently on trial", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who are currently on a trial subscription." 
      },
      { 
        id: "trial_expiring_days", 
        label: "Trial expiring within", 
        type: "number", 
        placeholder: "e.g., 3 days",
        hasTimePeriod: false,
        tooltip: "Finds users whose trial will expire within the specified number of days." 
      },
    ]
  },
  profile: {
    label: "Profile & Portfolio",
    icon: User,
    color: "green",
    filters: [
      { 
        id: "incomplete_profile", 
        label: "Incomplete profiles", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users whose profiles are missing key information." 
      },
      { 
        id: "no_portfolio_items", 
        label: "No uploaded projects", 
        type: "boolean",
        hasTimePeriod: false,
        tooltip: "Finds users who haven't uploaded any portfolio items or projects." 
      },
      { 
        id: "portfolio_updated_days", 
        label: "Updated portfolio in last", 
        type: "number", 
        placeholder: "e.g., 30 days",
        hasTimePeriod: false,
        tooltip: "Finds users who have updated their portfolio within the specified number of days." 
      },
      { 
        id: "outdated_projects_months", 
        label: "Outdated projects (older than)", 
        type: "number", 
        placeholder: "e.g., 6 months",
        hasTimePeriod: false,
        tooltip: "Finds users whose portfolio items are all older than the specified number of months." 
      },
    ]
  },
  moderation: {
    label: "Moderation & Safety",
    icon: Shield,
    color: "red",
    filters: [
      { 
        id: "min_flags", 
        label: "Flagged by more than X users", 
        type: "number", 
        placeholder: "e.g., 3",
        hasTimePeriod: true,
        defaultTimePeriod: 'all_time',
        tooltip: "Finds users who have been flagged or reported by more than the specified number of other users." 
      },
      { 
        id: "min_suspensions", 
        label: "Suspended X times", 
        type: "number", 
        placeholder: "e.g., 2",
        hasTimePeriod: true,
        defaultTimePeriod: 'all_time',
        tooltip: "Finds users who have been suspended the specified number of times or more." 
      },
      { 
        id: "posted_banned_content", 
        label: "Posted banned content", 
        type: "boolean",
        hasTimePeriod: true,
        defaultTimePeriod: 'all_time',
        tooltip: "Finds users who have posted content that was flagged as banned or violating platform policies." 
      },
      { 
        id: "min_failed_logins", 
        label: "More than X failed login attempts", 
        type: "number", 
        placeholder: "e.g., 5",
        hasTimePeriod: true,
        defaultTimePeriod: 'last_30_days',
        tooltip: "Finds users who have had more than the specified number of failed login attempts." 
      },
    ]
  },
  general: {
    label: "General",
    icon: Target,
    color: "indigo",
    filters: [
      { 
        id: "joined_last_hours", 
        label: "Joined in last", 
        type: "number", 
        placeholder: "e.g., 24 hours",
        hasTimePeriod: false,
        tooltip: "Finds users who created their account within the specified number of hours." 
      },
      { 
        id: "returned_after_months", 
        label: "Returned after X months inactivity", 
        type: "number", 
        placeholder: "e.g., 6 months",
        hasTimePeriod: false,
        tooltip: "Finds users who were inactive for the specified number of months but have returned." 
      },
    ]
  }
};

// This is a large component - continuing in next part due to length constraints
// The rest of the component implementation will follow the same pattern as the original
// but with enhanced UI for the query builder


