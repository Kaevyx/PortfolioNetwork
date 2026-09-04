"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface MentionLinkProps {
  username: string;
  content: string;
  mentionedUserIds?: string[] | null;
}

export function MentionLink({ username, content, mentionedUserIds }: MentionLinkProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const resolveUser = async () => {
      // First, try to find user in the mentionedUserIds array
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('clerk_id, display_name')
          .in('clerk_id', mentionedUserIds)
          .or(`display_name.ilike.%${username}%,email.ilike.%${username}%`)
          .limit(1);
        
        if (profiles && profiles.length > 0) {
          setUserId(profiles[0].clerk_id);
          return;
        }
      }
      
      // Fallback: resolve by username
      const { resolveMentionToUserId } = await import('@/lib/utils/resolveMentionToUserId');
      const resolved = await resolveMentionToUserId(username);
      if (resolved) setUserId(resolved);
    };
    
    resolveUser();
  }, [username, mentionedUserIds, supabase]);

  const href = userId ? `/profile/${userId}` : `/profile?search=${encodeURIComponent(username)}`;
  
  return (
    <Link
      href={href}
      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium"
    >
      {content}
    </Link>
  );
}

