"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Twitter, Instagram, Youtube, Linkedin, Facebook, Github, MessageCircle, Twitch, Users, Plus, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";
import { SocialMediaAccountForm } from "@/components/SocialMediaAccountForm";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  followers_count: number;
  following_count: number;
  subscribers_count: number;
  members_count: number;
  posts_count: number;
  verified: boolean;
}

const PLATFORMS = {
  twitter: { name: 'Twitter', icon: Twitter, color: 'text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-900/20' },
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  facebook: { name: 'Facebook', icon: Facebook, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  github: { name: 'GitHub', icon: Github, color: 'text-gray-800 dark:text-gray-200', bgColor: 'bg-gray-50 dark:bg-gray-700/50' },
  discord: { name: 'Discord', icon: MessageCircle, color: 'text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
  twitch: { name: 'Twitch', icon: Twitch, color: 'text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  tiktok: { name: 'TikTok', icon: Users, color: 'text-black dark:text-white', bgColor: 'bg-gray-50 dark:bg-gray-700/50' },
};

export function SocialMediaConnections({ profileId }: { profileId?: string }) {
  const { user, isLoaded } = useUser();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();
  
  const isOwnProfile = !profileId || profileId === user?.id;

  useEffect(() => {
    if (!isLoaded) return;
    
    const userId = profileId || user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from("social_media_accounts")
          .select("*")
          .eq("profile_id", userId)
          .order("created_at", { ascending: false });

        if (error && error.code !== 'PGRST116') {
          console.error("Error loading social accounts:", error);
        }

        setAccounts(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`social-media-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "social_media_accounts",
          filter: `profile_id=eq.${userId}`,
        },
        () => {
          loadAccounts();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id, profileId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleAccountAdded = () => {
    setIsAdding(false);
    // Reload will happen via real-time subscription
  };

  if (accounts.length === 0 && !isAdding) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Social Media</h3>
          {isOwnProfile && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No social media accounts connected</p>
        {isOwnProfile && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Or <Link href="/profile/edit" className="text-indigo-600 dark:text-indigo-400 hover:underline">edit your profile</Link> to add social media accounts
          </p>
        )}
      </div>
    );
  }

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS[platform as keyof typeof PLATFORMS] || { name: platform, icon: ExternalLink, color: 'text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-700/50' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Social Media</h3>
        {isOwnProfile && (
          <div className="flex items-center gap-2">
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            )}
            <Link
              href="/profile/edit"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Edit in profile settings"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
      
      {isAdding && isOwnProfile && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Add Social Media Account</h4>
            <button
              onClick={() => setIsAdding(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
          <SocialMediaAccountForm
            profileId={user?.id}
            onAccountAdded={handleAccountAdded}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}
      
      <div className="space-y-3">
        {accounts.map((account) => {
          const platformInfo = getPlatformInfo(account.platform);
          const Icon = platformInfo.icon;

          return (
            <div
              key={account.id}
              className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${platformInfo.bgColor}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${platformInfo.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {platformInfo.name}
                      </span>
                      {account.verified && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">@{account.username}</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {account.followers_count > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {account.followers_count.toLocaleString()}
                    </p>
                  </div>
                )}
                {account.following_count > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {account.following_count.toLocaleString()}
                    </p>
                  </div>
                )}
                {account.subscribers_count > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Subscribers</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {account.subscribers_count.toLocaleString()}
                    </p>
                  </div>
                )}
                {account.members_count > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {account.members_count.toLocaleString()}
                    </p>
                  </div>
                )}
                {account.posts_count > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Posts</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {account.posts_count.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

