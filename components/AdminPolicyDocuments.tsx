"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle, Eye, Globe, History, Copy, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PolicyDocument {
  id: string;
  policy_type: 'privacy_policy' | 'terms_of_service';
  version: string;
  title: string;
  content: string;
  is_published: boolean;
  published_at?: string | null;
  published_by?: string | null;
  expired_at?: string | null;
  expired_by?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AdminPolicyDocumentsProps {
  supabase: any;
  currentUserId: string;
}

export function AdminPolicyDocuments({ supabase, currentUserId }: AdminPolicyDocumentsProps) {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<PolicyDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<PolicyDocument | null>(null);
  const [formData, setFormData] = useState({
    policy_type: 'privacy_policy' as PolicyDocument['policy_type'],
    version: '',
    title: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'privacy_policy' | 'terms_of_service'>('privacy_policy');

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('policy_documents')
        .select('*')
        .eq('policy_type', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Check if version already exists
      const { data: existing, error: checkError } = await supabase
        .from('policy_documents')
        .select('id')
        .eq('policy_type', formData.policy_type)
        .eq('version', formData.version)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing && !editingDocument) {
        alert(`Version "${formData.version}" already exists for ${formData.policy_type === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'}. Please use a different version number.`);
        setSaving(false);
        return;
      }

      const documentData: any = {
        policy_type: formData.policy_type,
        version: formData.version,
        title: formData.title,
        content: formData.content,
        created_by: currentUserId,
      };

      if (editingDocument) {
        const { error: updateError } = await supabase
          .from('policy_documents')
          .update(documentData)
          .eq('id', editingDocument.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('policy_documents')
          .insert(documentData);

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error(`Version "${formData.version}" already exists. Please use a different version number.`);
          }
          throw insertError;
        }
      }

      await loadDocuments();
      setShowCreateModal(false);
      setEditingDocument(null);
      resetForm();
    } catch (error: any) {
      console.error("Error saving document:", error);
      alert("Failed to save document: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (documentId: string) => {
    if (!confirm("Are you sure you want to publish this version? This will unpublish any currently published version.")) {
      return;
    }

    setPublishing(documentId);
    try {
      const { error } = await supabase
        .from('policy_documents')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          published_by: currentUserId,
        })
        .eq('id', documentId);

      if (error) throw error;

      await loadDocuments();
      alert("Document published successfully!");
    } catch (error: any) {
      console.error("Error publishing document:", error);
      alert("Failed to publish document: " + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleUnpublish = async (documentId: string) => {
    if (!confirm("Are you sure you want to unpublish this document?")) {
      return;
    }

    setPublishing(documentId);
    try {
      const { error } = await supabase
        .from('policy_documents')
        .update({
          is_published: false,
          published_at: null,
          published_by: null,
        })
        .eq('id', documentId);

      if (error) throw error;

      await loadDocuments();
      alert("Document unpublished successfully!");
    } catch (error: any) {
      console.error("Error unpublishing document:", error);
      alert("Failed to unpublish document: " + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document version? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('policy_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document: " + error.message);
    }
  };

  const duplicateDocument = (document: PolicyDocument) => {
    setFormData({
      policy_type: document.policy_type,
      version: `${document.version}-copy`,
      title: `${document.title} (Copy)`,
      content: document.content,
    });
    setEditingDocument(null);
    setShowCreateModal(true);
  };

  const startEdit = (document: PolicyDocument) => {
    setEditingDocument(document);
    setFormData({
      policy_type: document.policy_type,
      version: document.version,
      title: document.title,
      content: document.content,
    });
    setShowCreateModal(true);
  };

  const getPublishedDocument = () => {
    return documents.find(d => d.is_published) || null;
  };

  const resetForm = () => {
    setFormData({
      policy_type: activeTab,
      version: '',
      title: '',
      content: '',
    });
  };

  const copyFromCurrentVersion = () => {
    const publishedDoc = getPublishedDocument();
    if (!publishedDoc) {
      alert('No published version available to copy from.');
      return;
    }

    // Suggest next version number
    const currentVersion = publishedDoc.version;
    let suggestedVersion = '';
    
    // Try to increment version number
    if (currentVersion.match(/^\d+\.\d+$/)) {
      // Format: 1.0, 2.0, etc.
      const parts = currentVersion.split('.');
      const major = parseInt(parts[0]);
      suggestedVersion = `${major + 1}.0`;
    } else if (currentVersion.match(/^\d+$/)) {
      // Format: 1, 2, etc.
      suggestedVersion = `${parseInt(currentVersion) + 1}`;
    } else {
      // Fallback: append "-update"
      suggestedVersion = `${currentVersion}-update`;
    }

    setFormData({
      policy_type: publishedDoc.policy_type,
      version: suggestedVersion,
      title: publishedDoc.title.replace(/v\d+\.?\d*/, `v${suggestedVersion}`).replace(/\(Copy\)/, '').trim(),
      content: publishedDoc.content,
    });
    setEditingDocument(null);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const publishedDoc = getPublishedDocument();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Documents</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create, edit, and manage versions of Privacy Policy and Terms of Service documents
          </p>
        </div>
        <div className="flex gap-2">
          {publishedDoc && (
            <button
              onClick={copyFromCurrentVersion}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              title="Copy content from current published version"
            >
              <Copy className="w-4 h-4" />
              Copy & Update Current
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setEditingDocument(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Version
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('privacy_policy')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'privacy_policy'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms_of_service')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'terms_of_service'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Terms of Service
          </button>
        </div>
      </div>

      {/* Published Document Info */}
      {publishedDoc && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-200">
                  Currently Published: {publishedDoc.title} (v{publishedDoc.version})
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Published {publishedDoc.published_at ? formatDistanceToNow(new Date(publishedDoc.published_at), { addSuffix: true }) : 'recently'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyFromCurrentVersion}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                title="Copy this version to create an updated version"
              >
                <Copy className="w-4 h-4" />
                Copy & Update
              </button>
              <a
                href={`/${activeTab === 'privacy_policy' ? 'privacy' : 'terms'}?v=${publishedDoc.version}`}
                target="_blank"
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Published
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No document versions yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{document.version}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{document.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {document.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {document.is_published ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1 w-fit">
                          <Globe className="w-3 h-3" />
                          Published
                        </span>
                      ) : document.expired_at ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1 w-fit" title={`Expired: ${new Date(document.expired_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}>
                          <AlertCircle className="w-3 h-3" />
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-fit">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(document.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setViewingDocument(document);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(document)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateDocument(document)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {document.is_published ? (
                          <button
                            onClick={() => handleUnpublish(document.id)}
                            disabled={publishing === document.id}
                            className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg disabled:opacity-50"
                            title="Unpublish"
                          >
                            {publishing === document.id ? (
                              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePublish(document.id)}
                            disabled={publishing === document.id}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-50"
                            title="Publish"
                          >
                            {publishing === document.id ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Globe className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(document.id)}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingDocument ? 'Edit Document' : 'Create New Version'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDocument(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Type *
                  </label>
                  <select
                    required
                    value={formData.policy_type}
                    onChange={(e) => setFormData({ ...formData, policy_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={!!editingDocument}
                  >
                    <option value="privacy_policy">Privacy Policy</option>
                    <option value="terms_of_service">Terms of Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version * (e.g., "2.0", "2024-01-15")
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="2.0"
                    disabled={!!editingDocument}
                  />
                </div>
              </div>

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
                  placeholder={`${formData.policy_type === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'} v${formData.version || 'X.X'}`}
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
                  rows={20}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="Enter the full document content here..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  HTML is supported. Use proper formatting for headings, paragraphs, lists, etc.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDocument(null);
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
                      <Save className="w-4 h-4" />
                      {editingDocument ? 'Update' : 'Create'} Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{viewingDocument.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Version {viewingDocument.version} • {viewingDocument.policy_type === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingDocument(null);
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
                dangerouslySetInnerHTML={{ __html: viewingDocument.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

