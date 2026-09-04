"use client";

import { useState, useEffect } from "react";
import { Flag, CheckCircle2, X, Loader2, Eye, User, FileText, MessageSquare, Image as ImageIcon, AlertTriangle, Search, Filter, ExternalLink } from "lucide-react";
import { Modal } from "./Modal";
import { SuspendUserModal } from "./SuspendUserModal";
import Link from "next/link";

interface AdminReportsModerationProps {
  supabase: any;
  currentUserId: string;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_type: "profile" | "post" | "comment" | "file";
  reported_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  action_taken: string | null;
  created_at: string;
  reporter?: {
    display_name: string;
    clerk_id: string;
  };
  reported_profile?: {
    display_name: string;
    clerk_id: string;
  };
  reported_post?: {
    id: string;
    content: string;
    profile_id: string;
    profile?: {
      display_name: string;
      clerk_id: string;
    };
  };
  reported_comment?: {
    id: string;
    content: string;
    user_id: string;
    post_id: string;
    user?: {
      display_name: string;
      clerk_id: string;
    };
  };
  reported_file?: {
    id: string;
    file_name: string;
    file_type: string;
    user_id: string;
    user?: {
      display_name: string;
      clerk_id: string;
    };
  };
}

export function AdminReportsModeration({ supabase, currentUserId }: AdminReportsModerationProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "reviewed" | "resolved" | "dismissed">("all");
  const [filterType, setFilterType] = useState<"all" | "profile" | "post" | "comment" | "file">("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionTaken, setActionTaken] = useState<"content_removed" | "user_suspended" | "warning_issued" | "no_action" | "">("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterType]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // First, get all reports
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterType !== "all") {
        query = query.eq("reported_type", filterType);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Get unique reporter IDs and reported profile IDs
      const reporterIds = [...new Set(reportsData.map(r => r.reporter_id))];
      const reportedProfileIds = [...new Set(
        reportsData
          .filter(r => r.reported_type === "profile")
          .map(r => r.reported_id)
      )];

      // Get reported post IDs, comment IDs, and file IDs
      const reportedPostIds = reportsData
        .filter(r => r.reported_type === "post")
        .map(r => r.reported_id);
      const reportedCommentIds = reportsData
        .filter(r => r.reported_type === "comment")
        .map(r => r.reported_id);
      const reportedFileIds = reportsData
        .filter(r => r.reported_type === "file")
        .map(r => r.reported_id);

      // Fetch reporter profiles
      const { data: reporterProfiles, error: reporterError } = await supabase
        .from("profiles")
        .select("display_name, clerk_id")
        .in("clerk_id", reporterIds);

      if (reporterError) {
        console.error("Error loading reporter profiles:", reporterError);
      }

      // Fetch reported profiles (only for profile reports)
      const { data: reportedProfiles, error: reportedError } = reportedProfileIds.length > 0
        ? await supabase
            .from("profiles")
            .select("display_name, clerk_id")
            .in("clerk_id", reportedProfileIds)
        : { data: null, error: null };

      if (reportedError) {
        console.error("Error loading reported profiles:", reportedError);
      }

      // Fetch reported posts with their authors
      let reportedPosts: any[] = [];
      let postAuthorIds: string[] = [];
      if (reportedPostIds.length > 0) {
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select("id, content, profile_id")
          .in("id", reportedPostIds);

        if (!postsError && postsData) {
          reportedPosts = postsData;
          postAuthorIds = [...new Set(postsData.map(p => p.profile_id))];
        }
      }

      // Fetch post authors
      const { data: postAuthors, error: postAuthorsError } = postAuthorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("display_name, clerk_id")
            .in("clerk_id", postAuthorIds)
        : { data: null, error: null };

      if (postAuthorsError) {
        console.error("Error loading post authors:", postAuthorsError);
      }

      // Fetch reported comments with their authors
      let reportedComments: any[] = [];
      let commentAuthorIds: string[] = [];
      if (reportedCommentIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from("post_comments")
          .select("id, content, user_id, post_id")
          .in("id", reportedCommentIds);

        if (!commentsError && commentsData) {
          reportedComments = commentsData;
          commentAuthorIds = [...new Set(commentsData.map(c => c.user_id))];
        }
      }

      // Fetch comment authors
      const { data: commentAuthors, error: commentAuthorsError } = commentAuthorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("display_name, clerk_id")
            .in("clerk_id", commentAuthorIds)
        : { data: null, error: null };

      if (commentAuthorsError) {
        console.error("Error loading comment authors:", commentAuthorsError);
      }

      // Fetch reported files with their owners
      let reportedFiles: any[] = [];
      let fileOwnerIds: string[] = [];
      if (reportedFileIds.length > 0) {
        const { data: filesData, error: filesError } = await supabase
          .from("storage_files")
          .select("id, file_name, file_type, user_id")
          .in("id", reportedFileIds);

        if (!filesError && filesData) {
          reportedFiles = filesData;
          fileOwnerIds = [...new Set(filesData.map(f => f.user_id))];
        }
      }

      // Fetch file owners
      const { data: fileOwners, error: fileOwnersError } = fileOwnerIds.length > 0
        ? await supabase
            .from("profiles")
            .select("display_name, clerk_id")
            .in("clerk_id", fileOwnerIds)
        : { data: null, error: null };

      if (fileOwnersError) {
        console.error("Error loading file owners:", fileOwnersError);
      }

      // Fetch reviewed_by profiles
      const reviewedByIds = [...new Set(reportsData.map(r => r.reviewed_by).filter(Boolean))];
      const { data: reviewedByProfiles, error: reviewedByError } = reviewedByIds.length > 0
        ? await supabase
            .from("profiles")
            .select("display_name, clerk_id")
            .in("clerk_id", reviewedByIds)
        : { data: null, error: null };

      if (reviewedByError) {
        console.error("Error loading reviewed_by profiles:", reviewedByError);
      }

      // Create maps for quick lookup
      const reporterMap = new Map(
        (reporterProfiles || []).map(p => [p.clerk_id, p])
      );
      const reportedProfileMap = new Map(
        (reportedProfiles || []).map(p => [p.clerk_id, p])
      );
      const postAuthorMap = new Map(
        (postAuthors || []).map(p => [p.clerk_id, p])
      );
      const commentAuthorMap = new Map(
        (commentAuthors || []).map(p => [p.clerk_id, p])
      );
      const fileOwnerMap = new Map(
        (fileOwners || []).map(p => [p.clerk_id, p])
      );
      const reviewedByMap = new Map(
        (reviewedByProfiles || []).map(p => [p.clerk_id, p])
      );
      const postMap = new Map(
        reportedPosts.map(p => [p.id, p])
      );
      const commentMap = new Map(
        reportedComments.map(c => [c.id, c])
      );
      const fileMap = new Map(
        reportedFiles.map(f => [f.id, f])
      );

      // Fetch warning acknowledgment status for reports with warning_issued action
      const reportsWithWarnings = reportsData.filter(r => r.action_taken === 'warning_issued');
      const warningIds: string[] = [];
      const warningMap = new Map<string, { is_acknowledged: boolean; acknowledged_at: string | null }>();
      
      if (reportsWithWarnings.length > 0) {
        // Get reported user IDs for these reports
        const reportedUserIdsForWarnings: string[] = [];
        for (const report of reportsWithWarnings) {
          let reportedUserId: string | null = null;
          if (report.reported_type === "profile") {
            reportedUserId = report.reported_id;
          } else if (report.reported_type === "post") {
            const post = postMap.get(report.reported_id);
            reportedUserId = post?.profile_id || null;
          } else if (report.reported_type === "comment") {
            const comment = commentMap.get(report.reported_id);
            reportedUserId = comment?.user_id || null;
          }
          if (reportedUserId) {
            reportedUserIdsForWarnings.push(reportedUserId);
          }
        }
        
        // Fetch warnings for these users
        if (reportedUserIdsForWarnings.length > 0) {
          const { data: warningsData } = await supabase
            .from('content_warnings')
            .select('id, is_acknowledged, acknowledged_at, user_id, post_id, comment_id')
            .in('user_id', reportedUserIdsForWarnings)
            .eq('is_active', true);
          
          if (warningsData) {
            // Map warnings by post_id/comment_id to reports
            for (const warning of warningsData) {
              if (warning.post_id) {
                warningMap.set(`post:${warning.post_id}`, {
                  is_acknowledged: warning.is_acknowledged,
                  acknowledged_at: warning.acknowledged_at
                });
              } else if (warning.comment_id) {
                warningMap.set(`comment:${warning.comment_id}`, {
                  is_acknowledged: warning.is_acknowledged,
                  acknowledged_at: warning.acknowledged_at
                });
              }
            }
          }
        }
      }

      // Enrich reports with all related data
      const enrichedReports = reportsData.map(report => {
        const baseReport: any = {
          ...report,
          reporter: reporterMap.get(report.reporter_id) || null,
          reviewed_by_profile: report.reviewed_by ? reviewedByMap.get(report.reviewed_by) || null : null,
        };
        
        // Add warning acknowledgment status
        if (report.action_taken === 'warning_issued') {
          const warningKey = report.reported_type === 'post' 
            ? `post:${report.reported_id}`
            : report.reported_type === 'comment'
            ? `comment:${report.reported_id}`
            : null;
          if (warningKey && warningMap.has(warningKey)) {
            baseReport.warning_acknowledged = warningMap.get(warningKey)!.is_acknowledged;
            baseReport.warning_acknowledged_at = warningMap.get(warningKey)!.acknowledged_at;
          }
        }

        // Add reported entity information based on type
        if (report.reported_type === "profile") {
          baseReport.reported_profile = reportedProfileMap.get(report.reported_id) || null;
        } else if (report.reported_type === "post") {
          const post = postMap.get(report.reported_id);
          if (post) {
            baseReport.reported_post = {
              ...post,
              profile: postAuthorMap.get(post.profile_id) || null,
            };
          }
        } else if (report.reported_type === "comment") {
          const comment = commentMap.get(report.reported_id);
          if (comment) {
            baseReport.reported_comment = {
              ...comment,
              user: commentAuthorMap.get(comment.user_id) || null,
            };
          }
        } else if (report.reported_type === "file") {
          const file = fileMap.get(report.reported_id);
          if (file) {
            baseReport.reported_file = {
              ...file,
              user: fileOwnerMap.get(file.user_id) || null,
            };
          }
        }

        return baseReport;
      });

      setReports(enrichedReports);
    } catch (error) {
      console.error("Error loading reports:", error);
      alert("Failed to load reports: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId: string, action: "resolve" | "dismiss") => {
    setProcessingId(reportId);
    try {
      const updateData: any = {
        status: action === "resolve" ? "resolved" : "dismissed",
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes.trim() || null,
        action_taken: actionTaken || null,
      };

      const { error } = await supabase
        .from("reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) throw error;

      // Get the report with all details
      const report = reports.find((r) => r.id === reportId);
      if (!report) {
        throw new Error("Report not found");
      }

      // Get admin profile for notifications
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("clerk_id", currentUserId)
        .single();

      const adminName = adminProfile?.display_name || "An administrator";

      // Determine the reported user ID based on report type
      let reportedUserId: string | null = null;
      if (report.reported_type === "profile") {
        // For profile reports, use reported_id directly if profile data not loaded
        reportedUserId = report.reported_profile?.clerk_id || report.reported_id;
      } else if (report.reported_type === "post") {
        // For post reports, get the post author
        if (report.reported_post?.profile) {
          reportedUserId = report.reported_post.profile.clerk_id;
        } else if (report.reported_post?.profile_id) {
          reportedUserId = report.reported_post.profile_id;
        } else {
          // Fallback: try to get from reported_id if it's a clerk_id format
          // Otherwise fetch the post to get profile_id
          try {
            const { data: postData } = await supabase
              .from("posts")
              .select("profile_id")
              .eq("id", report.reported_id)
              .single();
            if (postData) {
              reportedUserId = postData.profile_id;
            }
          } catch (e) {
            console.error("Error fetching post for reportedUserId:", e);
          }
        }
      } else if (report.reported_type === "comment") {
        if (report.reported_comment?.user) {
          reportedUserId = report.reported_comment.user.clerk_id;
        } else if (report.reported_comment?.user_id) {
          reportedUserId = report.reported_comment.user_id;
        } else {
          // Fallback: fetch comment to get user_id
          try {
            const { data: commentData } = await supabase
              .from("post_comments")
              .select("user_id")
              .eq("id", report.reported_id)
              .single();
            if (commentData) {
              reportedUserId = commentData.user_id;
            }
          } catch (e) {
            console.error("Error fetching comment for reportedUserId:", e);
          }
        }
      } else if (report.reported_type === "file") {
        if (report.reported_file?.user) {
          reportedUserId = report.reported_file.user.clerk_id;
        } else if (report.reported_file?.user_id) {
          reportedUserId = report.reported_file.user_id;
        } else {
          // Fallback: fetch file to get user_id
          try {
            const { data: fileData } = await supabase
              .from("storage_files")
              .select("user_id")
              .eq("id", report.reported_id)
              .single();
            if (fileData) {
              reportedUserId = fileData.user_id;
            }
          } catch (e) {
            console.error("Error fetching file for reportedUserId:", e);
          }
        }
      }

      console.log("Determined reportedUserId:", {
        reportedUserId,
        reportType: report.reported_type,
        reportedId: report.reported_id,
        hasReportedProfile: !!report.reported_profile,
        hasReportedPost: !!report.reported_post,
      });

      // Send notification to reporter (DO NOT include review notes - they should not see what action was taken)
      const reporterMessage = action === "resolve"
        ? `Your report has been reviewed. Thank you for helping keep our community safe.`
        : `Your report has been reviewed. Thank you for your report.`;

      try {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: report.reporter_id,
            type: action === "resolve" ? "report_resolved" : "report_dismissed",
            actor_id: currentUserId,
            target_id: reportId,
            message: reporterMessage,
          });

        if (notifError) {
          console.error("Error sending notification to reporter:", notifError);
        }

        // Log detailed account history for reporter
        try {
          await supabase.rpc("log_user_account_history", {
            p_user_id: report.reporter_id,
            p_action_type: "admin_action",
            p_performed_by: currentUserId,
            p_details: {
              action: action === "resolve" ? "report_resolved" : "report_dismissed",
              reportId: reportId,
              reportType: report.reported_type,
              reportReason: report.reason,
              reportedUserId: reportedUserId,
              actionTaken: actionTaken || null,
              // DO NOT include reviewNotes in reporter's account history - they should not see what action was taken
              reportedContentId: report.reported_id,
              resolutionDate: new Date().toISOString(),
            },
          });
        } catch (historyError) {
          console.error("Error logging reporter account history:", historyError);
        }
      } catch (notifError) {
        console.error("Error sending notification to reporter:", notifError);
      }

      // Handle content removal
      if (actionTaken === "content_removed" && reportedUserId) {
        let removedContentInfo: any = null;
        
        try {
          if (report.reported_type === "post" && report.reported_post?.id) {
            // Store post info before deletion
            removedContentInfo = {
              type: "post",
              id: report.reported_post.id,
              content: report.reported_post.content?.substring(0, 200) || "Post content",
              createdAt: report.reported_post.created_at || new Date().toISOString(),
            };
            
            // Get post image URLs before deleting
            const imageUrls = report.reported_post.image_url
              ? (Array.isArray(report.reported_post.image_url) 
                  ? report.reported_post.image_url 
                  : [report.reported_post.image_url])
              : [];
            
            // Delete the post
            const { error: deleteError } = await supabase
              .from("posts")
              .delete()
              .eq("id", report.reported_post.id);
            
            if (deleteError) {
              console.error("Error deleting post:", deleteError);
              throw deleteError;
            }

            // If post has images, delete them from storage
            if (imageUrls.length > 0) {
              for (const imageUrl of imageUrls) {
                try {
                  const deleteResponse = await fetch(
                    `/api/post/delete-image?imageUrl=${encodeURIComponent(imageUrl)}&postId=${report.reported_post.id}`,
                    { method: "DELETE" }
                  );
                  
                  if (!deleteResponse.ok) {
                    console.warn("Failed to delete post image, but post was deleted");
                  }
                } catch (imageError) {
                  console.error("Error deleting post image:", imageError);
                  // Don't fail if image deletion fails
                }
              }
            }
          } else if (report.reported_type === "comment" && report.reported_comment?.id) {
            // Store comment info before deletion
            removedContentInfo = {
              type: "comment",
              id: report.reported_comment.id,
              content: report.reported_comment.content?.substring(0, 200) || "Comment content",
              postId: report.reported_comment.post_id,
              createdAt: report.reported_comment.created_at || new Date().toISOString(),
            };
            
            // Delete the comment
            const { error: deleteError } = await supabase
              .from("post_comments")
              .delete()
              .eq("id", report.reported_comment.id);
            
            if (deleteError) {
              console.error("Error deleting comment:", deleteError);
              throw deleteError;
            }
          } else if (report.reported_type === "file" && report.reported_file?.id) {
            // Store file info before deletion
            removedContentInfo = {
              type: "file",
              id: report.reported_file.id,
              fileName: report.reported_file.file_name || "File",
              fileType: report.reported_file.file_type || "unknown",
              createdAt: new Date().toISOString(),
            };
            
            // Delete the file (this would need to be done via API route for storage)
            // For now, we'll just mark it in the database
            const { error: deleteError } = await supabase
              .from("storage_files")
              .delete()
              .eq("id", report.reported_file.id);
            
            if (deleteError) {
              console.error("Error deleting file:", deleteError);
              throw deleteError;
            }
          }
          
          // Note: Notification and account history for content_removed will be handled in the main flow below
          // to avoid duplication
        } catch (contentError) {
          console.error("Error removing content:", contentError);
          alert("Failed to remove content: " + (contentError instanceof Error ? contentError.message : "Unknown error"));
        }
      }

      // Note: User suspension is now handled immediately when admin confirms in the suspend modal
      // We don't need to suspend again here, but we verify that suspension was completed
      if (actionTaken === "user_suspended" && reportedUserId && suspensionReason) {
        // Suspension already happened in the modal, just verify it was successful
        // The suspend API already created the notification and account history
        console.log("User suspension was already completed in the suspend modal");
      }

      // If warning was issued, send notification and log to account history for reported user
      // Check if actionTaken is warning_issued (works for both resolve and dismiss actions)
      if (reportedUserId && actionTaken === "warning_issued") {
        console.log("Sending warning to reported user:", {
          reportedUserId,
          reportType: report.reported_type,
          reportId: reportId,
          actionTaken,
        });

        // Build warning message with context - distinguish from blocked attempt warnings
        const reportTypeDesc = report.reported_type === "post" ? "a post" : 
                              report.reported_type === "comment" ? "a comment" : 
                              report.reported_type === "file" ? "a file" :
                              report.reported_type === "profile" ? "your profile" :
                              "content";
        // Only include reason if one was provided
        const reasonText = reviewNotes?.trim() ? ` ${reviewNotes}` : " Please review our community guidelines.";
        let warningMessage = `You have received a warning for ${reportTypeDesc} that was reported by another user.${reasonText}`;
        
        // Add post/comment link reference if applicable (link will be displayed below in the banner)
        if (report.reported_type === "post" && report.reported_post?.id) {
          warningMessage += `\n\nYou can view the reported post below.`;
        } else if (report.reported_type === "comment" && report.reported_comment?.id && report.reported_comment?.post_id) {
          warningMessage += `\n\nYou can view the reported comment below.`;
        }

        // Create warning record in content_warnings table (for dashboard banner)
        let warningData;
        try {
          // Determine severity based on report reason or default to medium
          let severity: 'low' | 'medium' | 'high' = 'medium';
          if (report.reason) {
            const reasonLower = report.reason.toLowerCase();
            if (reasonLower.includes('spam') || reasonLower.includes('harassment') || reasonLower.includes('hate')) {
              severity = 'high';
            } else if (reasonLower.includes('inappropriate') || reasonLower.includes('offensive')) {
              severity = 'medium';
            } else {
              severity = 'low';
            }
          }

          // Determine category from report type
          const category = report.reported_type === "post" ? "reported_post" :
                          report.reported_type === "comment" ? "reported_comment" :
                          report.reported_type === "file" ? "reported_file" :
                          report.reported_type === "profile" ? "reported_profile" :
                          "reported_content";

          // Store post_id or comment_id for linking
          const postId = report.reported_type === "post" && report.reported_post?.id 
            ? report.reported_post.id 
            : null;
          const commentId = report.reported_type === "comment" && report.reported_comment?.id 
            ? report.reported_comment.id 
            : null;

          const { data: warningRecord, error: warningError } = await supabase
            .from('content_warnings')
            .insert({
              user_id: reportedUserId,
              blocked_attempt_id: null, // No blocked attempt for reported content
              warning_message: warningMessage,
              category: category,
              severity: severity,
              issued_by: currentUserId,
              is_active: true,
              post_id: postId,
              comment_id: commentId,
            })
            .select()
            .single();

          if (warningError) {
            console.error("Error creating warning record:", warningError);
            throw warningError;
          }

          warningData = warningRecord;
          console.log("Warning record created successfully:", warningData);
        } catch (warningError) {
          console.error("Error creating warning record:", warningError);
          // Continue even if warning record creation fails, but log it
        }

        // Send notification to reported user
        try {
          const { data: notifData, error: notifError } = await supabase
            .from("notifications")
            .insert({
              user_id: reportedUserId,
              type: "warning_issued",
              actor_id: currentUserId,
              target_id: warningData?.id || reportId, // Use warning ID if available, fallback to report ID
              message: warningMessage,
            })
            .select()
            .single();

          if (notifError) {
            console.error("Error sending warning notification:", notifError);
            // Don't throw - warning record is more important
          } else {
            console.log("Warning notification sent successfully:", notifData);
          }
        } catch (notifError) {
          console.error("Error sending warning notification:", notifError);
          // Don't fail the whole operation if notification fails
        }

        // Log admin action and account history for warning
        try {
          const logResponse = await fetch("/api/log-admin-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actionType: "warning_issued",
              targetUserId: reportedUserId,
              targetId: reportId,
              details: {
                reportType: report.reported_type,
                reportReason: report.reason,
                warningNotes: reviewNotes,
              },
            }),
          });

          if (!logResponse.ok) {
            const errorText = await logResponse.text();
            console.error("Failed to log admin action:", errorText);
          }

          // Also directly log to user account history for reported user
          try {
            const { error: historyError } = await supabase.rpc("log_user_account_history", {
              p_user_id: reportedUserId,
              p_action_type: "admin_action",
              p_performed_by: currentUserId,
              p_details: {
                action: "warning_issued",
                reportType: report.reported_type,
                reportReason: report.reason,
                warningNotes: reviewNotes,
                warningMessage: warningMessage,
                reportId: reportId,
                reportedContentId: report.reported_id,
                reportedPostId: report.reported_type === "comment" && report.reported_comment?.post_id 
                  ? report.reported_comment.post_id 
                  : report.reported_type === "post" 
                  ? report.reported_id 
                  : null,
                warningId: warningData?.id, // Include warning ID if created
              },
            });

            if (historyError) {
              console.error("Error logging to account history:", historyError);
            }
          } catch (historyError) {
            console.error("Error logging to account history:", historyError);
          }
        } catch (logError) {
          console.error("Error logging warning action:", logError);
        }
      }

      // Send notification to reported user if action was taken (other than warning or suspension)
      // Note: Suspension notifications are handled by the suspend API, so we skip them here to avoid duplicates
      if (action === "resolve" && reportedUserId && actionTaken && actionTaken !== "warning_issued" && actionTaken !== "user_suspended") {
        let reportedUserMessage = "";
        let accountHistoryAction = "admin_action";
        let removedContentInfo: any = null;
        
        // Get removed content info if content was removed
        if (actionTaken === "content_removed") {
          if (report.reported_type === "post" && report.reported_post?.id) {
            removedContentInfo = {
              type: "post",
              id: report.reported_post.id,
              content: report.reported_post.content?.substring(0, 200) || "Post content",
            };
          } else if (report.reported_type === "comment" && report.reported_comment?.id) {
            removedContentInfo = {
              type: "comment",
              id: report.reported_comment.id,
              content: report.reported_comment.content?.substring(0, 200) || "Comment content",
            };
          } else if (report.reported_type === "file" && report.reported_file?.id) {
            removedContentInfo = {
              type: "file",
              id: report.reported_file.id,
              fileName: report.reported_file.file_name || "File",
            };
          }
          
          const contentType = removedContentInfo?.type === "post" ? "post" : 
                            removedContentInfo?.type === "comment" ? "comment" : 
                            removedContentInfo?.type === "file" ? "file" : "content";
          // Truncate to 100 characters max to prevent massive notifications
          const maxLength = 100;
          const contentPreview = removedContentInfo?.type === "comment" && removedContentInfo?.content
            ? removedContentInfo.content.length > maxLength
              ? ` "${removedContentInfo.content.substring(0, maxLength)}..."`
              : ` "${removedContentInfo.content}"`
            : removedContentInfo?.type === "post" && removedContentInfo?.content
            ? removedContentInfo.content.length > maxLength
              ? ` "${removedContentInfo.content.substring(0, maxLength)}..."`
              : ` "${removedContentInfo.content}"`
            : removedContentInfo?.type === "file" && removedContentInfo?.fileName
            ? ` "${removedContentInfo.fileName}"`
            : "";
          
          // Only include reason if one was provided
          const reasonText = reviewNotes?.trim() ? `. ${reviewNotes}` : "";
          reportedUserMessage = `Your ${contentType}${contentPreview} was removed due to a violation of our community guidelines${reasonText}.`;
        } else if (actionTaken === "no_action") {
          reportedUserMessage = `A report was filed against your content, but after review, no action was taken.`;
        }

        if (reportedUserMessage) {
          try {
            await supabase
              .from("notifications")
              .insert({
                user_id: reportedUserId,
                type: actionTaken === "user_suspended" ? "account_suspended" : actionTaken === "content_removed" ? "content_removed" : "report_resolved",
                actor_id: currentUserId,
                target_id: reportId,
                message: reportedUserMessage,
              });

            // Log to account history (only once, not duplicated)
            try {
              await supabase.rpc("log_user_account_history", {
                p_user_id: reportedUserId,
                p_action_type: accountHistoryAction,
                p_performed_by: currentUserId,
                p_details: {
                  action: actionTaken,
                  reportType: report.reported_type,
                  reportReason: report.reason,
                  reviewNotes: reviewNotes?.trim() || null, // Only include if provided
                  reportId: reportId,
                  removedContent: removedContentInfo, // Include removed content info for content_removed
                },
              });
            } catch (historyError) {
              console.error("Error logging to account history:", historyError);
            }
          } catch (notifError) {
            console.error("Error sending notification to reported user:", notifError);
          }
        }
      }

      // Show success message
      if (actionTaken === "warning_issued" && reportedUserId) {
        alert("Warning issued successfully! The user will see this as a banner on their dashboard where they can acknowledge it.");
      } else {
        alert("Report reviewed successfully!");
      }

      setSelectedReport(null);
      setReviewNotes("");
      setActionTaken("");
      await loadReports();
    } catch (error: any) {
      console.error("Error reviewing report:", error);
      alert("Failed to review report: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "profile":
        return <User className="w-4 h-4" />;
      case "post":
        return <FileText className="w-4 h-4" />;
      case "comment":
        return <MessageSquare className="w-4 h-4" />;
      case "file":
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <Flag className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", text: "Pending" },
      reviewed: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", text: "Reviewed" },
      resolved: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", text: "Resolved" },
      dismissed: { color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300", text: "Dismissed" },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const filteredReports = reports.filter((report) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.reason.toLowerCase().includes(query) ||
        report.details?.toLowerCase().includes(query) ||
        report.reporter?.display_name?.toLowerCase().includes(query) ||
        report.reported_profile?.display_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="profile">Profile</option>
              <option value="post">Post</option>
              <option value="comment">Comment</option>
              <option value="file">File</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reporter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reported User/Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reviewed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action Taken
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No reports found
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  // Get reported user/content information
                  const getReportedInfo = () => {
                    if (report.reported_type === "profile" && report.reported_profile) {
                      return (
                        <Link
                          href={`/profile/${report.reported_profile.clerk_id}`}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          {report.reported_profile.display_name}
                        </Link>
                      );
                    } else if (report.reported_type === "post" && report.reported_post) {
                      return (
                        <div className="space-y-1">
                          {report.reported_post.profile ? (
                            <Link
                              href={`/profile/${report.reported_post.profile.clerk_id}`}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium block"
                            >
                              {report.reported_post.profile.display_name}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">Unknown User</span>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            Post: {report.reported_post.content?.substring(0, 50)}...
                          </p>
                          <Link
                            href={`/feed?post=${report.reported_post.id}`}
                            target="_blank"
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            View Post
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      );
                    } else if (report.reported_type === "comment" && report.reported_comment) {
                      return (
                        <div className="space-y-1">
                          {report.reported_comment.user ? (
                            <Link
                              href={`/profile/${report.reported_comment.user.clerk_id}`}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium block"
                            >
                              {report.reported_comment.user.display_name}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">Unknown User</span>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            Comment: {report.reported_comment.content?.substring(0, 50)}...
                          </p>
                          <Link
                            href={`/feed?post=${report.reported_comment.post_id}&comment=${report.reported_comment.id}`}
                            target="_blank"
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            View Comment
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      );
                    } else if (report.reported_type === "file" && report.reported_file) {
                      return (
                        <div className="space-y-1">
                          {report.reported_file.user ? (
                            <Link
                              href={`/profile/${report.reported_file.user.clerk_id}`}
                              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium block"
                            >
                              {report.reported_file.user.display_name}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">Unknown User</span>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            File: {report.reported_file.file_name || "Unknown"}
                          </p>
                        </div>
                      );
                    }
                    return <span className="text-sm text-gray-500 dark:text-gray-400">Unknown</span>;
                  };

                  return (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{report.reason}</p>
                          {report.details && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {report.details}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getReportTypeIcon(report.reported_type)}
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {report.reported_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {report.reporter ? (
                          <Link
                            href={`/profile/${report.reporter.clerk_id}`}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {report.reporter.display_name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getReportedInfo()}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4">
                        {report.reviewed_by_profile ? (
                          <Link
                            href={`/profile/${report.reviewed_by_profile.clerk_id}`}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {report.reviewed_by_profile.display_name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {report.action_taken ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-sm text-gray-900 dark:text-white capitalize">
                              {report.action_taken.replace('_', ' ')}
                            </span>
                            {report.action_taken === 'warning_issued' && report.warning_acknowledged && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                Acknowledged
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedReport(report)}
                          disabled={processingId === report.id}
                          className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => {
            setSelectedReport(null);
            setReviewNotes("");
            setActionTaken("");
          }}
          title={`Review Report: ${selectedReport.reason}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</p>
                <div className="flex items-center gap-2">
                  {getReportTypeIcon(selectedReport.reported_type)}
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {selectedReport.reported_type}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reporter</p>
                {selectedReport.reporter ? (
                  <Link
                    href={`/profile/${selectedReport.reporter.clerk_id}`}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {selectedReport.reporter.display_name}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">Unknown</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</p>
              <p className="text-sm text-gray-900 dark:text-white">{selectedReport.reason}</p>
            </div>

            {selectedReport.details && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</p>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedReport.details}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reported User/Content
              </p>
              {selectedReport.reported_type === "profile" && selectedReport.reported_profile ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    User: <span className="font-medium text-gray-900 dark:text-white">{selectedReport.reported_profile.display_name}</span>
                  </p>
                  <Link
                    href={`/profile/${selectedReport.reported_profile.clerk_id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    View Profile
                  </Link>
                </div>
              ) : selectedReport.reported_type === "post" && selectedReport.reported_post ? (
                <div className="space-y-2">
                  {selectedReport.reported_post.profile ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Post by: <Link href={`/profile/${selectedReport.reported_post.profile.clerk_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">{selectedReport.reported_post.profile.display_name}</Link>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unknown User</p>
                  )}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedReport.reported_post.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/feed?post=${selectedReport.reported_post.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Post
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Post ID: {selectedReport.reported_post.id}</p>
                  </div>
                </div>
              ) : selectedReport.reported_type === "comment" && selectedReport.reported_comment ? (
                <div className="space-y-2">
                  {selectedReport.reported_comment.user ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Comment by: <Link href={`/profile/${selectedReport.reported_comment.user.clerk_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">{selectedReport.reported_comment.user.display_name}</Link>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unknown User</p>
                  )}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedReport.reported_comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/feed?post=${selectedReport.reported_comment.post_id}&comment=${selectedReport.reported_comment.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Comment
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Comment ID: {selectedReport.reported_comment.id}</p>
                  </div>
                </div>
              ) : selectedReport.reported_type === "file" && selectedReport.reported_file ? (
                <div className="space-y-2">
                  {selectedReport.reported_file.user ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      File owner: <Link href={`/profile/${selectedReport.reported_file.user.clerk_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">{selectedReport.reported_file.user.display_name}</Link>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unknown User</p>
                  )}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">File Name:</span> {selectedReport.reported_file.file_name || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">File Type:</span> {selectedReport.reported_file.file_type || "Unknown"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">File ID: {selectedReport.reported_file.id}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Content ID: {selectedReport.reported_id} (Unable to load details)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Taken
              </label>
              <select
                value={actionTaken}
                onChange={(e) => {
                  const value = e.target.value as any;
                  setActionTaken(value);
                  // Only show suspend modal if user hasn't been suspended yet
                  if (value === "user_suspended" && !suspensionReason) {
                    setShowSuspendModal(true);
                  }
                }}
                disabled={actionTaken === "user_suspended" && !!suspensionReason}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select action...</option>
                <option value="content_removed">Content Removed</option>
                <option value="user_suspended">User Suspended{suspensionReason ? " ✓" : ""}</option>
                <option value="warning_issued">Warning Issued</option>
                <option value="no_action">No Action</option>
              </select>
              {actionTaken === "user_suspended" && suspensionReason && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  ✓ User has been suspended. You can now resolve the report.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Notes <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter your review notes and any actions taken (optional)..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setReviewNotes("");
                  setActionTaken("");
                }}
                disabled={processingId === selectedReport.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewReport(selectedReport.id, "dismiss")}
                disabled={processingId === selectedReport.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingId === selectedReport.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Dismiss
                  </>
                )}
              </button>
              <button
                onClick={() => handleReviewReport(selectedReport.id, "resolve")}
                disabled={processingId === selectedReport.id}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processingId === selectedReport.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedReport && (
        <SuspendUserModal
          isOpen={showSuspendModal}
          onClose={() => {
            setShowSuspendModal(false);
            // If user cancels, reset action taken
            if (!suspensionReason) {
              setActionTaken("");
            }
          }}
          userName={
            selectedReport.reported_profile?.display_name ||
            selectedReport.reported_post?.profile?.display_name ||
            selectedReport.reported_comment?.user?.display_name ||
            selectedReport.reported_file?.user?.display_name ||
            "User"
          }
          userId={(() => {
            if (selectedReport.reported_type === "profile") {
              return selectedReport.reported_profile?.clerk_id || selectedReport.reported_id;
            } else if (selectedReport.reported_type === "post") {
              return selectedReport.reported_post?.profile?.clerk_id || selectedReport.reported_post?.profile_id || selectedReport.reported_id;
            } else if (selectedReport.reported_type === "comment") {
              return selectedReport.reported_comment?.user?.clerk_id || selectedReport.reported_comment?.user_id || selectedReport.reported_id;
            } else if (selectedReport.reported_type === "file") {
              return selectedReport.reported_file?.user?.clerk_id || selectedReport.reported_file?.user_id || selectedReport.reported_id;
            }
            return selectedReport.reported_id;
          })()}
          onSuspend={async (reason: string, durationDays: number | null) => {
            // Suspend the user immediately when admin confirms in modal
            const reportedUserId = (() => {
              if (selectedReport.reported_type === "profile") {
                return selectedReport.reported_profile?.clerk_id || selectedReport.reported_id;
              } else if (selectedReport.reported_type === "post") {
                return selectedReport.reported_post?.profile?.clerk_id || selectedReport.reported_post?.profile_id || selectedReport.reported_id;
              } else if (selectedReport.reported_type === "comment") {
                return selectedReport.reported_comment?.user?.clerk_id || selectedReport.reported_comment?.user_id || selectedReport.reported_id;
              } else if (selectedReport.reported_type === "file") {
                return selectedReport.reported_file?.user?.clerk_id || selectedReport.reported_file?.user_id || selectedReport.reported_id;
              }
              return selectedReport.reported_id;
            })();

            if (!reportedUserId) {
              alert("Unable to determine user ID for suspension.");
              return;
            }

            try {
              const suspendResponse = await fetch("/api/admin/suspend-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  targetUserId: reportedUserId,
                  reason: reason,
                  durationDays: durationDays,
                }),
              });

              if (!suspendResponse.ok) {
                const errorData = await suspendResponse.json();
                throw new Error(errorData.error || "Failed to suspend user");
              }

              // Store reason and duration for report resolution
              setSuspensionReason(reason);
              setSuspensionDuration(durationDays);
              // Ensure actionTaken is set to user_suspended
              setActionTaken("user_suspended");
              setShowSuspendModal(false);
              
              alert("User suspended successfully. You can now resolve the report.");
            } catch (error: any) {
              console.error("Error suspending user:", error);
              alert("Failed to suspend user: " + (error instanceof Error ? error.message : "Unknown error"));
            }
          }}
        />
      )}
    </div>
  );
}




