"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function InboxBell() {
  const { user, isLoaded } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/messages/unread-count');
        if (!response.ok) {
          // Silently handle non-OK responses
          return;
        }
        const data = await response.json();
        setUnreadCount(data.count || 0);
      } catch (error) {
        // Silently handle network errors - API might not be available
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.debug("Error loading unread count:", error);
        }
      }
    };

    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [isLoaded, user?.id]);

  if (!isLoaded || !user) return null;

  return (
    <Link
      href="/inbox"
      className="relative p-1.5 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
      title="Inbox"
    >
      <MessageSquare className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full px-1">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

