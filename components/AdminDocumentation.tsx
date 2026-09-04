"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Globe, 
  Save,
  FolderTree,
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Star
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

interface DocumentationCategory {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  icon_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface DocumentationPage {
  id: string;
  category_id?: string | null;
  title: string;
  slug: string;
  content: string;
  description?: string | null;
  display_order: number;
  is_published: boolean;
  is_featured: boolean;
  published_at?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  view_count: number;
}

interface DocumentationChapter {
  id: string;
  category_id: string;
  title: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface AdminDocumentationProps {
  supabase: any;
  currentUserId: string;
}

export function AdminDocumentation({ supabase, currentUserId }: AdminDocumentationProps) {
  const [categories, setCategories] = useState<DocumentationCategory[]>([]);
  const [pages, setPages] = useState<DocumentationPage[]>([]);
  const [chapters, setChapters] = useState<DocumentationChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'categories' | 'pages' | 'chapters'>('pages');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentationCategory | null>(null);
  const [editingPage, setEditingPage] = useState<DocumentationPage | null>(null);
  const [editingChapter, setEditingChapter] = useState<DocumentationChapter | null>(null);
  const [viewingPage, setViewingPage] = useState<DocumentationPage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    icon_name: 'BookOpen',
    is_active: true,
  });

  const [pageFormData, setPageFormData] = useState({
    category_id: '',
    title: '',
    slug: '',
    content: '',
    description: '',
    display_order: 0,
    is_published: false,
    is_featured: false,
  });

  const [chapterFormData, setChapterFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        loadPages(),
        loadChapters(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('documentation_categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    setCategories(data || []);
  };

  const loadPages = async () => {
    const { data, error } = await supabase
      .from('documentation_pages')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    setPages(data || []);
  };

  const loadChapters = async () => {
    const { data, error } = await supabase
      .from('documentation_chapters')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    setChapters(data || []);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData: any = {
        ...categoryFormData,
        created_by: currentUserId,
      };

      if (editingCategory) {
        categoryData.updated_by = currentUserId;
        const { error } = await supabase
          .from('documentation_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documentation_categories')
          .insert(categoryData);
        if (error) throw error;
      }

      await loadCategories();
      resetCategoryForm();
      setShowCategoryModal(false);
    } catch (error: any) {
      console.error("Error saving category:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handlePageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Auto-generate slug if empty
      const slug = pageFormData.slug || generateSlug(pageFormData.title);

      // Check if slug already exists (excluding current page if editing)
      const { data: existing } = await supabase
        .from('documentation_pages')
        .select('id')
        .eq('slug', slug)
        .neq('id', editingPage?.id || '00000000-0000-0000-0000-000000000000')
        .single();

      if (existing) {
        alert('A page with this slug already exists. Please use a different title or slug.');
        return;
      }

      const pageData: any = {
        ...pageFormData,
        slug,
        created_by: currentUserId,
      };

      if (editingPage) {
        pageData.updated_by = currentUserId;
        if (pageFormData.is_published && !editingPage.is_published) {
          pageData.published_at = new Date().toISOString();
          pageData.published_by = currentUserId;
        }
        const { error } = await supabase
          .from('documentation_pages')
          .update(pageData)
          .eq('id', editingPage.id);
        if (error) throw error;
      } else {
        if (pageFormData.is_published) {
          pageData.published_at = new Date().toISOString();
          pageData.published_by = currentUserId;
        }
        const { error } = await supabase
          .from('documentation_pages')
          .insert(pageData);
        if (error) throw error;
      }

      await loadPages();
      resetPageForm();
      setShowPageModal(false);
    } catch (error: any) {
      console.error("Error saving page:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const chapterData: any = {
        ...chapterFormData,
        created_by: currentUserId,
      };

      if (editingChapter) {
        chapterData.updated_by = currentUserId;
        const { error } = await supabase
          .from('documentation_chapters')
          .update(chapterData)
          .eq('id', editingChapter.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documentation_chapters')
          .insert(chapterData);
        if (error) throw error;
      }

      await loadChapters();
      resetChapterForm();
      setShowChapterModal(false);
    } catch (error: any) {
      console.error("Error saving chapter:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Pages in this category will be unassigned.')) return;
    try {
      const { error } = await supabase
        .from('documentation_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      const { error } = await supabase
        .from('documentation_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadPages();
    } catch (error: any) {
      console.error("Error deleting page:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;
    try {
      const { error } = await supabase
        .from('documentation_chapters')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadChapters();
    } catch (error: any) {
      console.error("Error deleting chapter:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleTogglePublish = async (page: DocumentationPage) => {
    try {
      const updateData: any = {
        is_published: !page.is_published,
        updated_by: currentUserId,
      };

      if (!page.is_published) {
        updateData.published_at = new Date().toISOString();
        updateData.published_by = currentUserId;
      } else {
        updateData.published_at = null;
        updateData.published_by = null;
      }

      const { error } = await supabase
        .from('documentation_pages')
        .update(updateData)
        .eq('id', page.id);
      if (error) throw error;
      await loadPages();
    } catch (error: any) {
      console.error("Error toggling publish:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      display_order: 0,
      icon_name: 'BookOpen',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const resetPageForm = () => {
    setPageFormData({
      category_id: '',
      title: '',
      slug: '',
      content: '',
      description: '',
      display_order: 0,
      is_published: false,
      is_featured: false,
    });
    setEditingPage(null);
  };

  const resetChapterForm = () => {
    setChapterFormData({
      category_id: '',
      title: '',
      description: '',
      display_order: 0,
      is_active: true,
    });
    setEditingChapter(null);
  };

  const handleEditCategory = (category: DocumentationCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
      icon_name: category.icon_name || 'BookOpen',
      is_active: category.is_active,
    });
    setShowCategoryModal(true);
  };

  const handleEditPage = (page: DocumentationPage) => {
    setEditingPage(page);
    setPageFormData({
      category_id: page.category_id || '',
      title: page.title,
      slug: page.slug,
      content: page.content,
      description: page.description || '',
      display_order: page.display_order,
      is_published: page.is_published,
      is_featured: page.is_featured,
    });
    setShowPageModal(true);
  };

  const handleEditChapter = (chapter: DocumentationChapter) => {
    setEditingChapter(chapter);
    setChapterFormData({
      category_id: chapter.category_id,
      title: chapter.title,
      description: chapter.description || '',
      display_order: chapter.display_order,
      is_active: chapter.is_active,
    });
    setShowChapterModal(true);
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = !searchQuery || 
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPublished = filterPublished === 'all' ||
      (filterPublished === 'published' && page.is_published) ||
      (filterPublished === 'draft' && !page.is_published);
    
    const matchesCategory = selectedCategory === 'all' || page.category_id === selectedCategory;

    return matchesSearch && matchesPublished && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documentation...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage documentation pages, categories, and chapters</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetCategoryForm();
              setShowCategoryModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
          <button
            onClick={() => {
              resetPageForm();
              setShowPageModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Page
          </button>
          <button
            onClick={() => {
              resetChapterForm();
              setShowChapterModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chapter
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveView('pages')}
          className={`px-4 py-2 font-medium ${
            activeView === 'pages'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveView('categories')}
          className={`px-4 py-2 font-medium ${
            activeView === 'categories'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveView('chapters')}
          className={`px-4 py-2 font-medium ${
            activeView === 'chapters'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Chapters ({chapters.length})
        </button>
      </div>

      {/* Search and Filters */}
      {activeView === 'pages' && (
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterPublished}
            onChange={(e) => setFilterPublished(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Pages View */}
      {activeView === 'pages' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Views</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      No pages found
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => {
                    const category = categories.find(c => c.id === page.category_id);
                    return (
                      <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {page.is_featured && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{page.title}</div>
                              {page.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{page.description}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">{page.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {category?.name || 'Uncategorized'}
                        </td>
                        <td className="px-4 py-3">
                          {page.is_published ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {page.view_count}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col">
                            <span>{new Date(page.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            <RelativeTime date={page.created_at} className="text-gray-400 dark:text-gray-500" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          <RelativeTime date={page.updated_at} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setViewingPage(page);
                                setShowViewModal(true);
                              }}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                              title="View"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleEditPage(page)}
                              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleTogglePublish(page)}
                              className={page.is_published ? "p-1.5 text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors" : "p-1.5 text-green-600 dark:text-green-400 hover:text-green-900 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"}
                              title={page.is_published ? "Unpublish" : "Publish"}
                            >
                              <Globe className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeletePage(page.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories View */}
      {activeView === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Icon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pages</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((category) => {
                  const pageCount = pages.filter(p => p.category_id === category.id).length;
                  return (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {category.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category.icon_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category.display_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {pageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Chapters View */}
      {activeView === 'chapters' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {chapters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No chapters found
                  </td>
                </tr>
              ) : (
                chapters.map((chapter) => {
                  const category = categories.find(c => c.id === chapter.category_id);
                  return (
                    <tr key={chapter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {chapter.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {chapter.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {chapter.display_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {chapter.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditChapter(chapter)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    resetCategoryForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={categoryFormData.display_order}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icon Name
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.icon_name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, icon_name: e.target.value })}
                    placeholder="BookOpen"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={categoryFormData.is_active}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    resetCategoryForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Modal */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPage ? 'Edit Page' : 'Create Page'}
                </h3>
                <button
                  onClick={() => {
                    setShowPageModal(false);
                    resetPageForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handlePageSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={pageFormData.title}
                    onChange={(e) => {
                      setPageFormData({ 
                        ...pageFormData, 
                        title: e.target.value,
                        slug: pageFormData.slug || generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={pageFormData.slug}
                    onChange={(e) => setPageFormData({ ...pageFormData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={pageFormData.category_id}
                  onChange={(e) => setPageFormData({ ...pageFormData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Uncategorized</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={pageFormData.description}
                  onChange={(e) => setPageFormData({ ...pageFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content (HTML) *
                </label>
                <textarea
                  required
                  value={pageFormData.content}
                  onChange={(e) => setPageFormData({ ...pageFormData, content: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Enter HTML content..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={pageFormData.display_order}
                    onChange={(e) => setPageFormData({ ...pageFormData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={pageFormData.is_published}
                    onChange={(e) => setPageFormData({ ...pageFormData, is_published: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Published
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={pageFormData.is_featured}
                    onChange={(e) => setPageFormData({ ...pageFormData, is_featured: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Featured
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPageModal(false);
                    resetPageForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingPage ? 'Update' : 'Create'} Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingChapter ? 'Edit Chapter' : 'Create Chapter'}
                </h3>
                <button
                  onClick={() => {
                    setShowChapterModal(false);
                    resetChapterForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleChapterSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={chapterFormData.category_id}
                  onChange={(e) => setChapterFormData({ ...chapterFormData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={chapterFormData.title}
                  onChange={(e) => setChapterFormData({ ...chapterFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={chapterFormData.description}
                  onChange={(e) => setChapterFormData({ ...chapterFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={chapterFormData.display_order}
                    onChange={(e) => setChapterFormData({ ...chapterFormData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={chapterFormData.is_active}
                    onChange={(e) => setChapterFormData({ ...chapterFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChapterModal(false);
                    resetChapterForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingChapter ? 'Update' : 'Create'} Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Page Modal */}
      {showViewModal && viewingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{viewingPage.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {viewingPage.slug} • {viewingPage.is_published ? 'Published' : 'Draft'} • {viewingPage.view_count} views
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingPage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div 
                className="prose prose-lg dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: viewingPage.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

