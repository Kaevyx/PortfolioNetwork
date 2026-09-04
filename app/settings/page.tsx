"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, 
  Bell, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  Mail, 
  Shield, 
  Palette,
  Moon,
  Sun,
  Save,
  CheckCircle2,
  UserPlus,
  Star,
  MessageCircle,
  Heart,
  Search,
  Activity,
  Layout,
  Sparkles,
  Clock,
  Download,
  Trash2,
  Key,
  Smartphone,
  Languages,
  Volume2,
  VolumeX,
  Briefcase,
  HardDrive,
  Users,
  Ticket,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileCheck,
  FileX,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldX,
  MessageSquare,
  Repeat,
  AtSign,
  Crown
} from "lucide-react";
import { StorageSettingsSection } from "@/components/StorageSettingsSection";
import { VerificationRequestSection } from "@/components/VerificationRequestSection";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspensionWarning } from "@/components/SuspensionWarning";

export default function SettingsPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [userPlan, setUserPlan] = useState<string>("free");
  const supabase = createClient();
  const { isSuspended, reason, endsAt } = useSuspensionCheck();

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "storage", label: "Storage", icon: HardDrive },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "account", label: "Account", icon: Key },
    { id: "content", label: "Content", icon: Globe },
    { id: "data", label: "Data & Privacy", icon: Download },
  ];

  // Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    showEmail: true,
    showLocation: true,
    showWebsite: true,
    allowMessages: true,
    allowReviews: true,
    showPortfolio: true,
    showEmploymentStatus: true,
    showPlanBadge: true, // Show Pro/Ultimate badge on profile
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true, // Coming Soon
    pushNotifications: true,
    inAppNotifications: true,
    // Event subscriptions
    newFollower: true,
    newConnection: true,
    newReview: true,
    newComment: true,
    newLike: true,
    newMessage: true,
    newMention: true,
    newRepost: true,
    ticketCreated: true,
    ticketAssigned: true,
    ticketReplied: true,
    ticketStatusChanged: true,
    ticketClosed: true,
    warningIssued: true,
    accountSuspended: true,
    accountUnsuspended: true,
    fileApproved: true,
    fileRejected: true,
    profileApproved: true,
    profileRejected: true,
    verificationApproved: true,
    verificationRejected: true,
    reportResolved: true,
    reportDismissed: true,
    contentRemoved: true,
    adminWarning: true,
    adminNotification: true,
    weeklyDigest: false, // Coming Soon
    marketingEmails: false, // Coming Soon
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public", // public, followers, private
    showOnlineStatus: true,
    allowSearch: true,
    showInNearbyUsers: true, // Show in "Users Near You" section
    showActivity: true,
  });

  // Appearance Settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "system", // light, dark, system
    compactMode: false,
    showAnimations: true,
    fontSize: "medium", // small, medium, large
    language: "en", // Coming Soon
  });

  // Account Settings
  const [accountSettings, setAccountSettings] = useState({
    twoFactorAuth: false, // Coming Soon
    sessionTimeout: 30, // minutes
    deleteAccount: false, // Coming Soon
  });

  // Content Settings
  const [contentSettings, setContentSettings] = useState({
    autoPlayVideos: false,
    showSensitiveContent: false,
    contentLanguage: "all", // all, english, etc.
  });

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from("profiles")
          .select("settings, subscription_plan")
          .eq("clerk_id", user.id)
          .single();

        // Set user plan (always update, even if null/undefined, default to "free")
        setUserPlan(data?.subscription_plan || "free");

        if (data?.settings) {
          const settings = data.settings;
          if (settings.profile) {
            setProfileSettings({ 
              ...profileSettings, 
              ...settings.profile,
              // Ensure showPlanBadge defaults to true if not set
              showPlanBadge: settings.profile.showPlanBadge !== false
            });
          }
          if (settings.notifications) {
            setNotificationSettings((prev) => ({
              ...prev,
              ...settings.notifications,
              // Ensure all new fields have defaults if not present
              newConnection: settings.notifications.newConnection ?? true,
              newMention: settings.notifications.newMention ?? true,
              newRepost: settings.notifications.newRepost ?? true,
              ticketCreated: settings.notifications.ticketCreated ?? true,
              ticketAssigned: settings.notifications.ticketAssigned ?? true,
              ticketReplied: settings.notifications.ticketReplied ?? true,
              ticketStatusChanged: settings.notifications.ticketStatusChanged ?? true,
              ticketClosed: settings.notifications.ticketClosed ?? true,
              warningIssued: settings.notifications.warningIssued ?? true,
              accountSuspended: settings.notifications.accountSuspended ?? true,
              accountUnsuspended: settings.notifications.accountUnsuspended ?? true,
              fileApproved: settings.notifications.fileApproved ?? true,
              fileRejected: settings.notifications.fileRejected ?? true,
              profileApproved: settings.notifications.profileApproved ?? true,
              profileRejected: settings.notifications.profileRejected ?? true,
              verificationApproved: settings.notifications.verificationApproved ?? true,
              verificationRejected: settings.notifications.verificationRejected ?? true,
              reportResolved: settings.notifications.reportResolved ?? true,
              reportDismissed: settings.notifications.reportDismissed ?? true,
              contentRemoved: settings.notifications.contentRemoved ?? true,
              adminWarning: settings.notifications.adminWarning ?? true,
              adminNotification: settings.notifications.adminNotification ?? true,
            }));
          }
          if (settings.privacy) {
            setPrivacySettings({ 
              ...privacySettings, 
              ...settings.privacy,
              showInNearbyUsers: settings.privacy.showInNearbyUsers ?? true, // Default to true if not set
            });
          }
          if (settings.appearance) {
            setAppearanceSettings({ ...appearanceSettings, ...settings.appearance });
          }
          if (settings.account) {
            setAccountSettings({ ...accountSettings, ...settings.account });
          }
          if (settings.content) {
            setContentSettings({ ...contentSettings, ...settings.content });
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    if (user?.id) {
      loadSettings();
      
      // Refresh plan periodically (every 30 seconds) to catch plan changes
      const planRefreshInterval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("clerk_id", user.id)
            .single();
          
          if (data?.subscription_plan) {
            setUserPlan(data.subscription_plan);
          } else {
            setUserPlan("free");
          }
        } catch (error) {
          // Silently fail - don't spam console
        }
      }, 30000); // Check every 30 seconds

      // Also refresh when page becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          loadSettings();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(planRefreshInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Apply appearance settings
  useEffect(() => {
    // Apply theme
    if (appearanceSettings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (appearanceSettings.theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    // Apply font size
    document.documentElement.classList.remove("font-size-small", "font-size-medium", "font-size-large");
    document.documentElement.classList.add(`font-size-${appearanceSettings.fontSize}`);

    // Apply compact mode
    if (appearanceSettings.compactMode) {
      document.documentElement.classList.add("compact-mode");
    } else {
      document.documentElement.classList.remove("compact-mode");
    }

    // Apply animations
    if (!appearanceSettings.showAnimations) {
      document.documentElement.classList.add("no-animations");
    } else {
      document.documentElement.classList.remove("no-animations");
    }
  }, [appearanceSettings]);

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Prepare settings object, filtering out "Coming Soon" features that shouldn't be saved
      const settingsToSave = {
        profile: profileSettings,
        notifications: {
          // Delivery methods
          inAppNotifications: notificationSettings.inAppNotifications,
          pushNotifications: notificationSettings.pushNotifications,
          emailNotifications: notificationSettings.emailNotifications,
          // Event subscriptions
          newFollower: notificationSettings.newFollower,
          newConnection: notificationSettings.newConnection,
          newReview: notificationSettings.newReview,
          newComment: notificationSettings.newComment,
          newLike: notificationSettings.newLike,
          newMessage: notificationSettings.newMessage,
          newMention: notificationSettings.newMention,
          newRepost: notificationSettings.newRepost,
          ticketCreated: notificationSettings.ticketCreated,
          ticketAssigned: notificationSettings.ticketAssigned,
          ticketReplied: notificationSettings.ticketReplied,
          ticketStatusChanged: notificationSettings.ticketStatusChanged,
          ticketClosed: notificationSettings.ticketClosed,
          warningIssued: notificationSettings.warningIssued,
          accountSuspended: notificationSettings.accountSuspended,
          accountUnsuspended: notificationSettings.accountUnsuspended,
          fileApproved: notificationSettings.fileApproved,
          fileRejected: notificationSettings.fileRejected,
          profileApproved: notificationSettings.profileApproved,
          profileRejected: notificationSettings.profileRejected,
          verificationApproved: notificationSettings.verificationApproved,
          verificationRejected: notificationSettings.verificationRejected,
          reportResolved: notificationSettings.reportResolved,
          reportDismissed: notificationSettings.reportDismissed,
          contentRemoved: notificationSettings.contentRemoved,
          adminWarning: notificationSettings.adminWarning,
          adminNotification: notificationSettings.adminNotification,
          // Email preferences
          weeklyDigest: notificationSettings.weeklyDigest,
          marketingEmails: notificationSettings.marketingEmails,
        },
        privacy: privacySettings,
        appearance: appearanceSettings,
        account: {
          sessionTimeout: accountSettings.sessionTimeout,
          // Coming Soon - don't save
          twoFactorAuth: accountSettings.twoFactorAuth,
        },
        content: contentSettings,
      };

      // Use upsert to handle cases where profile might not have settings yet
      const { error } = await supabase
        .from("profiles")
        .update({
          settings: settingsToSave,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_id", user.id);

      if (error) {
        console.error("Error saving settings:", error);
        // Try upsert as fallback
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            clerk_id: user.id,
            settings: settingsToSave,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "clerk_id",
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      // Reload plan after saving to catch any plan changes
      const { data: updatedData } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("clerk_id", user.id)
        .single();
      
      if (updatedData?.subscription_plan) {
        setUserPlan(updatedData.subscription_plan);
      } else {
        setUserPlan("free");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(`Failed to save settings: ${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to access settings</p>
      </div>
    );
  }

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap border-b-2 ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                      : "text-gray-600 dark:text-gray-400 border-transparent hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Settings */}
        {activeTab === "profile" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
          </div>
          <div className="space-y-4">
            <SettingToggle
              label="Show Email Address"
              description="Display your email on your public profile"
              checked={profileSettings.showEmail}
              onChange={(checked) => setProfileSettings({ ...profileSettings, showEmail: checked })}
              icon={<Mail className="w-5 h-5" />}
              disabled={isSuspended}
            />
            <SettingToggle
              label="Show Location"
              description="Display your location on your profile"
              checked={profileSettings.showLocation}
              onChange={(checked) => setProfileSettings({ ...profileSettings, showLocation: checked })}
              icon={<Globe className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Website"
              description="Display your website link on your profile"
              checked={profileSettings.showWebsite}
              onChange={(checked) => setProfileSettings({ ...profileSettings, showWebsite: checked })}
              icon={<Globe className="w-5 h-5" />}
            />
            <SettingToggle
              label="Allow Messages"
              description="Let others send you messages"
              checked={profileSettings.allowMessages}
              onChange={(checked) => setProfileSettings({ ...profileSettings, allowMessages: checked })}
              icon={<Mail className="w-5 h-5" />}
            />
            <SettingToggle
              label="Allow Reviews"
              description="Let others leave reviews on your profile"
              checked={profileSettings.allowReviews}
              onChange={(checked) => setProfileSettings({ ...profileSettings, allowReviews: checked })}
              icon={<Star className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Portfolio"
              description="Display your portfolio on your profile page"
              checked={profileSettings.showPortfolio}
              onChange={(checked) => setProfileSettings({ ...profileSettings, showPortfolio: checked })}
              icon={<Layout className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Employment Status"
              description="Display your employment status badge on your profile"
              checked={profileSettings.showEmploymentStatus}
              onChange={(checked) => setProfileSettings({ ...profileSettings, showEmploymentStatus: checked })}
              icon={<Briefcase className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Plan Badge"
              description={
                userPlan === "free" 
                  ? "Upgrade to Pro or Ultimate to display a plan badge on your profile"
                  : "Display your Pro or Ultimate plan badge on your profile"
              }
              checked={profileSettings.showPlanBadge}
              onChange={(checked) => setProfileSettings({ ...profileSettings, showPlanBadge: checked })}
              icon={<Crown className="w-5 h-5" />}
              disabled={userPlan === "free" || isSuspended}
            />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Notification Settings */}
        {activeTab === "notifications" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            <SettingToggle
              label="In-App Notifications"
              description="Receive notifications in the app"
              checked={notificationSettings.inAppNotifications}
              onChange={(checked) => setNotificationSettings({ ...notificationSettings, inAppNotifications: checked })}
              icon={<Bell className="w-5 h-5" />}
            />
            <SettingToggle
              label="Push Notifications"
              description="Receive push notifications on your device"
              checked={notificationSettings.pushNotifications}
              onChange={(checked) => setNotificationSettings({ ...notificationSettings, pushNotifications: checked })}
              icon={<Smartphone className="w-5 h-5" />}
            />
            <SettingToggle
              label="Email Notifications"
              description="Receive notifications via email"
              checked={notificationSettings.emailNotifications}
              onChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
              icon={<Mail className="w-5 h-5" />}
              comingSoon={true}
            />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Event Subscriptions</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Choose which events you want to be notified about
              </p>
              
              {/* Social Events */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Social & Interactions
                </h5>
                <div className="space-y-3">
                  <SettingToggle
                    label="New Follower"
                    description="When someone follows you"
                    checked={notificationSettings.newFollower}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newFollower: checked })}
                    icon={<UserPlus className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Connection"
                    description="When you connect with someone (mutual follow)"
                    checked={notificationSettings.newConnection}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newConnection: checked })}
                    icon={<Users className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Comment"
                    description="When someone comments on your posts"
                    checked={notificationSettings.newComment}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newComment: checked })}
                    icon={<MessageCircle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Like/Reaction"
                    description="When someone reacts to your posts"
                    checked={notificationSettings.newLike}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newLike: checked })}
                    icon={<Heart className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Mention"
                    description="When someone mentions you"
                    checked={notificationSettings.newMention}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newMention: checked })}
                    icon={<AtSign className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Repost"
                    description="When someone reposts your content"
                    checked={notificationSettings.newRepost}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newRepost: checked })}
                    icon={<Repeat className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Review"
                    description="When someone leaves you a review"
                    checked={notificationSettings.newReview}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newReview: checked })}
                    icon={<Star className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="New Message"
                    description="When you receive a direct message"
                    checked={notificationSettings.newMessage}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newMessage: checked })}
                    icon={<MessageSquare className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Support Tickets */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  Support Tickets
                </h5>
                <div className="space-y-3">
                  <SettingToggle
                    label="Ticket Created"
                    description="When a new support ticket is created"
                    checked={notificationSettings.ticketCreated}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, ticketCreated: checked })}
                    icon={<Ticket className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Ticket Assigned"
                    description="When a ticket is assigned to you"
                    checked={notificationSettings.ticketAssigned}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, ticketAssigned: checked })}
                    icon={<Ticket className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Ticket Reply"
                    description="When someone replies to your ticket"
                    checked={notificationSettings.ticketReplied}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, ticketReplied: checked })}
                    icon={<MessageCircle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Ticket Status Changed"
                    description="When your ticket status changes"
                    checked={notificationSettings.ticketStatusChanged}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, ticketStatusChanged: checked })}
                    icon={<Activity className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Ticket Closed"
                    description="When your ticket is closed"
                    checked={notificationSettings.ticketClosed}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, ticketClosed: checked })}
                    icon={<CheckCircle className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Account & Moderation */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Account & Moderation
                </h5>
                <div className="space-y-3">
                  <SettingToggle
                    label="Warning Issued"
                    description="When you receive a warning"
                    checked={notificationSettings.warningIssued}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, warningIssued: checked })}
                    icon={<AlertTriangle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Account Suspended"
                    description="When your account is suspended"
                    checked={notificationSettings.accountSuspended}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, accountSuspended: checked })}
                    icon={<XCircle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Account Unsuspended"
                    description="When your account suspension is lifted"
                    checked={notificationSettings.accountUnsuspended}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, accountUnsuspended: checked })}
                    icon={<CheckCircle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Content Removed"
                    description="When your content is removed"
                    checked={notificationSettings.contentRemoved}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, contentRemoved: checked })}
                    icon={<XCircle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Admin Warning"
                    description="Important warnings from administrators"
                    checked={notificationSettings.adminWarning}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, adminWarning: checked })}
                    icon={<AlertTriangle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Admin Notifications"
                    description="General notifications from administrators"
                    checked={notificationSettings.adminNotification}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, adminNotification: checked })}
                    icon={<Bell className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Verification & Files */}
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Verification & Files
                </h5>
                <div className="space-y-3">
                  <SettingToggle
                    label="File Approved"
                    description="When your file upload is approved"
                    checked={notificationSettings.fileApproved}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, fileApproved: checked })}
                    icon={<FileCheck className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="File Rejected"
                    description="When your file upload is rejected"
                    checked={notificationSettings.fileRejected}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, fileRejected: checked })}
                    icon={<FileX className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Profile Approved"
                    description="When your profile is approved"
                    checked={notificationSettings.profileApproved}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, profileApproved: checked })}
                    icon={<UserCheck className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Profile Rejected"
                    description="When your profile is rejected"
                    checked={notificationSettings.profileRejected}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, profileRejected: checked })}
                    icon={<UserX className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Verification Approved"
                    description="When your verification is approved"
                    checked={notificationSettings.verificationApproved}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, verificationApproved: checked })}
                    icon={<ShieldCheck className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Verification Rejected"
                    description="When your verification is rejected"
                    checked={notificationSettings.verificationRejected}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, verificationRejected: checked })}
                    icon={<ShieldX className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Report Resolved"
                    description="When a report about you is resolved"
                    checked={notificationSettings.reportResolved}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, reportResolved: checked })}
                    icon={<CheckCircle className="w-5 h-5" />}
                  />
                  <SettingToggle
                    label="Report Dismissed"
                    description="When a report about you is dismissed"
                    checked={notificationSettings.reportDismissed}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, reportDismissed: checked })}
                    icon={<XCircle className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Email Preferences */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Email Preferences</h5>
                <div className="space-y-3">
                  <SettingToggle
                    label="Weekly Digest"
                    description="Receive a weekly summary of your activity"
                    checked={notificationSettings.weeklyDigest}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, weeklyDigest: checked })}
                    icon={<Mail className="w-5 h-5" />}
                    comingSoon={true}
                  />
                  <SettingToggle
                    label="Marketing Emails"
                    description="Receive updates about new features and tips"
                    checked={notificationSettings.marketingEmails}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, marketingEmails: checked })}
                    icon={<Mail className="w-5 h-5" />}
                    comingSoon={true}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Privacy Settings */}
        {activeTab === "privacy" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Privacy</h2>
          </div>
          <div className="space-y-4">
            <SettingSelect
              label="Profile Visibility"
              description="Who can view your profile"
              value={privacySettings.profileVisibility}
              onChange={(value) => setPrivacySettings({ ...privacySettings, profileVisibility: value })}
              options={[
                { value: "public", label: "Public" },
                { value: "followers", label: "Followers Only" },
                { value: "private", label: "Private" },
              ]}
            />
            <SettingToggle
              label="Show Online Status"
              description="Let others see when you're online"
              checked={privacySettings.showOnlineStatus}
              onChange={(checked) => setPrivacySettings({ ...privacySettings, showOnlineStatus: checked })}
              icon={<Eye className="w-5 h-5" />}
            />
            <SettingToggle
              label="Allow Search"
              description="Allow your profile to appear in search results"
              checked={privacySettings.allowSearch}
              onChange={(checked) => setPrivacySettings({ ...privacySettings, allowSearch: checked })}
              icon={<Search className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show in Users Near You"
              description="Allow your profile to appear in the 'Users Near You' section for location-based discovery"
              checked={privacySettings.showInNearbyUsers}
              onChange={(checked) => setPrivacySettings({ ...privacySettings, showInNearbyUsers: checked })}
              icon={<Users className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Activity"
              description="Display your recent activity on your profile"
              checked={privacySettings.showActivity}
              onChange={(checked) => setPrivacySettings({ ...privacySettings, showActivity: checked })}
              icon={<Activity className="w-5 h-5" />}
            />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Appearance Settings */}
        {activeTab === "appearance" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          <div className="space-y-4">
            <SettingSelect
              label="Theme"
              description="Choose your preferred theme"
              value={appearanceSettings.theme}
              onChange={(value) => {
                setAppearanceSettings({ ...appearanceSettings, theme: value });
                // Apply theme immediately
                if (value === "dark") {
                  document.documentElement.classList.add("dark");
                  localStorage.setItem('theme', 'dark');
                } else if (value === "light") {
                  document.documentElement.classList.remove("dark");
                  localStorage.setItem('theme', 'light');
                } else {
                  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  if (prefersDark) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                  localStorage.setItem('theme', 'system');
                }
              }}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
            <SettingSelect
              label="Font Size"
              description="Adjust the text size"
              value={appearanceSettings.fontSize}
              onChange={(value) => setAppearanceSettings({ ...appearanceSettings, fontSize: value })}
              options={[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
            />
            <SettingToggle
              label="Compact Mode"
              description="Use a more compact layout"
              checked={appearanceSettings.compactMode}
              onChange={(checked) => setAppearanceSettings({ ...appearanceSettings, compactMode: checked })}
              icon={<Layout className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Animations"
              description="Enable animations and transitions"
              checked={appearanceSettings.showAnimations}
              onChange={(checked) => setAppearanceSettings({ ...appearanceSettings, showAnimations: checked })}
              icon={<Sparkles className="w-5 h-5" />}
            />
            <SettingSelect
              label="Language"
              description="Choose your preferred language"
              value={appearanceSettings.language}
              onChange={(value) => setAppearanceSettings({ ...appearanceSettings, language: value })}
              options={[
                { value: "en", label: "English" },
                { value: "es", label: "Spanish" },
                { value: "fr", label: "French" },
                { value: "de", label: "German" },
              ]}
              comingSoon={true}
            />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Account Settings */}
        {activeTab === "account" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Account</h2>
          </div>
          
          {/* Verification Section */}
          <div id="verification" className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Account Verification
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get verified to show you're authentic and build trust with your network
                </p>
              </div>
            </div>
            <VerificationRequestSection supabase={supabase} userId={user?.id || ""} />
          </div>
          
          <div className="space-y-4">
            <SettingToggle
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
              checked={accountSettings.twoFactorAuth}
              onChange={(checked) => setAccountSettings({ ...accountSettings, twoFactorAuth: checked })}
              icon={<Shield className="w-5 h-5" />}
              comingSoon={true}
            />
            <SettingSelect
              label="Session Timeout"
              description="Automatically log out after inactivity"
              value={accountSettings.sessionTimeout.toString()}
              onChange={(value) => setAccountSettings({ ...accountSettings, sessionTimeout: parseInt(value) })}
              options={[
                { value: "15", label: "15 minutes" },
                { value: "30", label: "30 minutes" },
                { value: "60", label: "1 hour" },
                { value: "120", label: "2 hours" },
                { value: "0", label: "Never" },
              ]}
            />
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Delete Account</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const confirmText = prompt('Type "DELETE MY ACCOUNT" to confirm account deletion. This will delete ALL your data including files, posts, and your Clerk account.');
                    if (confirmText !== "DELETE MY ACCOUNT") {
                      alert("Deletion cancelled. You must type 'DELETE MY ACCOUNT' exactly to confirm.");
                      return;
                    }
                    if (!confirm("Are you absolutely sure? This will permanently delete:\n- All files and storage\n- All posts, comments, reviews\n- All connections and follows\n- Your Clerk account\n\nThis cannot be undone!")) {
                      return;
                    }
                    try {
                      setLoading(true);
                      const response = await fetch("/api/user/delete-account", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ confirmText: "DELETE MY ACCOUNT" }),
                      });
                      if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || "Failed to delete account");
                      }
                      alert("Account deletion initiated. You will be signed out.");
                      window.location.href = "/sign-in";
                    } catch (error: any) {
                      alert("Failed to delete account: " + error.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {loading ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Content Settings */}
        {activeTab === "content" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Content</h2>
          </div>
          <div className="space-y-4">
            <SettingToggle
              label="Auto-play Videos"
              description="Automatically play videos in posts"
              checked={contentSettings.autoPlayVideos}
              onChange={(checked) => setContentSettings({ ...contentSettings, autoPlayVideos: checked })}
              icon={<Volume2 className="w-5 h-5" />}
            />
            <SettingToggle
              label="Show Sensitive Content"
              description="Display content that may be sensitive"
              checked={contentSettings.showSensitiveContent}
              onChange={(checked) => setContentSettings({ ...contentSettings, showSensitiveContent: checked })}
              icon={<Eye className="w-5 h-5" />}
            />
            <SettingSelect
              label="Content Language"
              description="Filter content by language"
              value={contentSettings.contentLanguage}
              onChange={(value) => setContentSettings({ ...contentSettings, contentLanguage: value })}
              options={[
                { value: "all", label: "All Languages" },
                { value: "en", label: "English Only" },
                { value: "es", label: "Spanish Only" },
                { value: "fr", label: "French Only" },
              ]}
            />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Storage Settings */}
        {activeTab === "storage" && (
          <StorageSettingsSection supabase={supabase} userId={user?.id || ""} />
        )}

        {/* Data & Privacy */}
        {activeTab === "data" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Data & Privacy</h2>
          </div>
          <div className="space-y-4">
            <button
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <div className="font-semibold text-gray-500 dark:text-gray-400">Download Your Data</div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">Get a copy of all your data</div>
                </div>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">
                Coming Soon
              </span>
            </button>
            <button
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              disabled
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <div className="font-semibold text-gray-500 dark:text-gray-400">Clear All Data</div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">Remove all your posts and activity</div>
                </div>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">
                Coming Soon
              </span>
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}

        {/* Save Success Message */}
        {saved && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-fade-in z-50">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Settings saved successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function SettingToggle({ 
  label, 
  description, 
  checked, 
  onChange, 
  icon,
  comingSoon = false,
  disabled = false
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  comingSoon?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = comingSoon || disabled;
  
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl ${
      isDisabled 
        ? "bg-gray-100 dark:bg-gray-800/50 opacity-60" 
        : "bg-gray-50 dark:bg-gray-700/50"
    }`}>
      <div className="flex items-center gap-3 flex-1">
        <div className={`${isDisabled ? "text-gray-400" : "text-indigo-600 dark:text-indigo-400"}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={`font-semibold ${isDisabled ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
              {label}
            </div>
            {comingSoon && (
              <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                Coming Soon
              </span>
            )}
          </div>
          <div className={`text-sm ${isDisabled ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
            {description}
          </div>
        </div>
      </div>
      <button
        onClick={() => !isDisabled && onChange(!checked)}
        disabled={isDisabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isDisabled 
            ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50" 
            : checked 
              ? "bg-indigo-600" 
              : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SettingSelect({
  label,
  description,
  value,
  onChange,
  options,
  comingSoon = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  comingSoon?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl ${
      comingSoon 
        ? "bg-gray-100 dark:bg-gray-800/50 opacity-60" 
        : "bg-gray-50 dark:bg-gray-700/50"
    }`}>
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <div className={`font-semibold ${comingSoon ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
            {label}
          </div>
          {comingSoon && (
            <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
              Coming Soon
            </span>
          )}
        </div>
        <div className={`text-sm ${comingSoon ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
          {description}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => !comingSoon && onChange(e.target.value)}
        disabled={comingSoon}
        className={`mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 ${
          comingSoon ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

