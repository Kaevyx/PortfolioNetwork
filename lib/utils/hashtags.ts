/**
 * Utility functions for parsing and handling hashtags
 */

/**
 * Extract hashtags from text content
 * Matches # followed by alphanumeric characters and underscores
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
 * Parse text and replace hashtags with clickable components
 * Returns an array of text segments and hashtag objects
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

/**
 * Clean hashtag (remove # and normalize)
 */
export function cleanHashtag(tag: string): string {
  return tag.replace(/^#/, '').toLowerCase();
}

/**
 * Format hashtag for display (add # if missing)
 */
export function formatHashtag(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

