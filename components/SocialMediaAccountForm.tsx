"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Twitter, Instagram, Youtube, Linkedin, Facebook, Github, MessageCircle, Twitch, X } from "lucide-react";

interface SocialAccount {
  id?: string;
  platform: string;
  username: string;
  followers_count: number;
  following_count: number;
  subscribers_count: number;
  members_count: number;
  posts_count: number;
  verified: boolean;
}

interface SocialMediaAccountFormProps {
  account?: SocialAccount | null;
  profileId?: string;
  onSave?: (account: SocialAccount) => void;
  onAccountAdded?: () => void;
  onCancel: () => void;
}

const PLATFORMS = [
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'discord', label: 'Discord', icon: MessageCircle },
  { value: 'twitch', label: 'Twitch', icon: Twitch },
  { value: 'tiktok', label: 'TikTok', icon: X },
];

export function SocialMediaAccountForm({ account, profileId, onSave, onAccountAdded, onCancel }: SocialMediaAccountFormProps) {
  const [formData, setFormData] = useState<SocialAccount>(account || {
    platform: '',
    username: '',
    followers_count: 0,
    following_count: 0,
    subscribers_count: 0,
    members_count: 0,
    posts_count: 0,
    verified: false,
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform || !formData.username) {
      alert("Please fill in platform and username");
      return;
    }

    // If onSave is provided (for edit page), use it
    if (onSave) {
      onSave({ ...formData, id: account?.id });
      return;
    }

    // Otherwise, save directly to database
    if (!profileId) {
      alert("Profile ID is required");
      return;
    }

    setSaving(true);
    try {
      if (account?.id) {
        // Update existing
        const { error } = await supabase
          .from("social_media_accounts")
          .update({
            platform: formData.platform,
            username: formData.username,
            followers_count: formData.followers_count,
            following_count: formData.following_count,
            subscribers_count: formData.subscribers_count,
            members_count: formData.members_count,
            posts_count: formData.posts_count,
            verified: formData.verified,
          })
          .eq("id", account.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("social_media_accounts")
          .insert({
            profile_id: profileId,
            platform: formData.platform,
            username: formData.username,
            followers_count: formData.followers_count,
            following_count: formData.following_count,
            subscribers_count: formData.subscribers_count,
            members_count: formData.members_count,
            posts_count: formData.posts_count,
            verified: formData.verified,
          });

        if (error) throw error;
      }

      if (onAccountAdded) {
        onAccountAdded();
      }
    } catch (error) {
      console.error("Error saving social media account:", error);
      alert("Failed to save social media account. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Platform <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.platform}
          onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select platform</option>
          {PLATFORMS.map((platform) => (
            <option key={platform.value} value={platform.value}>
              {platform.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Username <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          placeholder="@username"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Followers
          </label>
          <input
            type="number"
            value={formData.followers_count}
            onChange={(e) => setFormData({ ...formData, followers_count: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Following
          </label>
          <input
            type="number"
            value={formData.following_count}
            onChange={(e) => setFormData({ ...formData, following_count: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            min="0"
          />
        </div>
        {(formData.platform === 'youtube' || formData.platform === 'twitch') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subscribers
            </label>
            <input
              type="number"
              value={formData.subscribers_count}
              onChange={(e) => setFormData({ ...formData, subscribers_count: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              min="0"
            />
          </div>
        )}
        {formData.platform === 'discord' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Members
            </label>
            <input
              type="number"
              value={formData.members_count}
              onChange={(e) => setFormData({ ...formData, members_count: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              min="0"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Posts
          </label>
          <input
            type="number"
            value={formData.posts_count}
            onChange={(e) => setFormData({ ...formData, posts_count: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            min="0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="verified"
          checked={formData.verified}
          onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
        />
        <label htmlFor="verified" className="text-sm text-gray-700 dark:text-gray-300">
          Verified on this platform
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : account ? "Update" : "Add"} Account
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

