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
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { RelativeTime } from "@/components/RelativeTime";

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
    textClass: "text-green-800 dark:text-green-200",
    iconClass: "text-green-600 dark:text-green-400",
    heartbeatClass: "text-green-500 animate-pulse",
  },
  degraded_performance: {
    icon: AlertCircle,
    textClass: "text-yellow-800 dark:text-yellow-200",
    iconClass: "text-yellow-600 dark:text-yellow-400",
    heartbeatClass: "text-yellow-500 animate-pulse",
  },
  partial_outage: {
    icon: AlertTriangle,
    textClass: "text-orange-800 dark:text-orange-200",
    iconClass: "text-orange-600 dark:text-orange-400",
    heartbeatClass: "text-orange-500 animate-pulse",
  },
  major_outage: {
    icon: AlertCircle,
    textClass: "text-red-800 dark:text-red-200",
    iconClass: "text-red-600 dark:text-red-400",
    heartbeatClass: "text-red-500 animate-pulse",
  },
  maintenance: {
    icon: Wrench,
    textClass: "text-blue-800 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-400",
    heartbeatClass: "text-blue-500 animate-pulse",
  },
  investigating: {
    icon: Activity,
    textClass: "text-purple-800 dark:text-purple-200",
    iconClass: "text-purple-600 dark:text-purple-400",
    heartbeatClass: "text-purple-500 animate-pulse",
  },
};

export function StatusCard() {
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

      const bannerSettings = settingsData || {
        is_enabled: false,
        show_incidents: true,
        only_show_when_issues: true,
        banner_type: "banner",
      };

      setSettings(bannerSettings);

      // If banner is disabled or not set to card mode, don't load status
      if (!bannerSettings.is_enabled || bannerSettings.banner_type !== "card") {
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
        
        // Check new_users (joined in last 30 days)
        if (bannerSettings.visible_to_roles.includes('new_users')) {
          if (userProfile?.created_at) {
            const createdAt = new Date(userProfile.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (createdAt >= thirtyDaysAgo) {
              matchesGroup = true;
            }
          }
        }
        
        // Check suspended_users
        if (bannerSettings.visible_to_roles.includes('suspended_users')) {
          if (userProfile?.is_suspended) {
            matchesGroup = true;
          }
        }
        
        // Check verified_users
        if (bannerSettings.visible_to_roles.includes('verified_users')) {
          if (userProfile?.is_verified) {
            matchesGroup = true;
          }
        }
        
        // Check premium_users (Pro or Ultimate)
        if (bannerSettings.visible_to_roles.includes('premium_users')) {
          const plan = (userProfile?.subscription_plan || 'free').toLowerCase();
          if (plan === 'pro' || plan === 'ultimate') {
            matchesGroup = true;
          }
        }
        
        // Check free_users
        if (bannerSettings.visible_to_roles.includes('free_users')) {
          const plan = (userProfile?.subscription_plan || 'free').toLowerCase();
          if (plan === 'free') {
            matchesGroup = true;
          }
        }
        
        // User must match at least one role OR one group
        if (!matchesRole && !matchesGroup) {
          setShouldShow(false);
          setLoading(false);
          return;
        }
      }

      // Check plan-based visibility
      // If visible_to_plans is set and has items, user must be in that list
      const visibleToPlans = bannerSettings.visible_to_plans;
      if (visibleToPlans && Array.isArray(visibleToPlans) && visibleToPlans.length > 0) {
        const userPlan = (userProfile?.subscription_plan || 'free').toLowerCase();
        const normalizedPlans = visibleToPlans.map((p: string) => p.toLowerCase());
        if (!normalizedPlans.includes(userPlan)) {
          console.log('Plan visibility check failed (card):', { userPlan, visibleToPlans, normalizedPlans });
          setShouldShow(false);
          setLoading(false);
          return;
        }
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

      // Check if we should show card
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

      setShouldShow(true);
    } catch (error) {
      console.error("Error loading status card data:", error);
      setShouldShow(false);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not showing
  if (loading || !shouldShow || !settings || !settings.is_enabled || settings.banner_type !== "card") {
    return null;
  }

  // Cards always only show on dashboard (display_on_all_pages doesn't apply to cards)
  if (pathname !== '/dashboard') {
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

  if (settings.only_show_when_issues && overallStatus === "operational") {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className={`w-4 h-4 ${statusInfo.heartbeatClass} flex-shrink-0`} />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Overall System Status
          </h3>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <RelativeTime date={lastUpdated} />
          </div>
        )}
      </div>

      <div className="mb-3">
        <p className={`text-sm font-medium ${statusInfo.textClass}`}>
          {statusLabel}
        </p>
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
              <div key={incident.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h4 className="font-medium text-gray-900 dark:text-white text-xs">
                        {incident.title}
                      </h4>
                      {incident.status && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.bgClass || "bg-gray-100 dark:bg-gray-700"} ${incidentStatusConfig[incident.status as keyof typeof incidentStatusConfig]?.textClass || "text-gray-700 dark:text-gray-300"}`}>
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Impact: {impactScopeLabel}
                          </span>
                        );
                      })()}
                    </div>
                    {incident.component_names && incident.component_names.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                        <span className="font-medium">Affected:</span>
                        <span className="truncate max-w-[150px]">{incident.component_names.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={toggleExpanded}
                    className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label={isExpanded ? "Collapse incident details" : "Expand incident details"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <>
                    {incident.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {incident.description}
                      </p>
                    )}
                    {incident.updates && incident.updates.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Latest:</p>
                        {incident.updates.slice(0, 1).map((update: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                            {update.message}
                          </div>
                        ))}
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
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          href={settings.custom_status_page_url || "/status"}
          className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          {settings.custom_status_page_link_text || "View Status Page"}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

