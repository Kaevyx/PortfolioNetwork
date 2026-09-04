"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Clock, User, FileText, Shield, CheckCircle, XCircle, Upload, Trash2, Edit, Loader2, Filter, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AccountHistoryItem {
  id: string;
  action_type: string;
  performed_by: string | null;
  details: any;
  created_at: string;
  performer_name?: string;
  performer_is_admin?: boolean;
  reported_user_name?: string;
}

type SortOption = "newest" | "oldest" | "type";
type FilterOption = "all" | string;

export function AccountHistory() {
  const { user, isLoaded } = useUser();
  const [history, setHistory] = useState<AccountHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<AccountHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("user_account_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        // Fetch performer names
        const performerIds = [...new Set((data || []).map((h: any) => h.performed_by).filter(Boolean))];
        let performersMap = new Map();

        if (performerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("clerk_id, display_name, is_admin")
            .in("clerk_id", performerIds);

          performersMap = new Map(profiles?.map((p: any) => [p.clerk_id, p]) || []);
        }

        // Fetch reported user names from details
        const reportedUserIds = [...new Set((data || [])
          .map((h: any) => h.details?.reportedUserId)
          .filter(Boolean))];
        let reportedUsersMap = new Map();

        if (reportedUserIds.length > 0) {
          const { data: reportedProfiles } = await supabase
            .from("profiles")
            .select("clerk_id, display_name")
            .in("clerk_id", reportedUserIds);

          reportedUsersMap = new Map(reportedProfiles?.map((p: any) => [p.clerk_id, p]) || []);
        }

        const historyWithNames = (data || []).map((item: any) => ({
          ...item,
          performer_name: item.performed_by ? performersMap.get(item.performed_by)?.display_name : null,
          performer_is_admin: item.performed_by ? performersMap.get(item.performed_by)?.is_admin : false,
          reported_user_name: item.details?.reportedUserId ? reportedUsersMap.get(item.details.reportedUserId)?.display_name : null,
        }));

        setHistory(historyWithNames);
      } catch (error) {
        console.error("Error loading account history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`account-history-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_account_history",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded, user?.id, supabase]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...history];

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.action_type === typeFilter);
    }

    // Apply sorting
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "type") {
      filtered.sort((a, b) => a.action_type.localeCompare(b.action_type));
    }

    setFilteredHistory(filtered);
  }, [history, typeFilter, sortBy]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "profile_created":
      case "profile_updated":
        return <User className="w-4 h-4 text-blue-500" />;
      case "profile_approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "profile_rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "file_uploaded":
      case "file_approved":
        return <Upload className="w-4 h-4 text-indigo-500" />;
      case "file_rejected":
      case "file_deleted":
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case "verification_requested":
      case "verification_approved":
      case "verification_rejected":
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case "account_suspended":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "account_unsuspended":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "admin_action":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionMessage = (item: AccountHistoryItem) => {
    const details = item.details || {};
    const performer = item.performer_name || (item.performed_by ? "An administrator" : "You");

    switch (item.action_type) {
      case "profile_created":
        return "Your profile was created";
      case "profile_updated":
        return details.changes ? `Profile updated: ${details.changes}` : "Your profile was updated";
      case "profile_approved":
        return `Your profile was approved by ${performer}${details.reason ? `. ${details.reason}` : ""}`;
      case "profile_rejected":
        return `Your profile was rejected by ${performer}${details.reason ? `. Reason: ${details.reason}` : ""}`;
      case "file_uploaded":
        return `File "${details.fileName || "file"}" was uploaded`;
      case "file_approved":
        return `File "${details.fileName || "file"}" was approved by ${performer}`;
      case "file_rejected":
        return `File "${details.fileName || "file"}" was rejected by ${performer}${details.reason ? `. Reason: ${details.reason}` : ""}`;
      case "file_deleted":
        return `File "${details.fileName || "file"}" was deleted${item.performed_by ? ` by ${performer}` : ""}`;
      case "verification_requested":
        return "Verification request submitted";
      case "verification_approved":
        return `Verification request approved by ${performer}`;
      case "verification_rejected":
        return `Verification request rejected by ${performer}${details.reason ? `. Reason: ${details.reason}` : ""}`;
      case "account_suspended":
        const durationText = details.durationDays 
          ? ` for ${details.durationDays} day${details.durationDays > 1 ? 's' : ''}`
          : " permanently";
        const endsAtText = details.endsAt 
          ? ` (ends ${new Date(details.endsAt).toLocaleString()})`
          : "";
        return `Your account was suspended${durationText}${details.reason ? `. Reason: ${details.reason}` : ""}${endsAtText}`;
      case "account_unsuspended":
        return `Your account suspension was lifted. Your profile is now visible again.`;
      case "admin_action":
        // Handle report-related actions with detailed messages
        if (details.action === "report_resolved" || details.action === "report_dismissed") {
          const reportType = details.reportType || "content";
          const actionTaken = details.actionTaken;
          const reportedUserName = item.reported_user_name || (details.reportedUserId ? "a user" : null);
          const reportedUser = reportedUserName ? ` (reported user: ${reportedUserName})` : "";
          
          if (details.action === "report_resolved") {
            let actionText = "";
            if (actionTaken === "warning_issued") {
              actionText = "Warning issued to reported user";
            } else if (actionTaken === "content_removed") {
              actionText = "Content removed";
            } else if (actionTaken === "user_suspended") {
              actionText = "User suspended";
            } else if (actionTaken === "no_action") {
              actionText = "No action taken";
            } else {
              actionText = "Action taken";
            }
            // Only include notes if provided
            const notesText = details.reviewNotes?.trim() ? ` Notes: ${details.reviewNotes}` : "";
            return `Your report about a ${reportType}${reportedUser} was resolved. ${actionText}.${notesText}`;
          } else {
            // Only include reason if provided
            const reasonText = details.reviewNotes?.trim() ? ` Reason: ${details.reviewNotes}` : "";
            return `Your report about a ${reportType}${reportedUser} was dismissed.${reasonText}`;
          }
        }
        // Handle warning received
        if (details.action === "warning_issued") {
          // Distinguish between reported content warnings and blocked attempt warnings
          const isReportedContent = details.reportType || details.reportId;
          const isBlockedAttempt = details.blockedAttemptId;
          
          if (isReportedContent) {
            // Warning for content that was actually posted/created and then reported
            const reportType = details.reportType || "content";
            const reportTypeDesc = reportType === "post" ? "a post" : 
                                  reportType === "comment" ? "a comment" : 
                                  reportType === "file" ? "a file" :
                                  reportType === "profile" ? "your profile" :
                                  "content";
            
            // Check if warningMessage already contains the full message (to avoid duplication)
            const warningMessage = details.warningMessage || "";
            const hasFullMessage = warningMessage.includes("You have received a warning") || 
                                  warningMessage.includes("You received a warning");
            
            let message = "";
            
            if (hasFullMessage) {
              // If warningMessage is already a complete message, use it but remove the "You can view..." part
              // since we'll add a link instead
              message = warningMessage
                .replace(/\n\nYou can view the reported (post|comment) (below|in your dashboard)\./g, "")
                .trim();
            } else {
              // Build message from parts
              message = `You received a warning for ${reportTypeDesc} that was reported by another user`;
              
              if (details.reportReason) {
                message += ` (reason: ${details.reportReason})`;
              }
              
              if (details.warningNotes) {
                message += `. ${details.warningNotes}`;
              } else {
                message += `. Please review our community guidelines.`;
              }
            }
            
            // Add link to view the reported content
            const hasContentLink = (reportType === "post" || reportType === "comment") && details.reportedContentId;
            
            return (
              <span>
                {message}
                {hasContentLink && (
                  <>
                    {" "}
                    {reportType === "post" ? (
                      <Link href={`/feed?post=${details.reportedContentId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        View Post
                      </Link>
                    ) : reportType === "comment" && details.reportedPostId ? (
                      <Link href={`/feed?post=${details.reportedPostId}&comment=${details.reportedContentId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        View Comment
                      </Link>
                    ) : (
                      <Link href={`/feed?comment=${details.reportedContentId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        View Comment
                      </Link>
                    )}
                  </>
                )}
              </span>
            );
          } else if (isBlockedAttempt) {
            // Warning for attempting to post content with blocked keywords/domains
            const category = details.category;
            const contentType = details.contentType || "content";
            
            // Determine content type description
            const contentDesc = contentType === "post" ? "a post" : 
                               contentType === "comment" ? "a comment" : 
                               contentType === "share_comment" ? "a comment" :
                               contentType === "message" ? "a message" : 
                               "content";
            
            // Build a more specific message - warnings are for attempts, not actual posts
            let message = `You received a warning for attempting to post ${contentDesc}`;
            
            if (category && category !== "content" && category !== "blocked_keyword" && category !== "blocked_domain") {
              message += ` that violated our community guidelines (${category})`;
            } else {
              message += ` that violated our community guidelines`;
            }
            
            if (details.warningMessage || details.warningNotes) {
              message += `. ${details.warningMessage || details.warningNotes}`;
            }
            
            return message;
          } else {
            // Fallback for other warning types
            let message = `You received a warning`;
            if (details.warningMessage || details.warningNotes) {
              message += `. ${details.warningMessage || details.warningNotes}`;
            }
            return message;
          }
        }
        // Handle content removed
        if (details.action === "content_removed") {
          const removedContent = details.removedContent;
          if (removedContent) {
            const contentType = removedContent.type === "post" ? "post" : removedContent.type === "comment" ? "comment" : "file";
            let contentPreview = "";
            if (removedContent.type === "post" || removedContent.type === "comment") {
              // Truncate to 100 characters max to prevent massive notifications
              const maxLength = 100;
              const content = removedContent.content || "";
              contentPreview = content.length > maxLength 
                ? ` "${content.substring(0, maxLength)}..."`
                : content 
                ? ` "${content}"`
                : "";
            } else if (removedContent.type === "file") {
              contentPreview = removedContent.fileName ? ` "${removedContent.fileName}"` : "";
            }
            // Only include reason if one was provided
            const reasonText = details.reviewNotes?.trim() ? ` ${details.reviewNotes}` : "";
            return `Your ${contentType}${contentPreview} was removed due to a violation of our community guidelines${reasonText ? `.${reasonText}` : ""}.`;
          }
          // Only include reason if one was provided
          const reasonText = details.reviewNotes?.trim() ? ` ${details.reviewNotes}` : "";
          return `Your content was removed due to a violation of our community guidelines${reasonText ? `.${reasonText}` : ""}.`;
        }
        return details.message || "Admin action performed";
      case "account_modified":
        // Make account_modified more specific
        if (details.changes) {
          if (item.performed_by === null || performer === "You") {
            return `You updated your account: ${details.changes}`;
          }
          return `Your account was modified by ${performer}: ${details.changes}`;
        } else if (details.field) {
          const fieldName = details.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const oldValue = details.old_value;
          const newValue = details.new_value;
          if (oldValue !== undefined && newValue !== undefined) {
            if (item.performed_by === null || performer === "You") {
              return `You changed your ${fieldName} from "${oldValue}" to "${newValue}"`;
            }
            return `Your ${fieldName} was changed by ${performer} from "${oldValue}" to "${newValue}"`;
          } else {
            if (item.performed_by === null || performer === "You") {
              return `You updated your ${fieldName}`;
            }
            return `Your ${fieldName} was modified by ${performer}`;
          }
        } else {
          if (item.performed_by === null || performer === "You") {
            return "You updated your account settings";
          }
          return `Your account settings were modified by ${performer}`;
        }
      case "employment_status_changed":
        const oldStatus = details.old_status;
        const newStatus = details.new_status;
        if (oldStatus && newStatus) {
          const formatStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `Your employment status was changed from "${formatStatus(oldStatus)}" to "${formatStatus(newStatus)}"`;
        } else if (newStatus) {
          const formatStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `Your employment status was set to "${formatStatus(newStatus)}"`;
        } else {
          return "Your employment status was updated";
        }
      default:
        // Format the action type to be more readable
        const formattedType = item.action_type
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return `${formattedType}${details.changes ? `: ${details.changes}` : ""}`;
    }
  };

  const actionTypes = [
    "all",
    ...["account_modified", "account_suspended", "account_unsuspended", "admin_action", "employment_status_changed", "file_approved", "file_deleted", "file_rejected", "file_uploaded", "profile_approved", "profile_created", "profile_rejected", "profile_updated", "verification_approved", "verification_rejected", "verification_requested"].sort((a, b) => a.localeCompare(b)),
  ];

  const getActionLabel = (actionType: string) => {
    // Special formatting for certain action types
    const specialLabels: Record<string, string> = {
      "employment_status_changed": "Employment Status Changed",
      "account_modified": "Account Modified",
      "profile_updated": "Profile Updated",
      "profile_created": "Profile Created",
      "file_uploaded": "File Uploaded",
      "verification_requested": "Verification Requested",
    };
    
    if (specialLabels[actionType]) {
      return specialLabels[actionType];
    }
    
    return actionType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatHistoryTime = (dateString: string) => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Action Type
              </div>
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterOption)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {getActionLabel(type)}
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

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {history.length === 0 
                  ? "No account history yet" 
                  : "No history matches your filters"}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(item.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {getActionMessage(item)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400" title={new Date(item.created_at).toLocaleString()}>
                      {formatHistoryTime(item.created_at)}
                    </p>
                    {item.performed_by && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.performer_is_admin ? (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            item.performer_name || "Unknown"
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

