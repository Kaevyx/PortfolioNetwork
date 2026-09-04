/**
 * Get the profile URL for a user, preferring username if available
 * @param profile - Profile object with username and clerk_id, or just clerk_id string
 * @returns Profile URL string
 */
export function getProfileUrl(profile: { username?: string | null; clerk_id: string } | string): string {
  // If profile is a string, assume it's a clerk_id
  if (typeof profile === 'string') {
    return `/profile/${profile}`;
  }

  // Prefer username if available, otherwise use clerk_id
  return `/profile/${profile.username || profile.clerk_id}`;
}

/**
 * Get profile URL from clerk_id (async, fetches username if available)
 * Use this when you only have clerk_id and want to get the best URL
 */
export async function getProfileUrlFromClerkId(
  clerkId: string,
  supabase: any
): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username, clerk_id')
      .eq('clerk_id', clerkId)
      .single();

    if (data?.username) {
      return `/profile/${data.username}`;
    }
  } catch (error) {
    // Fallback to clerk_id if error
  }

  return `/profile/${clerkId}`;
}


