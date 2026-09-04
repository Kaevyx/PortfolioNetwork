/**
 * Utility functions for parsing post content (hashtags and links)
 */

export type ContentPart = 
  | { type: 'text'; content: string }
  | { type: 'hashtag'; content: string; tag: string }
  | { type: 'link'; content: string; url: string }
  | { type: 'mention'; content: string; userId?: string; username?: string };

/**
 * URL regex pattern - matches http, https, www, and common domains
 * Matches:
 * - http:// or https:// URLs
 * - www. URLs (will add https://)
 * - Domain names like example.com, subdomain.example.com
 * - URLs with paths, query strings, and fragments
 */
const URL_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}[^\s<>"']*)/gi;

/**
 * Hashtag regex pattern
 */
const HASHTAG_REGEX = /#[\w]+/g;

/**
 * Mention regex pattern - matches @username or @display_name
 */
const MENTION_REGEX = /@[\w\s]+/g;

/**
 * Parse text and extract hashtags and links
 * Returns an array of content parts (text, hashtags, and links)
 * Priority: Links > Hashtags > Text
 */
export function parseContent(text: string): ContentPart[] {
  if (!text) return [{ type: 'text', content: '' }];

  const parts: ContentPart[] = [];
  const processedIndices = new Set<number>();
  
  // First, find all URLs
  const urlMatches: Array<{ index: number; length: number; url: string; match: string }> = [];
  let urlMatch;
  URL_REGEX.lastIndex = 0; // Reset regex
  while ((urlMatch = URL_REGEX.exec(text)) !== null) {
    const url = urlMatch[0];
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : url.startsWith('www.') 
        ? `https://${url}`
        : `https://${url}`;
    
    urlMatches.push({
      index: urlMatch.index,
      length: urlMatch[0].length,
      url: fullUrl,
      match: urlMatch[0]
    });
  }

  // Then, find all hashtags
  const hashtagMatches: Array<{ index: number; length: number; tag: string; match: string }> = [];
  let hashtagMatch;
  HASHTAG_REGEX.lastIndex = 0; // Reset regex
  while ((hashtagMatch = HASHTAG_REGEX.exec(text)) !== null) {
    // Check if this hashtag is inside a URL
    const isInsideUrl = urlMatches.some(url => 
      hashtagMatch.index >= url.index && 
      hashtagMatch.index < url.index + url.length
    );
    
    if (!isInsideUrl) {
      hashtagMatches.push({
        index: hashtagMatch.index,
        length: hashtagMatch[0].length,
        tag: hashtagMatch[0].substring(1).toLowerCase(),
        match: hashtagMatch[0]
      });
    }
  }

  // Find all mentions
  const mentionMatches: Array<{ index: number; length: number; username: string; match: string }> = [];
  let mentionMatch;
  MENTION_REGEX.lastIndex = 0; // Reset regex
  while ((mentionMatch = MENTION_REGEX.exec(text)) !== null) {
    // Check if this mention is inside a URL
    const isInsideUrl = urlMatches.some(url => 
      mentionMatch.index >= url.index && 
      mentionMatch.index < url.index + url.length
    );
    
    if (!isInsideUrl) {
      mentionMatches.push({
        index: mentionMatch.index,
        length: mentionMatch[0].length,
        username: mentionMatch[0].substring(1).trim(),
        match: mentionMatch[0]
      });
    }
  }

  // Combine and sort all matches by index
  const allMatches: Array<{
    index: number;
    length: number;
    type: 'url' | 'hashtag' | 'mention';
    url?: string;
    tag?: string;
    username?: string;
    match: string;
  }> = [
    ...urlMatches.map(m => ({ ...m, type: 'url' as const, url: m.url })),
    ...hashtagMatches.map(m => ({ ...m, type: 'hashtag' as const, tag: m.tag })),
    ...mentionMatches.map(m => ({ ...m, type: 'mention' as const, username: m.username }))
  ].sort((a, b) => a.index - b.index);

  // Remove overlapping matches (URLs take priority)
  const filteredMatches: typeof allMatches = [];
  for (const match of allMatches) {
    const overlaps = filteredMatches.some(existing => 
      (match.index >= existing.index && match.index < existing.index + existing.length) ||
      (existing.index >= match.index && existing.index < match.index + match.length)
    );
    
    if (!overlaps) {
      filteredMatches.push(match);
    } else if (match.type === 'url') {
      // URLs take priority, remove overlapping hashtags
      const index = filteredMatches.findIndex(existing => 
        (match.index >= existing.index && match.index < existing.index + existing.length) ||
        (existing.index >= match.index && existing.index < match.index + match.length)
      );
      if (index !== -1 && filteredMatches[index].type === 'hashtag') {
        filteredMatches.splice(index, 1, match);
      }
    }
  }

  // Build parts array
  let lastIndex = 0;
  
  for (const match of filteredMatches) {
    // Add text before match
    if (match.index > lastIndex) {
      const textContent = text.substring(lastIndex, match.index);
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Add match
    if (match.type === 'url' && match.url) {
      parts.push({
        type: 'link',
        content: match.match,
        url: match.url
      });
    } else if (match.type === 'hashtag' && match.tag) {
      parts.push({
        type: 'hashtag',
        content: match.match,
        tag: match.tag
      });
    } else if (match.type === 'mention' && match.username) {
      parts.push({
        type: 'mention',
        content: match.match,
        username: match.username
      });
    }

    lastIndex = match.index + match.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // If no matches found, return the whole text as a single text part
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}

/**
 * Extract hashtags from text content (for backward compatibility)
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  
  if (!matches) return [];
  
  // Remove duplicates and return unique hashtags (case-insensitive)
  const uniqueHashtags = new Set<string>();
  matches.forEach(tag => {
    uniqueHashtags.add(tag.toLowerCase());
  });
  
  return Array.from(uniqueHashtags);
}

/**
 * Parse text and replace hashtags with clickable components (for backward compatibility)
 * @deprecated Use parseContent instead which handles both hashtags and links
 */
export function parseHashtags(text: string): Array<{ type: 'text' | 'hashtag'; content: string; tag?: string }> {
  if (!text) return [{ type: 'text', content: '' }];
  
  const parts: Array<{ type: 'text' | 'hashtag'; content: string; tag?: string }> = [];
  const hashtagRegex = /#[\w]+/g;
  let lastIndex = 0;
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    
    // Add hashtag
    const hashtag = match[0];
    parts.push({
      type: 'hashtag',
      content: hashtag,
      tag: hashtag.substring(1).toLowerCase(), // Remove # and lowercase
    });
    
    lastIndex = match.index + hashtag.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }
  
  // If no hashtags found, return the whole text as a single text part
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }
  
  return parts;
}

