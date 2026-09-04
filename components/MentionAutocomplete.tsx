"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Check } from "lucide-react";
import { AvatarImage } from "./AvatarImage";

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (mention: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

interface UserProfile {
  clerk_id: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
  is_verified?: boolean;
}

export function MentionAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  className,
  inputRef,
}: MentionAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Find mention position in text
  const findMentionPosition = useCallback((text: string, cursorPos: number): { start: number; query: string } | null => {
    // Look backwards from cursor position for @ symbol
    let start = cursorPos - 1;
    while (start >= 0 && text[start] !== '@' && text[start] !== ' ' && text[start] !== '\n') {
      start--;
    }
    
    if (start >= 0 && text[start] === '@') {
      // Check if there's a space before @ (valid mention start)
      const beforeAt = start === 0 || text[start - 1] === ' ' || text[start - 1] === '\n';
      if (beforeAt) {
        // Extract the query (text after @)
        const query = text.substring(start + 1, cursorPos).trim();
        // Only show suggestions if query doesn't contain spaces and is valid
        if (!query.includes(' ') && !query.includes('\n')) {
          return { start, query };
        }
      }
    }
    
    return { start: -1, query: "" };
  }, []);

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const searchPattern = `%${query}%`;
      
      // Search by display_name, email, and username
      const [displayNameResults, emailResults, usernameResults] = await Promise.all([
        supabase
          .from('profiles')
          .select('clerk_id, username, display_name, email, avatar_url, is_verified')
          .ilike('display_name', searchPattern)
          .eq('profile_status', 'approved')
          .eq('is_suspended', false)
          .limit(10),
        supabase
          .from('profiles')
          .select('clerk_id, username, display_name, email, avatar_url, is_verified')
          .ilike('email', searchPattern)
          .eq('profile_status', 'approved')
          .eq('is_suspended', false)
          .limit(10),
        supabase
          .from('profiles')
          .select('clerk_id, username, display_name, email, avatar_url, is_verified')
          .ilike('username', searchPattern)
          .eq('profile_status', 'approved')
          .eq('is_suspended', false)
          .limit(10)
      ]);

      // Combine and deduplicate
      const allProfiles: UserProfile[] = [];
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

      if (usernameResults.data) {
        usernameResults.data.forEach(p => {
          if (!seenIds.has(p.clerk_id)) {
            allProfiles.push(p);
            seenIds.add(p.clerk_id);
          }
        });
      }

      // Sort: exact matches first, then by display_name
      const queryLower = query.toLowerCase();
      allProfiles.sort((a, b) => {
        const aExact = a.display_name?.toLowerCase().startsWith(queryLower);
        const bExact = b.display_name?.toLowerCase().startsWith(queryLower);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

      setSuggestions(allProfiles.slice(0, 8));
      setShowSuggestions(allProfiles.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Select a mention
  const selectMention = useCallback((user: UserProfile) => {
    if (mentionStart === null) return;

    const displayName = user.display_name || user.email || 'User';
    const mentionText = `@${displayName}`;
    
    // Replace the mention query with the selected mention
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(mentionStart + 1 + mentionQuery.length);
    const newValue = beforeMention + mentionText + ' ' + afterMention;
    
    onChange(newValue);
    onSelect(mentionText);
    
    // Set cursor position after the mention
    setTimeout(() => {
      const input = inputRef?.current;
      if (input) {
        const newPos = mentionStart + mentionText.length + 1;
        input.setSelectionRange(newPos, newPos);
        input.focus();
      }
    }, 0);
    
    setShowSuggestions(false);
    setMentionStart(null);
    setMentionQuery("");
  }, [mentionStart, mentionQuery, value, onChange, onSelect, inputRef]);

  // Monitor value and cursor position changes to detect mentions
  useEffect(() => {
    const input = inputRef?.current;
    if (!input || disabled) {
      setShowSuggestions(false);
      return;
    }
    
    // Use a small delay to ensure cursor position is updated
    const timer = setTimeout(() => {
      const cursorPos = input.selectionStart || value.length;
      const mentionPos = findMentionPosition(value, cursorPos);
      
      if (mentionPos && mentionPos.start >= 0) {
        setMentionStart(mentionPos.start);
        setMentionQuery(mentionPos.query);
        searchUsers(mentionPos.query);
      } else {
        setShowSuggestions(false);
        setMentionStart(null);
        setMentionQuery("");
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [value, findMentionPosition, searchUsers, inputRef, disabled]);

  // Handle keyboard navigation for suggestions
  useEffect(() => {
    const input = inputRef?.current;
    if (!input || !showSuggestions || suggestions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== input) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowSuggestions(false);
      }
    };

    input.addEventListener('keydown', handleKeyDown, true);
    return () => input.removeEventListener('keydown', handleKeyDown, true);
  }, [showSuggestions, suggestions, selectedIndex, inputRef, selectMention]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputRef]);

  return (
    <div className="relative w-full">
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto w-full"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '200px',
          }}
        >
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : (
            suggestions.map((user, index) => (
              <button
                key={user.clerk_id}
                type="button"
                onClick={() => selectMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                  index === selectedIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <AvatarImage
                  src={user.avatar_url}
                  alt={user.display_name || user.email}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.display_name || user.email}
                    </span>
                    {user.is_verified && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    )}
                  </div>
                  {user.display_name && user.email && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                      {user.email}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

