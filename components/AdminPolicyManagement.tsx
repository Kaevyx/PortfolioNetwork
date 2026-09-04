"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle, FileText, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PolicyDocument {
  id: string;
  version: string;
  title: string;
  is_published: boolean;
  published_at?: string | null;
  expired_at?: string | null;
}

interface PolicyVersion {
  id: string;
  policy_type: 'privacy_policy' | 'terms_of_service';
  version: string;
  effective_date: string;
  requires_reconfirmation: boolean;
  created_by: string;
  created_at: string;
  document_id?: string | null;
  policy_documents?: PolicyDocument[] | null;
}

interface AdminPolicyManagementProps {
  supabase: any;
  currentUserId: string;
}

export function AdminPolicyManagement({ supabase, currentUserId }: AdminPolicyManagementProps) {
  const [policies, setPolicies] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    policy_type: 'privacy_policy' as PolicyVersion['policy_type'],
    version: '',
    effective_date: new Date().toISOString().split('T')[0],
    requires_reconfirmation: false,
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    agreedToPrivacy: 0,
    agreedToTerms: 0,
    needsPrivacyReconfirmation: 0,
    needsTermsReconfirmation: 0,
  });

  useEffect(() => {
    loadPolicies();
    loadStats();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const { data: policiesData, error } = await supabase
        .from('policy_versions')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;

      // Load documents for each policy version
      const policiesWithDocs = await Promise.all(
        (policiesData || []).map(async (policy) => {
          // Find documents matching this policy type and version
          const { data: docs } = await supabase
            .from('policy_documents')
            .select('id, version, title, is_published, published_at, expired_at')
            .eq('policy_type', policy.policy_type)
            .eq('version', policy.version)
            .limit(1);

          return {
            ...policy,
            policy_documents: docs || null,
          };
        })
      );

      setPolicies(policiesWithDocs);
    } catch (error) {
      console.error("Error loading policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total users
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get users who agreed
      const { count: privacyCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('privacy_policy_agreed_at', 'is', null);

      const { count: termsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('terms_agreed_at', 'is', null);

      // Get latest versions that require reconfirmation
      const { data: latestPrivacy } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_type', 'privacy_policy')
        .eq('requires_reconfirmation', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      const { data: latestTerms } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_type', 'terms_of_service')
        .eq('requires_reconfirmation', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      // Count users who need reconfirmation
      let needsPrivacy = 0;
      let needsTerms = 0;

      if (latestPrivacy) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or(`privacy_policy_version.is.null,privacy_policy_version.neq.${latestPrivacy.version}`);
        needsPrivacy = count || 0;
      }

      if (latestTerms) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or(`terms_version.is.null,terms_version.neq.${latestTerms.version}`);
        needsTerms = count || 0;
      }

      setStats({
        totalUsers: totalCount || 0,
        agreedToPrivacy: privacyCount || 0,
        agreedToTerms: termsCount || 0,
        needsPrivacyReconfirmation: needsPrivacy,
        needsTermsReconfirmation: needsTerms,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Check if version already exists
      const { data: existing, error: checkError } = await supabase
        .from('policy_versions')
        .select('id, version')
        .eq('policy_type', formData.policy_type)
        .eq('version', formData.version)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        const update = confirm(
          `Version "${formData.version}" already exists for ${formData.policy_type === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'}. Do you want to update it instead?`
        );
        
        if (update) {
          const { error: updateError } = await supabase
            .from('policy_versions')
            .update({
              effective_date: new Date(formData.effective_date).toISOString(),
              requires_reconfirmation: formData.requires_reconfirmation,
              created_by: currentUserId,
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
        } else {
          setSaving(false);
          return;
        }
      } else {
        const policyData = {
          policy_type: formData.policy_type,
          version: formData.version,
          effective_date: new Date(formData.effective_date).toISOString(),
          requires_reconfirmation: formData.requires_reconfirmation,
          created_by: currentUserId,
        };

        const { error: insertError } = await supabase
          .from('policy_versions')
          .insert(policyData);

        if (insertError) throw insertError;
      }

      await loadPolicies();
      await loadStats();
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating policy version:", error);
      if (error.code === '23505') {
        alert(`Version "${formData.version}" already exists for this policy type. Please use a different version number.`);
      } else {
        alert("Failed to create policy version: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy version? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('policy_versions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPolicies();
      await loadStats();
    } catch (error: any) {
      console.error("Error deleting policy version:", error);
      alert("Failed to delete policy version: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      policy_type: 'privacy_policy',
      version: '',
      effective_date: new Date().toISOString().split('T')[0],
      requires_reconfirmation: false,
    });
  };

  const forceReconfirmation = async (policyType: 'privacy_policy' | 'terms_of_service') => {
    const version = prompt(`Enter a new version number for ${policyType === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'} (e.g., "2.0" or "2024-01-15"):`);
    if (!version) return;

    if (!confirm(`This will require ALL users to re-confirm their agreement to the ${policyType === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'}. Continue?`)) {
      return;
    }

    setSaving(true);
    try {
      // Check if version already exists
      const { data: existing, error: checkError } = await supabase
        .from('policy_versions')
        .select('id, version')
        .eq('policy_type', policyType)
        .eq('version', version)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Update existing version to require reconfirmation
        const { error: updateError } = await supabase
          .from('policy_versions')
          .update({
            effective_date: new Date().toISOString(),
            requires_reconfirmation: true,
            created_by: currentUserId,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        alert(`Updated existing version "${version}" to require re-confirmation. All users will now be required to re-confirm.`);
      } else {
        const policyData = {
          policy_type: policyType,
          version: version,
          effective_date: new Date().toISOString(),
          requires_reconfirmation: true,
          created_by: currentUserId,
        };

        const { error: insertError } = await supabase
          .from('policy_versions')
          .insert(policyData);

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error(`Version "${version}" already exists. Please use a different version number.`);
          }
          throw insertError;
        }

        alert(`Success! All users will now be required to re-confirm their agreement to the ${policyType === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'}.`);
      }

      await loadPolicies();
      await loadStats();
    } catch (error: any) {
      console.error("Error creating policy version:", error);
      alert("Failed to create policy version: " + error.message);
    } finally {
      setSaving(false);
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage privacy policy and terms of service versions, and force users to re-confirm agreements
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => forceReconfirmation('privacy_policy')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Force Privacy Re-confirmation
          </button>
          <button
            onClick={() => forceReconfirmation('terms_of_service')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Force Terms Re-confirmation
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Version
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Agreed to Privacy</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.agreedToPrivacy}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Agreed to Terms</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.agreedToTerms}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Need Privacy Re-confirmation</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.needsPrivacyReconfirmation}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Need Terms Re-confirmation</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.needsTermsReconfirmation}</p>
        </div>
      </div>

      {/* Policy Versions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Policy Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Effective Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requires Re-confirmation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No policy versions yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {policy.policy_type === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Service'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{policy.version}</span>
                    </td>
                    <td className="px-6 py-4">
                      {policy.policy_documents && policy.policy_documents.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {policy.policy_documents[0].is_published ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              Published
                            </span>
                          ) : policy.policy_documents[0].expired_at ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              Expired
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              Draft
                            </span>
                          )}
                          <a
                            href={`/admin?tab=documents`}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            View
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No document</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {new Date(policy.effective_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {policy.requires_reconfirmation ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-fit">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(policy.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(policy.created_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(policy.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Policy Version</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
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
                  Policy Type *
                </label>
                <select
                  required
                  value={formData.policy_type}
                  onChange={(e) => setFormData({ ...formData, policy_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="privacy_policy">Privacy Policy</option>
                  <option value="terms_of_service">Terms of Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version * (e.g., "2.0", "2024-01-15", "v2.1")
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="2.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_reconfirmation"
                  checked={formData.requires_reconfirmation}
                  onChange={(e) => setFormData({ ...formData, requires_reconfirmation: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="requires_reconfirmation" className="text-sm text-gray-700 dark:text-gray-300">
                  Require all users to re-confirm agreement (forces banner to appear)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Create Version
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

