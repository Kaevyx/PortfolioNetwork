/**
 * Database-backed Content Moderation Utility
 * Fetches blocked keywords and domains from the database
 */

import { createClient } from "@/lib/supabase/client";

interface BlockedKeyword {
  id?: string;
  keyword: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  match_type: 'exact' | 'contains' | 'regex';
  custom_message: string | null;
}

interface BlockedDomain {
  id?: string;
  domain: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  custom_message: string | null;
}

// Cache for keywords and domains (refresh every 5 minutes)
let keywordsCache: BlockedKeyword[] | null = null;
let domainsCache: BlockedDomain[] | null = null;
let categoriesCache: Record<string, string> | null = null; // Cache for category default messages
let cacheTimestamp: number = 0;
let categoriesCacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize domain for comparison
 */
function normalizeDomain(url: string): string {
  try {
    let domain = url.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^www\./i, '');
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    domain = domain.split('#')[0];
    domain = domain.split(':')[0];
    return domain.toLowerCase().trim();
  } catch (error) {
    return url.toLowerCase().trim();
  }
}

/**
 * Extract all URLs from text content
 */
function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}[^\s<>"']*)/gi;
  const matches = text.match(urlRegex);
  
  if (!matches) return [];
  
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
 * Load blocked keywords from database (with caching)
 */
async function loadBlockedKeywords(): Promise<BlockedKeyword[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (keywordsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return keywordsCache;
  }
  
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_active_blocked_keywords');
    
    if (error) {
      console.error("Error loading blocked keywords:", error);
      return keywordsCache || [];
    }
    
    keywordsCache = data || [];
    cacheTimestamp = now;
    return keywordsCache;
  } catch (error) {
    console.error("Error loading blocked keywords:", error);
    return keywordsCache || [];
  }
}

/**
 * Load blocked domains from database (with caching)
 */
async function loadBlockedDomains(): Promise<BlockedDomain[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (domainsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return domainsCache;
  }
  
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_active_blocked_domains');
    
    if (error) {
      console.error("Error loading blocked domains:", error);
      return domainsCache || [];
    }
    
    domainsCache = data || [];
    cacheTimestamp = now;
    return domainsCache;
  } catch (error) {
    console.error("Error loading blocked domains:", error);
    return domainsCache || [];
  }
}

/**
 * Normalize text to handle obfuscation attempts
 * - Converts leet speak (0->o, 1->i, 3->e, 4->a, 5->s, 7->t, @->a, $->s, etc.)
 * - Removes repeated characters (ugggly -> ugly)
 * - Normalizes spacing and punctuation
 */
function normalizeTextForMatching(text: string): string {
  let normalized = text.toLowerCase();
  
  // Character substitutions (leet speak and common obfuscations)
  const substitutions: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
    '@': 'a', '$': 's', '!': 'i', '|': 'i',
  };
  
  // Apply character substitutions
  for (const [char, replacement] of Object.entries(substitutions)) {
    normalized = normalized.replace(new RegExp(char, 'gi'), replacement);
  }
  
  // Remove repeated characters (ugggly -> ugly, but keep reasonable repeats like "too")
  // Only collapse 3+ consecutive identical characters
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  
  // Normalize spacing: remove extra spaces, handle dashes/underscores as word separators
  normalized = normalized
    .replace(/[-_]/g, ' ') // Convert dashes and underscores to spaces
    .replace(/[^\w\s]/g, ' ') // Replace other punctuation with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
  
  return normalized;
}

/**
 * Check if a word matches with fuzzy matching (handles typos and variations)
 * STRICT: Only matches if words are very similar (repeated chars, leet speak normalization)
 * Does NOT match words that differ by single letters (e.g., "race" vs "rape")
 */
function fuzzyWordMatch(textWord: string, phraseWord: string, maxDistance: number = 1): boolean {
  // Exact match
  if (textWord === phraseWord) return true;
  
  // If words are different lengths, only match if one is clearly a variation of the other
  // (e.g., "ugly" vs "uglyy" - repeated character)
  const lengthDiff = Math.abs(textWord.length - phraseWord.length);
  
  // If one word is just the other with repeated characters at the end
  if (lengthDiff <= 2) {
    const shorter = textWord.length <= phraseWord.length ? textWord : phraseWord;
    const longer = textWord.length > phraseWord.length ? textWord : phraseWord;
    
    // Check if longer is just shorter with repeated last character(s)
    if (longer.startsWith(shorter)) {
      const extra = longer.substring(shorter.length);
      // Only allow if extra is just repeated last character (e.g., "ugly" + "y" = "uglyy")
      if (extra.length <= 2 && extra.split('').every(char => char === shorter[shorter.length - 1])) {
        return true;
      }
    }
  }
  
  // For same-length words, only match if differences are due to normalization
  // (leet speak, etc.) - NOT different letters
  if (textWord.length === phraseWord.length && lengthDiff === 0) {
    let differences = 0;
    for (let i = 0; i < textWord.length; i++) {
      if (textWord[i] !== phraseWord[i]) {
        differences++;
        // If more than 1 character difference, don't match
        // This prevents "race" from matching "rape" (c vs p)
        if (differences > maxDistance) return false;
      }
    }
    // Only match if differences are 0 (already handled) or if it's the same word
    // We're very strict here - single letter differences are NOT matches
    return false; // Changed: Don't match same-length words with character differences
  }
  
  return false;
}

/**
 * Check if a phrase matches with words potentially inserted between phrase words
 * Also handles obfuscation attempts like leet speak, repeated characters, spacing variations
 * Example: "you are ugly" should match:
 * - "you are very ugly" (word insertion)
 * - "y0u @re ug1y" (leet speak)
 * - "you are uggggly" (repeated characters)
 * - "you are u g l y" (spacing variations)
 */
function matchesPhraseWithInsertions(text: string, phrase: string): boolean {
  // Skip if phrase is empty or too short
  if (!phrase || phrase.trim().length < 2) {
    return false;
  }
  
  // Normalize both text and phrase to handle obfuscation
  const normalizedText = normalizeTextForMatching(text);
  const normalizedPhrase = normalizeTextForMatching(phrase);
  
  // Skip if normalization results in empty strings
  if (!normalizedText || !normalizedPhrase || normalizedText.trim().length === 0 || normalizedPhrase.trim().length === 0) {
    return false;
  }
  
  // Split into words
  const textWords = normalizedText.split(/\s+/).filter(word => word.length > 0);
  const phraseWords = normalizedPhrase.split(/\s+/).filter(word => word.length > 0);
  
  // Skip if no valid words after normalization
  if (phraseWords.length === 0) {
    return false;
  }
  
  // If phrase is single word, check with fuzzy matching
  if (phraseWords.length === 1) {
    const phraseWord = phraseWords[0];
    // Skip if phrase word is too short (less than 2 chars)
    if (phraseWord.length < 2) {
      return false;
    }
    // Check if any word in text matches (exact or fuzzy)
    for (const textWord of textWords) {
      if (textWord.length < 2) continue; // Skip very short words
      if (textWord === phraseWord || fuzzyWordMatch(textWord, phraseWord)) {
        return true;
      }
      // Also check if phrase word is contained in text word or vice versa (only if both are meaningful length)
      if (phraseWord.length >= 2 && textWord.length >= 2) {
        if (textWord.includes(phraseWord) || phraseWord.includes(textWord)) {
          return true;
        }
      }
    }
    return false;
  }
  
  // For multi-word phrases, check if all words appear in order
  // This allows words to be inserted between phrase words
  // Uses fuzzy matching for each word to handle obfuscation
  
  // List of very common words that should be ignored in phrase matching
  // to prevent false positives (e.g., "you" matching in "what race are you?")
  const commonWords = new Set(['you', 'are', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'where', 'when', 'why', 'how', 'who', 'which', 'that', 'this', 'these', 'those', 'i', 'me', 'my', 'we', 'us', 'our', 'he', 'she', 'it', 'they', 'them', 'their']);
  
  // Filter out common words from phrase matching (but still require them if they're the ONLY word)
  const significantPhraseWords = phraseWords.filter(word => 
    word.length >= 3 || !commonWords.has(word.toLowerCase())
  );
  
  // If all words are common, require at least one to match (but this shouldn't happen for real phrases)
  if (significantPhraseWords.length === 0 && phraseWords.length > 0) {
    // Fall back to requiring all words if phrase only contains common words
    // This handles edge cases but shouldn't match legitimate phrases
    significantPhraseWords.push(...phraseWords);
  }
  
  // If we filtered out too many words, the phrase is probably too generic
  if (significantPhraseWords.length === 0) {
    return false;
  }
  
  // Now check if all SIGNIFICANT words appear in order
  let phraseIndex = 0;
  for (let i = 0; i < textWords.length && phraseIndex < significantPhraseWords.length; i++) {
    const textWord = textWords[i];
    const phraseWord = significantPhraseWords[phraseIndex];
    
    // Skip very short words
    if (textWord.length < 2 || phraseWord.length < 2) {
      continue;
    }
    
    // STRICT: Only exact word matches for phrase matching (no substring matching)
    // This prevents "you" from matching in contexts where it shouldn't
    if (textWord === phraseWord || fuzzyWordMatch(textWord, phraseWord)) {
      phraseIndex++;
    }
  }
  
  // All significant phrase words must be found in order
  return phraseIndex === significantPhraseWords.length;
}

export async function checkBlockedKeywords(text: string): Promise<{
  found: boolean;
  keyword?: string;
  keywordId?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  message?: string;
}> {
  if (!text || !text.trim()) {
    return { found: false };
  }
  
  const keywords = await loadBlockedKeywords();
  const normalizedText = text.toLowerCase();
  
  // Pre-normalize the input text once for efficiency
  const normalizedInput = normalizeTextForMatching(text);
  const inputWords = normalizedInput ? normalizedInput.split(/\s+/).filter(w => w && w.length > 0) : [];
  
  for (const keywordData of keywords) {
    let matches = false;
    
    switch (keywordData.match_type) {
      case 'exact':
        // Skip very short keywords to prevent false positives
        const exactKeyword = keywordData.keyword.toLowerCase().trim();
        if (!exactKeyword || exactKeyword.length < 2) {
          matches = false;
        } else {
          matches = normalizedText === exactKeyword;
        }
        break;
      case 'contains':
        // Use smart matching that handles obfuscation and word insertions
        const keywordLower = keywordData.keyword.toLowerCase().trim();
        
        // Skip empty or very short keywords that would cause false positives
        if (!keywordLower || keywordLower.length < 2) {
          matches = false;
          break;
        }
        
        if (keywordLower.split(/\s+/).length > 1) {
          // Multi-word phrase: check if all words appear in order (allowing insertions)
          matches = matchesPhraseWithInsertions(text, keywordData.keyword);
        } else {
          // Single word: SIMPLIFIED approach - just check if the word appears as a whole word
          // This is more reliable and straightforward
          const keywordLower = keywordData.keyword.toLowerCase().trim();
          
          // Skip empty or very short keywords
          if (!keywordLower || keywordLower.length < 2) {
            matches = false;
            break;
          }
          
          // Skip very short keywords (less than 3 chars) to avoid false positives
          if (keywordLower.length < 3) {
            matches = false;
            break;
          }
          
          // SIMPLE: Use word boundary regex to find the keyword as a whole word
          // This matches "fuck" in "fuck you" but not "fuck" in "fucking" (unless we want that)
          // Word boundary \b ensures we match whole words only
          try {
            // Escape special regex characters in the keyword
            const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Check if keyword contains non-word characters (like asterisks, dashes, etc.)
            // If it does, we can't use word boundaries - just search for the literal string
            const hasNonWordChars = /[^\w]/.test(keywordLower);
            
            if (hasNonWordChars) {
              // For keywords with special characters (like "p***"), just search for the literal string
              // This matches "p***" in "p*** off" or anywhere in the text
              const literalRegex = new RegExp(escapedKeyword, 'i');
              matches = literalRegex.test(text);
            } else {
              // For normal words, use word boundaries to match whole words only
              // This matches "fuck" in "fuck you" but not "fuck" in "fucking"
              const wordBoundaryRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
              matches = wordBoundaryRegex.test(text);
            }
          } catch (error) {
            // If regex fails, fall back to simple string matching
            console.error("Regex error for keyword:", keywordLower, error);
            // Fallback: check if keyword appears anywhere in the text (case-insensitive)
            matches = text.toLowerCase().includes(keywordLower);
          }
        }
        break;
      case 'regex':
        try {
          const regex = new RegExp(keywordData.keyword, 'gi');
          matches = regex.test(text);
          regex.lastIndex = 0; // Reset regex
        } catch (error) {
          console.error("Invalid regex pattern:", keywordData.keyword);
        }
        break;
    }
    
    if (matches) {
        // Get custom message or generate default
        let message = keywordData.custom_message;
        if (!message) {
          message = await getDefaultMessage(keywordData.category);
        }
      
      return {
        found: true,
        keyword: keywordData.keyword,
        keywordId: keywordData.id,
        category: keywordData.category,
        severity: keywordData.severity,
        message,
      };
    }
  }
  
  return { found: false };
}

/**
 * Check if text contains blocked domains
 */
export async function checkBlockedDomains(text: string): Promise<{
  found: boolean;
  domain?: string;
  domainId?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  message?: string;
}> {
  if (!text || !text.trim()) {
    return { found: false };
  }
  
  const urls = extractUrls(text);
  const domains = await loadBlockedDomains();
  
  for (const url of urls) {
    const normalizedUrl = normalizeDomain(url);
    
    for (const domainData of domains) {
      const normalizedBlocked = domainData.domain.toLowerCase();
      
      // Exact match or subdomain match
      if (normalizedUrl === normalizedBlocked || normalizedUrl.endsWith('.' + normalizedBlocked)) {
        // Get custom message or generate default
        let message = domainData.custom_message;
        if (!message) {
          message = await getDefaultMessage(domainData.category);
        }
        
        return {
          found: true,
          domain: domainData.domain,
          domainId: domainData.id,
          category: domainData.category,
          severity: domainData.severity,
          message,
        };
      }
    }
  }
  
  return { found: false };
}

/**
 * Load category default messages from database (with caching)
 */
async function loadCategoryMessages(): Promise<Record<string, string>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (categoriesCache && (now - categoriesCacheTimestamp) < CACHE_DURATION) {
    return categoriesCache;
  }
  
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_moderation_categories');
    
    if (error) {
      console.error("Error loading category messages:", error);
      return categoriesCache || getFallbackMessages();
    }
    
    // Build cache from database
    const messages: Record<string, string> = {};
    if (data) {
      for (const cat of data) {
        if (cat.is_active && cat.default_message) {
          messages[cat.name] = cat.default_message;
        }
      }
    }
    
    categoriesCache = messages;
    categoriesCacheTimestamp = now;
    return messages;
  } catch (error) {
    console.error("Error loading category messages:", error);
    return categoriesCache || getFallbackMessages();
  }
}

/**
 * Fallback messages (used if database fetch fails)
 */
function getFallbackMessages(): Record<string, string> {
  return {
    violence: 'Content containing references to violence, threats, or harm is not permitted.',
    hate_speech: 'Hate speech and discriminatory content is not allowed on our platform.',
    bullying: 'Bullying and harassment are not tolerated. Please treat others with respect.',
    sexual_harassment: 'Sexual harassment and inappropriate sexual content is strictly prohibited.',
    self_harm: 'Content promoting self-harm or suicide is not permitted. If you need help, please reach out to support services.',
    offensive_language: 'Offensive language and slurs are not allowed. Please communicate respectfully.',
    doxxing: 'Doxxing and privacy violations are strictly prohibited.',
    homophobia: 'Homophobia, transphobia, and discrimination against LGBTQ+ individuals is not tolerated. We support and respect all sexual orientations and gender identities.',
    body_shaming: 'Body shaming and appearance-based discrimination is not allowed. Please be respectful of others regardless of their appearance.',
    gender_discrimination: 'Gender-based discrimination, sexism, and misogyny are not permitted. We promote equality and respect for all genders.',
    racism: 'Racist language, slurs, and discriminatory content based on race or ethnicity are strictly prohibited.',
    drugs: 'Content promoting, selling, or discussing illegal drugs or substance abuse is not permitted on our platform.',
    adult_content: 'Adult content, explicit sexual material, or inappropriate content is not allowed on our platform.',
    illegal_activities: 'Content promoting, describing, or facilitating illegal activities is strictly prohibited.',
    spam: 'Spam content is not allowed. Please ensure your message is relevant and meaningful.',
    scam: 'Scam content is strictly prohibited. Please do not attempt to deceive or defraud others.',
    gambling: 'Gambling content and links to gambling websites are not permitted.',
    phishing: 'Phishing and malicious content is strictly prohibited.',
    malware: 'Malware and potentially harmful content is not allowed.',
    hate_site: 'Hate speech and discriminatory content is not allowed on our platform.',
    other: 'This content violates our community guidelines.',
  };
}

/**
 * Get default message for a category (global - works for both keywords and domains)
 * Fetches from database with caching
 */
export async function getDefaultMessage(category: string): Promise<string> {
  const messages = await loadCategoryMessages();
  const fallback = getFallbackMessages();
  return messages[category] || fallback[category] || fallback.other;
}

/**
 * Combined check for both blocked keywords and domains
 * Returns detailed information for logging purposes
 */
export async function checkContentSafety(text: string): Promise<{
  isSafe: boolean;
  reason?: string;
  category?: string;
  matchedKeyword?: string;
  matchedDomain?: string;
  severity?: 'low' | 'medium' | 'high';
  keywordId?: string;
  domainId?: string;
}> {
  // First check for blocked domains
  const domainCheck = await checkBlockedDomains(text);
  
  if (domainCheck.found) {
      return {
        isSafe: false,
        reason: domainCheck.message || 'Your content contains a link to a blocked website.',
        category: domainCheck.category || 'blocked_domain',
        matchedDomain: domainCheck.domain,
        domainId: domainCheck.domainId,
        severity: domainCheck.severity,
      };
  }
  
  // Then check for blocked keywords
  const keywordCheck = await checkBlockedKeywords(text);
  
  if (keywordCheck.found) {
      return {
        isSafe: false,
        reason: keywordCheck.message || 'Your content violates our community guidelines.',
        category: keywordCheck.category || 'blocked_keyword',
        matchedKeyword: keywordCheck.keyword,
        keywordId: keywordCheck.keywordId,
        severity: keywordCheck.severity,
      };
  }
  
  return { isSafe: true };
}

/**
 * Log a blocked content attempt to the database
 */
export async function logBlockedAttempt(data: {
  userId: string;
  contentType: 'post' | 'comment' | 'share_comment' | 'message' | 'other';
  attemptedContent: string;
  matchedKeyword?: string;
  matchedDomain?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  messageShown?: string;
  contextUrl?: string;
  keywordId?: string;
  domainId?: string;
}): Promise<void> {
  try {
    const supabase = createClient();
    
    // Get keyword/domain IDs if we have the matched text
    let keywordId: string | null = null;
    let domainId: string | null = null;
    
    if (data.matchedKeyword) {
      const { data: keywordData } = await supabase
        .from('blocked_keywords')
        .select('id')
        .eq('keyword', data.matchedKeyword)
        .eq('is_active', true)
        .maybeSingle();
      keywordId = keywordData?.id || null;
    }
    
    if (data.matchedDomain) {
      const { data: domainData } = await supabase
        .from('blocked_domains')
        .select('id')
        .eq('domain', data.matchedDomain)
        .eq('is_active', true)
        .maybeSingle();
      domainId = domainData?.id || null;
    }
    
    // Use provided IDs first, then try to look them up
    const finalKeywordId = data.keywordId || keywordId || null;
    const finalDomainId = data.domainId || domainId || null;
    
    const { error } = await supabase
      .from('blocked_content_attempts')
      .insert({
        user_id: data.userId,
        content_type: data.contentType,
        attempted_content: data.attemptedContent,
        blocked_keyword_id: finalKeywordId,
        blocked_domain_id: finalDomainId,
        matched_keyword: data.matchedKeyword || null,
        matched_domain: data.matchedDomain || null,
        category: data.category || null,
        severity: data.severity || null,
        message_shown: data.messageShown || null,
        context_url: data.contextUrl || null,
      });
    
    if (error) {
      console.error("Error logging blocked attempt:", error);
      // Don't throw - logging failures shouldn't break the user experience
    }
  } catch (error) {
    console.error("Error logging blocked attempt:", error);
    // Silently fail - logging is not critical
  }
}

/**
 * Clear the cache (useful when admins update keywords/domains/categories)
 */
export function clearModerationCache() {
  keywordsCache = null;
  domainsCache = null;
  categoriesCache = null;
  cacheTimestamp = 0;
  categoriesCacheTimestamp = 0;
}

