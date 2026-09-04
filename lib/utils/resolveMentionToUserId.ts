/**
 * Utility function to resolve a mention username to a user ID
 * This is used for rendering mention links
 */

import { createClient } from "@/lib/supabase/client";

export async function resolveMentionToUserId(
  username: string
): Promise<string | null> {
  if (!username) return null;

  const supabase = createClient();
  const usernameLower = username.toLowerCase().trim();

  try {
    // Search by display_name first (most common)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_id, display_name, email')
      .or(`display_name.ilike.%${username}%,email.ilike.%${username}%`)
      .limit(10);

    if (!profiles || profiles.length === 0) return null;

    // Try exact match first
    const exactMatch = profiles.find(
      p =>
        p.display_name?.toLowerCase().trim() === usernameLower ||
        p.email?.toLowerCase().trim() === usernameLower
    );

    if (exactMatch) {
      return exactMatch.clerk_id;
    }

    // If only one match, use it
    if (profiles.length === 1) {
      return profiles[0].clerk_id;
    }

    // Prefer display_name match
    const bestMatch = profiles.find(p =>
      p.display_name?.toLowerCase().includes(usernameLower)
    ) || profiles[0];

    return bestMatch?.clerk_id || null;
  } catch (error) {
    console.error('Error resolving mention to user ID:', error);
    return null;
  }
}

