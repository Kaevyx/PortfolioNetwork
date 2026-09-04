"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { SearchBar } from "./SearchBar";
import { NotificationBell } from "./NotificationBell";
import { InboxBell } from "./InboxBell";
import { BarChart3, Settings, Shield, ChevronDown, Users, Network, TrendingUp, Bookmark, LayoutGrid, BookOpen, Hash, Activity, FileText, Map, MessageSquare, Calendar } from "lucide-react";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";

export function Navbar() {
  const { isSignedIn, user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const networkDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { isSuspended } = useSuspensionCheck();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isSignedIn || !user?.id) {
        setIsAdmin(false);
        setPendingCount(0);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("clerk_id", user.id)
          .single();

        const adminStatus = data?.is_admin || false;
        setIsAdmin(adminStatus);

        // If admin, get pending counts
        if (adminStatus) {
          const [verifications, files, profiles, reports] = await Promise.all([
            supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("storage_files").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_status", "pending"),
            supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
          ]);

          const totalPending = (verifications.count || 0) + (files.count || 0) + (profiles.count || 0) + (reports.count || 0);
          setPendingCount(totalPending);
        }
      } catch (error) {
        setIsAdmin(false);
        setPendingCount(0);
      }
    };

    if (isSignedIn) {
      checkAdmin();
    }
  }, [isSignedIn, user?.id, supabase]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
        setShowNetworkDropdown(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <Link 
            href="/" 
            className="text-xl font-bold gradient-text hover:opacity-80 transition-opacity"
          >
            Portfolio Network
          </Link>
          
          {isSignedIn && !isSuspended && (
            <div className="flex-1 max-w-xl mx-4">
              <SearchBar />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden lg:block px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                >
                  Dashboard
                </Link>
                {!isSuspended && (
                  <>
                    <Link
                      href="/feed"
                      className="hidden lg:block px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                    >
                      Feed
                    </Link>
                    
                    {/* Network Dropdown */}
                    <div className="relative hidden lg:block" ref={networkDropdownRef}>
                      <button
                        onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                      >
                        <Network className="w-4 h-4" />
                        Network
                        <ChevronDown className={`w-3 h-3 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showNetworkDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                          <Link
                            href="/connections"
                            onClick={() => setShowNetworkDropdown(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            Connections
                          </Link>
                          <Link
                            href="/explore"
                            onClick={() => setShowNetworkDropdown(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Network className="w-4 h-4" />
                            Explore
                          </Link>
                          <Link
                            href="/portfolio"
                            onClick={() => setShowNetworkDropdown(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <LayoutGrid className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Discover Dropdown - Only show Support and Status for suspended users */}
                    {!isSuspended ? (
                      <div className="relative hidden xl:block" ref={moreDropdownRef}>
                        <button
                          onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                        >
                          Discover
                          <ChevronDown className={`w-3 h-3 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showMoreDropdown && (
                          <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                            <Link
                              href="/trending"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <TrendingUp className="w-4 h-4" />
                              Trending
                            </Link>
                            <Link
                              href="/bookmarks"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <Bookmark className="w-4 h-4" />
                              Saved
                            </Link>
                            <Link
                              href="/docs"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <BookOpen className="w-4 h-4" />
                              Documentation
                            </Link>
                            <Link
                              href="/hashtags"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <Hash className="w-4 h-4" />
                              All Hashtags
                            </Link>
                            <Link
                              href="/changelog"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Changelog
                            </Link>
                            <Link
                              href="/scheduled-posts"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <Calendar className="w-4 h-4" />
                              Scheduled Posts
                            </Link>
                            <Link
                              href="/support"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Support
                            </Link>
                            <Link
                              href="/status"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <Activity className="w-4 h-4" />
                              Status
                            </Link>
                            <Link
                              href="/roadmap"
                              onClick={() => setShowMoreDropdown(false)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            >
                              <Map className="w-4 h-4" />
                              Roadmap
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Link
                          href="/support"
                          className="hidden xl:block px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                        >
                          Support
                        </Link>
                        <Link
                          href="/status"
                          className="hidden xl:block px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                        >
                          Status
                        </Link>
                      </>
                    )}
                  </>
                )}

                {/* Show individual links on smaller screens */}
                {!isSuspended && (
                  <>
                    <Link
                      href="/connections"
                      className="lg:hidden px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                    >
                      Connections
                    </Link>
                    <Link
                      href="/trending"
                      className="xl:hidden px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                    >
                      Trending
                    </Link>
                    <Link
                      href="/bookmarks"
                      className="xl:hidden px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                    >
                      Saved
                    </Link>
                  </>
                )}
                {isSuspended && (
                  <>
                    <Link
                      href="/support"
                      className="xl:hidden px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors font-medium"
                    >
                      Support
                    </Link>
                  </>
                )}

                {!isSuspended && (
                  <Link
                    href="/analytics"
                    className="p-1.5 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Analytics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Link>
                )}
                <Link
                  href="/settings"
                  className="p-1.5 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="relative p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Admin Dashboard"
                  >
                    <Shield className="w-4 h-4" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </Link>
                )}
                {!isSuspended && <InboxBell />}
                <NotificationBell />
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <div className="flex gap-2">
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="px-3 py-1.5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow">
                    Sign Up
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

