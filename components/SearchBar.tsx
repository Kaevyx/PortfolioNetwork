"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Search, X, User, Briefcase, CheckCircle2, Hash, Star } from "lucide-react";
import { AvatarImage } from "./AvatarImage";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface SearchResult {
  id: string;
  clerk_id: string;
  username?: string | null;
  display_name: string;
  profile_type: string;
  bio?: string;
  is_verified: boolean;
  avatar_url?: string | null;
  featured_priority?: number | null;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchProfiles = async () => {
      setLoading(true);
      try {
        // Check if query is a hashtag (starts with #)
        const isHashtag = query.trim().startsWith('#');
        const cleanQuery = isHashtag ? query.trim().substring(1) : query.trim();

        // Get all approved and non-suspended profiles first
        const { data: allProfiles, error } = await supabase
          .from("profiles")
          .select("id, clerk_id, username, display_name, profile_type, bio, is_verified, avatar_url, settings, featured_priority, subscription_plan")
          .eq("profile_status", "approved") // Only show approved profiles
          .eq("is_suspended", false) // Exclude suspended users
          .or(`display_name.ilike.%${cleanQuery}%,bio.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%`)
          .limit(20);

        if (error) throw error;

        // Filter out profiles that have allowSearch disabled
        const filteredProfiles = (allProfiles || []).filter((profile) => {
          const allowSearch = profile.settings?.privacy?.allowSearch !== false;
          return allowSearch;
        });

        // Sort by featured priority (higher first), then alphabetically
        filteredProfiles.sort((a, b) => {
          const aPriority = a.featured_priority || 0;
          const bPriority = b.featured_priority || 0;
          if (bPriority !== aPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          // If same priority, sort alphabetically
          return (a.display_name || "").localeCompare(b.display_name || "");
        });

        const limitedResults = filteredProfiles.slice(0, 8);
        // Debug: Log avatar URLs to help diagnose
        if (limitedResults.length > 0) {
          console.log("Search results with avatars:", limitedResults.map(r => ({
            name: r.display_name,
            hasAvatar: !!r.avatar_url,
            avatarUrl: r.avatar_url
          })));
        }
        setResults(limitedResults);
        setIsOpen(filteredProfiles.length > 0 || isHashtag);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProfiles, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, supabase]);

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          placeholder="Search profiles, skills, services..."
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : (
            <>
              {/* Hashtag search result */}
              {query.trim().startsWith('#') && (
                <Link
                  href={`/hashtag/${encodeURIComponent(query.trim().substring(1).toLowerCase())}`}
                  onClick={() => {
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-shrink-0">
                    <Hash className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {query.trim()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      View posts with this hashtag
                    </p>
                  </div>
                </Link>
              )}
              
              {/* Profile results */}
              {results.length > 0 && (
                <div className="py-2">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      href={getProfileUrl({ username: result.username, clerk_id: result.clerk_id })}
                      onClick={() => {
                        setQuery("");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-shrink-0 relative">
                        <AvatarImage
                          src={result.avatar_url || undefined}
                          alt={result.display_name}
                          fallbackText={result.display_name?.charAt(0).toUpperCase() || "U"}
                          className="border border-gray-200 dark:border-gray-600"
                          size="sm"
                          userId={result.clerk_id}
                          eager={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {result.display_name}
                          </p>
                          {result.is_verified && (
                            <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          )}
                          {result.featured_priority != null && result.featured_priority > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                              <Star className="w-3 h-3 fill-current" />
                              {result.featured_priority >= 100 ? "Featured" : "Pro"}
                            </span>
                          )}
                        </div>
                        {result.bio && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {result.bio}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {!query.trim().startsWith('#') && results.length === 0 && query && (
                <div className="p-4 text-center text-gray-500">No results found</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

