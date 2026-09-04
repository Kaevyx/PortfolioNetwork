"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle, Info, AlertTriangle, Wrench, Calendar, Users, Filter, Copy, FileText, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'information' | 'warning' | 'maintenance';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  display_type: 'banner' | 'card' | 'modal' | 'top_bar' | 'sidebar' | 'inline';
  target_type: 'all' | 'specific_users' | 'new_accounts' | 'unverified' | 'suspended' | 'not_agreed_policies' | 'custom_filter';
  target_user_ids?: string[] | null;
  target_criteria?: any;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  title: string;
  content: string;
  type: Announcement['type'];
  priority: Announcement['priority'];
  display_type: Announcement['display_type'];
  target_type: Announcement['target_type'];
  created_at: string;
}

interface AdminAnnouncementsProps {
  supabase: any;
  currentUserId: string;
}

export function AdminAnnouncements({ supabase, currentUserId }: AdminAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showTemplateCreateModal, setShowTemplateCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'announcement' as Announcement['type'],
    priority: 'normal' as Announcement['priority'],
    display_type: 'banner' as Announcement['display_type'],
    target_type: 'all' as Announcement['target_type'],
    target_user_ids: [] as string[],
    target_criteria: null as any,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
  });
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    title: '',
    content: '',
    type: 'announcement' as Announcement['type'],
    priority: 'normal' as Announcement['priority'],
    display_type: 'banner' as Announcement['display_type'],
    target_type: 'all' as Announcement['target_type'],
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
    loadTemplates();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('clerk_id, display_name, email')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const announcementData: any = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        display_type: formData.display_type,
        target_type: formData.target_type,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        is_active: formData.is_active,
        created_by: currentUserId,
      };

      if (formData.target_type === 'specific_users') {
        announcementData.target_user_ids = formData.target_user_ids;
      }

      if (formData.target_type === 'custom_filter') {
        announcementData.target_criteria = formData.target_criteria;
      }

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData);

        if (error) throw error;
      }

      await loadAnnouncements();
      setShowCreateModal(false);
      setEditingAnnouncement(null);
      resetForm();
    } catch (error: any) {
      console.error("Error saving announcement:", error);
      alert("Failed to save announcement: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAnnouncements();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      alert("Failed to delete announcement: " + error.message);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);

      if (error) throw error;
      await loadAnnouncements();
    } catch (error: any) {
      console.error("Error toggling announcement:", error);
      alert("Failed to update announcement: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'announcement',
      priority: 'normal',
      display_type: 'banner',
      target_type: 'all',
      target_user_ids: [],
      target_criteria: null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true,
    });
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      title: '',
      content: '',
      type: 'announcement',
      priority: 'normal',
      display_type: 'banner',
      target_type: 'all',
    });
  };

  const startEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      display_type: announcement.display_type || 'banner',
      target_type: announcement.target_type,
      target_user_ids: announcement.target_user_ids || [],
      target_criteria: announcement.target_criteria,
      start_date: new Date(announcement.start_date).toISOString().split('T')[0],
      end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().split('T')[0] : '',
      is_active: announcement.is_active,
    });
    setShowCreateModal(true);
  };

  const applyTemplate = (template: Template) => {
    setFormData({
      title: template.title,
      content: template.content,
      type: template.type,
      priority: template.priority,
      display_type: template.display_type,
      target_type: template.target_type,
      target_user_ids: [],
      target_criteria: null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true,
    });
    setShowTemplatesModal(false);
    setShowCreateModal(true);
  };

  const duplicateAnnouncement = (announcement: Announcement) => {
    setFormData({
      title: `${announcement.title} (Copy)`,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      display_type: announcement.display_type || 'banner',
      target_type: announcement.target_type,
      target_user_ids: announcement.target_user_ids || [],
      target_criteria: announcement.target_criteria,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: false,
    });
    setShowCreateModal(true);
  };

  const saveAsTemplate = async () => {
    if (!formData.title || !formData.content) {
      alert("Please fill in title and content before saving as template");
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name: prompt("Enter a name for this template:") || `${formData.title} Template`,
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        display_type: formData.display_type,
        target_type: formData.target_type,
        created_by: currentUserId,
      };

      const { error } = await supabase
        .from('announcement_templates')
        .insert(templateData);

      if (error) throw error;

      await loadTemplates();
      alert("Template saved successfully!");
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert("Failed to save template: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const templateData = {
        ...templateFormData,
        created_by: currentUserId,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('announcement_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcement_templates')
          .insert(templateData);

        if (error) throw error;
      }

      await loadTemplates();
      setShowTemplateCreateModal(false);
      setEditingTemplate(null);
      resetTemplateForm();
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert("Failed to save template: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from('announcement_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template: " + error.message);
    }
  };

  const duplicateTemplate = (template: Template) => {
    setTemplateFormData({
      name: `${template.name} (Copy)`,
      title: template.title,
      content: template.content,
      type: template.type,
      priority: template.priority,
      display_type: template.display_type,
      target_type: template.target_type,
    });
    setEditingTemplate(null);
    setShowTemplateCreateModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'information':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getTargetTypeLabel = (targetType: string) => {
    switch (targetType) {
      case 'all':
        return 'All Users';
      case 'specific_users':
        return 'Specific Users';
      case 'new_accounts':
        return 'New Accounts (Last 7 Days)';
      case 'unverified':
        return 'Unverified Users';
      case 'suspended':
        return 'Suspended Users';
      case 'not_agreed_policies':
        return 'Users Who Haven\'t Agreed to Policies';
      case 'custom_filter':
        return 'Custom Filter';
      default:
        return targetType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create and manage announcements, information, warnings, and banners for users
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingAnnouncement(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Display</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No announcements yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(announcement.type)}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{announcement.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                        {announcement.display_type || 'banner'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{announcement.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {announcement.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getTargetTypeLabel(announcement.target_type)}
                      </div>
                      {announcement.target_type === 'specific_users' && announcement.target_user_ids && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {announcement.target_user_ids.length} user(s)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        announcement.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        announcement.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                        announcement.priority === 'normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(announcement)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          announcement.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {announcement.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(announcement)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateAnnouncement(announcement)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAnnouncement(null);
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content * (HTML supported)
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Announcement content (HTML supported)"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Announcement Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="information">Information</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Type *
                  </label>
                  <select
                    required
                    value={formData.display_type}
                    onChange={(e) => setFormData({ ...formData, display_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="banner">Banner</option>
                    <option value="card">Card</option>
                    <option value="modal">Modal</option>
                    <option value="top_bar">Top Bar (Fixed)</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="inline">Inline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience *
                </label>
                <select
                  required
                  value={formData.target_type}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      target_type: e.target.value as any,
                      target_user_ids: e.target.value !== 'specific_users' ? [] : formData.target_user_ids,
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Users</option>
                  <option value="specific_users">Specific Users</option>
                  <option value="new_accounts">New Accounts (Last 7 Days)</option>
                  <option value="unverified">Unverified Users</option>
                  <option value="suspended">Suspended Users</option>
                  <option value="not_agreed_policies">Users Who Haven't Agreed to Policies</option>
                  <option value="custom_filter">Custom Filter</option>
                </select>
              </div>

              {formData.target_type === 'specific_users' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search and Select Users
                  </label>
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white mb-2"
                  />
                  {userSearchResults.length > 0 && (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.clerk_id}
                          type="button"
                          onClick={() => {
                            if (!formData.target_user_ids?.includes(user.clerk_id)) {
                              setFormData({
                                ...formData,
                                target_user_ids: [...(formData.target_user_ids || []), user.clerk_id],
                              });
                            }
                            setUserSearchQuery('');
                            setUserSearchResults([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.display_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                          {formData.target_user_ids?.includes(user.clerk_id) && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.target_user_ids && formData.target_user_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.target_user_ids.map((userId) => {
                        const user = userSearchResults.find(u => u.clerk_id === userId);
                        return (
                          <span
                            key={userId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm"
                          >
                            {user?.display_name || userId}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  target_user_ids: formData.target_user_ids?.filter(id => id !== userId) || [],
                                });
                              }}
                              className="hover:text-indigo-900 dark:hover:text-indigo-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                  Active (announcement will be shown to users)
                </label>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={saveAsTemplate}
                  disabled={saving || !formData.title || !formData.content}
                  className="px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Save as Template
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAnnouncement(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {editingAnnouncement ? 'Update' : 'Create'} Announcement
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Announcement Templates</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetTemplateForm();
                      setEditingTemplate(null);
                      setShowTemplateCreateModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Template
                  </button>
                  <button
                    onClick={() => setShowTemplatesModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No templates yet. Create one to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.title}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => applyTemplate(template)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                            title="Use Template"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duplicateTemplate(template)}
                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                          {template.type}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                          {template.display_type}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          {template.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Create/Edit Modal */}
      {showTemplateCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <button
                  onClick={() => {
                    setShowTemplateCreateModal(false);
                    setEditingTemplate(null);
                    resetTemplateForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleTemplateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Welcome Message"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={templateFormData.title}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content * (HTML supported)
                </label>
                <textarea
                  required
                  value={templateFormData.content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Announcement Type *</label>
                  <select
                    required
                    value={templateFormData.type}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="information">Information</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display *</label>
                  <select
                    required
                    value={templateFormData.display_type}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, display_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="banner">Banner</option>
                    <option value="card">Card</option>
                    <option value="modal">Modal</option>
                    <option value="top_bar">Top Bar</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="inline">Inline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority *</label>
                  <select
                    required
                    value={templateFormData.priority}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateCreateModal(false);
                    setEditingTemplate(null);
                    resetTemplateForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {editingTemplate ? 'Update' : 'Create'} Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

