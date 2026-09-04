"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  BookOpen, 
  Search,
  Menu,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
  Star
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

interface DocumentationCategory {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  icon_name?: string | null;
}

interface DocumentationPage {
  id: string;
  category_id?: string | null;
  title: string;
  slug: string;
  content: string;
  description?: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

interface DocumentationChapter {
  id: string;
  category_id: string;
  title: string;
  description?: string | null;
  display_order: number;
}

interface DocumentationSection {
  id: string;
  chapter_id: string;
  page_id: string;
  title: string;
  display_order: number;
}

export default function DocsPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<DocumentationCategory[]>([]);
  const [pages, setPages] = useState<DocumentationPage[]>([]);
  const [chapters, setChapters] = useState<DocumentationChapter[]>([]);
  const [sections, setSections] = useState<DocumentationSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewCountIncremented, setViewCountIncremented] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDocumentation();
  }, []);

  // Separate function for view count increment to avoid duplicate calls
  const handlePageViewIncrement = async (pageId: string, force: boolean = false) => {
    // Prevent duplicate increments unless forced
    if (!force && viewCountIncremented.has(pageId)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('increment_documentation_page_view', { p_page_id: pageId });
      if (error) {
        console.error("Error incrementing view count:", error);
      } else {
        // Mark as incremented
        setViewCountIncremented(prev => new Set(prev).add(pageId));
        
        // Reload pages to get updated view count
        const { data: updatedPages } = await supabase
          .from('documentation_pages')
          .select('*')
          .eq('is_published', true)
          .order('display_order', { ascending: true });
        if (updatedPages) {
          setPages(updatedPages);
        }
      }
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  };

  // Check URL for slug parameter when searchParams change
  useEffect(() => {
    const slug = searchParams.get('page');
    if (slug && pages.length > 0) {
      const page = pages.find(p => p.slug === slug);
      if (page && page.id !== activePageId) {
        // Update page and navigation state
        setActivePageId(page.id);
        
        // Find and set the category and chapter
        if (page.category_id) {
          setActiveSection(page.category_id);
          const pageChapter = chapters.find(c => c.category_id === page.category_id);
          if (pageChapter) {
            setActiveChapter(pageChapter.id);
          }
        }
        
        // Increment view count for new page (reset the increment tracking)
        setViewCountIncremented(prev => {
          const newSet = new Set(prev);
          newSet.delete(page.id); // Remove from set so it can be incremented
          return newSet;
        });
        handlePageViewIncrement(page.id);
      } else if (page && page.id === activePageId && !viewCountIncremented.has(page.id)) {
        // Same page but not yet incremented (e.g., on initial load)
        handlePageViewIncrement(page.id);
      }
    }
  }, [searchParams, pages, chapters]);

  const loadDocumentation = async () => {
    try {
      setLoading(true);
      
      // Load all published documentation
      const [categoriesRes, pagesRes, chaptersRes, sectionsRes] = await Promise.all([
        supabase
          .from('documentation_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('documentation_pages')
          .select('id, category_id, title, slug, content, description, display_order, is_featured, created_at, updated_at')
          .eq('is_published', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('documentation_chapters')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('documentation_sections')
          .select('*')
          .order('display_order', { ascending: true })
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (pagesRes.error) throw pagesRes.error;
      if (chaptersRes.error) throw chaptersRes.error;
      if (sectionsRes.error) throw sectionsRes.error;

      const loadedCategories = categoriesRes.data || [];
      const loadedPages = pagesRes.data || [];
      const loadedChapters = chaptersRes.data || [];
      const loadedSections = sectionsRes.data || [];

      setCategories(loadedCategories);
      setPages(loadedPages);
      setChapters(loadedChapters);
      setSections(loadedSections);

      // Set initial active section/chapter/page
      // Check if URL has a page parameter first
      const urlSlug = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('page') : null;
      
      if (urlSlug) {
        // URL has a slug, find the page
        const page = loadedPages.find(p => p.slug === urlSlug);
        if (page) {
          setActivePageId(page.id);
          if (page.category_id) {
            setActiveSection(page.category_id);
            const pageChapter = loadedChapters.find(c => c.category_id === page.category_id);
            if (pageChapter) {
              setActiveChapter(pageChapter.id);
            }
          }
          // Don't increment here - let the useEffect handle it to avoid duplicates
        }
      } else if (loadedCategories.length > 0) {
        // No URL parameter, set first available page
        const firstCategory = loadedCategories[0];
        setActiveSection(firstCategory.id);
        
        const firstChapter = loadedChapters.find(c => c.category_id === firstCategory.id);
        if (firstChapter) {
          setActiveChapter(firstChapter.id);
          
          const firstSection = loadedSections.find(s => s.chapter_id === firstChapter.id);
          if (firstSection) {
            const firstPage = loadedPages.find(p => p.id === firstSection.page_id);
            if (firstPage) {
              setActivePageId(firstPage.id);
              // Update URL with first page slug
              router.push(`/docs?page=${firstPage.slug}`, { scroll: false });
            }
          } else {
            // If no sections, find first page in category
            const firstPage = loadedPages.find(p => p.category_id === firstCategory.id);
            if (firstPage) {
              setActivePageId(firstPage.id);
              router.push(`/docs?page=${firstPage.slug}`, { scroll: false });
            }
          }
        } else {
          // If no chapters, find first page in category
          const firstPage = loadedPages.find(p => p.category_id === firstCategory.id);
          if (firstPage) {
            setActivePageId(firstPage.id);
            router.push(`/docs?page=${firstPage.slug}`, { scroll: false });
          }
        }
      }
    } catch (error) {
      console.error("Error loading documentation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageClick = async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    // Don't do anything if this page is already active
    if (activePageId === pageId) return;

    // Update URL first - this will trigger the useEffect to handle state updates
    const newUrl = `/docs${page.slug ? `?page=${page.slug}` : ''}`;
    router.push(newUrl, { scroll: false });
    
    // Also update state immediately for better UX (no delay)
    setActivePageId(pageId);
    
    // Find and set the category and chapter immediately
    if (page.category_id) {
      setActiveSection(page.category_id);
      const pageChapter = chapters.find(c => c.category_id === page.category_id);
      if (pageChapter) {
        setActiveChapter(pageChapter.id);
      }
    }

    // Reset increment tracking for this page and increment
    setViewCountIncremented(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageId); // Remove so it can be incremented
      return newSet;
    });
    handlePageViewIncrement(pageId);
  };

  const filteredCategories = categories.filter(cat => {
    if (!searchQuery) return true;
    const categoryPages = pages.filter(p => p.category_id === cat.id);
    const categoryChapters = chapters.filter(c => c.category_id === cat.id);
    return (
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryPages.some(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      categoryChapters.some(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  });

  const currentPage = pages.find(p => p.id === activePageId);
  const currentCategory = categories.find(c => c.id === activeSection);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation</h1>
              </div>
            </div>
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <nav className="space-y-2">
                {filteredCategories.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No documentation available</p>
                ) : (
                  filteredCategories.map((category) => {
                    const categoryChapters = chapters.filter(c => c.category_id === category.id);
                    const categoryPages = pages.filter(p => p.category_id === category.id);
                    const isActive = activeSection === category.id;
                    const isExpanded = isActive;

                    return (
                      <div key={category.id} className="space-y-1">
                        <button
                          onClick={() => {
                            setActiveSection(isActive ? null : category.id);
                            if (!isActive && categoryChapters.length > 0) {
                              setActiveChapter(categoryChapters[0].id);
                              const firstSection = sections.find(s => s.chapter_id === categoryChapters[0].id);
                              if (firstSection) {
                                setActivePageId(firstSection.page_id);
                              }
                            } else if (!isActive && categoryPages.length > 0) {
                              setActivePageId(categoryPages[0].id);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {category.name}
                          </span>
                          {(categoryChapters.length > 0 || categoryPages.length > 0) && (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )
                          )}
                        </button>

                        {isExpanded && (
                          <div className="ml-4 space-y-1 mt-1">
                            {categoryChapters.map((chapter) => {
                              const chapterSections = sections.filter(s => s.chapter_id === chapter.id);
                              const chapterPages = chapterSections
                                .map(s => pages.find(p => p.id === s.page_id))
                                .filter(Boolean) as DocumentationPage[];
                              const isChapterActive = activeChapter === chapter.id;

                              return (
                                <div key={chapter.id} className="space-y-1">
                                  <button
                                    onClick={() => {
                                      setActiveChapter(isChapterActive ? null : chapter.id);
                                      if (!isChapterActive && chapterPages.length > 0) {
                                        setActivePageId(chapterPages[0].id);
                                      }
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                                      isChapterActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <span>{chapter.title}</span>
                                    {chapterPages.length > 0 && (
                                      isChapterActive ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )
                                    )}
                                  </button>

                                  {isChapterActive && chapterPages.length > 0 && (
                                    <div className="ml-4 space-y-1">
                                      {chapterPages.map((page) => (
                                        <button
                                          key={page.id}
                                          onClick={() => handlePageClick(page.id)}
                                          className={`w-full px-3 py-1.5 rounded text-left text-sm transition-colors ${
                                            activePageId === page.id
                                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            {page.is_featured && <Star className="w-3 h-3 text-yellow-500" />}
                                            {page.title}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Pages without chapters */}
                            {categoryChapters.length === 0 && categoryPages.map((page) => (
                              <button
                                key={page.id}
                                onClick={() => handlePageClick(page.id)}
                                className={`w-full px-3 py-2 rounded text-left text-sm transition-colors ${
                                  activePageId === page.id
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {page.is_featured && <Star className="w-3 h-3 text-yellow-500" />}
                                  {page.title}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {currentPage ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {currentPage.is_featured && <Star className="w-5 h-5 text-yellow-500" />}
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {currentPage.title}
                    </h1>
                  </div>
                  {currentPage.description && (
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      {currentPage.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {currentCategory && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {currentCategory.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span>Created:</span>
                      <span className="font-medium">
                        {new Date(currentPage.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">
                        (<RelativeTime date={currentPage.created_at} />)
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span>Last updated:</span>
                      <RelativeTime date={currentPage.updated_at} className="font-medium" />
                    </span>
                  </div>
                </div>
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentPage.content }}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No page selected
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a page from the sidebar to view its content
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
