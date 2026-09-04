"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Map,
  Loader2,
  CheckCircle2,
  Clock,
  Lightbulb,
  XCircle,
  Rocket,
  Calendar,
  Star,
  Filter,
  X,
  MessageSquare
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: 'considering' | 'planned' | 'in_progress' | 'cancelled' | 'implemented';
  category: 'feature' | 'improvement' | 'bug_fix' | 'performance' | 'security' | 'ui_ux' | 'integration' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_date?: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  view_count: number;
}

interface RoadmapUpdate {
  id: string;
  roadmap_item_id: string;
  status: 'considering' | 'planned' | 'in_progress' | 'cancelled' | 'implemented';
  message: string;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  considering: { label: 'Considering', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800' },
  planned: { label: 'Planned', icon: Clock, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800' },
  in_progress: { label: 'In Progress', icon: Rocket, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700' },
  implemented: { label: 'Implemented', icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800' },
};

const categoryConfig = {
  feature: { label: 'Feature', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  improvement: { label: 'Improvement', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  bug_fix: { label: 'Bug Fix', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  performance: { label: 'Performance', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  security: { label: 'Security', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  ui_ux: { label: 'UI/UX', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  integration: { label: 'Integration', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export default function RoadmapPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | RoadmapItem['status']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | RoadmapItem['category']>('all');
  const [viewCountIncremented, setViewCountIncremented] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [updates, setUpdates] = useState<RoadmapUpdate[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadRoadmap();
  }, []);

  const loadRoadmap = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading roadmap:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemView = async (itemId: string) => {
    // Prevent duplicate increments
    if (viewCountIncremented.has(itemId)) return;

    try {
      const { error } = await supabase.rpc('increment_roadmap_item_view', { p_item_id: itemId });
      if (error) {
        console.error("Error incrementing view count:", error);
      } else {
        setViewCountIncremented(prev => new Set(prev).add(itemId));
        // Reload items to get updated view count
        const { data: updatedItems } = await supabase
          .from('roadmap_items')
          .select('*')
          .eq('is_published', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });
        if (updatedItems) {
          setItems(updatedItems);
        }
      }
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  };

  const handleItemClick = async (item: RoadmapItem) => {
    // Increment view count
    if (!viewCountIncremented.has(item.id)) {
      try {
        const { error } = await supabase.rpc('increment_roadmap_item_view', { p_item_id: item.id });
        if (!error) {
          setViewCountIncremented(prev => new Set(prev).add(item.id));
          // Update view count in local state
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, view_count: i.view_count + 1 } : i));
        }
      } catch (error) {
        console.error("Error incrementing view count:", error);
      }
    }

    // Load updates for this item
    try {
      const { data, error } = await supabase
        .from('roadmap_item_updates')
        .select('*')
        .eq('roadmap_item_id', item.id)
        .order('created_at', { ascending: false });
      if (!error) {
        setUpdates(data || []);
      }
    } catch (error) {
      console.error("Error loading updates:", error);
    }

    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  // Group items by status
  const groupedItems = {
    implemented: filteredItems.filter(i => i.status === 'implemented'),
    in_progress: filteredItems.filter(i => i.status === 'in_progress'),
    planned: filteredItems.filter(i => i.status === 'planned'),
    considering: filteredItems.filter(i => i.status === 'considering'),
    cancelled: filteredItems.filter(i => i.status === 'cancelled'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Map className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Product Roadmap</h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Stay informed about what we're building, what's in progress, and what's coming next
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="considering">Considering</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
            <option value="implemented">Implemented</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Categories</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="bug_fix">Bug Fix</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
            <option value="ui_ux">UI/UX</option>
            <option value="integration">Integration</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Roadmap Items by Status - Vertical Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Considering Column */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
              <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">Considering</h2>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full flex-shrink-0">
                {groupedItems.considering.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 min-h-[200px]">
                {groupedItems.considering.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No items
                  </div>
                ) : (
                  groupedItems.considering.map((item) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {item.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">{item.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${categoryConfig[item.category].color}`}>
                              {categoryConfig[item.category].label}
                            </span>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${priorityConfig[item.priority].color}`}>
                              {priorityConfig[item.priority].label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="prose prose-xs dark:prose-invert max-w-none mb-3 text-xs leading-relaxed line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                      <div className="space-y-0.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[10px]">Created:</span>
                            <span className="text-[10px]">{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                          <span className="text-[10px]">{item.view_count} views</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[10px]">Updated:</span>
                            <RelativeTime date={item.updated_at} className="text-[10px]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>

          {/* Planned Column */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">Planned</h2>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full flex-shrink-0">
                {groupedItems.planned.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 min-h-[200px]">
                {groupedItems.planned.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No items
                  </div>
                ) : (
                  groupedItems.planned.map((item) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.is_featured && <Star className="w-4 h-4 text-yellow-500" />}
                            <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[item.category].color}`}>
                              {categoryConfig[item.category].label}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[item.priority].color}`}>
                              {priorityConfig[item.priority].label}
                            </span>
                            {item.target_date && (
                              <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Target: {new Date(item.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none mb-4"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                      <div className="space-y-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Created:</span>
                            <span>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                          <span>{item.view_count} views</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Last Updated:</span>
                            <RelativeTime date={item.updated_at} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>

          {/* In Progress Column */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
              <Rocket className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">In Progress</h2>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full flex-shrink-0">
                {groupedItems.in_progress.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 min-h-[200px]">
                {groupedItems.in_progress.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No items
                  </div>
                ) : (
                  groupedItems.in_progress.map((item) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.is_featured && <Star className="w-4 h-4 text-yellow-500" />}
                            <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[item.category].color}`}>
                              {categoryConfig[item.category].label}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[item.priority].color}`}>
                              {priorityConfig[item.priority].label}
                            </span>
                            {item.target_date && (
                              <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Target: {new Date(item.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none mb-4"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                      <div className="space-y-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Created:</span>
                            <span>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                          <span>{item.view_count} views</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Last Updated:</span>
                            <RelativeTime date={item.updated_at} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>

          {/* Cancelled Column */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
              <XCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">Cancelled</h2>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full flex-shrink-0">
                {groupedItems.cancelled.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 min-h-[200px]">
                {groupedItems.cancelled.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No items
                  </div>
                ) : (
                  groupedItems.cancelled.map((item) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow opacity-75 cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.is_featured && <Star className="w-4 h-4 text-yellow-500" />}
                            <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[item.category].color}`}>
                              {categoryConfig[item.category].label}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[item.priority].color}`}>
                              {priorityConfig[item.priority].label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none mb-4"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                      <div className="space-y-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Created:</span>
                            <span>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                          <span>{item.view_count} views</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Last Updated:</span>
                            <RelativeTime date={item.updated_at} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>

          {/* Implemented Column */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">Implemented</h2>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full flex-shrink-0">
                {groupedItems.implemented.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 min-h-[200px]">
                {groupedItems.implemented.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    No items
                  </div>
                ) : (
                  groupedItems.implemented.map((item) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {item.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">{item.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${categoryConfig[item.category].color}`}>
                              {categoryConfig[item.category].label}
                            </span>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${priorityConfig[item.priority].color}`}>
                              {priorityConfig[item.priority].label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="prose prose-xs dark:prose-invert max-w-none mb-3 text-xs leading-relaxed line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                      <div className="space-y-0.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[10px]">Created:</span>
                            <span className="text-[10px]">{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                          <span className="text-[10px]">{item.view_count} views</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-[10px]">Updated:</span>
                            <RelativeTime date={item.updated_at} className="text-[10px]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedItem.is_featured && <Star className="w-5 h-5 text-yellow-500" />}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedItem.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[selectedItem.status].color}`}>
                      {statusConfig[selectedItem.status].label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[selectedItem.category].color}`}>
                      {categoryConfig[selectedItem.category].label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[selectedItem.priority].color}`}>
                      {priorityConfig[selectedItem.priority].label}
                    </span>
                    {selectedItem.target_date && (
                      <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Target: {new Date(selectedItem.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Created:</span>
                      <span>{new Date(selectedItem.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      <RelativeTime date={selectedItem.created_at} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Last Updated:</span>
                      <RelativeTime date={selectedItem.updated_at} />
                    </div>
                    <div>
                      <span className="font-medium">Views:</span> {selectedItem.view_count}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                    setUpdates([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedItem.description }}
                />
              </div>

              {/* Updates Section */}
              {updates.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5" />
                    Updates ({updates.length})
                  </h4>
                  <div className="space-y-3">
                    {updates.map((update) => {
                      const StatusIcon = statusConfig[update.status].icon;
                      return (
                        <div key={update.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 border-indigo-500">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig[update.status].color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig[update.status].label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <RelativeTime date={update.created_at} />
                              </span>
                            </div>
                          </div>
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: update.message }}
                          />
                          {update.updated_at !== update.created_at && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Updated:</span> <RelativeTime date={update.updated_at} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


