"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Plus, Edit2, Trash2, X, Globe, Eye, Save, Bug, Sparkles, Shield, AlertTriangle, Info, Copy, ChevronDown, ChevronRight, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RelativeTime } from "@/components/RelativeTime";

interface ChangelogVersion {
  id: string;
  version: string;
  title?: string | null;
  description?: string | null;
  category?: 'minor_update' | 'major_update' | 'patch' | 'security_patch' | 'maintenance' | 'release_candidate' | 'beta' | 'alpha' | null;
  is_latest: boolean;
  is_published: boolean;
  published_at?: string | null;
  published_by?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  entries?: ChangelogEntry[];
}

interface ChangelogEntry {
  id: string;
  version_id: string;
  title: string;
  description: string;
  category: 'bug_fix' | 'improvement' | 'new_feature' | 'security_update' | 'deprecation' | 'general_update' | 'general_notice' | 'other';
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AdminChangelogProps {
  supabase: any;
  currentUserId: string;
}

const categoryConfig = {
  bug_fix: { 
    label: 'Bug Fix', 
    icon: Bug, 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300'
  },
  improvement: { 
    label: 'Improvement', 
    icon: Sparkles, 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  new_feature: { 
    label: 'New Feature', 
    icon: FileText, 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300'
  },
  security_update: { 
    label: 'Security Update', 
    icon: Shield, 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  deprecation: { 
    label: 'Deprecation', 
    icon: AlertTriangle, 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300'
  },
  general_update: { 
    label: 'General Update', 
    icon: Info, 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  general_notice: { 
    label: 'General Notice', 
    icon: Info, 
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    textClass: 'text-indigo-700 dark:text-indigo-300'
  },
  other: { 
    label: 'Other', 
    icon: Info, 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
};

const priorityConfig = {
  low: { 
    label: 'Low', 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
  normal: { 
    label: 'Normal', 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  high: { 
    label: 'High', 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  critical: { 
    label: 'Critical', 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300'
  },
};

const versionCategoryConfig = {
  minor_update: { 
    label: 'Minor Update', 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  major_update: { 
    label: 'Major Update', 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300'
  },
  patch: { 
    label: 'Patch', 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
  security_patch: { 
    label: 'Security Patch', 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300'
  },
  maintenance: { 
    label: 'Maintenance', 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300'
  },
  release_candidate: { 
    label: 'Release Candidate', 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  beta: { 
    label: 'Beta', 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  alpha: { 
    label: 'Alpha', 
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    textClass: 'text-pink-700 dark:text-pink-300'
  },
};

export function AdminChangelog({ supabase, currentUserId }: AdminChangelogProps) {
  const [versions, setVersions] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [editingVersion, setEditingVersion] = useState<ChangelogVersion | null>(null);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionFormData, setVersionFormData] = useState({
    version: '',
    title: '',
    description: '',
    category: '' as ChangelogVersion['category'],
  });
  const [entryFormData, setEntryFormData] = useState({
    title: '',
    description: '',
    category: 'improvement' as ChangelogEntry['category'],
    priority: 'normal' as ChangelogEntry['priority'],
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      setLoading(true);
      // Load versions with their entries
      const { data: versionsData, error: versionsError } = await supabase
        .from('changelog_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;

      // Load entries for each version
      const versionsWithEntries = await Promise.all(
        (versionsData || []).map(async (version: ChangelogVersion) => {
          const { data: entriesData } = await supabase
            .from('changelog_entries')
            .select('*')
            .eq('version_id', version.id)
            .order('created_at', { ascending: false });

          return {
            ...version,
            entries: entriesData || [],
          };
        })
      );

      setVersions(versionsWithEntries);
    } catch (error) {
      console.error("Error loading versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const versionData: any = {
        version: versionFormData.version,
        title: versionFormData.title || null,
        description: versionFormData.description || null,
        category: versionFormData.category || null,
        created_by: currentUserId,
      };

      if (editingVersion) {
        const { error } = await supabase
          .from('changelog_versions')
          .update(versionData)
          .eq('id', editingVersion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('changelog_versions')
          .insert(versionData);

        if (error) throw error;
      }

      await loadVersions();
      setShowVersionModal(false);
      setEditingVersion(null);
      resetVersionForm();
    } catch (error: any) {
      console.error("Error saving version:", error);
      alert("Failed to save version: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersionId) {
      alert("Please select a version first");
      return;
    }

    setSaving(true);

    try {
      const entryData: any = {
        version_id: selectedVersionId,
        title: entryFormData.title,
        description: entryFormData.description,
        category: entryFormData.category,
        priority: entryFormData.priority,
        created_by: currentUserId,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('changelog_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('changelog_entries')
          .insert(entryData);

        if (error) throw error;
      }

      await loadVersions();
      setShowEntryModal(false);
      setEditingEntry(null);
      setSelectedVersionId(null);
      resetEntryForm();
    } catch (error: any) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    setPublishing(versionId);
    try {
      const { error } = await supabase
        .from('changelog_versions')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          published_by: currentUserId,
        })
        .eq('id', versionId);

      if (error) throw error;

      await loadVersions();
      alert("Version published successfully!");
    } catch (error: any) {
      console.error("Error publishing version:", error);
      alert("Failed to publish version: " + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleUnpublishVersion = async (versionId: string) => {
    if (!confirm("Are you sure you want to unpublish this version?")) {
      return;
    }

    setPublishing(versionId);
    try {
      const { error } = await supabase
        .from('changelog_versions')
        .update({
          is_published: false,
          published_at: null,
          published_by: null,
        })
        .eq('id', versionId);

      if (error) throw error;

      await loadVersions();
      alert("Version unpublished successfully!");
    } catch (error: any) {
      console.error("Error unpublishing version:", error);
      alert("Failed to unpublish version: " + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleSetLatest = async (versionId: string, version: string) => {
    if (!confirm(`Set version ${version} as the latest version? This will unmark any other latest version.`)) {
      return;
    }

    setPublishing(versionId);
    try {
      // First, unmark all latest versions
      await supabase
        .from('changelog_versions')
        .update({ is_latest: false })
        .eq('is_latest', true);

      // Then mark this one as latest (only if published)
      const { error } = await supabase
        .from('changelog_versions')
        .update({ is_latest: true })
        .eq('id', versionId)
        .eq('is_published', true);

      if (error) throw error;

      await loadVersions();
      alert(`Version ${version} is now the latest version!`);
    } catch (error: any) {
      console.error("Error setting latest version:", error);
      alert("Failed to set latest version: " + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleUnsetLatest = async (versionId: string) => {
    if (!confirm("Remove this version as the latest version?")) {
      return;
    }

    setPublishing(versionId);
    try {
      const { error } = await supabase
        .from('changelog_versions')
        .update({ is_latest: false })
        .eq('id', versionId);

      if (error) throw error;

      await loadVersions();
      alert("Latest version unset successfully!");
    } catch (error: any) {
      console.error("Error unsetting latest version:", error);
      alert("Failed to unset latest version: " + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleDeleteVersion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this version? All entries in this version will also be deleted. This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('changelog_versions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadVersions();
    } catch (error: any) {
      console.error("Error deleting version:", error);
      alert("Failed to delete version: " + error.message);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('changelog_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadVersions();
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry: " + error.message);
    }
  };

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const startEditVersion = (version: ChangelogVersion) => {
    setEditingVersion(version);
    setVersionFormData({
      version: version.version,
      title: version.title || '',
      description: version.description || '',
      category: version.category || '',
    });
    setShowVersionModal(true);
  };

  const startEditEntry = (entry: ChangelogEntry) => {
    setEditingEntry(entry);
    setSelectedVersionId(entry.version_id);
    setEntryFormData({
      title: entry.title,
      description: entry.description,
      category: entry.category,
      priority: entry.priority,
    });
    setShowEntryModal(true);
  };

  const startAddEntry = (versionId: string) => {
    setSelectedVersionId(versionId);
    resetEntryForm();
    setEditingEntry(null);
    setShowEntryModal(true);
  };

  const resetVersionForm = () => {
    setVersionFormData({
      version: '',
      title: '',
      description: '',
      category: '',
    });
  };

  const resetEntryForm = () => {
    setEntryFormData({
      title: '',
      description: '',
      category: 'improvement',
      priority: 'normal',
    });
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Changelog Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create versions first, then add entries to them
          </p>
        </div>
        <button
          onClick={() => {
            resetVersionForm();
            setEditingVersion(null);
            setShowVersionModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Version
        </button>
      </div>

      {/* Versions List */}
      <div className="space-y-4">
        {versions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No versions yet. Create a version to get started.
            </p>
          </div>
        ) : (
          versions.map((version) => {
            const isExpanded = expandedVersions.has(version.id);
            const entryCount = version.entries?.length || 0;

            return (
              <div key={version.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Version Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleVersionExpanded(version.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Version {version.version}
                          </h3>
                          {version.category && versionCategoryConfig[version.category] && (
                            <span className={`text-xs px-2 py-1 rounded-full ${versionCategoryConfig[version.category].bgClass} ${versionCategoryConfig[version.category].textClass}`}>
                              {versionCategoryConfig[version.category].label}
                            </span>
                          )}
                          {version.is_latest && version.is_published && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Latest
                            </span>
                          )}
                          {version.is_published ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Published
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              Draft
                            </span>
                          )}
                        </div>
                        {version.title && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{version.title}</p>
                        )}
                        {version.description && (
                          <div 
                            className="text-xs text-gray-500 dark:text-gray-400 mt-1 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: version.description }}
                          />
                        )}
                        <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{entryCount} {entryCount === 1 ? 'entry' : 'entries'}</span>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span>
                              Created: {new Date(version.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={version.created_at} />
                            </span>
                            {version.published_at && (
                              <span>
                                Published: {new Date(version.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={version.published_at} />
                              </span>
                            )}
                            <span>
                              Last updated: <RelativeTime date={version.updated_at} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startAddEntry(version.id)}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                        title="Add Entry"
                      >
                        <Plus className="w-3 h-3" />
                        Add Entry
                      </button>
                      {version.is_published ? (
                        <>
                          {version.is_latest ? (
                            <button
                              onClick={() => handleUnsetLatest(version.id)}
                              disabled={publishing === version.id}
                              className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50"
                              title="Unset as Latest"
                            >
                              {publishing === version.id ? (
                                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Star className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetLatest(version.id, version.version)}
                              disabled={publishing === version.id}
                              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg disabled:opacity-50"
                              title="Set as Latest Version"
                            >
                              {publishing === version.id ? (
                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Star className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleUnpublishVersion(version.id)}
                            disabled={publishing === version.id}
                            className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg disabled:opacity-50"
                            title="Unpublish"
                          >
                            {publishing === version.id ? (
                              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handlePublishVersion(version.id)}
                          disabled={publishing === version.id}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-50"
                          title="Publish"
                        >
                          {publishing === version.id ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => startEditVersion(version)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Version Entries */}
                {isExpanded && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                    {entryCount === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No entries yet. Click "Add Entry" to add one.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {version.entries?.map((entry) => {
                          const categoryConfigEntry = categoryConfig[entry.category];
                          const CategoryIcon = categoryConfigEntry.icon;
                          const priorityConfigEntry = priorityConfig[entry.priority];

                          return (
                            <div
                              key={entry.id}
                              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${categoryConfigEntry.bgClass} ${categoryConfigEntry.textClass} flex items-center gap-1`}>
                                      <CategoryIcon className="w-3 h-3" />
                                      {categoryConfigEntry.label}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${priorityConfigEntry.bgClass} ${priorityConfigEntry.textClass}`}>
                                      {priorityConfigEntry.label}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                    {entry.title}
                                  </h4>
                                  <div 
                                    className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: entry.description.substring(0, 200) + (entry.description.length > 200 ? '...' : '') }}
                                  />
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    <span>
                                      Created: {new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={entry.created_at} />
                                    </span>
                                    {entry.updated_at !== entry.created_at && (
                                      <span className="ml-3">
                                        Updated: <RelativeTime date={entry.updated_at} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => startEditEntry(entry)}
                                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Version Create/Edit Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingVersion ? 'Edit Version' : 'Create New Version'}
                </h3>
                <button
                  onClick={() => {
                    setShowVersionModal(false);
                    setEditingVersion(null);
                    resetVersionForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleVersionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version * (e.g., "1.2.0", "2024-01-15")
                </label>
                <input
                  type="text"
                  required
                  value={versionFormData.version}
                  onChange={(e) => setVersionFormData({ ...versionFormData, version: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="1.2.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category (optional)
                </label>
                <select
                  value={versionFormData.category || ''}
                  onChange={(e) => setVersionFormData({ ...versionFormData, category: e.target.value as ChangelogVersion['category'] || null })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">No Category</option>
                  <option value="minor_update">Minor Update</option>
                  <option value="major_update">Major Update</option>
                  <option value="patch">Patch</option>
                  <option value="security_patch">Security Patch</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="release_candidate">Release Candidate</option>
                  <option value="beta">Beta</option>
                  <option value="alpha">Alpha</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={versionFormData.title}
                  onChange={(e) => setVersionFormData({ ...versionFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Major Update, Security Patch, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional, HTML supported)
                </label>
                <textarea
                  value={versionFormData.description}
                  onChange={(e) => setVersionFormData({ ...versionFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="Brief description of what this version includes. HTML is supported..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  HTML is supported for rich formatting.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowVersionModal(false);
                    setEditingVersion(null);
                    resetVersionForm();
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
                      <Save className="w-4 h-4" />
                      {editingVersion ? 'Update' : 'Create'} Version
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Create/Edit Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingEntry ? 'Edit Entry' : 'Add Entry to Version'}
                </h3>
                <button
                  onClick={() => {
                    setShowEntryModal(false);
                    setEditingEntry(null);
                    setSelectedVersionId(null);
                    resetEntryForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEntrySubmit} className="p-6 space-y-4">
              {!editingEntry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version *
                  </label>
                  <select
                    required
                    value={selectedVersionId || ''}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a version</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        Version {v.version} {v.is_latest && v.is_published && '(Latest)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority *
                  </label>
                  <select
                    required
                    value={entryFormData.priority}
                    onChange={(e) => setEntryFormData({ ...entryFormData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={entryFormData.category}
                    onChange={(e) => setEntryFormData({ ...entryFormData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bug_fix">Bug Fix</option>
                    <option value="improvement">Improvement</option>
                    <option value="new_feature">New Feature</option>
                    <option value="security_update">Security Update</option>
                    <option value="deprecation">Deprecation</option>
                    <option value="general_update">General Update</option>
                    <option value="general_notice">General Notice</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={entryFormData.title}
                  onChange={(e) => setEntryFormData({ ...entryFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief title for this update"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description * (HTML supported)
                </label>
                <textarea
                  required
                  value={entryFormData.description}
                  onChange={(e) => setEntryFormData({ ...entryFormData, description: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="Detailed description of the change, bug fix, or feature. HTML is supported..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  HTML is supported. Use &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;, etc. for rich formatting.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEntryModal(false);
                    setEditingEntry(null);
                    setSelectedVersionId(null);
                    resetEntryForm();
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
                      <Save className="w-4 h-4" />
                      {editingEntry ? 'Update' : 'Create'} Entry
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
