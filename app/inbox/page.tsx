"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Search, User, X, Plus, Check, CheckCheck, Trash2, MoreVertical, Settings, Lock } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";
import { AvatarImage } from "@/components/AvatarImage";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import { checkContentSafety } from "@/lib/utils/databaseContentModeration";
import { logBlockedAttempt } from "@/lib/utils/databaseContentModeration";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspensionWarning } from "@/components/SuspensionWarning";

export default function InboxPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { isSuspended, reason, endsAt } = useSuspensionCheck();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSearchQuery, setComposeSearchQuery] = useState("");
  const [composeSearchResults, setComposeSearchResults] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showConversationMenu, setShowConversationMenu] = useState<string | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const supabase = createClient();

  // Check for user query parameter to auto-open compose or conversation
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded && user?.id) {
      const params = new URLSearchParams(window.location.search);
      const userId = params.get('user');
      if (userId && userId !== user.id) {
        // Check if conversation exists
        const existingConv = conversations.find(c => c.other_user_id === userId);
        if (existingConv) {
          setSelectedConversation(existingConv);
        } else {
          // Open compose modal with user pre-selected
          setComposeRecipient(userId);
          setShowCompose(true);
        }
      }
    }
  }, [isLoaded, user?.id, conversations]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (isSuspended) {
      router.push("/dashboard");
    }
  }, [isSuspended, router]);

  useEffect(() => {
    if (isLoaded && user?.id && !isSuspended) {
      loadConversations();
      loadUnreadCount();
    }
  }, [isLoaded, user?.id, isSuspended]);

  // Set up real-time subscription (only recreate when user or selected conversation changes)
  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    
    const cleanup = setupRealtimeSubscription();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, selectedConversation?.conversation_id]);

  // Close conversation menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showConversationMenu && !(event.target as Element).closest('.conversation-menu-container')) {
        setShowConversationMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConversationMenu]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.conversation_id);
      setIsAtBottom(true);
    }
  }, [selectedConversation]);

  useEffect(() => {
    // Only auto-scroll if user is at bottom or if it's a new conversation
    if (isAtBottom && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, isAtBottom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setIsAtBottom(isNearBottom);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();
      if (response.ok) {
        const conversationsList = data.conversations || [];
        
        // Fetch settings for all other users in conversations
        const otherUserIds = conversationsList.map((conv: any) => conv.other_user_id).filter(Boolean);
        if (otherUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('clerk_id, settings')
            .in('clerk_id', otherUserIds);
          
          // Map settings to conversations
          const profilesMap = new Map(profilesData?.map((p: any) => [p.clerk_id, p.settings]) || []);
          conversationsList.forEach((conv: any) => {
            conv.other_user_settings = profilesMap.get(conv.other_user_id);
          });
        }
        
        setConversations(conversationsList);
        setUnreadCount(conversationsList.reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0) || 0);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/unread-count');
      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversation/${conversationId}`);
      const data = await response.json();
      if (response.ok) {
        // Reverse to show oldest first
        setMessages((data.messages || []).reverse());
        await loadConversations(); // Refresh to update unread counts
        // Scroll to bottom after loading messages
        setTimeout(() => {
          setIsAtBottom(true);
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    setDeletingConversation(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      // Also delete all messages in the conversation
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Clear selected conversation if it was deleted
      if (selectedConversation?.conversation_id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      await loadConversations();
      setShowConversationMenu(null);
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      alert("Failed to delete conversation: " + error.message);
    } finally {
      setDeletingConversation(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    // Check for blocked domains and inappropriate content
    const safetyCheck = await checkContentSafety(newMessage.trim());
    if (!safetyCheck.isSafe) {
      // Log the blocked attempt
      try {
        await logBlockedAttempt({
          userId: user?.id || '',
          contentType: 'message',
          attemptedContent: newMessage.trim(),
          matchedKeyword: safetyCheck.matchedKeyword,
          matchedDomain: safetyCheck.matchedDomain,
          category: safetyCheck.category,
          severity: safetyCheck.severity,
          messageShown: safetyCheck.reason,
          contextUrl: '/inbox',
          keywordId: safetyCheck.keywordId,
          domainId: safetyCheck.domainId,
        });
      } catch (error) {
        console.error("Error logging blocked attempt:", error);
      }
      
      alert(
        safetyCheck.reason || "Your message violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate."
      );
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedConversation.other_user_id,
          content: newMessage.trim()
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setNewMessage("");
        // The message will appear via real-time subscription, but we can also add it optimistically
        if (data.message) {
          // Get sender profile info
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('clerk_id, display_name, avatar_url')
            .eq('clerk_id', user?.id || '')
            .single();
          
          const optimisticMessage = {
            ...data.message,
            sender_display_name: senderProfile?.display_name || null,
            sender_avatar_url: senderProfile?.avatar_url || null,
          };
          
          setMessages(prev => {
            // Check if message already exists
            if (prev.some(m => m.id === data.message.id)) {
              return prev;
            }
            // Add new message and sort
            const updated = [...prev, optimisticMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return updated;
          });
          
          // Scroll to bottom
          setTimeout(() => {
            setIsAtBottom(true);
            scrollToBottom();
          }, 100);
        }
        await loadConversations();
      } else {
        alert(data.error || "Failed to send message");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setComposeSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('clerk_id, username, display_name, email, avatar_url, settings')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('clerk_id', user?.id)
        .limit(20); // Get more results to filter

      if (error) throw error;
      
      // Filter out users who have disabled messages
      const filteredResults = (data || []).filter((profile) => {
        // Check if allowMessages is explicitly false
        const allowMessages = profile.settings?.profile?.allowMessages;
        return allowMessages !== false; // Include if true or undefined (defaults to true)
      });
      
      setComposeSearchResults(filteredResults.slice(0, 10));
    } catch (error) {
      console.error("Error searching users:", error);
      setComposeSearchResults([]);
    }
  };

  const handleCompose = async () => {
    if (!composeRecipient || !composeMessage.trim() || sending) return;

    // Check for blocked domains and inappropriate content
    const safetyCheck = await checkContentSafety(composeMessage.trim());
    if (!safetyCheck.isSafe) {
      // Log the blocked attempt
      try {
        await logBlockedAttempt({
          userId: user?.id || '',
          contentType: 'message',
          attemptedContent: composeMessage.trim(),
          matchedKeyword: safetyCheck.matchedKeyword,
          matchedDomain: safetyCheck.matchedDomain,
          category: safetyCheck.category,
          severity: safetyCheck.severity,
          messageShown: safetyCheck.reason,
          contextUrl: '/inbox',
          keywordId: safetyCheck.keywordId,
          domainId: safetyCheck.domainId,
        });
      } catch (error) {
        console.error("Error logging blocked attempt:", error);
      }
      
      alert(
        safetyCheck.reason || "Your message violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate."
      );
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: composeRecipient,
          content: composeMessage.trim()
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setShowCompose(false);
        setComposeRecipient("");
        setComposeMessage("");
        setComposeSearchQuery("");
        await loadConversations();
        // Open the new conversation
        const newConv = conversations.find(c => c.other_user_id === composeRecipient) || 
          (await fetch('/api/messages/conversations').then(r => r.json())).conversations?.find((c: any) => c.other_user_id === composeRecipient);
        if (newConv) {
          setSelectedConversation(newConv);
        }
      } else {
        alert(data.error || "Failed to send message");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return () => {};

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Update conversations list
          await loadConversations();
          await loadUnreadCount();
          
          // If this message is in the current conversation, add it to the messages list
          if (selectedConversation && newMessage.conversation_id === selectedConversation.conversation_id) {
            // Get sender profile info
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('clerk_id, display_name, avatar_url')
              .eq('clerk_id', newMessage.sender_id)
              .single();
            
            // Add new message to the list
            const enrichedMessage = {
              ...newMessage,
              sender_display_name: senderProfile?.display_name || null,
              sender_avatar_url: senderProfile?.avatar_url || null,
            };
            
            setMessages(prev => {
              // Check if message already exists (avoid duplicates)
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              // Add new message and sort by created_at
              const updated = [...prev, enrichedMessage].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              return updated;
            });
            
            // Auto-scroll if user is at bottom
            if (isAtBottom) {
              setTimeout(() => {
                scrollToBottom();
              }, 100);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Update conversations list
          await loadConversations();
          
          // If this message is in the current conversation, add it to the messages list
          if (selectedConversation && newMessage.conversation_id === selectedConversation.conversation_id) {
            // Get sender profile info (which is the current user)
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('clerk_id, display_name, avatar_url')
              .eq('clerk_id', user.id)
              .single();
            
            // Add new message to the list
            const enrichedMessage = {
              ...newMessage,
              sender_display_name: senderProfile?.display_name || null,
              sender_avatar_url: senderProfile?.avatar_url || null,
            };
            
            setMessages(prev => {
              // Check if message already exists (avoid duplicates)
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              // Add new message and sort by created_at
              const updated = [...prev, enrichedMessage].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              return updated;
            });
            
            // Auto-scroll to bottom for sent messages
            setTimeout(() => {
              setIsAtBottom(true);
              scrollToBottom();
            }, 100);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        async (payload) => {
          const updatedMessage = payload.new as any;
          
          // Update read receipts for sent messages
          if (selectedConversation && updatedMessage.conversation_id === selectedConversation.conversation_id) {
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id ? { ...msg, is_read: updatedMessage.is_read, read_at: updatedMessage.read_at } : msg
            ));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.other_user_display_name?.toLowerCase().includes(query) ||
      conv.other_user_email?.toLowerCase().includes(query) ||
      conv.last_message_content?.toLowerCase().includes(query)
    );
  });

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show suspension warning and block access if suspended
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Suspended</h2>
          <SuspensionWarning reason={reason} endsAt={endsAt} />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Your account is currently suspended. You cannot access your inbox or send messages during this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4 sm:py-6 pb-24 sm:pb-28 lg:pb-32">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8" />
            Inbox
          </h1>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Message</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-12 sm:mb-16 lg:mb-20" style={{ height: 'calc(100vh - 280px)', minHeight: '500px', maxHeight: 'calc(100vh - 280px)' }}>
          {/* Conversations List */}
          <div className="lg:col-span-1 xl:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm h-full min-h-0">
            <div className="p-4 xl:p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
                  <button
                    onClick={() => setShowCompose(true)}
                    className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Start a conversation
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className={`relative group conversation-menu-container border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedConversation?.conversation_id === conv.conversation_id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : ''
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedConversation(conv);
                        setShowConversationMenu(null);
                      }}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <AvatarImage
                            src={conv.other_user_avatar_url}
                            alt={conv.other_user_display_name || "User"}
                            fallbackText={conv.other_user_display_name?.charAt(0).toUpperCase() || "U"}
                            size="lg"
                            userId={conv.other_user_id}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {conv.other_user_display_name || conv.other_user_email || 'Unknown User'}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {conv.unread_count > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {conv.last_message_content && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {conv.last_message_sender_id === user?.id ? 'You: ' : ''}
                              {conv.last_message_content}
                            </p>
                          )}
                          {conv.last_message_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              <RelativeTime date={conv.last_message_at} />
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConversationMenu(showConversationMenu === conv.conversation_id ? null : conv.conversation_id);
                      }}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showConversationMenu === conv.conversation_id && (
                      <div className="absolute top-10 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 min-w-[150px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.conversation_id);
                          }}
                          disabled={deletingConversation}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-3 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm h-full min-h-0">
            {selectedConversation ? (
              <>
                <div className="p-4 xl:p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <AvatarImage
                      src={selectedConversation.other_user_avatar_url}
                      alt={selectedConversation.other_user_display_name || "User"}
                      fallbackText={selectedConversation.other_user_display_name?.charAt(0).toUpperCase() || "U"}
                      size="md"
                      userId={selectedConversation.other_user_id}
                    />
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.other_user_display_name || selectedConversation.other_user_email || 'Unknown User'}
                      </h2>
                      <Link
                        href={selectedConversation.other_user ? getProfileUrl({ username: selectedConversation.other_user.username, clerk_id: selectedConversation.other_user_id }) : `/profile/${selectedConversation.other_user_id}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Banner if other user has disabled messages */}
                {(() => {
                  // Check if the other user has disabled messages
                  const otherUserSettings = selectedConversation?.other_user_settings;
                  const allowMessages = otherUserSettings?.profile?.allowMessages;
                  const messagesDisabled = allowMessages === false;
                  
                  return messagesDisabled && (
                    <div className="mx-4 xl:mx-5 mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-800 dark:text-orange-300">
                          <strong>{selectedConversation.other_user_display_name || 'This user'}</strong> is no longer accepting messages. You can still view your conversation history, but new messages cannot be sent.
                        </p>
                      </div>
                    </div>
                  );
                })()}
                  <div className="flex-1 overflow-y-auto relative min-h-0">
                    <div 
                      ref={messagesContainerRef}
                      onScroll={handleScroll}
                      className="h-full overflow-y-auto p-4 xl:p-6 space-y-4"
                    >
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender_id === user?.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center justify-between mt-1 ${
                              msg.sender_id === user?.id
                                ? 'text-indigo-100'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              <span className="text-xs">
                                <RelativeTime date={msg.created_at} />
                              </span>
                              {msg.sender_id === user?.id && (
                                <div className="flex items-center gap-1 ml-2">
                                  {msg.is_read ? (
                                    <div 
                                      className="flex items-center gap-1" 
                                      title={msg.read_at ? `Seen ${new Date(msg.read_at).toLocaleString()}` : 'Seen'}
                                    >
                                      <CheckCheck className="w-4 h-4 text-indigo-200" />
                                      {msg.read_at && (
                                        <span className="text-[10px] opacity-90 font-medium">Seen</span>
                                      )}
                                    </div>
                                  ) : (
                                    <Check className="w-4 h-4 opacity-60" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    {!isAtBottom && messages.length > 0 && (
                      <button
                        onClick={() => {
                          setIsAtBottom(true);
                          scrollToBottom();
                        }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Scroll to bottom
                      </button>
                    )}
                  </div>
                <div className="p-4 xl:p-5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                  {(() => {
                    // Check if the other user has disabled messages
                    const otherUserSettings = selectedConversation?.other_user_settings;
                    const allowMessages = otherUserSettings?.profile?.allowMessages;
                    const messagesDisabled = allowMessages === false;
                    
                    return messagesDisabled ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          You cannot send messages to this user
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 xl:gap-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Message</h2>
                <button
                  onClick={() => {
                    setShowCompose(false);
                    setComposeRecipient("");
                    setComposeMessage("");
                    setComposeSearchQuery("");
                    setComposeSearchResults([]);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To
                  </label>
                  {composeRecipient ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {composeSearchResults.find(u => u.clerk_id === composeRecipient)?.display_name || 
                         composeSearchResults.find(u => u.clerk_id === composeRecipient)?.email || 
                         'Selected user'}
                      </span>
                      <button
                        onClick={() => setComposeRecipient("")}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={composeSearchQuery}
                        onChange={(e) => {
                          setComposeSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        placeholder="Search by name or email..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      {composeSearchResults.length > 0 && (
                        <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                          {composeSearchResults.map((user) => (
                            <button
                              key={user.clerk_id}
                              type="button"
                              onClick={() => {
                                setComposeRecipient(user.clerk_id);
                                setComposeSearchQuery("");
                                setComposeSearchResults([]);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                            >
                              <div className="flex-shrink-0">
                                <AvatarImage
                                  src={user.avatar_url}
                                  alt={user.display_name}
                                  fallbackText={user.display_name?.charAt(0).toUpperCase() || "U"}
                                  size="sm"
                                  userId={user.clerk_id}
                                />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.display_name || 'No name'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Type your message..."
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCompose(false);
                      setComposeRecipient("");
                      setComposeMessage("");
                      setComposeSearchQuery("");
                      setComposeSearchResults([]);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompose}
                    disabled={!composeRecipient || !composeMessage.trim() || sending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

