"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { MessageCircle, Share2, MoreVertical, Trash2, Eye, Copy, Check, ExternalLink, Edit2, X, Repeat2 } from "lucide-react";
import { BookmarkButton } from "./BookmarkButton";
import { ShareButton } from "./RepostButton";
import { ReactionButton } from "./ReactionButton";
import { CommentReactionButton } from "./CommentReactionButton";
import { OnlineStatus } from "./OnlineStatus";
import { AvatarImage } from "./AvatarImage";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { ReportButton } from "./ReportButton";
import { formatDistanceToNow } from "date-fns";
import { parseContent } from "@/lib/utils/parseContent";
import { checkContentSafety } from "@/lib/utils/databaseContentModeration";
import { showToast } from "@/lib/utils/toast";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { MentionLink } from "./MentionLink";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface Post {
  id: string;
  profile_id: string;
  content: string;
  image_url?: string | string[];
  created_at: string;
  is_repost?: boolean;
  original_post_id?: string;
  share_comment?: string;
  profiles?: {
    display_name: string;
    clerk_id: string;
    is_verified: boolean;
    avatar_url?: string | null;
  };
  original_post?: {
    id: string;
    content: string;
    image_url?: string | string[];
    profile_id: string;
    profiles?: {
      display_name: string;
      clerk_id: string;
      username?: string | null;
      is_verified: boolean;
      avatar_url?: string | null;
    };
  };
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  is_liked?: boolean;
}

interface PostCardProps {
  post: Post;
  onDelete?: () => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user, isLoaded } = useUser();
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [reactionsCount, setReactionsCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [viewsCount, setViewsCount] = useState(post.views_count || 0);
  const [sharesCount, setSharesCount] = useState(0);
  const [showComments, setShowComments] = useState(true); // Expanded by default
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [mentionUserMap, setMentionUserMap] = useState<Map<string, string>>(new Map());
  const postRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { isSuspended } = useSuspensionCheck();

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node) &&
        !postRef.current?.contains(event.target as Node)
      ) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showShareMenu]);

  // Load shares count
  useEffect(() => {
    const loadSharesCount = async () => {
      try {
        const postIdToCheck = post.is_repost && post.original_post_id ? post.original_post_id : post.id;
        const { count } = await supabase
          .from("reposts")
          .select("*", { count: "exact", head: true })
          .eq("original_post_id", postIdToCheck);
        setSharesCount(count || 0);
      } catch (error) {
        console.error("Error loading shares count:", error);
      }
    };
    loadSharesCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  // Track post view (only once per user)
  useEffect(() => {
    const trackView = async () => {
      if (!isLoaded || !user?.id) return; // Don't track anonymous views

      try {
        // Check if user has already viewed this post
        const { data: existingView } = await supabase
          .from("post_views")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .single();

        // If already viewed, don't track again
        if (existingView) return;

        // Track new view
        const { error } = await supabase.from("post_views").insert({
          post_id: post.id,
          user_id: user.id,
        });

        if (!error) {
          setViewsCount((prev) => prev + 1);
        }
      } catch (error) {
        // Ignore errors (likely duplicate view)
        console.error("Error tracking view:", error);
      }
    };

    // Track view after component mounts (with slight delay to avoid spam)
    const timer = setTimeout(trackView, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, isLoaded, user?.id]);

  useEffect(() => {
    if (showComments) {
      loadComments();
      
      // Set up real-time subscription for comments
      const channel = supabase
        .channel(`post-comments-${post.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_comments',
            filter: `post_id=eq.${post.id}`,
          },
          () => {
            loadComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, post.id]);

  const loadComments = async () => {
    try {
      // Try with implicit foreign key resolution first, fallback if it doesn't work
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, profiles!user_id(display_name, clerk_id, is_verified, avatar_url)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) {
        // Check if it's a relationship error (PGRST200) - foreign keys not configured
        const errorCode = (error as any)?.code;
        const errorMessage = (error as any)?.message || '';
        
        // If it's a relationship error, silently use fallback (this is expected)
        if (errorCode === 'PGRST200' || errorMessage.includes('relationship') || errorMessage.includes('schema cache')) {
          // Foreign key relationships not configured - use fallback approach
          // This is expected and the fallback will work correctly
        } else {
          // Log other errors for debugging
          console.error("Error loading comments:", {
            code: errorCode,
            message: errorMessage,
            error: error
          });
        }
        // Fallback: try without join if foreign key doesn't exist
        const { data: commentsData } = await supabase
          .from("post_comments")
          .select("*")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true });

        if (commentsData) {
          // Manually fetch profile data
          const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("clerk_id, display_name, is_verified")
            .in("clerk_id", userIds);

          const profilesMap = new Map(profilesData?.map((p: any) => [p.clerk_id, p]) || []);
          const commentsWithProfiles = await Promise.all(
            commentsData.map(async (c: any) => {
              // Get reaction count for each comment
              let reactionCount = 0;
              try {
                const { count } = await supabase
                  .from("comment_reactions")
                  .select("*", { count: "exact", head: true })
                  .eq("comment_id", c.id);
                reactionCount = count || 0;
              } catch (e) {
                // Ignore if table doesn't exist yet
              }
              return {
                ...c,
                profiles: profilesMap.get(c.user_id),
                reactionsCount: reactionCount,
              };
            })
          );

          setComments(commentsWithProfiles);
          setCommentsCount(commentsWithProfiles.length);
        } else {
          setComments([]);
          setCommentsCount(0);
        }
        return;
      }

      if (data) {
        // Get reaction counts for each comment
        const commentsWithReactions = await Promise.all(
          data.map(async (comment: any) => {
            let reactionCount = 0;
            try {
              const { count } = await supabase
                .from("comment_reactions")
                .select("*", { count: "exact", head: true })
                .eq("comment_id", comment.id);
              reactionCount = count || 0;
            } catch (e) {
              // Ignore if table doesn't exist yet
            }
            return {
              ...comment,
              reactionsCount: reactionCount,
            };
          })
        );
        setComments(commentsWithReactions);
        setCommentsCount(commentsWithReactions.length);
      } else {
        setComments([]);
        setCommentsCount(0);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
      setCommentsCount(0);
    }
  };

  // Load current user's reaction
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadReaction = async () => {
      try {
        const { data } = await supabase
          .from("post_reactions")
          .select("reaction_type")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .single();

        if (data) {
          setCurrentReaction(data.reaction_type);
        }
      } catch (error) {
        setCurrentReaction(null);
      }
    };

    loadReaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, post.id]);

  // Load total reactions count
  useEffect(() => {
    const loadCount = async () => {
      try {
        const { count } = await supabase
          .from("post_reactions")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);

        setReactionsCount(count || 0);
      } catch (error) {
        // Fallback to post_likes if post_reactions doesn't exist yet
        try {
          const { count } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          setReactionsCount(count || 0);
        } catch (e) {
          console.error("Error loading reactions count:", e);
        }
      }
    };

    loadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newComment.trim()) return;

    // Check for blocked domains and inappropriate content
    const safetyCheck = await checkContentSafety(newComment.trim());
    if (!safetyCheck.isSafe) {
      // Log the blocked attempt
      try {
        const { logBlockedAttempt } = await import('@/lib/utils/databaseContentModeration');
        await logBlockedAttempt({
          userId: user.id,
          contentType: 'comment',
          attemptedContent: newComment.trim(),
          matchedKeyword: safetyCheck.matchedKeyword,
          matchedDomain: safetyCheck.matchedDomain,
          category: safetyCheck.category,
          severity: safetyCheck.severity,
          messageShown: safetyCheck.reason,
          contextUrl: `/feed?post=${post.id}`,
          keywordId: safetyCheck.keywordId,
          domainId: safetyCheck.domainId,
        });
      } catch (error) {
        console.error("Error logging blocked attempt:", error);
      }
      
      showToast(
        safetyCheck.reason || "Your comment violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate.",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      // Extract mentions from comment content
      const { extractMentions } = await import('@/lib/utils/mentions');
      const mentions = extractMentions(newComment.trim());
      console.log('Extracted mentions from comment:', mentions);
      
      // Resolve mentions to user IDs
      const { resolveMentionsToUserIds } = await import('@/lib/utils/mentions');
      const mentionedUserIds = await resolveMentionsToUserIds(supabase, mentions);
      console.log('Resolved mention user IDs:', mentionedUserIds);
      
      // Insert comment first to get the comment ID
      const { data: newCommentData, error: commentError } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim(),
          mentions: mentionedUserIds.length > 0 ? mentionedUserIds : null,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Create notifications for mentioned users (after comment is created)
      if (mentionedUserIds.length > 0 && newCommentData) {
        const commenterName = user.firstName || user.email?.split('@')[0] || 'Someone';
        
        for (const mentionedUserId of mentionedUserIds) {
          if (mentionedUserId !== user.id) {
            // Check user's notification preferences
            const { data: mentionedUserProfile } = await supabase
              .from('profiles')
              .select('settings')
              .eq('clerk_id', mentionedUserId)
              .single();
            
            const userSettings = mentionedUserProfile?.settings as any;
            const notifications = userSettings?.notifications || {};
            const inAppEnabled = notifications.inAppNotifications !== false;
            const mentionEnabled = notifications.newMention !== false;
            
            if (inAppEnabled && mentionEnabled) {
              const { error: notifError } = await supabase.from('notifications').insert({
                user_id: mentionedUserId,
                type: 'mention',
                actor_id: user.id,
                target_id: `comment:${newCommentData.id}`, // Prefix with "comment:" to indicate it's a comment mention
                message: `${commenterName} mentioned you in a comment`
              });
              
              if (notifError) {
                console.error('Error creating mention notification:', notifError);
              } else {
                console.log(`Mention notification created for user ${mentionedUserId}`);
              }
            } else {
              console.log(`Mention notification skipped for user ${mentionedUserId} (inApp: ${inAppEnabled}, mention: ${mentionEnabled})`);
            }
          }
        }
      }

      setNewComment("");
      await loadComments();
      setCommentsCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Failed to add comment. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    // Allow deletion if user owns the comment OR if user owns the post
    const canDelete = user?.id === commentUserId || user?.id === post.profile_id;
    if (!user?.id || !canDelete) return;
    
    const isPostOwner = user.id === post.profile_id && user.id !== commentUserId;
    const confirmMessage = isPostOwner 
      ? "Are you sure you want to delete this comment from your post?"
      : "Are you sure you want to delete this comment?";
    
    if (!confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      await loadComments();
      setCommentsCount((prev) => Math.max(0, prev - 1));
      showToast(isPostOwner ? "Comment deleted from your post." : "Comment deleted.", "success");
    } catch (error) {
      console.error("Error deleting comment:", error);
      showToast("Failed to delete comment.", "error");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) {
      setEditingCommentId(null);
      return;
    }

    // Check for blocked domains and inappropriate content
    const safetyCheck = await checkContentSafety(editCommentText.trim());
    if (!safetyCheck.isSafe) {
      showToast(
        safetyCheck.reason || "Your comment violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate.",
        "error"
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("post_comments")
        .update({ content: editCommentText.trim() })
        .eq("id", commentId);

      if (error) throw error;

      setEditingCommentId(null);
      setEditCommentText("");
      await loadComments();
    } catch (error) {
      console.error("Error editing comment:", error);
      showToast("Failed to edit comment.", "error");
    }
  };

  const startEditingComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      // Get post image URLs before deleting
      const displayPost = post.is_repost && post.original_post ? post.original_post : post;
      const imageUrls = displayPost.image_url 
        ? (Array.isArray(displayPost.image_url) ? displayPost.image_url : [displayPost.image_url])
        : [];

      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      // If post has images, delete them from storage
      if (imageUrls.length > 0) {
        for (const imageUrl of imageUrls) {
          try {
            const deleteResponse = await fetch(
              `/api/post/delete-image?imageUrl=${encodeURIComponent(imageUrl)}&postId=${post.id}`,
              { method: "DELETE" }
            );
            
            if (!deleteResponse.ok) {
              console.warn("Failed to delete post image, but post was deleted");
            }
          } catch (imageError) {
            console.error("Error deleting post image:", imageError);
            // Don't fail the post deletion if image deletion fails
          }
        }
      }

      onDelete?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    }
  };

  const displayPost = post.is_repost && post.original_post ? post.original_post : post;
  const reposterProfile = post.is_repost ? post.profiles : null;
  const isOwnPost = user?.id === post.profile_id;

  // Check if post author has showOnlineStatus enabled
  useEffect(() => {
    if (!displayPost.profile_id || isOwnPost) {
      setShowOnlineStatus(false); // Don't show for own posts
      return;
    }

    const checkPrivacySettings = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("settings")
          .eq("clerk_id", displayPost.profile_id)
          .single();

        const showStatus = data?.settings?.privacy?.showOnlineStatus !== false;
        setShowOnlineStatus(showStatus);
      } catch (error) {
        // Default to showing status if error
        setShowOnlineStatus(true);
      }
    };

    checkPrivacySettings();
  }, [displayPost.profile_id, isOwnPost, supabase]);

  const handleShare = async (method: 'copy' | 'twitter' | 'linkedin') => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    if (method === 'copy') {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowShareMenu(false);
    } else if (method === 'twitter') {
      const shareContent = displayPost.content ? displayPost.content.substring(0, 100) : 'Check out this post';
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareContent)}&url=${encodeURIComponent(postUrl)}`, '_blank');
      setShowShareMenu(false);
    } else if (method === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`, '_blank');
      setShowShareMenu(false);
    }
  };

  return (
    <div ref={postRef} data-post-id={post.id} className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-3 hover:shadow-md transition-all duration-200 animate-fade-in ${
      isOwnPost ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-900/10" : "border-gray-200/50 dark:border-gray-700/50"
    }`}>
      {/* Share Header */}
      {post.is_repost && reposterProfile && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-lg p-3 -mx-4 -mt-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Share2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={getProfileUrl(reposterProfile ? { username: reposterProfile.username, clerk_id: post.profile_id } : post.profile_id)}
                  className="text-sm font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {reposterProfile.display_name}
                </Link>
                <span className="text-sm text-gray-600 dark:text-gray-400">shared this post</span>
              </div>
              {displayPost.profiles && displayPost.profile_id !== post.profile_id && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Original post by</span>
                  <Link
                    href={getProfileUrl(displayPost.profiles ? { username: displayPost.profiles.username, clerk_id: displayPost.profile_id } : displayPost.profile_id)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    {displayPost.profiles.display_name || "Unknown"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Own Post Badge */}
      {isOwnPost && (
        <div className="absolute top-3 right-3 z-10">
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium shadow-sm">
            Your Post
          </span>
        </div>
      )}

      {/* Post Header */}
      <div className={`flex items-start justify-between ${isOwnPost ? 'mt-4 mb-4' : 'mb-3'}`}>
        <Link
          href={getProfileUrl(displayPost.profiles ? { username: displayPost.profiles.username, clerk_id: displayPost.profile_id } : displayPost.profile_id)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-1"
        >
          <div className="relative flex-shrink-0">
            <AvatarImage
              src={displayPost.profiles?.avatar_url}
              alt={displayPost.profiles?.display_name || "User"}
              fallbackText={displayPost.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
              className="border-2 border-indigo-500 shadow-md"
              size="md"
              userId={displayPost.profile_id}
            />
            {displayPost.profile_id && !isOwnPost && showOnlineStatus && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineStatus userId={displayPost.profile_id} size="sm" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
                {displayPost.profiles?.display_name || "Unknown"}
              </span>
              {displayPost.profiles?.username && (
                <span className="text-xs text-gray-500 dark:text-gray-400">@{displayPost.profiles.username}</span>
              )}
              {displayPost.profiles?.is_verified && (
                <span className="text-blue-500 text-xs flex-shrink-0" title="Verified">✓</span>
              )}
              {post.is_repost && displayPost.profile_id !== post.profile_id && (
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                  Original Author
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span 
                className="text-xs text-gray-500 dark:text-gray-400 cursor-help"
                title={new Date(post.created_at).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short'
                })}
              >
                {post.is_repost 
                  ? `Shared ${formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}`
                  : formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
                }
              </span>
              {viewsCount > 0 && (
                <>
                  <span className="text-gray-400 text-xs">·</span>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {viewsCount}
                  </button>
                </>
              )}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isOwnPost && (
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
              title="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        {post.share_comment && (
          <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-1">Your comment:</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
              {parseContent(post.share_comment).map((part, idx) => {
                if (part.type === 'hashtag' && part.tag) {
                  return (
                    <Link
                      key={idx}
                      href={`/hashtag/${encodeURIComponent(part.tag)}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-medium"
                    >
                      {part.content}
                    </Link>
                  );
                }
                if (part.type === 'link' && part.url) {
                  return (
                    <a
                      key={idx}
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all"
                    >
                      {part.content}
                    </a>
                  );
                }
                return <span key={idx}>{part.content}</span>;
              })}
            </p>
          </div>
        )}
        {displayPost.content && (
          <p className="text-gray-900 dark:text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
            {parseContent(displayPost.content).map((part, idx) => {
              if (part.type === 'hashtag' && part.tag) {
                return (
                  <Link
                    key={idx}
                    href={`/hashtag/${encodeURIComponent(part.tag)}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-medium"
                  >
                    {part.content}
                  </Link>
                );
              }
              if (part.type === 'link' && part.url) {
                return (
                  <a
                    key={idx}
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all"
                  >
                    {part.content}
                  </a>
                );
              }
              if (part.type === 'mention' && part.username) {
                return (
                  <MentionLink
                    key={idx}
                    username={part.username}
                    content={part.content}
                    mentionedUserIds={post.mentions}
                  />
                );
              }
              return <span key={idx}>{part.content}</span>;
            })}
          </p>
        )}
        {(() => {
          // Safely handle image_url - could be string, array, or null/undefined
          if (!displayPost.image_url) return null;
          
          // TEMPORARY DEBUG: Log what we're receiving
          console.log('🔍 PostCard image_url DEBUG:', {
            postId: post.id,
            raw: displayPost.image_url,
            type: typeof displayPost.image_url,
            isArray: Array.isArray(displayPost.image_url),
            length: Array.isArray(displayPost.image_url) ? displayPost.image_url.length : 'N/A',
            constructor: displayPost.image_url?.constructor?.name,
            stringified: JSON.stringify(displayPost.image_url)
          });
          
          let imageUrls: string[] = [];
          
          try {
            if (Array.isArray(displayPost.image_url)) {
              console.log('✅ Processing as array, length:', displayPost.image_url.length);
              // Process array - convert all to strings and filter out empty/invalid
              imageUrls = displayPost.image_url
                .map((url: any, idx: number) => {
                  console.log(`  [${idx}]`, { url, type: typeof url, isNull: url === null, isUndefined: url === undefined });
                  // Convert to string if needed
                  if (url === null || url === undefined) return '';
                  const str = String(url).trim();
                  console.log(`  [${idx}] converted to:`, str);
                  return str;
                })
                .filter((url: string) => {
                  // Accept any non-empty string (be less strict about URL format)
                  const isValid = url !== '' && url.length > 0;
                  console.log(`  Filtering "${url}":`, isValid);
                  return isValid;
                });
              console.log('✅ Final imageUrls array:', imageUrls);
            } else if (typeof displayPost.image_url === 'string') {
              console.log('✅ Processing as string');
              const url = displayPost.image_url.trim();
              if (url !== '') {
                imageUrls = [url];
                console.log('✅ Added single URL:', url);
              }
            } else if (displayPost.image_url) {
              console.log('⚠️ Processing as other type:', typeof displayPost.image_url);
              // Try to convert to string if it's some other type
              const url = String(displayPost.image_url).trim();
              if (url !== '' && url !== 'null' && url !== 'undefined') {
                imageUrls = [url];
                console.log('✅ Converted to URL:', url);
              }
            }
          } catch (error) {
            console.error('❌ Error processing image_url:', error, displayPost.image_url);
            return null;
          }
          
          // Debug logging
          console.log('📊 Final result:', {
            postId: post.id,
            imageUrlsCount: imageUrls.length,
            imageUrls: imageUrls
          });
          
          if (displayPost.image_url && imageUrls.length === 0) {
            console.warn('⚠️ Post has image_url but no valid URLs extracted:', {
              postId: post.id,
              image_url: displayPost.image_url,
              type: typeof displayPost.image_url,
              isArray: Array.isArray(displayPost.image_url),
              extracted: imageUrls
            });
          }
          
          if (imageUrls.length === 0) return null;
          
          return (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {imageUrls.length === 1 ? (
                <img
                  src={imageUrls[0]}
                  alt="Post"
                  className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(imageUrls[0], '_blank')}
                />
              ) : (
                <div className={`grid gap-1 ${
                  imageUrls.length === 2 ? "grid-cols-2" :
                  imageUrls.length === 3 ? "grid-cols-3" :
                  imageUrls.length === 4 ? "grid-cols-2" :
                  "grid-cols-3"
                }`}>
                  {imageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Post image ${index + 1}`}
                      className={`w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity ${
                        imageUrls.length === 1 ? "max-h-[300px]" :
                        imageUrls.length === 2 ? "max-h-[250px]" :
                        "max-h-[200px]"
                      }`}
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Engagement Stats */}
      {showStats && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{likesCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Likes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{commentsCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{viewsCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Views</div>
            </div>
          </div>
        </div>
      )}

      {/* Share Menu */}
      {showShareMenu && (
        <div ref={shareMenuRef} className="absolute right-4 top-16 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 min-w-[200px]">
          <button
            onClick={() => handleShare('copy')}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Copy Link</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Share on Twitter</span>
          </button>
          <button
            onClick={() => handleShare('linkedin')}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Share on LinkedIn</span>
          </button>
          {!isOwnPost && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <div className="px-4 py-2">
                <ReportButton
                  reportType="post"
                  reportedId={post.id}
                  reportedName={`Post by ${displayPost.profiles?.display_name || "Unknown"}`}
                  variant="link"
                  className="text-red-600 dark:text-red-400"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <ReactionButton
            postId={post.id}
            initialReaction={currentReaction}
            initialCount={reactionsCount}
          />

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${
              showComments ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" : ""
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">{commentsCount || 0}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <ShareButton 
            postId={post.is_repost && post.original_post_id ? post.original_post_id : post.id}
            originalPostAuthor={displayPost.profiles?.display_name}
            onShareComplete={() => window.location.reload()}
          />
          <BookmarkButton postId={post.id} />
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Comments ({commentsCount || 0})
          </h3>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {comments.length > 0 ? (
              comments.map((comment) => {
                const isOwnComment = user?.id === comment.user_id;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} data-comment-id={comment.id} className="flex gap-3 group animate-fade-in">
                    <Link href={`/profile/${comment.user_id}`} className="flex-shrink-0">
                      <AvatarImage
                        src={comment.profiles?.avatar_url}
                        alt={comment.profiles?.display_name || "User"}
                        fallbackText={comment.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
                        className="border-2 border-indigo-500 shadow-md hover:scale-110 transition-transform"
                        size="md"
                        userId={comment.user_id}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-indigo-300 dark:border-indigo-600">
                          <input
                            type="text"
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleEditComment(comment.id);
                              }
                              if (e.key === 'Escape') {
                                setEditingCommentId(null);
                                setEditCommentText("");
                              }
                            }}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleEditComment(comment.id)}
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentText("");
                              }}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-white dark:bg-gray-700/70 rounded-xl p-3 border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Link
                                    href={`/profile/${comment.user_id}`}
                                    className="font-bold text-sm text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  >
                                    {comment.profiles?.display_name || "Unknown"}
                                  </Link>
                                  {comment.profiles?.is_verified && (
                                    <span className="text-blue-500 text-xs">✓</span>
                                  )}
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    <span
                                      title={new Date(comment.created_at).toLocaleString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        timeZoneName: 'short'
                                      })}
                                      className="cursor-help"
                                    >
                                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </span>
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                                  {parseContent(comment.content).map((part, idx) => {
                                    if (part.type === 'hashtag' && part.tag) {
                                      return (
                                        <Link
                                          key={idx}
                                          href={`/hashtag/${encodeURIComponent(part.tag)}`}
                                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline font-medium"
                                        >
                                          {part.content}
                                        </Link>
                                      );
                                    }
                                    if (part.type === 'link' && part.url) {
                                      return (
                                        <a
                                          key={idx}
                                          href={part.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all"
                                        >
                                          {part.content}
                                        </a>
                                      );
                                    }
                                    if (part.type === 'mention' && part.username) {
                                      return (
                                        <MentionLink
                                          key={idx}
                                          username={part.username}
                                          content={part.content}
                                          mentionedUserIds={comment.mentions}
                                        />
                                      );
                                    }
                                    return <span key={idx}>{part.content}</span>;
                                  })}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <CommentReactionButton
                                    commentId={comment.id}
                                    initialCount={comment.reactionsCount || 0}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {isOwnComment && (
                                  <>
                                    <button
                                      onClick={() => startEditingComment(comment)}
                                      className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                                      title="Edit comment"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                      title="Delete comment"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {/* Show delete button if user owns the post (not the comment) */}
                                {!isOwnComment && user?.id === post.profile_id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                    title="Delete comment from your post"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                {/* Show report button for all users (except comment owner) */}
                                {!isOwnComment && user?.id && (
                                  <ReportButton
                                    reportType="comment"
                                    reportedId={comment.id}
                                    reportedName={comment.profiles?.display_name || "Comment"}
                                    variant="icon"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 text-xs py-3">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>

          {isLoaded && user && (
            <form onSubmit={handleComment} className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 w-full">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
                {user.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 flex gap-2 items-center min-w-0">
                <div className="flex-1 relative min-w-0">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => {
                      const cursorPos = e.target.selectionStart || 0;
                      setNewComment(e.target.value);
                      // Trigger mention detection after state update
                      setTimeout(() => {
                        const input = commentInputRef.current;
                        if (input) {
                          input.setSelectionRange(cursorPos, cursorPos);
                        }
                      }, 0);
                    }}
                    onKeyDown={(e) => {
                      // Handle mention autocomplete navigation
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        // Let MentionAutocomplete handle these
                      }
                    }}
                    onSelect={(e) => {
                      // Trigger mention detection on selection change
                      const target = e.target as HTMLInputElement;
                      const cursorPos = target.selectionStart || 0;
                      // This will be handled by the onChange handler
                    }}
                    placeholder="Write a comment..."
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || isSuspended}
                    readOnly={isSuspended}
                  />
                  <MentionAutocomplete
                    value={newComment}
                    onChange={(newValue) => setNewComment(newValue)}
                    onSelect={(mention) => {
                      // Mention is already inserted by the component
                    }}
                    inputRef={commentInputRef}
                    disabled={loading || isSuspended}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newComment.trim() || isSuspended}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all shadow-md hover:shadow-lg flex-shrink-0 whitespace-nowrap"
                >
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

