"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Loader2,
  Trash2,
  ExternalLink,
  User,
  MessageSquare,
  FileText,
  Filter,
  X,
  AlertCircle,
  Calendar,
  Hash,
  AtSign,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface PostResult {
  id: string;
  profile_id: string;
  content: string;
  image_url: string | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  is_repost: boolean;
  original_post_id: string | null;
  created_at: string;
  updated_at: string;
  user_display_name: string;
  user_email: string;
  user_avatar_url: string | null;
}

interface CommentResult {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_display_name: string;
  user_email: string;
  user_avatar_url: string | null;
  user_username?: string | null;
  post_content: string | null;
  post_profile_id: string | null;
  post_user_display_name: string | null;
  post_user_username?: string | null;
}

type ContentType = "all" | "posts" | "comments";
type SortBy = "newest" | "oldest" | "user";

export function AdminContentFinder() {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [comments, setComments] = useState<CommentResult[]>([]);
  const [users, setUsers] = useState<Array<{ clerk_id: string; display_name: string; email: string }>>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const userFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  // Close user filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userFilterRef.current && !userFilterRef.current.contains(event.target as Node)) {
        setShowUserFilter(false);
      }
    };

    if (showUserFilter) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserFilter]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const debounceTimer = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      setPosts([]);
      setComments([]);
    }
  }, [searchQuery, contentType, selectedUserId]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("clerk_id, username, display_name, email")
        .order("display_name", { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const performSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const searchTerm = searchQuery.trim().toLowerCase();

      // Search posts
      if (contentType === "all" || contentType === "posts") {
        let postsQuery = supabase
          .from("posts")
          .select(`
            id,
            profile_id,
            content,
            image_url,
            hashtags,
            mentions,
            created_at,
            updated_at,
            profiles (
              display_name,
              email,
              avatar_url
            )
          `)
          .ilike("content", `%${searchTerm}%`);

        if (selectedUserId) {
          postsQuery = postsQuery.eq("profile_id", selectedUserId);
        }

        const { data: postsData, error: postsError } = await postsQuery.order("created_at", { ascending: false });

        if (postsError) {
          // If join fails, try fallback approach
          console.warn("Posts join failed, using fallback:", postsError);
          
          let fallbackQuery = supabase
            .from("posts")
            .select("id, profile_id, content, image_url, hashtags, mentions, created_at, updated_at")
            .ilike("content", `%${searchTerm}%`);

          if (selectedUserId) {
            fallbackQuery = fallbackQuery.eq("profile_id", selectedUserId);
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery.order("created_at", { ascending: false });

          if (fallbackError) {
            throw fallbackError;
          }

          // Get unique profile IDs
          const profileIds = [...new Set((fallbackData || []).map((p: any) => p.profile_id))];
          
          // Fetch profiles separately
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("clerk_id, username, display_name, email, avatar_url")
            .in("clerk_id", profileIds);

          const profileMap = new Map((profilesData || []).map((p: any) => [p.clerk_id, p]));

          const formattedPosts: PostResult[] = (fallbackData || []).map((post: any) => {
            const profile = profileMap.get(post.profile_id);
            return {
              id: post.id,
              profile_id: post.profile_id,
              content: post.content,
              image_url: post.image_url,
              hashtags: post.hashtags,
              mentions: post.mentions,
              is_repost: post.is_repost || false,
              original_post_id: post.original_post_id || null,
              created_at: post.created_at,
              updated_at: post.updated_at,
              user_display_name: profile?.display_name || "Unknown",
              user_email: profile?.email || "",
              user_avatar_url: profile?.avatar_url || null,
              user_username: profile?.username || null,
            };
          });

          setPosts(formattedPosts);
        } else {
          const formattedPosts: PostResult[] = (postsData || []).map((post: any) => ({
            id: post.id,
            profile_id: post.profile_id,
            content: post.content,
            image_url: post.image_url,
            hashtags: post.hashtags,
            mentions: post.mentions,
            is_repost: post.is_repost || false,
            original_post_id: post.original_post_id || null,
            created_at: post.created_at,
            updated_at: post.updated_at,
            user_display_name: post.profiles?.display_name || "Unknown",
            user_email: post.profiles?.email || "",
            user_avatar_url: post.profiles?.avatar_url || null,
            user_username: post.profiles?.username || null,
          }));

          setPosts(formattedPosts);
        }
      } else {
        setPosts([]);
      }

      // Search comments
      if (contentType === "all" || contentType === "comments") {
        let commentsQuery = supabase
          .from("post_comments")
          .select(`
            id,
            post_id,
            user_id,
            content,
            created_at,
            updated_at,
            profiles (
              username,
              display_name,
              email,
              avatar_url
            ),
            posts (
              content,
              profile_id
            )
          `)
          .ilike("content", `%${searchTerm}%`);

        if (selectedUserId) {
          commentsQuery = commentsQuery.eq("user_id", selectedUserId);
        }

        const { data: commentsData, error: commentsError } = await commentsQuery.order("created_at", { ascending: false });

        if (commentsError) {
          // If join fails, try fallback approach
          console.warn("Comments join failed, using fallback:", commentsError);
          
          let fallbackQuery = supabase
            .from("post_comments")
            .select("id, post_id, user_id, content, created_at, updated_at")
            .ilike("content", `%${searchTerm}%`);

          if (selectedUserId) {
            fallbackQuery = fallbackQuery.eq("user_id", selectedUserId);
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery.order("created_at", { ascending: false });

          if (fallbackError) {
            throw fallbackError;
          }

          // Get unique user IDs and post IDs
          const userIds = [...new Set((fallbackData || []).map((c: any) => c.user_id))];
          const postIds = [...new Set((fallbackData || []).map((c: any) => c.post_id))];
          
          // Fetch profiles and posts separately
          const [profilesResult, postsResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("clerk_id, username, display_name, email, avatar_url")
              .in("clerk_id", userIds),
            supabase
              .from("posts")
              .select("id, content, profile_id")
              .in("id", postIds),
          ]);

          const profileMap = new Map((profilesResult.data || []).map((p: any) => [p.clerk_id, p]));
          const postMap = new Map((postsResult.data || []).map((p: any) => [p.id, p]));

          // Get post owner profiles
          const postOwnerIds = [...new Set((postsResult.data || []).map((p: any) => p.profile_id))];
          const { data: postOwnerProfiles } = await supabase
            .from("profiles")
            .select("clerk_id, username, display_name")
            .in("clerk_id", postOwnerIds);

          const postOwnerMap = new Map((postOwnerProfiles || []).map((p: any) => [p.clerk_id, p]));

          const formattedComments: CommentResult[] = (fallbackData || []).map((comment: any) => {
            const profile = profileMap.get(comment.user_id);
            const post = postMap.get(comment.post_id);
            const postOwner = post ? postOwnerMap.get(post.profile_id) : null;

            return {
              id: comment.id,
              post_id: comment.post_id,
              user_id: comment.user_id,
              content: comment.content,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              user_display_name: profile?.display_name || "Unknown",
              user_email: profile?.email || "",
              user_avatar_url: profile?.avatar_url || null,
              user_username: profile?.username || null,
              post_content: post?.content || null,
              post_profile_id: post?.profile_id || null,
              post_user_display_name: postOwner?.display_name || null,
              post_user_username: postOwner?.username || null,
            };
          });

          setComments(formattedComments);
        } else {
          // Get post owner profiles for comments (nested join might not work)
          const postIds = [...new Set((commentsData || []).map((c: any) => c.post_id))];
          const { data: postsData } = await supabase
            .from("posts")
            .select("id, profile_id")
            .in("id", postIds);

          const postOwnerIds = [...new Set((postsData || []).map((p: any) => p.profile_id))];
          const { data: postOwnerProfiles } = await supabase
            .from("profiles")
            .select("clerk_id, username, display_name")
            .in("clerk_id", postOwnerIds);

          const postOwnerMap = new Map((postOwnerProfiles || []).map((p: any) => [p.clerk_id, p]));
          const postMap = new Map((postsData || []).map((p: any) => [p.id, p.profile_id]));

          const formattedComments: CommentResult[] = (commentsData || []).map((comment: any) => {
            const postOwnerId = postMap.get(comment.post_id);
            const postOwner = postOwnerId ? postOwnerMap.get(postOwnerId) : null;

            return {
              id: comment.id,
              post_id: comment.post_id,
              user_id: comment.user_id,
              content: comment.content,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              user_display_name: comment.profiles?.display_name || "Unknown",
              user_email: comment.profiles?.email || "",
              user_avatar_url: comment.profiles?.avatar_url || null,
              user_username: comment.profiles?.username || null,
              post_content: comment.posts?.content || null,
              post_profile_id: comment.posts?.profile_id || null,
              post_user_display_name: postOwner?.display_name || null,
              post_user_username: postOwner?.username || null,
            };
          });

          setComments(formattedComments);
        }
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error("Error performing search:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error: error,
      });
      alert(`Error performing search: ${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    setDeletingId(postId);
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      setPosts(posts.filter((p) => p.id !== postId));
      alert("Post deleted successfully");
    } catch (error: any) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    setDeletingId(commentId);
    try {
      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter((c) => c.id !== commentId));
      alert("Comment deleted successfully");
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const sortedPosts = useMemo(() => {
    const sorted = [...posts];
    switch (sortBy) {
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "user":
        return sorted.sort((a, b) => a.user_display_name.localeCompare(b.user_display_name));
      case "newest":
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [posts, sortBy]);

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    switch (sortBy) {
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "user":
        return sorted.sort((a, b) => a.user_display_name.localeCompare(b.user_display_name));
      case "newest":
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [comments, sortBy]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const selectedUser = users.find((u) => u.clerk_id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Finder</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Search and moderate posts and comments across the platform
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for text in posts and comments (minimum 2 characters)..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Content Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Content</option>
              <option value="posts">Posts Only</option>
              <option value="comments">Comments Only</option>
            </select>
          </div>

          {/* User Filter */}
          <div className="relative flex items-center gap-2" ref={userFilterRef}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUserFilter(!showUserFilter)}
                className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                  selectedUserId
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                    : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <User className="w-4 h-4" />
                {selectedUser ? selectedUser.display_name : "Filter by User"}
              </button>
              {selectedUserId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUserId(null);
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Clear user filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {showUserFilter && (
              <div className="absolute top-full left-0 z-10 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="space-y-1">
                    {users
                      .filter((user) => {
                        if (!userSearchQuery) return true;
                        const query = userSearchQuery.toLowerCase();
                        return (
                          user.display_name.toLowerCase().includes(query) ||
                          user.email.toLowerCase().includes(query)
                        );
                      })
                      .map((user) => (
                        <button
                          key={user.clerk_id}
                          onClick={() => {
                            setSelectedUserId(user.clerk_id);
                            setShowUserFilter(false);
                            setUserSearchQuery("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                        >
                          {user.display_name} ({user.email})
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="user">Sort by User</option>
            </select>
          </div>

          {/* Results Count */}
          {(posts.length > 0 || comments.length > 0) && (
            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {posts.length} post{posts.length !== 1 ? "s" : ""} • {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Results */}
      {!loading && searchQuery.trim().length >= 2 && (
        <div className="space-y-6">
          {/* Posts Results */}
          {(contentType === "all" || contentType === "posts") && sortedPosts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Posts ({sortedPosts.length})
                </h3>
              </div>
              <div className="space-y-4">
                {sortedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-3">
                          {post.user_avatar_url ? (
                            <img
                              src={post.user_avatar_url}
                              alt={post.user_display_name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={getProfileUrl({ username: post.user_username, clerk_id: post.profile_id })}
                              target="_blank"
                              className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                            >
                              {post.user_display_name}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{post.user_email}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="mb-3">
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                            {highlightText(post.content, searchQuery)}
                          </p>
                        </div>

                        {/* Post Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {post.hashtags.join(", ")}
                            </div>
                          )}
                          {post.mentions && post.mentions.length > 0 && (
                            <div className="flex items-center gap-1">
                              <AtSign className="w-3 h-3" />
                              {post.mentions.length} mention{post.mentions.length !== 1 ? "s" : ""}
                            </div>
                          )}
                          {post.is_repost && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                              Repost
                            </span>
                          )}
                          {post.image_url && (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              Has Image
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <Link
                            href={`${getProfileUrl({ username: post.user_username, clerk_id: post.profile_id })}?post=${post.id}`}
                            target="_blank"
                            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Post
                          </Link>
                          <Link
                            href={`/admin?tab=users&user=${post.profile_id}`}
                            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <User className="w-4 h-4" />
                            View User Profile
                          </Link>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingId === post.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Post"
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Results */}
          {(contentType === "all" || contentType === "comments") && sortedComments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Comments ({sortedComments.length})
                </h3>
              </div>
              <div className="space-y-4">
                {sortedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-3">
                          {comment.user_avatar_url ? (
                            <img
                              src={comment.user_avatar_url}
                              alt={comment.user_display_name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={getProfileUrl({ username: (comment as any).user_username, clerk_id: comment.user_id })}
                              target="_blank"
                              className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                            >
                              {comment.user_display_name}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{comment.user_email}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </div>
                        </div>

                        {/* Comment Content */}
                        <div className="mb-3">
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                            {highlightText(comment.content, searchQuery)}
                          </p>
                        </div>

                        {/* Parent Post Info */}
                        {comment.post_content && (
                          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-indigo-500">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Comment on post by {comment.post_user_display_name || "Unknown"}:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {comment.post_content}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          {comment.post_profile_id && (
                            <Link
                              href={comment.post_profile_id ? `${getProfileUrl({ username: (comment as any).post_user_username, clerk_id: comment.post_profile_id })}?post=${comment.post_id}` : `#`}
                              target="_blank"
                              className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Post
                            </Link>
                          )}
                          <Link
                            href={`/admin?tab=users&user=${comment.user_id}`}
                            className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <User className="w-4 h-4" />
                            View User Profile
                          </Link>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deletingId === comment.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Comment"
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery.trim().length >= 2 && sortedPosts.length === 0 && sortedComments.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Try adjusting your search query or filters
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!loading && searchQuery.trim().length < 2 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Enter at least 2 characters to search</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Search across all posts and comments to find specific content
          </p>
        </div>
      )}
    </div>
  );
}

