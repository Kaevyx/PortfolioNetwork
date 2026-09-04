/**
 * Utility functions for extracting and handling mentions
 */

/**
 * Extract mentions from text content
 * Returns array of mentioned usernames (without @)
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  
  const mentionRegex = /@([\w\s]+)/g;
  const matches = text.match(mentionRegex);
  
  if (!matches) return [];
  
  // Remove @ and return unique mentions
  const uniqueMentions = new Set<string>();
  matches.forEach(mention => {
    const username = mention.substring(1).trim();
    if (username) {
      uniqueMentions.add(username);
    }
  });
  
  return Array.from(uniqueMentions);
}

/**
 * Resolve mentions to user IDs by searching profiles
 * This should be called server-side or with proper authentication
 */
export async function resolveMentionsToUserIds(
  supabase: any,
  mentions: string[]
): Promise<string[]> {
  if (!mentions || mentions.length === 0) return [];

  console.log('Resolving mentions:', mentions);
  const userIds: string[] = [];

  // Search for each mention in profiles (by display_name or email)
  for (const mention of mentions) {
    // Use case-insensitive search - try exact match first, then partial match
    const mentionLower = mention.toLowerCase().trim();
    const mentionPattern = `%${mention}%`;
    
    try {
      // Search by display_name and email separately, then combine results
      const [displayNameResults, emailResults] = await Promise.all([
        supabase
          .from('profiles')
          .select('clerk_id, display_name, email')
          .ilike('display_name', mentionPattern)
          .limit(10),
        supabase
          .from('profiles')
          .select('clerk_id, display_name, email')
          .ilike('email', mentionPattern)
          .limit(10)
      ]);
      
      // Combine results and remove duplicates
      const allProfiles: any[] = [];
      const seenIds = new Set<string>();
      
      if (displayNameResults.data) {
        displayNameResults.data.forEach(p => {
          if (!seenIds.has(p.clerk_id)) {
            allProfiles.push(p);
            seenIds.add(p.clerk_id);
          }
        });
      }
      
      if (emailResults.data) {
        emailResults.data.forEach(p => {
          if (!seenIds.has(p.clerk_id)) {
            allProfiles.push(p);
            seenIds.add(p.clerk_id);
          }
        });
      }
      
      if (allProfiles.length > 0) {
        console.log(`Found ${allProfiles.length} profile(s) for mention "${mention}"`, allProfiles.map(p => ({ display_name: p.display_name, email: p.email })));
        
        // Try to find exact match first (case-insensitive)
        const exactMatch = allProfiles.find(
          p => 
            p.display_name?.toLowerCase().trim() === mentionLower ||
            p.email?.toLowerCase().trim() === mentionLower
        );
        
        if (exactMatch) {
          console.log(`Exact match found for "${mention}":`, exactMatch.clerk_id);
          userIds.push(exactMatch.clerk_id);
        } else if (allProfiles.length === 1) {
          // If only one match, use it
          console.log(`Single match found for "${mention}":`, allProfiles[0].clerk_id);
          userIds.push(allProfiles[0].clerk_id);
        } else {
          // If multiple matches, prefer display_name match over email
          const bestMatch = allProfiles.find(p => 
            p.display_name?.toLowerCase().includes(mentionLower)
          ) || allProfiles[0];
          
          if (bestMatch) {
            console.log(`Best match found for "${mention}":`, bestMatch.clerk_id);
            userIds.push(bestMatch.clerk_id);
          }
        }
      } else {
        console.log(`No profiles found for mention "${mention}"`);
      }
    } catch (err) {
      console.error('Error resolving mention:', mention, err);
      continue;
    }
  }

  return Array.from(new Set(userIds)); // Return unique user IDs
}

