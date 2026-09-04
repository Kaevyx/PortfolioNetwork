/**
 * Blocked domains and URL patterns for content moderation
 * These domains are not allowed in posts, comments, or any user-generated content
 */

/**
 * List of blocked domains (case-insensitive)
 * Add domains without protocol (e.g., "example.com" not "https://example.com")
 */
export const BLOCKED_DOMAINS = [
  // Adult content
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'spankwire.com',
  'keezmovies.com',
  'extremetube.com',
  '4tube.com',
  'xhamster.com',
  'porn.com',
  'youjizz.com',
  'tnaflix.com',
  'drtuber.com',
  'sunporno.com',
  'beeg.com',
  'pornoxo.com',
  'pornhd.com',
  'porn300.com',
  'porn555.com',
  'pornmd.com',
  'pornotube.com',
  'pornotube8.com',
  'pornotube24.com',
  'pornotube69.com',
  'pornotube88.com',
  'pornotube99.com',
  'pornotube123.com',
  'pornotube456.com',
  'pornotube789.com',
  'pornotube000.com',
  'pornotube111.com',
  'pornotube222.com',
  'pornotube333.com',
  'pornotube444.com',
  'pornotube555.com',
  'pornotube666.com',
  'pornotube777.com',
  'pornotube888.com',
  'pornotube999.com',
  
  // Additional adult content sites
  'chaturbate.com',
  'livejasmin.com',
  'stripchat.com',
  'cam4.com',
  'myfreecams.com',
  'bongacams.com',
  'camsoda.com',
  'flirt4free.com',
  'streamate.com',
  'adultfriendfinder.com',
  'ashleymadison.com',
  'fetlife.com',
  
  // Inappropriate content
  'onlyfans.com',
  'justfor.fans',
  'fansly.com',
  'manyvids.com',
  'clips4sale.com',
  
  // Gambling (if you want to block)
  // 'bet365.com',
  // 'pokerstars.com',
  // '888.com',
  
  // Add more domains as needed
];

/**
 * Normalize domain for comparison (remove protocol, www, trailing slashes, etc.)
 */
function normalizeDomain(url: string): string {
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//i, '');
    
    // Remove www. if present
    domain = domain.replace(/^www\./i, '');
    
    // Remove path, query string, and fragment
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    domain = domain.split('#')[0];
    
    // Remove port if present
    domain = domain.split(':')[0];
    
    // Convert to lowercase
    domain = domain.toLowerCase().trim();
    
    return domain;
  } catch (error) {
    // If URL parsing fails, return original
    return url.toLowerCase().trim();
  }
}

/**
 * Check if a URL contains a blocked domain
 */
export function isBlockedDomain(url: string): boolean {
  if (!url) return false;
  
  const normalizedUrl = normalizeDomain(url);
  
  // Check against blocked domains list
  return BLOCKED_DOMAINS.some(blockedDomain => {
    const normalizedBlocked = blockedDomain.toLowerCase();
    
    // Exact match or subdomain match
    return normalizedUrl === normalizedBlocked || 
           normalizedUrl.endsWith('.' + normalizedBlocked);
  });
}

/**
 * Extract all URLs from text content
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}[^\s<>"']*)/gi;
  const matches = text.match(urlRegex);
  
  if (!matches) return [];
  
  // Normalize URLs (add protocol if missing)
  return matches.map(url => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }
    return `https://${url}`;
  });
}

/**
 * Check if text content contains any blocked domains
 * Returns the first blocked domain found, or null if none found
 */
export function containsBlockedDomain(text: string): string | null {
  if (!text) return null;
  
  const urls = extractUrls(text);
  
  for (const url of urls) {
    if (isBlockedDomain(url)) {
      return normalizeDomain(url);
    }
  }
  
  return null;
}

