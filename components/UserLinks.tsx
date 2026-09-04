"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Plus, X, ExternalLink, Edit2, Trash2, Link2 } from "lucide-react";

interface UserLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  click_count: number;
}

export function UserLinks({ profileId, isOwnProfile }: { profileId: string; isOwnProfile: boolean }) {
  const { user } = useUser();
  const [links, setLinks] = useState<UserLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    url: "",
    icon: "",
  });

  useEffect(() => {
    loadLinks();
  }, [profileId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("user_links")
        .select("*")
        .eq("profile_id", profileId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error loading links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwnProfile) return;

    try {
      if (editingId) {
        // Update existing link
        const { error } = await supabase
          .from("user_links")
          .update({
            title: formData.title,
            url: formData.url,
            icon: formData.icon || null,
          })
          .eq("id", editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new link
        const maxOrder = links.length > 0 ? Math.max(...links.map(l => l.display_order)) : 0;
        const { error } = await supabase
          .from("user_links")
          .insert({
            profile_id: user.id,
            title: formData.title,
            url: formData.url,
            icon: formData.icon || null,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        setIsAdding(false);
      }

      setFormData({ title: "", url: "", icon: "" });
      loadLinks();
    } catch (error) {
      console.error("Error saving link:", error);
      alert("Failed to save link. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const { error } = await supabase
        .from("user_links")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      loadLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
      alert("Failed to delete link. Please try again.");
    }
  };

  const handleEdit = (link: UserLink) => {
    setFormData({
      title: link.title,
      url: link.url,
      icon: link.icon || "",
    });
    setEditingId(link.id);
    setIsAdding(true);
  };

  const handleLinkClick = async (linkId: string, url: string) => {
    // Always open the link (users can click multiple times)
    window.open(url, "_blank", "noopener,noreferrer");
    
    // Track the click (only first click per user will be counted)
    try {
      const response = await fetch("/api/track-link-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });

      if (response.ok) {
        // Reload links to update click count (if it was counted)
        const data = await response.json();
        if (data.counted) {
          loadLinks();
        }
      }
    } catch (error) {
      console.error("Error tracking click:", error);
      // Link already opened, tracking is optional
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading links...</div>;
  }

  return (
    <div className="space-y-4">
      {isOwnProfile && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            My Links
          </h3>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
          )}
        </div>
      )}

      {isOwnProfile && isAdding && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="e.g., My Website, LinkedIn, Portfolio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon (Optional - emoji or icon name)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="🔗 or link"
                maxLength={2}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
              >
                {editingId ? "Update Link" : "Add Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({ title: "", url: "", icon: "" });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
            >
              <button
                onClick={() => handleLinkClick(link.id, link.url)}
                className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-lg">
                  {link.icon || "🔗"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {link.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {link.url}
                  </p>
                  {isOwnProfile && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {link.click_count} {link.click_count === 1 ? "click" : "clicks"}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </button>
              {isOwnProfile && (
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => handleEdit(link)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {isOwnProfile ? "No links added yet. Add your first link!" : "No links available."}
          </div>
        )
      )}
    </div>
  );
}

