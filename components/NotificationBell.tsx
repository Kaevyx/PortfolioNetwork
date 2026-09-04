"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Bell, UserPlus, Star, MessageCircle, Users, Heart, CheckCheck, AlertTriangle, Ticket, MessageSquare, XCircle, CheckCircle, ThumbsUp, Smile, Frown, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  message: string;
  userId: string;
  targetId?: string;
  createdAt: string;
  read: boolean;
  read_at?: string;
  actor?: {
    display_name?: string;
    clerk_id?: string;
  };
}

export function NotificationBell() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    const supabase = supabaseRef.current;
    try {
      setLoading(true);
      
      // Check notification settings
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("settings")
        .eq("clerk_id", user.id)
        .single();

      if (profileError) {
        console.error("Error loading profile:", profileError);
      }

      const settings = profile?.settings;
      const inAppNotifications = settings?.notifications?.inAppNotifications !== false;
      
      // Note: We'll still load notifications even if inAppNotifications is disabled
      // The user can see them in the history tab anyway, so we should show them in the bell too
      // But we'll respect individual notification type settings

      const notificationTypes = {
        newFollower: settings?.notifications?.newFollower !== false,
        newConnection: settings?.notifications?.newConnection !== false,
        newReview: settings?.notifications?.newReview !== false,
        newComment: settings?.notifications?.newComment !== false,
        newLike: settings?.notifications?.newLike !== false,
        newMessage: settings?.notifications?.newMessage !== false,
        newMention: settings?.notifications?.newMention !== false,
        newRepost: settings?.notifications?.newRepost !== false,
        ticketCreated: settings?.notifications?.ticketCreated !== false,
        ticketAssigned: settings?.notifications?.ticketAssigned !== false,
        ticketReplied: settings?.notifications?.ticketReplied !== false,
        ticketStatusChanged: settings?.notifications?.ticketStatusChanged !== false,
        ticketClosed: settings?.notifications?.ticketClosed !== false,
        warningIssued: settings?.notifications?.warningIssued !== false,
        accountSuspended: settings?.notifications?.accountSuspended !== false,
        accountUnsuspended: settings?.notifications?.accountUnsuspended !== false,
        fileApproved: settings?.notifications?.fileApproved !== false,
        fileRejected: settings?.notifications?.fileRejected !== false,
        profileApproved: settings?.notifications?.profileApproved !== false,
        profileRejected: settings?.notifications?.profileRejected !== false,
        verificationApproved: settings?.notifications?.verificationApproved !== false,
        verificationRejected: settings?.notifications?.verificationRejected !== false,
        reportResolved: settings?.notifications?.reportResolved !== false,
        reportDismissed: settings?.notifications?.reportDismissed !== false,
        contentRemoved: settings?.notifications?.contentRemoved !== false,
        adminWarning: settings?.notifications?.adminWarning !== false,
        adminNotification: settings?.notifications?.adminNotification !== false,
      };
      
      console.log("Notification settings loaded:", {
        inAppNotifications,
        newComment: notificationTypes.newComment,
        settings: settings?.notifications
      });

      // Get notifications from database
      // Debug: Log the user.id we're searching for
      console.log("Loading notifications for user:", user.id);
      console.log("User ID type:", typeof user.id);
      
      // Use simple query to avoid foreign key issues
      // Try exact match first
      let { data: simpleNotifications, error: simpleError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // If no results, try without the filter to see what user_ids exist
      if (!simpleError && (!simpleNotifications || simpleNotifications.length === 0)) {
        console.log("No notifications found with exact match, checking all notifications...");
        const { data: allNotifications } = await supabase
          .from("notifications")
          .select("user_id")
          .limit(10);
        console.log("Sample user_ids in database:", allNotifications?.map((n: any) => n.user_id));
      }

      if (simpleError) {
        console.error("Error loading notifications:", simpleError);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      console.log("Found notifications:", simpleNotifications?.length || 0);
      if (simpleNotifications && simpleNotifications.length > 0) {
        console.log("Sample notification user_ids:", simpleNotifications.slice(0, 3).map((n: any) => n.user_id));
        console.log("Current user.id:", user.id);
        console.log("First notification user_id matches:", simpleNotifications[0].user_id === user.id);
      }

      if (simpleNotifications && simpleNotifications.length > 0) {
        // Manually fetch profile data
        const actorIds = [...new Set(simpleNotifications.map((n: any) => n.actor_id).filter(Boolean))];
        let profilesMap = new Map();
        
        if (actorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("clerk_id, display_name")
            .in("clerk_id", actorIds);
          
          profilesMap = new Map(profilesData?.map((p: any) => [p.clerk_id, p]) || []);
        }
        
        const formatted = simpleNotifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          userId: n.actor_id,
          targetId: n.target_id,
          createdAt: n.created_at,
          read: n.read || false,
          read_at: n.read_at,
          actor: profilesMap.get(n.actor_id),
        }));

          // Filter by notification settings
          const typeMap: Record<string, keyof typeof notificationTypes> = {
            'follow': 'newFollower',
            'connection': 'newConnection',
            'comment': 'newComment',
            'review': 'newReview',
            'like': 'newLike',
            'message': 'newMessage',
            'mention': 'newMention',
            'repost': 'newRepost',
            'ticket_created': 'ticketCreated',
            'ticket_assigned': 'ticketAssigned',
            'ticket_replied': 'ticketReplied',
            'ticket_status_changed': 'ticketStatusChanged',
            'ticket_closed': 'ticketClosed',
            'warning_issued': 'warningIssued',
            'account_suspended': 'accountSuspended',
            'account_unsuspended': 'accountUnsuspended',
            'file_approved': 'fileApproved',
            'file_rejected': 'fileRejected',
            'profile_approved': 'profileApproved',
            'profile_rejected': 'profileRejected',
            'verification_approved': 'verificationApproved',
            'verification_rejected': 'verificationRejected',
            'report_resolved': 'reportResolved',
            'report_dismissed': 'reportDismissed',
            'content_removed': 'contentRemoved',
            'admin_warning': 'adminWarning',
            'admin_notification': 'adminNotification',
          };
          
          // For the bell, show ALL unread notifications regardless of settings
          // Users can manage their preferences, but we don't want to hide important notifications
          // The settings will still be respected for NEW notifications going forward
          const filtered = formatted;
          
          // Log if any would have been filtered (for debugging)
          const wouldBeFiltered = formatted.filter((n: Notification) => {
            if (!inAppNotifications) return true;
            const settingKey = typeMap[n.type];
            if (settingKey) {
              return notificationTypes[settingKey] === false;
            }
            return false;
          });
          
          if (wouldBeFiltered.length > 0) {
            console.log(`Note: ${wouldBeFiltered.length} notifications would be filtered by settings, but showing all in bell`);
          }
          
          console.log(`Filtered ${formatted.length} notifications down to ${filtered.length}`);
          console.log("All notifications before filtering:", formatted.map((n) => ({ id: n.id, type: n.type, read: n.read, message: n.message.substring(0, 50) })));

        setNotifications(filtered);
        const unreadNotifications = filtered.filter((n) => !n.read);
        const unread = unreadNotifications.length;
        setUnreadCount(unread);
        console.log("Final filtered notifications:", filtered.length, "Unread:", unread);
        console.log("Unread notifications:", unreadNotifications.map((n) => ({ id: n.id, type: n.type, read: n.read, message: n.message.substring(0, 50) })));
        if (filtered.length > 0) {
          console.log("Sample notification:", filtered[0]);
        }
        if (unread > 0) {
          console.log("✅ Unread count is", unread, "- bell should show red dot");
        } else {
          console.log("⚠️ Unread count is 0 - bell will not show red dot");
        }
      } else {
        setNotifications([]);
        setUnreadCount(0);
        console.log("No notifications found in database for user:", user.id);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    loadNotifications();

    // Set up real-time subscription
    const supabase = supabaseRef.current;
    let reloadTimeout: NodeJS.Timeout;
    const debouncedReload = (payload?: any) => {
      console.log("Real-time notification event received:", payload?.eventType, payload?.new);
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        console.log("Reloading notifications after real-time event...");
        loadNotifications();
      }, 300);
    };

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification INSERT:", payload);
          debouncedReload(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Notification UPDATE:", payload);
          debouncedReload(payload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Notification DELETE:", payload);
          debouncedReload(payload);
        }
      )
      .subscribe((status) => {
        console.log("Real-time subscription status:", status);
      });

    return () => {
      clearTimeout(reloadTimeout);
      supabase.removeChannel(channel);
    };
  }, [isLoaded, user?.id, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (markingRead === notificationId) return;
    
    setMarkingRead(notificationId);
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        // Update local state immediately
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        // Reload to ensure sync
        setTimeout(() => loadNotifications(), 200);
      } else {
        console.error("Failed to mark notification as read");
        // Still update local state for better UX
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Update local state as fallback
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } finally {
      setMarkingRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id || markingAllRead || unreadCount === 0) return;

    setMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state immediately
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        // Reload to ensure sync
        setTimeout(() => loadNotifications(), 200);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to mark all notifications as read:", errorData.error || response.statusText);
        if (errorData.details) {
          console.error("Error details:", errorData.details);
        }
        // Still update local state for better UX
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      // Update local state as fallback
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatNotificationTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      // If less than 24 hours, use relative time
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      
      // If less than 7 days, show day and time
      if (diffInHours < 168) {
        return format(date, 'EEE h:mm a');
      }
      
      // Otherwise show date
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Recently';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "connection":
        return <Users className="w-4 h-4 text-indigo-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "like":
        return <ThumbsUp className="w-4 h-4 text-blue-500" />;
      case "reaction_love":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "reaction_laugh":
        return <Smile className="w-4 h-4 text-yellow-500" />;
      case "reaction_wow":
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      case "reaction_sad":
        return <Frown className="w-4 h-4 text-blue-500" />;
      case "reaction_angry":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "review":
        return <Star className="w-4 h-4 text-yellow-500" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case "mention":
        return <UserPlus className="w-4 h-4 text-cyan-500" />;
      case "repost":
        return <MessageSquare className="w-4 h-4 text-teal-500" />;
      case "ticket_created":
      case "ticket_assigned":
      case "ticket_replied":
      case "ticket_status_changed":
      case "ticket_closed":
        return <Ticket className="w-4 h-4 text-orange-500" />;
      case "warning_issued":
      case "warning_acknowledged":
      case "admin_warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "account_suspended":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "account_unsuspended":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "file_approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "file_rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "profile_approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "profile_rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "verification_approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "verification_rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "report_resolved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "report_dismissed":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case "content_removed":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "admin_notification":
        return <Bell className="w-4 h-4 text-indigo-500" />;
      case "follow":
      default:
        return <UserPlus className="w-4 h-4 text-green-500" />;
    }
  };

  const getNotificationHref = (notification: Notification) => {
    if (notification.targetId) {
      // Check if it's a comment notification - link to specific comment
      // For comment notifications, targetId is comment_id
      // We'll link to feed with comment param, and PostsFeed will handle finding the post
      if (notification.type === 'comment') {
        return `/feed?comment=${notification.targetId}`;
      }
      // Check if it's a mention
      if (notification.type === 'mention') {
        // For mentions, targetId is prefixed with "post:" or "comment:" to indicate the type
        if (notification.targetId?.startsWith('post:')) {
          const postId = notification.targetId.replace('post:', '');
          return `/feed?post=${postId}`;
        } else if (notification.targetId?.startsWith('comment:')) {
          const commentId = notification.targetId.replace('comment:', '');
          return `/feed?comment=${commentId}`;
        }
        // Fallback: try as comment (for backward compatibility)
        return `/feed?comment=${notification.targetId}`;
      }
      // Check if it's a like/reaction
      if (notification.type === 'like' || notification.type.startsWith('reaction_')) {
        return `/feed?post=${notification.targetId}`;
      }
      // Check if it's a ticket
      if (notification.type.startsWith('ticket_')) {
        return `/support?ticket=${notification.targetId}`;
      }
    }
    if (notification.userId) {
      return `/profile/${notification.userId}`;
    }
    return '/feed';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {showDropdown && (
        <div ref={dropdownRef} className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : notifications.filter((n) => !n.read).length > 0 ? (
              notifications.filter((n) => !n.read).map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationHref(notification)}
                  onClick={() => {
                    setShowDropdown(false);
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                  className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.read ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-3 break-words">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {notification.createdAt 
                          ? formatNotificationTime(notification.createdAt)
                          : 'Just now'}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No unread notifications</p>
                <Link
                  href="/dashboard?tab=notifications"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
                  onClick={() => setShowDropdown(false)}
                >
                  View notification history
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
