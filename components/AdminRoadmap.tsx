"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Map, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Eye, 
  Globe, 
  Star,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  Lightbulb,
  XCircle,
  Rocket,
  MessageSquare,
  Save
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
  is_published: boolean;
  is_featured: boolean;
  published_at?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  view_count: number;
}

interface RoadmapUpdate {
  id: string;
  roadmap_item_id: string;
  status: 'considering' | 'planned' | 'in_progress' | 'cancelled' | 'implemented';
  message: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string | null;
}

interface AdminRoadmapProps {
  supabase: any;
  currentUserId: string;
}

const statusConfig = {
  considering: { label: 'Considering', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  planned: { label: 'Planned', icon: Clock, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  in_progress: { label: 'In Progress', icon: Rocket, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  implemented: { label: 'Implemented', icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
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

export function AdminRoadmap({ supabase, currentUserId }: AdminRoadmapProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [viewingItem, setViewingItem] = useState<RoadmapItem | null>(null);
  const [updates, setUpdates] = useState<RoadmapUpdate[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<RoadmapUpdate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | RoadmapItem['status']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | RoadmapItem['category']>('all');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  
  const [updateFormData, setUpdateFormData] = useState({
    status: 'planned' as RoadmapItem['status'],
    message: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planned' as RoadmapItem['status'],
    category: 'feature' as RoadmapItem['category'],
    priority: 'medium' as RoadmapItem['priority'],
    target_date: '',
    display_order: 0,
    is_published: false,
    is_featured: false,
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      // Define status order: considering, planned, in_progress, cancelled, implemented
      const statusOrder: Record<string, number> = {
        'considering': 1,
        'planned': 2,
        'in_progress': 3,
        'cancelled': 4,
        'implemented': 5,
      };
      
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('*');
      if (error) throw error;
      
      // Sort items by status order, then display_order, then created_at
      const sortedItems = (data || []).sort((a, b) => {
        const statusA = statusOrder[a.status] || 999;
        const statusB = statusOrder[b.status] || 999;
        
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setItems(sortedItems);
    } catch (error) {
      console.error("Error loading roadmap items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData: any = {
        ...formData,
        target_date: formData.target_date || null,
        created_by: currentUserId,
      };

      if (editingItem) {
        itemData.updated_by = currentUserId;
        if (formData.is_published && !editingItem.is_published) {
          itemData.published_at = new Date().toISOString();
          itemData.published_by = currentUserId;
        }
        const { error } = await supabase
          .from('roadmap_items')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        if (formData.is_published) {
          itemData.published_at = new Date().toISOString();
          itemData.published_by = currentUserId;
        }
        const { error } = await supabase
          .from('roadmap_items')
          .insert(itemData);
        if (error) throw error;
      }

      await loadItems();
      resetForm();
      setShowModal(false);
    } catch (error: any) {
      console.error("Error saving roadmap item:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this roadmap item?')) return;
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadItems();
    } catch (error: any) {
      console.error("Error deleting roadmap item:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleTogglePublish = async (item: RoadmapItem) => {
    try {
      const updateData: any = {
        is_published: !item.is_published,
        updated_by: currentUserId,
      };

      if (!item.is_published) {
        updateData.published_at = new Date().toISOString();
        updateData.published_by = currentUserId;
      } else {
        updateData.published_at = null;
        updateData.published_by = null;
      }

      const { error } = await supabase
        .from('roadmap_items')
        .update(updateData)
        .eq('id', item.id);
      if (error) throw error;
      await loadItems();
    } catch (error: any) {
      console.error("Error toggling publish:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'planned',
      category: 'feature',
      priority: 'medium',
      target_date: '',
      display_order: 0,
      is_published: false,
      is_featured: false,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      status: item.status,
      category: item.category,
      priority: item.priority,
      target_date: item.target_date ? new Date(item.target_date).toISOString().split('T')[0] : '',
      display_order: item.display_order,
      is_published: item.is_published,
      is_featured: item.is_featured,
    });
    setShowModal(true);
  };

  const loadUpdates = async (itemId: string) => {
    try {
      console.log('Loading updates for roadmap item:', itemId);
      const { data, error } = await supabase
        .from('roadmap_item_updates')
        .select('*')
        .eq('roadmap_item_id', itemId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading updates:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      console.log('Loaded updates:', data);
      setUpdates(data || []);
    } catch (error) {
      console.error("Error loading updates:", error);
      alert(`Error loading updates: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck the browser console for more details.`);
    }
  };

  const handleViewItem = async (item: RoadmapItem) => {
    setViewingItem(item);
    await loadUpdates(item.id);
    setShowViewModal(true);
  };

  const handleAddUpdate = (item: RoadmapItem) => {
    setViewingItem(item);
    setUpdateFormData({ 
      status: item.status, // Default to current status
      message: '' 
    });
    setEditingUpdate(null);
    setShowUpdateModal(true);
  };

  const handleEditUpdate = (update: RoadmapUpdate) => {
    setEditingUpdate(update);
    setUpdateFormData({
      status: update.status,
      message: update.message,
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingItem) return;

    try {
      const updateData: any = {
        status: updateFormData.status,
        message: updateFormData.message,
        created_by: currentUserId,
      };

      console.log('Creating update with data:', updateData);
      console.log('For roadmap item:', viewingItem.id);

      if (editingUpdate) {
        updateData.updated_by = currentUserId;
        const { data, error } = await supabase
          .from('roadmap_item_updates')
          .update(updateData)
          .eq('id', editingUpdate.id)
          .select();
        if (error) {
          console.error('Error updating update:', error);
          throw error;
        }
        console.log('Update updated:', data);
      } else {
        updateData.roadmap_item_id = viewingItem.id;
        const { data, error } = await supabase
          .from('roadmap_item_updates')
          .insert(updateData)
          .select();
        if (error) {
          console.error('Error inserting update:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          throw error;
        }
        console.log('Update created:', data);

        // Update roadmap item status if changed (ONLY the status, NOT the description)
        if (updateFormData.status !== viewingItem.status) {
          const { error: itemError } = await supabase
            .from('roadmap_items')
            .update({ 
              status: updateFormData.status,
              updated_by: currentUserId 
            })
            .eq('id', viewingItem.id);
          if (itemError) {
            console.error('Error updating roadmap item status:', itemError);
            throw itemError;
          }
        }
      }

      // Reload updates to show the new one
      await loadUpdates(viewingItem.id);
      // Reload items to get updated status
      await loadItems();
      // Update viewing item if status changed
      if (!editingUpdate && updateFormData.status !== viewingItem.status) {
        const updatedItem = { ...viewingItem, status: updateFormData.status };
        setViewingItem(updatedItem);
      }
      setUpdateFormData({ status: 'planned', message: '' });
      setEditingUpdate(null);
      setShowUpdateModal(false);
    } catch (error: any) {
      console.error("Error saving update:", error);
      alert(`Error saving update: ${error.message}\n\nCheck the browser console for more details.`);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return;
    if (!viewingItem) return;

    try {
      const { error } = await supabase
        .from('roadmap_item_updates')
        .delete()
        .eq('id', updateId);
      if (error) throw error;
      await loadUpdates(viewingItem.id);
    } catch (error: any) {
      console.error("Error deleting update:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesPublished = filterPublished === 'all' ||
      (filterPublished === 'published' && item.is_published) ||
      (filterPublished === 'draft' && !item.is_published);

    return matchesSearch && matchesStatus && matchesCategory && matchesPublished;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roadmap...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Roadmap Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage roadmap items to keep users informed</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Roadmap Item
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search roadmap items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
        <select
          value={filterPublished}
          onChange={(e) => setFilterPublished(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Publish Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Publish Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Views</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    No roadmap items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const statusInfo = statusConfig[item.status] || statusConfig.considering; // Fallback to considering if status not found
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.is_featured && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.is_published ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                          {item.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[item.category].color}`}>
                          {categoryConfig[item.category].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[item.priority].color}`}>
                          {priorityConfig[item.priority].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {item.target_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {item.view_count}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          <RelativeTime date={item.created_at} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        <RelativeTime date={item.updated_at} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewItem(item)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleTogglePublish(item)}
                            className={item.is_published ? "p-1.5 text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors" : "p-1.5 text-green-600 dark:text-green-400 hover:text-green-900 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"}
                            title={item.is_published ? "Unpublish" : "Publish"}
                          >
                            <Globe className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingItem ? 'Edit Roadmap Item' : 'Create Roadmap Item'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (HTML) *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Enter HTML content..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as RoadmapItem['status'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="considering">Considering</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="implemented">Implemented</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as RoadmapItem['category'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as RoadmapItem['priority'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Published
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Featured
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingItem ? 'Update' : 'Create'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {viewingItem.is_featured && <Star className="w-5 h-5 text-yellow-500" />}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{viewingItem.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${(statusConfig[viewingItem.status] || statusConfig.considering).color}`}>
                      {(statusConfig[viewingItem.status] || statusConfig.considering).label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[viewingItem.category].color}`}>
                      {categoryConfig[viewingItem.category].label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityConfig[viewingItem.priority].color}`}>
                      {priorityConfig[viewingItem.priority].label}
                    </span>
                    {viewingItem.target_date && (
                      <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Target: {new Date(viewingItem.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Created:</span>
                      <span>{new Date(viewingItem.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      <RelativeTime date={viewingItem.created_at} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Last Updated:</span>
                      <RelativeTime date={viewingItem.updated_at} />
                    </div>
                    <div>
                      <span className="font-medium">Views:</span> {viewingItem.view_count}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleAddUpdate(viewingItem)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    title="Add Update"
                  >
                    <Plus className="w-4 h-4" />
                    Add Update
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingItem(null);
                      setUpdates([]);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: viewingItem.description }}
                />
              </div>

              {/* Updates Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Updates ({updates.length})
                  </h4>
                  <button
                    onClick={() => handleAddUpdate(viewingItem)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Update
                  </button>
                </div>
                {updates.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No updates yet. Add one to keep users informed!</p>
                ) : (
                  <div className="space-y-3">
                    {updates.map((update) => {
                      const updateStatusInfo = statusConfig[update.status] || statusConfig.considering;
                      const StatusIcon = updateStatusInfo.icon;
                      return (
                        <div key={update.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 border-indigo-500">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${updateStatusInfo.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {updateStatusInfo.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <RelativeTime date={update.created_at} />
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditUpdate(update)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUpdate(update.id)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingUpdate ? 'Edit Update' : 'Add Update'}
                </h3>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdateFormData({ status: 'planned', message: '' });
                    setEditingUpdate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status *
                </label>
                <select
                  required
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, status: e.target.value as RoadmapItem['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="considering">Considering</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="implemented">Implemented</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Changing the status will update the roadmap item's status
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Update Message (HTML) *
                </label>
                <textarea
                  required
                  value={updateFormData.message}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, message: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Enter HTML content for the update message..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdateFormData({ status: 'planned', message: '' });
                    setEditingUpdate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingUpdate ? 'Update' : 'Post'} Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

