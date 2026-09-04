"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Activity,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Heart,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { RelativeTime } from "@/components/RelativeTime";

interface StatusBannerProps {
  type?: "banner" | "card" | "modal";
  renderLocation?: "layout" | "page"; // Indicates where the component is being rendered from
}

interface StatusBannerSettings {
  is_enabled: boolean;
  show_incidents: boolean;
  only_show_when_issues: boolean;
  banner_type: "banner" | "card" | "modal";
  refresh_interval?: number;
  max_incidents?: number;
  min_incident_severity?: string;
  min_status_threshold?: string;
  banner_position?: string;
  modal_position?: "bottom-left" | "bottom-right";
  custom_status_messages?: Record<string, string>;
  custom_status_page_url?: string;
  custom_status_page_link_text?: string;
  display_on_all_pages?: boolean;
  visible_to_roles?: string[];
  visible_to_plans?: string[];
  time_based_rules?: {
    enabled: boolean;
    days: number[];
    start_hour: number;
    end_hour: number;
    timezone: string;
  };
}

interface ActiveIncident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  impact_scope: string | null;
  affected_components: string[];
  started_at: string;
  updates?: Array<{
    message: string;
    created_at: string;
  }>;
  component_names?: string[];
}

// Function to get properly capitalized overall status label (matching footer/status page)
function getOverallStatusLabel(status: string, allAffected: boolean = false): string {
  // Only use "All Systems" if all components are affected, otherwise use severity-based labels
  if (status === 'operational') {
    return 'All Systems Operational';
  }
  
  if (allAffected) {
    const labels: Record<string, string> = {
      'degraded_performance': 'All Systems Degraded Performance',
      'partial_outage': 'All Systems Partial Outage',
      'major_outage': 'All Systems Major Outage',
      'maintenance': 'All Systems Under Maintenance',
      'investigating': 'All Systems Investigating Issues',
    };
    return labels[status] || 'All Systems Operational';
  } else {
    // Use severity-based labels when not all components are affected
    const labels: Record<string, string> = {
      'degraded_performance': 'Degraded Performance',
      'partial_outage': 'Partial Outage',
      'major_outage': 'Major Outage',
      'maintenance': 'Under Maintenance',
      'investigating': 'Investigating Issues',
    };
    return labels[status] || 'All Systems Operational';
  }
}

const incidentStatusConfig = {
  investigating: {
    label: "Investigating",
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
    textClass: "text-purple-700 dark:text-purple-300",
  },
  identified: {
    label: "Identified",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    textClass: "text-blue-700 dark:text-blue-300",
  },
  monitoring: {
    label: "Monitoring",
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
    textClass: "text-yellow-700 dark:text-yellow-300",
  },
  resolved: {
    label: "Resolved",
    bgClass: "bg-green-100 dark:bg-green-900/30",
    textClass: "text-green-700 dark:text-green-300",
  },
  scheduled: {
    label: "Scheduled",
    bgClass: "bg-gray-100 dark:bg-gray-700",
    textClass: "text-gray-700 dark:text-gray-300",
  },
  in_progress: {
    label: "In Progress",
    bgClass: "bg-orange-100 dark:bg-orange-900/30",
    textClass: "text-orange-700 dark:text-orange-300",
  },
  verifying: {
    label: "Verifying",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
    textClass: "text-indigo-700 dark:text-indigo-300",
  },
};

const statusConfig = {
  operational: {
    icon: CheckCircle2,
    bgClass: "bg-green-50 dark:bg-green-900/20",
    borderClass: "border-green-200 dark:border-green-800",
    textClass: "text-green-800 dark:text-green-200",
    iconClass: "text-green-600 dark:text-green-400",
    heartbeatClass: "text-green-500 animate-pulse",
  },
  degraded_performance: {
    icon: AlertCircle,
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    textClass: "text-yellow-800 dark:text-yellow-200",
    iconClass: "text-yellow-600 dark:text-yellow-400",
    heartbeatClass: "text-yellow-500 animate-pulse",
  },
  partial_outage: {
    icon: AlertTriangle,
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    borderClass: "border-orange-200 dark:border-orange-800",
    textClass: "text-orange-800 dark:text-orange-200",
    iconClass: "text-orange-600 dark:text-orange-400",
    heartbeatClass: "text-orange-500 animate-pulse",
  },
  major_outage: {
    icon: AlertCircle,
    bgClass: "bg-red-50 dark:bg-red-900/20",
    borderClass: "border-red-200 dark:border-red-800",
    textClass: "text-red-800 dark:text-red-200",
    iconClass: "text-red-600 dark:text-red-400",
    heartbeatClass: "text-red-500 animate-pulse",
  },
  maintenance: {
    icon: Wrench,
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    borderClass: "border-blue-200 dark:border-blue-800",
    textClass: "text-blue-800 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-400",
    heartbeatClass: "text-blue-500 animate-pulse",
  },
  investigating: {
    icon: Activity,
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    borderClass: "border-purple-200 dark:border-purple-800",
    textClass: "text-purple-800 dark:text-purple-200",
    iconClass: "text-purple-600 dark:text-purple-400",
    heartbeatClass: "text-purple-500 animate-pulse",
  },
};

export function StatusBanner({ type = "banner", renderLocation = "page" }: StatusBannerProps) {
  const supabase = createClient();
  const { user } = useUser();
  const pathname = usePathname();
  const [settings, setSettings] = useState<StatusBannerSettings | null>(null);
  const [overallStatus, setOverallStatus] = useState<string>("operational");
  const [allAffected, setAllAffected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<ActiveIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [shouldShow, setShouldShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [user?.id]);

  useEffect(() => {
    if (userProfile !== null) {
      loadData();
    }
  }, [userProfile]);

  useEffect(() => {
    if (!settings || !shouldShow) return;
    
    const refreshInterval = settings.refresh_interval || 10;
    if (refreshInterval === 0) return; // Manual refresh only

    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings, shouldShow]);

  const loadUserProfile = async () => {
    if (!user?.id) {
      setUserProfile({}); // Anonymous user
      return;
    }

    try {
      const { data } = await supabase
        .from("profiles")
        .select("profile_type, subscription_plan, is_admin, is_super_admin, created_at, is_suspended, is_verified")
        .eq("clerk_id", user.id)
        .single();

      setUserProfile(data || {});
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUserProfile({});
    }
  };

  const loadData = async () => {
    try {
      // Reset shouldShow at the start of each load
      // Use a flag to track if we should show, instead of relying on state
      let canShow = true;
      setShouldShow(false);
      console.log('🔄 Starting loadData - reset shouldShow to false');
      
      // Load banner settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("status_banner_settings")
        .select("*")
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error("Error loading banner settings:", settingsError);
        setLoading(false);
        return;
      }

      // Ensure all settings have proper defaults, especially for visibility arrays
      // Spread settingsData first, then override with proper defaults for arrays
      const bannerSettings = {
        ...settingsData,
        is_enabled: settingsData?.is_enabled ?? false,
        show_incidents: settingsData?.show_incidents !== false,
        only_show_when_issues: settingsData?.only_show_when_issues !== false,
        banner_type: settingsData?.banner_type || "banner",
        // Ensure arrays are always arrays, never null/undefined
        visible_to_plans: Array.isArray(settingsData?.visible_to_plans) ? settingsData.visible_to_plans : (settingsData?.visible_to_plans ? [settingsData.visible_to_plans] : []),
        visible_to_roles: Array.isArray(settingsData?.visible_to_roles) ? settingsData.visible_to_roles : (settingsData?.visible_to_roles ? [settingsData.visible_to_roles] : []),
      };

      console.log('Loaded banner settings:', { 
        visible_to_plans: bannerSettings.visible_to_plans,
        visible_to_roles: bannerSettings.visible_to_roles,
        is_enabled: bannerSettings.is_enabled
      });

      setSettings(bannerSettings);

      // If banner is disabled, don't load status
      if (!bannerSettings.is_enabled) {
        setLoading(false);
        return;
      }

      // Load overall status
      const { data: statusData, error: statusError } = await supabase.rpc("get_overall_system_status");

      if (statusError) {
        console.error("Error loading overall status:", statusError);
        setLoading(false);
        return;
      }

      const status = statusData || "operational";
      setOverallStatus(status);

      // Check minimum status threshold
      // Status order from least to most severe: operational < investigating < maintenance < degraded_performance < partial_outage < major_outage
      const statusOrder = ['operational', 'investigating', 'maintenance', 'degraded_performance', 'partial_outage', 'major_outage'];
      const minThreshold = bannerSettings.min_status_threshold || 'operational';
      const statusIndex = statusOrder.indexOf(status);
      const thresholdIndex = statusOrder.indexOf(minThreshold);
      
      // If status not found in order, treat it as operational (shouldn't happen, but safe fallback)
      const effectiveStatusIndex = statusIndex === -1 ? 0 : statusIndex;
      const effectiveThresholdIndex = thresholdIndex === -1 ? 0 : thresholdIndex;
      
      if (effectiveStatusIndex < effectiveThresholdIndex) {
        console.log('Status threshold check failed:', { 
          status, 
          statusIndex: effectiveStatusIndex, 
          threshold: minThreshold, 
          thresholdIndex: effectiveThresholdIndex 
        });
        setShouldShow(false);
        setLoading(false);
        return;
      }

      // Check role-based and user group visibility
      if (bannerSettings.visible_to_roles && bannerSettings.visible_to_roles.length > 0) {
        const userRole = userProfile?.is_super_admin ? 'super_admin' 
          : userProfile?.is_admin ? 'admin'
          : userProfile?.profile_type || 'individual';
        
        // Check if user matches any role
        let matchesRole = bannerSettings.visible_to_roles.includes(userRole);
        
        // Check if user matches any user group
        let matchesGroup = false;
        const userGroups: string[] = [];
        
        // Check new_users (joined in last 30 days)
        if (bannerSettings.visible_to_roles.includes('new_users')) {
          if (userProfile?.created_at) {
            const createdAt = new Date(userProfile.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (createdAt >= thirtyDaysAgo) {
              matchesGroup = true;
              userGroups.push('new_users');
            }
          }
        }
        
        // Check suspended_users
        if (bannerSettings.visible_to_roles.includes('suspended_users')) {
          if (userProfile?.is_suspended) {
            matchesGroup = true;
            userGroups.push('suspended_users');
          }
        }
        
        // Check verified_users
        if (bannerSettings.visible_to_roles.includes('verified_users')) {
          if (userProfile?.is_verified) {
            matchesGroup = true;
            userGroups.push('verified_users');
          }
        }
        
        // Check premium_users (Pro or Ultimate)
        if (bannerSettings.visible_to_roles.includes('premium_users')) {
          const plan = (userProfile?.subscription_plan || 'free').toLowerCase();
          if (plan === 'pro' || plan === 'ultimate') {
            matchesGroup = true;
            userGroups.push('premium_users');
          }
        }
        
        // Check free_users
        if (bannerSettings.visible_to_roles.includes('free_users')) {
          const plan = (userProfile?.subscription_plan || 'free').toLowerCase();
          if (plan === 'free') {
            matchesGroup = true;
            userGroups.push('free_users');
          }
        }
        
        // User must match at least one role OR one group
        if (!matchesRole && !matchesGroup) {
          console.log('Role/Group visibility check failed:', { 
            userRole, 
            userGroups,
            visibleRoles: bannerSettings.visible_to_roles,
            matchesRole,
            matchesGroup
          });
          canShow = false;
          setShouldShow(false);
          setLoading(false);
          return;
        }
        
        console.log('✅ Role/Group visibility check PASSED:', { userRole, userGroups, matchesRole, matchesGroup });
      }

      // Check plan-based visibility
      // If visible_to_plans is set and has items, user must be in that list
      const visibleToPlans = bannerSettings.visible_to_plans;
      console.log('Plan visibility check:', { 
        visibleToPlans, 
        isArray: Array.isArray(visibleToPlans),
        length: visibleToPlans?.length,
        userProfile: userProfile?.subscription_plan,
        bannerSettings: bannerSettings.visible_to_plans
      });
      
      if (visibleToPlans && Array.isArray(visibleToPlans) && visibleToPlans.length > 0) {
        const userPlan = (userProfile?.subscription_plan || 'free').toLowerCase();
        const normalizedPlans = visibleToPlans.map((p: string) => (p || '').toLowerCase()).filter(Boolean);
        const isIncluded = normalizedPlans.includes(userPlan);
        
        console.log('Plan visibility check details:', { userPlan, normalizedPlans, includes: isIncluded });
        
        if (!isIncluded) {
          console.error('❌❌❌ Plan visibility check FAILED - BLOCKING NOTIFICATION ❌❌❌', { 
            userPlan, 
            normalizedPlans, 
            visibleToPlans,
            userProfile: userProfile?.subscription_plan 
          });
          canShow = false;
          setShouldShow(false);
          setLoading(false);
          console.error('❌ Exiting loadData early - notification will NOT be shown');
          return; // CRITICAL: Exit early to prevent setShouldShow(true) from being called
        }
        console.log('✅ Plan visibility check PASSED - user plan is in visible plans');
      } else {
        console.log('Plan visibility check SKIPPED - no plans restriction or empty array:', { visibleToPlans });
      }

      // Check time-based rules
      if (bannerSettings.time_based_rules?.enabled) {
        const now = new Date();
        const timezone = bannerSettings.time_based_rules.timezone || 'UTC';
        const currentDay = now.getUTCDay();
        const currentHour = now.getUTCHours();
        
        const rules = bannerSettings.time_based_rules;
        const isInDayRange = rules.days.includes(currentDay);
        const isInHourRange = currentHour >= rules.start_hour && currentHour < rules.end_hour;
        
        if (!isInDayRange || !isInHourRange) {
          setShouldShow(false);
          setLoading(false);
          return;
        }
      }

      // Get last updated timestamp (only if function exists)
      try {
        const { data: lastUpdatedData, error: lastUpdatedError } = await supabase.rpc("get_status_last_updated");
        
        if (lastUpdatedError) {
          // Function might not exist yet - silently ignore
          if (lastUpdatedError.code !== "PGRST202" && lastUpdatedError.code !== "42883") {
            console.error("Error loading last updated:", lastUpdatedError);
          }
        } else if (lastUpdatedData) {
          setLastUpdated(lastUpdatedData);
        }
      } catch (error) {
        // Silently ignore if function doesn't exist
      }

      // Load public components to check if all are affected
      const { data: componentsData, error: componentsError } = await supabase
        .from("status_components")
        .select("id, status")
        .eq("is_public", true);

      if (!componentsError && componentsData) {
        const components = componentsData || [];
        const totalPublicComponents = components.length;
        const affectedComponents = components.filter((c: any) => 
          c.status !== "operational" && c.status !== "maintenance"
        ).length;
        const allComponentsAffected = totalPublicComponents > 0 && affectedComponents === totalPublicComponents;
        setAllAffected(allComponentsAffected);
      }

      // Check if we should show banner
      if (bannerSettings.only_show_when_issues && status === "operational") {
        setShouldShow(false);
        setLoading(false);
        return;
      }

      // Load active incidents if enabled
      if (bannerSettings.show_incidents) {
        const maxIncidents = bannerSettings.max_incidents || 3;
        const minSeverity = bannerSettings.min_incident_severity || 'none';
        
        // Map severity to impact_scope
        const severityMap: Record<string, string[]> = {
          'none': [],
          'minor': ['scaled_down'],
          'major': ['partial_outage'],
          'critical': ['major_outage', 'full_outage'],
        };
        
        let incidentsQuery = supabase
          .from("status_incidents")
          .select(`
            id,
            title,
            description,
            status,
            impact_scope,
            affected_components,
            started_at,
            status_incident_updates (
              message,
              created_at
            )
          `)
          .eq("is_public", true)
          .in("status", ["investigating", "identified", "monitoring", "in_progress", "verifying"])
          .order("started_at", { ascending: false })
          .limit(maxIncidents * 2); // Get more to filter

        const { data: incidentsData, error: incidentsError } = await incidentsQuery;

        if (!incidentsError && incidentsData) {
          // Filter by severity
          let filteredIncidents = incidentsData;
          if (minSeverity !== 'none' && severityMap[minSeverity]) {
            const allowedScopes = severityMap[minSeverity];
            filteredIncidents = incidentsData.filter((incident: any) => {
              if (!incident.impact_scope) return false;
              // Check if incident severity matches or exceeds minimum
              const severityOrder = ['scaled_down', 'partial_outage', 'major_outage', 'full_outage'];
              const incidentIndex = severityOrder.indexOf(incident.impact_scope);
              const minIndex = Math.min(...allowedScopes.map(s => severityOrder.indexOf(s)).filter(i => i >= 0));
              return incidentIndex >= minIndex;
            });
          }
          
          // Limit to max incidents
          filteredIncidents = filteredIncidents.slice(0, maxIncidents);
          
          // Fetch component names for affected components
          const allComponentIds = [...new Set(filteredIncidents.flatMap((inc: any) => inc.affected_components || []))];
          let componentNamesMap = new Map<string, string>();
          
          if (allComponentIds.length > 0) {
            const { data: componentsData } = await supabase
              .from("status_components")
              .select("id, name")
              .in("id", allComponentIds);
            
            if (componentsData) {
              componentsData.forEach((comp: any) => {
                componentNamesMap.set(comp.id, comp.name);
              });
            }
          }
          
          // Add component names to incidents
          const incidentsWithNames = filteredIncidents.map((incident: any) => ({
            ...incident,
            component_names: (incident.affected_components || []).map((id: string) => componentNamesMap.get(id)).filter(Boolean) as string[],
          }));
          
          setActiveIncidents(incidentsWithNames as any);
        }
      }

      // CRITICAL: Only set to true if we haven't already been blocked by visibility checks
      // If any visibility check failed, we would have returned early, so if we reach here, all checks passed
      if (!canShow) {
        console.error('❌❌❌ CANNOT SHOW - canShow flag is false - this should not happen!');
        setShouldShow(false);
        setLoading(false);
        return;
      }
      console.log('✅✅✅ All visibility checks passed - setting shouldShow to true ✅✅✅');
      setShouldShow(true);
      console.log('✅ shouldShow has been set to TRUE');
    } catch (error) {
      console.error("Error loading status banner data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !settings || !settings.is_enabled || !shouldShow) {
    console.log('StatusBanner render blocked:', { loading, hasSettings: !!settings, isEnabled: settings?.is_enabled, shouldShow });
    return null;
  }

  const statusInfo = statusConfig[overallStatus as keyof typeof statusConfig] || statusConfig.operational;
  const StatusIcon = statusInfo.icon;
  // Get custom status message or use default
  const getStatusLabel = () => {
    if (settings.custom_status_messages && settings.custom_status_messages[overallStatus]) {
      return settings.custom_status_messages[overallStatus];
    }
    return getOverallStatusLabel(overallStatus, allAffected);
  };
  
  const statusLabel = getStatusLabel();
  // Use settings banner_type as primary source (admin-controlled), fallback to type prop, then default to banner
  const displayType = (settings?.banner_type || type || "banner") as "banner" | "card" | "modal";
  
  // Debug log to help troubleshoot
  if (process.env.NODE_ENV === "development") {
    console.log("StatusBanner display type:", { displayType, settingsBannerType: settings?.banner_type, typeProp: type });
  }

  // Only hide if operational AND only_show_when_issues is true
  // Maintenance, investigating, and other statuses should always show when only_show_when_issues is true
  if (settings.only_show_when_issues && overallStatus === "operational") {
    return null;
  }

  // Check if notification should show based on display type
  if (displayType === 'banner') {
    // Banner type always only shows on dashboard, never on all pages
    if (renderLocation !== "page" || pathname !== '/dashboard') {
      return null;
    }
  } else if (displayType === 'card') {
    // Card type always only shows on dashboard, and only when rendered from a page
    if (pathname !== '/dashboard' || renderLocation !== "page") {
      return null;
    }
  } else if (displayType === 'modal') {
    // Modal type can appear on all pages when display_on_all_pages is true, or just dashboard when false
    // Modal should only render once - in layout if display_on_all_pages is true, otherwise in page
    if (settings.display_on_all_pages) {
      // Only render if we're in the layout
      if (renderLocation !== "layout") {
        return null;
      }
    } else {
      // Only render if we're in a page and it's the dashboard
      if (renderLocation !== "page" || pathname !== '/dashboard') {
        return null;
      }
    }
  }

  // Render based on display type from settings
  // For card mode, return null here - it will be rendered as a dashboard card component
  if (displayType === "card") {
    return null; // Card will be rendered separately in dashboard
  }

  // Modal mode - floating button with expandable modal (must be before content creation)
  if (displayType === "modal") {
    const modalPosition = settings.modal_position || "bottom-right";
    const positionClasses = modalPosition === "bottom-left" 
      ? "bottom-4 left-4" 
      : "bottom-4 right-4";
    
    return (
      <>
        {/* Floating Button - Always visible */}
        {!modalOpen && (
          <div className={`fixed ${positionClasses} z-50`}>
            <button
              onClick={() => setModalOpen(true)}
              className={`${statusInfo.bgClass} ${statusInfo.borderClass} border rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-3 group`}
              aria-label="View system status"
            >
              <div className="flex items-center gap-2">
                <Heart className={`w-5 h-5 ${statusInfo.heartbeatClass} flex-shrink-0`} />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    System Status
                  </div>
                  <div className={`text-xs ${statusInfo.textClass}`}>
                    {statusLabel}
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Modal - Expandable */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setModalOpen(false)}
          >
            <div
              className={`${statusInfo.bgClass} ${statusInfo.borderClass} border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Heart className={`w-6 h-6 ${statusInfo.heartbeatClass} flex-shrink-0`} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Overall System Status
                      </h3>
                      <p className={`text-sm font-medium ${statusInfo.textClass} mt-0.5`}>
                        {statusLabel}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label="Close status modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Last Updated */}
                {lastUpdated && (
                  <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last updated: <RelativeTime date={lastUpdated} /></span>
                  </div>
                )}

                {/* Active Incidents */}
                {settings.show_incidents && activeIncidents.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Active Incidents
                    </h4>
                    {activeIncidents.map((incident) => {
                      const isExpanded = expandedIncidents.has(incident.id);
                      const toggleExpanded = () => {
                        const newExpanded = new Set(expandedIncidents);
                        if (isExpanded) {
                          newExpanded.delete(incident.id);
                        } else {
                          newExpanded.add(incident.id);
                        }
                        setExpandedIncidents(newExpanded);
                      };

                      return (
                        <div
                          key={incident.id}
                          className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {incident.title}
                                </h4>
                                {incident.status && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.bgClass || "bg-gray-100 dark:bg-gray-700"} ${incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.textClass || "text-gray-700 dark:text-gray-300"}`}>
                                    {incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.label || incident.status}
                                  </span>
                                )}
                                {incident.impact_scope && (() => {
                                  const impactScopeLabels: Record<string, string> = {
                                    'site_wide': 'Site Wide',
                                    'scaled_down': 'Scaled Down',
                                    'limited_users': 'Limited Users',
                                    'specific_feature': 'Specific Feature',
                                    'no_effect': 'No Effect',
                                    'none': 'None',
                                  };
                                  const impactScopeLabel = impactScopeLabels[incident.impact_scope] || incident.impact_scope.replace(/_/g, ' ');
                                  return (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                      Impact: {impactScopeLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                              {incident.component_names && incident.component_names.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                  <span className="font-medium">Affected:</span>
                                  <span>{incident.component_names.join(', ')}</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={toggleExpanded}
                              className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              aria-label={isExpanded ? "Collapse incident details" : "Expand incident details"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {isExpanded && (
                            <>
                              {incident.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 mt-2">
                                  {incident.description}
                                </p>
                              )}
                              {incident.updates && incident.updates.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Updates:</p>
                                  <div className="space-y-2">
                                    {incident.updates.map((update: any, idx: number) => (
                                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium">
                                            {update.created_at ? formatDistanceToNow(new Date(update.created_at), { addSuffix: true }) : 'Recently'}
                                          </span>
                                        </div>
                                        <p>{update.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Link to Status Page */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href={settings.custom_status_page_url || "/status"}
                    className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    onClick={() => setModalOpen(false)}
                  >
                    {settings.custom_status_page_link_text || "View Status Page"}
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Banner mode - create content only for banner type
  const content = (
    <div className={`${statusInfo.bgClass} ${statusInfo.borderClass} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Heart className={`w-5 h-5 ${statusInfo.heartbeatClass} flex-shrink-0`} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Overall System Status
            </h3>
            <p className={`text-sm font-medium ${statusInfo.textClass} mt-0.5`}>
              {statusLabel}
            </p>
          </div>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated <RelativeTime date={lastUpdated} /></span>
          </div>
        )}
      </div>

      {/* Active Incidents */}
      {settings.show_incidents && activeIncidents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {activeIncidents.map((incident) => {
            const isExpanded = expandedIncidents.has(incident.id);
            const toggleExpanded = () => {
              const newExpanded = new Set(expandedIncidents);
              if (newExpanded.has(incident.id)) {
                newExpanded.delete(incident.id);
              } else {
                newExpanded.add(incident.id);
              }
              setExpandedIncidents(newExpanded);
            };

            return (
              <div key={incident.id} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {incident.title}
                      </h4>
                      {incident.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.bgClass || "bg-gray-100 dark:bg-gray-700"} ${incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.textClass || "text-gray-700 dark:text-gray-300"}`}>
                          {incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.label || incident.status}
                        </span>
                      )}
                      {incident.impact_scope && (() => {
                        const impactScopeLabels: Record<string, string> = {
                          'site_wide': 'Site Wide',
                          'scaled_down': 'Scaled Down',
                          'limited_users': 'Limited Users',
                          'specific_feature': 'Specific Feature',
                          'no_effect': 'No Effect',
                          'none': 'None',
                        };
                        const impactScopeLabel = impactScopeLabels[incident.impact_scope] || incident.impact_scope.replace(/_/g, ' ');
                        return (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Impact: {impactScopeLabel}
                          </span>
                        );
                      })()}
                    </div>
                    {incident.component_names && incident.component_names.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        <span className="font-medium">Affected:</span>
                        <span>{incident.component_names.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={toggleExpanded}
                    className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label={isExpanded ? "Collapse incident details" : "Expand incident details"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <>
                    {incident.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {incident.description}
                      </p>
                    )}
                    {incident.updates && incident.updates.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Latest Updates:</p>
                        {incident.updates.slice(0, 2).map((update: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span className="font-medium">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}:
                            </span>{" "}
                            {update.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <Clock className="w-3 h-3" />
                  <span>Started {formatDistanceToNow(new Date(incident.started_at), { addSuffix: true })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to Status Page */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          href={settings.custom_status_page_url || "/status"}
          className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {settings.custom_status_page_link_text || "View Status Page"}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );

  // Banner mode - constrained width like announcements
  // Banner always only shows on dashboard (never on all pages)
  // Page handles the container
  return (
    <div key={`status-banner-${displayType}`} className="mb-4">
      {content}
    </div>
  );
}

