"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "./PostCard";
import { CreatePost } from "./CreatePost";

interface PostsFeedProps {
  profileId?: string;
  showCreatePost?: boolean;
  bookmarkedPostIds?: string[];
  trendingPostIds?: string[];
  filters?: {
    sortBy?: string;
    timeRange?: string;
  };
}

export function PostsFeed({ profileId, showCreatePost = false, bookmarkedPostIds, trendingPostIds, filters }: PostsFeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadPosts = async () => {
    try {
      setLoading(true);
      // Try with joins first, but use fallback if foreign keys aren't properly configured
      // Use implicit foreign key resolution (let Supabase infer the relationship)
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles(display_name, clerk_id, is_verified, avatar_url),
          original_post:posts!original_post_id(
            id,
            content,
            image_url,
            profile_id,
            created_at,
            hashtags,
            mentions,
            profiles(display_name, clerk_id, is_verified, avatar_url)
          ),
          share_comment
        `)
        .limit(20);

      if (profileId) {
        // Include both original posts and shared posts (reposts) by this user
        // Shared posts already have profile_id set to the user who shared them
        query = query.eq("profile_id", profileId);
      } else if (bookmarkedPostIds && bookmarkedPostIds.length > 0) {
        query = query.in("id", bookmarkedPostIds);
      } else if (trendingPostIds && trendingPostIds.length > 0) {
        query = query.in("id", trendingPostIds);
      }

      // Apply time range filter
      if (filters?.timeRange && filters.timeRange !== "all") {
        const now = new Date();
        let startDate = new Date();
        
        switch (filters.timeRange) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        query = query.gte("created_at", startDate.toISOString());
      }

      // Default to recent
      query = query.order("created_at", { ascending: false });

      let { data, error } = await query;

      // Normalize image_url arrays from Supabase to ensure they're proper arrays
      if (data) {
        console.log('🔍 PostsFeed: Processing', data.length, 'posts');
        data = data.map((post: any, idx: number) => {
          // TEMPORARY DEBUG: Log raw data from Supabase
          if (post.image_url) {
            console.log(`📦 PostsFeed: Post ${idx} (${post.id}) raw image_url:`, {
              raw: post.image_url,
              type: typeof post.image_url,
              isArray: Array.isArray(post.image_url),
              stringified: JSON.stringify(post.image_url)
            });
          }
          
          // Ensure image_url is properly formatted
          if (post.image_url !== null && post.image_url !== undefined) {
            // If it's already an array, keep it and filter out null/empty values
            if (Array.isArray(post.image_url)) {
              console.log(`  ✅ Post ${idx}: Processing as array, length:`, post.image_url.length);
              post.image_url = post.image_url
                .map((url: any) => url === null || url === undefined ? '' : String(url).trim())
                .filter((url: string) => url !== '');
              // Set to null if array is empty after filtering
              if (post.image_url.length === 0) {
                console.log(`  ⚠️ Post ${idx}: Array became empty after filtering, setting to null`);
                post.image_url = null;
              } else {
                console.log(`  ✅ Post ${idx}: Final array:`, post.image_url);
              }
            } else if (typeof post.image_url === 'string') {
              console.log(`  ✅ Post ${idx}: Processing as string:`, post.image_url);
              // If it's a string, wrap it in an array if not empty
              const trimmed = post.image_url.trim();
              post.image_url = trimmed ? [trimmed] : null;
              console.log(`  ✅ Post ${idx}: Wrapped to array:`, post.image_url);
            } else {
              console.log(`  ⚠️ Post ${idx}: Processing as other type:`, typeof post.image_url);
              // Try to convert other types to string array
              const url = String(post.image_url).trim();
              post.image_url = url && url !== 'null' && url !== 'undefined' ? [url] : null;
              console.log(`  ✅ Post ${idx}: Converted to:`, post.image_url);
            }
          }
          
          // Also normalize original_post image_url if it exists
          if (post.original_post?.image_url !== null && post.original_post?.image_url !== undefined) {
            if (Array.isArray(post.original_post.image_url)) {
              post.original_post.image_url = post.original_post.image_url
                .map((url: any) => url === null || url === undefined ? '' : String(url).trim())
                .filter((url: string) => url !== '');
              if (post.original_post.image_url.length === 0) {
                post.original_post.image_url = null;
              }
            } else if (typeof post.original_post.image_url === 'string') {
              const trimmed = post.original_post.image_url.trim();
              post.original_post.image_url = trimmed ? [trimmed] : null;
            } else {
              const url = String(post.original_post.image_url).trim();
              post.original_post.image_url = url && url !== 'null' && url !== 'undefined' ? [url] : null;
            }
          }
          
          return post;
        });
      }

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
          console.error("Error loading posts with join:", {
            code: errorCode,
            message: errorMessage,
            error: error
          });
        }
        // Fallback: fetch posts without join and manually get profiles
        let fallbackQuery = supabase
          .from("posts")
          .select("*")
          .limit(20);
        
        // Apply profileId filter in fallback too
        if (profileId) {
          fallbackQuery = fallbackQuery.eq("profile_id", profileId);
        } else if (bookmarkedPostIds && bookmarkedPostIds.length > 0) {
          fallbackQuery = fallbackQuery.in("id", bookmarkedPostIds);
        } else if (trendingPostIds && trendingPostIds.length > 0) {
          fallbackQuery = fallbackQuery.in("id", trendingPostIds);
        }
        
        // Apply time range filter in fallback
        if (filters?.timeRange && filters.timeRange !== "all") {
          const now = new Date();
          let startDate = new Date();
          
          switch (filters.timeRange) {
            case "today":
              startDate.setHours(0, 0, 0, 0);
              break;
            case "week":
              startDate.setDate(now.getDate() - 7);
              break;
            case "month":
              startDate.setMonth(now.getMonth() - 1);
              break;
          }
          
          fallbackQuery = fallbackQuery.gte("created_at", startDate.toISOString());
        }
        
        const { data: simpleData, error: simpleError } = await fallbackQuery.order("created_at", { ascending: false });
        
        // Normalize image_url arrays in fallback data too
        if (simpleData) {
          simpleData.forEach((post: any) => {
            if (post.image_url) {
              if (Array.isArray(post.image_url)) {
                post.image_url = post.image_url.filter((url: any) => 
                  typeof url === 'string' && url.trim() !== ''
                );
              } else if (typeof post.image_url === 'string') {
                post.image_url = post.image_url.trim() ? [post.image_url] : null;
              }
            }
          });
        }
        
        if (simpleError) {
          console.error("Error loading posts:", simpleError);
          setPosts([]);
          setLoading(false);
          return;
        }
        
        if (!simpleData || simpleData.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }
        
        // Manually fetch profile data
        const profileIds = [...new Set(simpleData.map((p: any) => p.profile_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("clerk_id, display_name, is_verified, avatar_url")
          .in("clerk_id", profileIds);
        
        const profilesMap = new Map(profilesData?.map((p: any) => [p.clerk_id, p]) || []);
        data = simpleData.map((post: any) => ({
          ...post,
          profiles: profilesMap.get(post.profile_id) || { display_name: "Unknown", clerk_id: post.profile_id, is_verified: false },
        }));
      } else {
        // If no error, data is already set from the query above
      }

      // Get reactions, comments, and views count for each post
      if (data) {
        const postsWithCounts = await Promise.all(
          data.map(async (post) => {
            // Try post_reactions first, fallback to post_likes
            let reactionsCount = 0;
            try {
              const { count } = await supabase
                .from("post_reactions")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id);
              reactionsCount = count || 0;
            } catch (error) {
              // Fallback to post_likes if post_reactions doesn't exist
              const { count } = await supabase
                .from("post_likes")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id);
              reactionsCount = count || 0;
            }

            const { count: commentsCount } = await supabase
              .from("post_comments")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id);

            const { count: viewsCount } = await supabase
              .from("post_views")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id);

            // Get shares count
            let sharesCount = 0;
            try {
              const { count } = await supabase
                .from("reposts")
                .select("*", { count: "exact", head: true })
                .eq("original_post_id", post.id);
              sharesCount = count || 0;
            } catch (e) {
              // Ignore if table doesn't exist
            }

            return {
              ...post,
              likes_count: reactionsCount || 0, // Keep as likes_count for compatibility
              comments_count: commentsCount || 0,
              views_count: viewsCount || 0,
              shares_count: sharesCount || 0,
            };
          })
        );

        // Apply sorting
        let sortedPosts = postsWithCounts;
        if (filters?.sortBy) {
          switch (filters.sortBy) {
            case "popular":
              sortedPosts = postsWithCounts.sort((a, b) => 
                (b.views_count || 0) - (a.views_count || 0)
              );
              break;
            case "liked":
              sortedPosts = postsWithCounts.sort((a, b) => 
                (b.likes_count || 0) - (a.likes_count || 0)
              );
              break;
            case "commented":
              sortedPosts = postsWithCounts.sort((a, b) => 
                (b.comments_count || 0) - (a.comments_count || 0)
              );
              break;
            case "recent":
            default:
              sortedPosts = postsWithCounts.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              break;
          }
        }

        setPosts(sortedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    
    // Listen for post creation events
    const handlePostCreated = () => {
      setTimeout(() => loadPosts(), 500);
    };
    
    window.addEventListener('post-created', handlePostCreated);
    
    // Set up real-time subscription for new posts
    const channel = supabase
      .channel("posts-feed-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          // Debounce reload to avoid too many updates
          setTimeout(() => loadPosts(), 500);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('post-created', handlePostCreated);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, filters?.sortBy, filters?.timeRange]);

  // Scroll to specific post if URL parameter is present
  useEffect(() => {
    if (typeof window !== 'undefined' && posts.length > 0) {
      const handlePostScroll = (postElement: Element, commentId: string | null) => {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the post
        postElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
        setTimeout(() => {
          postElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
        }, 3000);
        
        // Ensure comments are expanded (they're expanded by default now)
        // If comment ID is present, try to scroll to comment
        if (commentId) {
          setTimeout(() => {
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              commentElement.classList.add('ring-2', 'ring-yellow-500', 'ring-offset-2');
              setTimeout(() => {
                commentElement.classList.remove('ring-2', 'ring-yellow-500', 'ring-offset-2');
              }, 3000);
            }
          }, 500);
        }
      };
      
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get('post');
      const commentId = urlParams.get('comment');
      
      // If we have a comment ID but no post ID, fetch the post_id from the comment
      if (commentId && !postId) {
        const fetchPostId = async () => {
          try {
            const { data: comment } = await supabase
              .from('post_comments')
              .select('post_id')
              .eq('id', commentId)
              .single();
            
            if (comment?.post_id) {
              // Update URL to include post_id
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('post', comment.post_id);
              window.history.replaceState({}, '', newUrl.toString());
              // Wait for posts to render, then scroll
              setTimeout(() => {
                const postElement = document.querySelector(`[data-post-id="${comment.post_id}"]`);
                if (postElement) {
                  handlePostScroll(postElement, commentId);
                }
              }, 500);
            }
          } catch (error) {
            console.error('Error fetching comment post_id:', error);
          }
        };
        fetchPostId();
      } else if (postId) {
        // Wait for posts to render, then scroll
        setTimeout(() => {
          const postElement = document.querySelector(`[data-post-id="${postId}"]`);
          if (postElement) {
            handlePostScroll(postElement, commentId);
          }
        }, 500);
      }
    }
  }, [posts, supabase]);

  const handlePostCreated = () => {
    loadPosts();
  };

  const handlePostDeleted = () => {
    loadPosts();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {showCreatePost && <CreatePost onPostCreated={handlePostCreated} />}
      {posts.length > 0 ? (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handlePostDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {profileId ? "No posts yet" : "No posts to show"}
          </p>
        </div>
      )}
    </div>
  );
}

