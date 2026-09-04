"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, UserPlus, Star, MessageCircle, Users, Heart, AlertTriangle, Ticket, 
  MessageSquare, XCircle, CheckCircle, Loader2, Filter, ArrowUpDown, 
  Calendar, Clock, ThumbsUp, Smile, Frown, AlertCircle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  message: string;
  user_id: string;
  actor_id?: string;
  target_id?: string;
  created_at: string;
  read: boolean;
  read_at?: string;
  actor?: {
    display_name?: string;
    clerk_id?: string;
  };
}

type SortOption = "newest" | "oldest" | "type";
type FilterOption = "all" | "unread" | "read" | string;

export function NotificationsHistory() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FilterOption>("all");
  const [readFilter, setReadFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;

        // Fetch actor profiles
        const actorIds = [...new Set((data || []).map((n: any) => n.actor_id).filter(Boolean))];
        let profilesMap = new Map();

        if (actorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("clerk_id, display_name")
            .in("clerk_id", actorIds);

          profilesMap = new Map(profilesData?.map((p: any) => [p.clerk_id, p]) || []);
        }

        const formatted = (data || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          user_id: n.user_id,
          actor_id: n.actor_id,
          target_id: n.target_id,
          created_at: n.created_at,
          read: n.read || false,
          read_at: n.read_at,
          actor: profilesMap.get(n.actor_id),
        }));

        setNotifications(formatted);
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`notifications-history-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded, user?.id, supabase]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...notifications];

    // Apply read filter
    if (readFilter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (readFilter === "read") {
      filtered = filtered.filter((n) => n.read);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    // Apply sorting
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "type") {
      filtered.sort((a, b) => a.type.localeCompare(b.type));
    }

    setFilteredNotifications(filtered);
  }, [notifications, typeFilter, readFilter, sortBy]);

  const getIcon = (type: string) => {
    switch (type) {
      case "connection":
        return <Users className="w-5 h-5 text-indigo-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "like":
        return <ThumbsUp className="w-5 h-5 text-blue-500" />;
      case "reaction_love":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "reaction_laugh":
        return <Smile className="w-5 h-5 text-yellow-500" />;
      case "reaction_wow":
        return <AlertCircle className="w-5 h-5 text-purple-500" />;
      case "reaction_sad":
        return <Frown className="w-5 h-5 text-blue-500" />;
      case "reaction_angry":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "review":
        return <Star className="w-5 h-5 text-yellow-500" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case "mention":
        return <UserPlus className="w-5 h-5 text-cyan-500" />;
      case "repost":
        return <MessageSquare className="w-5 h-5 text-teal-500" />;
      case "ticket_created":
      case "ticket_assigned":
      case "ticket_replied":
      case "ticket_status_changed":
      case "ticket_closed":
        return <Ticket className="w-5 h-5 text-orange-500" />;
      case "warning_issued":
      case "warning_acknowledged":
      case "admin_warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "account_suspended":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "account_unsuspended":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "file_approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "file_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "profile_approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "profile_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "verification_approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "verification_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "report_resolved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "report_dismissed":
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case "content_removed":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "admin_notification":
        return <Bell className="w-5 h-5 text-indigo-500" />;
      case "follow":
      default:
        return <UserPlus className="w-5 h-5 text-green-500" />;
    }
  };

  const getNotificationHref = (notification: Notification) => {
    if (notification.target_id) {
      // Check if it's a comment notification - link to specific comment
      // For comment notifications, target_id is comment_id
      if (notification.type === 'comment') {
        return `/feed?comment=${notification.target_id}`;
      }
      // Check if it's a mention
      if (notification.type === 'mention') {
        // For mentions, target_id is prefixed with "post:" or "comment:" to indicate the type
        if (notification.target_id?.startsWith('post:')) {
          const postId = notification.target_id.replace('post:', '');
          return `/feed?post=${postId}`;
        } else if (notification.target_id?.startsWith('comment:')) {
          const commentId = notification.target_id.replace('comment:', '');
          return `/feed?comment=${commentId}`;
        }
        // Fallback: try as comment (for backward compatibility)
        return `/feed?comment=${notification.target_id}`;
      }
      if (notification.type === 'like' || notification.type.startsWith('reaction_')) {
        return `/feed?post=${notification.target_id}`;
      }
      if (notification.type.startsWith('ticket_')) {
        return `/support?ticket=${notification.target_id}`;
      }
    }
    if (notification.actor_id) {
      return `/profile/${notification.actor_id}`;
    }
    return '/feed';
  };

  const formatNotificationTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      
      if (diffInHours < 168) {
        return format(date, 'EEE h:mm a');
      }
      
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Recently';
    }
  };

  const notificationTypes = [
    "all",
    ...["account_suspended", "account_unsuspended", "admin_notification", "comment", "connection", "content_removed", "file_approved", "file_rejected", "follow", "like", "reaction_angry", "reaction_laugh", "reaction_love", "reaction_sad", "reaction_wow", "mention", "message", "profile_approved", "profile_rejected", "report_dismissed", "report_resolved", "review", "repost", "ticket_assigned", "ticket_closed", "ticket_created", "ticket_replied", "ticket_status_changed", "verification_approved", "verification_rejected", "warning_issued"].sort((a, b) => a.localeCompare(b)),
  ];

  const getTypeLabel = (type: string) => {
    // Special labels for reaction types
    const reactionLabels: Record<string, string> = {
      'reaction_love': 'Love Reaction ❤️',
      'reaction_laugh': 'Laugh Reaction 😂',
      'reaction_wow': 'Wow Reaction 😮',
      'reaction_sad': 'Sad Reaction 😢',
      'reaction_angry': 'Angry Reaction 😠',
      'like': 'Like Reaction 👍',
    };
    
    if (reactionLabels[type]) {
      return reactionLabels[type];
    }
    
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sorting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Read Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Read Status
              </div>
            </label>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as FilterOption)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterOption)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {getTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Sort By
              </div>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="type">By Type</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {notifications.length === 0 
              ? "No notifications yet" 
              : "No notifications match your filters"}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map((notification) => (
              <Link
                key={notification.id}
                href={getNotificationHref(notification)}
                className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  !notification.read ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-3 break-words">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatNotificationTime(notification.created_at)}
                          </div>
                          {notification.read_at && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="w-3 h-3" />
                                Read {formatNotificationTime(notification.read_at)}
                              </div>
                            </>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {getTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

