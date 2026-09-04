"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Shield, 
  Users, 
  User,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Search,
  Filter,
  FileText,
  Flag,
  Bell,
  Settings,
  Activity,
  Menu,
  X,
  FolderTree,
  BookOpen,
  Map,
  MessageSquare,
  CreditCard,
  DollarSign,
  Crown,
  BarChart3,
  Star,
  Eye
} from "lucide-react";

// Custom Pound Sterling icon component
const PoundSterling = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>£</span>
);
import { AdminUserManagement } from "@/components/AdminUserManagement";
import { AdminVerificationRequests } from "@/components/AdminVerificationRequests";
import { AdminFileModeration } from "@/components/AdminFileModeration";
import { AdminProfileApprovals } from "@/components/AdminProfileApprovals";
import { AdminReportsModeration } from "@/components/AdminReportsModeration";
import { AdminAnnouncements } from "@/components/AdminAnnouncements";
import { AdminPolicyManagement } from "@/components/AdminPolicyManagement";
import { AdminPolicyDocuments } from "@/components/AdminPolicyDocuments";
import { AdminChangelog } from "@/components/AdminChangelog";
import { AdminStatusPage } from "@/components/AdminStatusPage";
import { AdminContentModeration } from "@/components/AdminContentModeration";
import { AdminDocumentation } from "@/components/AdminDocumentation";
import { AdminRoadmap } from "@/components/AdminRoadmap";
import { AdminSupportTickets } from "@/components/AdminSupportTickets";
import { AdminBilling } from "@/components/AdminBilling";
import { AdminFinancials } from "@/components/AdminFinancials";
import { SuperAdminDashboard } from "@/components/SuperAdminDashboard";
import AdminUserMetrics from "@/components/AdminUserMetrics";
import { AdminVisitorAnalytics } from "@/components/AdminVisitorAnalytics";
import { AdminReviews } from "@/components/AdminReviews";
import { AdminUserModerationAnalytics } from "@/components/AdminUserModerationAnalytics";
import { AdminContentFinder } from "@/components/AdminContentFinder";
import { AdminPlatformDataSearch } from "@/components/AdminPlatformDataSearch";

type TabType = "users" | "profiles" | "verifications" | "moderation" | "files" | "reports" | "announcements" | "policies" | "documents" | "changelog" | "status" | "documentation" | "roadmap" | "support" | "billing" | "financials" | "super-admin" | "user-metrics" | "visitor-analytics" | "reviews" | "moderation-analytics" | "content-finder" | "platform-data-search";

interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  section: string;
}

const tabs: TabConfig[] = [
  { id: "users", label: "User Management", icon: Users, section: "User Management" },
  { id: "profiles", label: "Profile Approvals", icon: User, section: "User Management" },
  { id: "verifications", label: "Verification Requests", icon: CheckCircle2, section: "User Management" },
  { id: "moderation", label: "Content Moderation", icon: Shield, section: "Content Moderation" },
  { id: "content-finder", label: "Content Finder", icon: Search, section: "Content Moderation" },
  { id: "files", label: "File Moderation", icon: FileText, section: "Content Moderation" },
  { id: "reports", label: "Reports", icon: Flag, section: "Content Moderation" },
  { id: "announcements", label: "Announcements", icon: Bell, section: "Content Moderation" },
  { id: "policies", label: "Policy Management", icon: Settings, section: "Policies & Documents" },
  { id: "documents", label: "Policy Documents", icon: BookOpen, section: "Policies & Documents" },
  { id: "changelog", label: "Changelog", icon: FolderTree, section: "System" },
  { id: "status", label: "Status Page", icon: Activity, section: "System" },
  { id: "documentation", label: "Documentation", icon: BookOpen, section: "System" },
  { id: "roadmap", label: "Roadmap", icon: Map, section: "System" },
  { id: "support", label: "Support Tickets", icon: MessageSquare, section: "User Management" },
  { id: "billing", label: "Billing", icon: CreditCard, section: "User Management" },
  { id: "financials", label: "Financials", icon: PoundSterling, section: "Analytics" },
  { id: "user-metrics", label: "User Metrics", icon: BarChart3, section: "Analytics" },
  { id: "visitor-analytics", label: "Visitor Analytics", icon: Eye, section: "Analytics" },
  { id: "moderation-analytics", label: "User Moderation", icon: Shield, section: "Analytics" },
  { id: "reviews", label: "Reviews & Feedback", icon: Star, section: "Content Moderation" },
  { id: "platform-data-search", label: "Platform Data Search", icon: Search, section: "Analytics" },
  { id: "super-admin", label: "Super Admin", icon: Crown, section: "Super Admin" },
];

const sections = ["User Management", "Content Moderation", "Policies & Documents", "System", "Analytics", "Super Admin"];

// Permission mapping for tabs
const tabPermissions: Record<TabType, string> = {
  "users": "users.view",
  "profiles": "profiles.approve",
  "verifications": "verifications.manage",
  "moderation": "content.moderate",
  "files": "files.moderate",
  "reports": "reports.manage",
  "announcements": "announcements.manage",
  "policies": "policies.manage",
  "documents": "documents.manage",
  "changelog": "changelog.manage",
  "status": "status.manage",
  "documentation": "documentation.manage",
  "roadmap": "roadmap.manage",
  "support": "support.manage",
  "billing": "billing.view",
  "financials": "financials.view",
  "user-metrics": "analytics.view",
  "visitor-analytics": "analytics.view",
  "moderation-analytics": "analytics.view",
  "reviews": "reviews.manage",
  "platform-data-search": "analytics.view",
  "content-finder": "content.moderate",
  "super-admin": "roles.manage",
};

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(sections));

  // Open sidebar on desktop by default
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Check for tab parameter in URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && tabs.some(t => t.id === tab)) {
        setActiveTab(tab as TabType);
        // Expand the section containing this tab
        const tabConfig = tabs.find(t => t.id === tab);
        if (tabConfig) {
          setExpandedSections(new Set([tabConfig.section]));
        }
      }
    }
  }, []);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleTabClick = (tabId: TabType) => {
    try {
      setActiveTab(tabId);
      // Update URL without causing navigation
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
      // Expand the section containing this tab
      const tabConfig = tabs.find(t => t.id === tabId);
      if (tabConfig) {
        setExpandedSections(prev => new Set([...prev, tabConfig.section]));
      }
      // Close sidebar on mobile after selecting a tab
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Error handling tab click:", error);
      // Fallback: just set the tab without navigation
      setActiveTab(tabId);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isLoaded || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin, is_super_admin")
          .eq("clerk_id", user.id)
          .single();

        if (error) throw error;

        if (!data?.is_admin && !data?.is_super_admin) {
          router.push("/");
          return;
        }

        setIsAdmin(true);
        setIsSuperAdmin(data?.is_super_admin || false);

        // Load user permissions (super admins get all permissions automatically)
        if (data?.is_super_admin) {
          // Super admins have all permissions - get all permission names from database
          const { data: allPermsData } = await supabase
            .from("admin_permissions")
            .select("name");
          
          if (allPermsData) {
            const allPermNames = allPermsData.map((p: any) => p.name);
            setUserPermissions(new Set(allPermNames));
          } else {
            // Fallback: use tab permissions if database query fails
            const allPermissions = Object.values(tabPermissions);
            setUserPermissions(new Set(allPermissions));
          }
        } else {
          // Load permissions from database
          const { data: permsData, error: permsError } = await supabase.rpc("get_user_permissions", {
            p_clerk_id: user.id,
          });

          if (permsError) {
            console.error("Error loading permissions:", permsError);
            // Fallback: if permission system fails, grant basic access
            setUserPermissions(new Set(["users.view"]));
          } else {
            const permNames = (permsData || []).map((p: any) => p.permission_name);
            setUserPermissions(new Set(permNames));
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, isLoaded, router, supabase]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:static inset-y-0 left-0 z-50 w-64 transition-transform duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-hidden`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {sections.map((section) => {
              // Filter tabs based on permissions (super admins see all)
              const sectionTabs = tabs.filter(tab => {
                if (tab.section !== section) return false;
                if (isSuperAdmin) return true; // Super admins see all tabs
                const requiredPermission = tabPermissions[tab.id];
                return userPermissions.has(requiredPermission);
              });
              
              // Don't show section if no tabs are available
              if (sectionTabs.length === 0) return null;
              
              const isExpanded = expandedSections.has(section);
              
              return (
                <div key={section} className="mb-4">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <span>{section}</span>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      ›
                    </span>
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-1 ml-2 space-y-1">
                      {sectionTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                              isActive
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label || "Admin Dashboard"}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tabs.find(t => t.id === activeTab)?.section || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === "users" && (
              <AdminUserManagement supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "profiles" && (
              <AdminProfileApprovals supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "verifications" && (
              <AdminVerificationRequests supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "moderation" && (
              <AdminContentModeration supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "content-finder" && (
              <AdminContentFinder />
            )}
            {activeTab === "files" && (
              <AdminFileModeration supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "reports" && (
              <AdminReportsModeration supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "announcements" && (
              <AdminAnnouncements supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "policies" && (
              <AdminPolicyManagement supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "documents" && (
              <AdminPolicyDocuments supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "changelog" && (
              <AdminChangelog supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "status" && (
              <AdminStatusPage supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "documentation" && (
              <AdminDocumentation supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "roadmap" && (
              <AdminRoadmap supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "support" && (
              <AdminSupportTickets supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "billing" && (
              <AdminBilling supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "financials" && (
              <AdminFinancials supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "user-metrics" && (
              <AdminUserMetrics />
            )}
            {activeTab === "visitor-analytics" && (
              <AdminVisitorAnalytics />
            )}
            {activeTab === "moderation-analytics" && (
              <AdminUserModerationAnalytics />
            )}
            {activeTab === "reviews" && (
              <AdminReviews supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "platform-data-search" && (
              <AdminPlatformDataSearch supabase={supabase} currentUserId={user?.id || ""} />
            )}
            {activeTab === "super-admin" && isSuperAdmin && (
              <SuperAdminDashboard supabase={supabase} currentUserId={user?.id || ""} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

