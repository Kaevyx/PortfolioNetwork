"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Activity,
  Server,
  Database,
  Globe,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Heart,
  RefreshCw
} from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

interface StatusComponentGroup {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface StatusComponent {
  id: string;
  group_id?: string | null;
  name: string;
  description?: string | null;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'maintenance' | 'investigating';
  status_message?: string | null;
  original_status?: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'maintenance' | 'investigating' | null;
  display_order: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  group?: StatusComponentGroup | null;
}

interface StatusIncident {
  id: string;
  title: string;
  description?: string | null;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'scheduled' | 'in_progress' | 'verifying';
  impact_scope: 'site_wide' | 'scaled_down' | 'none' | 'no_effect' | 'limited_users' | 'specific_feature';
  component_status?: string | null;
  affected_components: string[];
  started_at: string;
  resolved_at?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updates?: StatusIncidentUpdate[];
}

interface StatusIncidentUpdate {
  id: string;
  incident_id: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'scheduled' | 'in_progress' | 'verifying';
  message: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AdminStatusPageProps {
  supabase: any;
  currentUserId: string;
}

const statusConfig = {
  operational: { 
    label: 'Operational', 
    icon: CheckCircle2, 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300',
    dotClass: 'bg-green-500'
  },
  degraded_performance: { 
    label: 'Degraded Performance', 
    icon: AlertCircle, 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    dotClass: 'bg-yellow-500'
  },
  partial_outage: { 
    label: 'Partial Outage', 
    icon: AlertTriangle, 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300',
    dotClass: 'bg-orange-500'
  },
  major_outage: { 
    label: 'Major Outage', 
    icon: AlertCircle, 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500'
  },
  maintenance: { 
    label: 'Maintenance', 
    icon: Settings, 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-500'
  },
  investigating: { 
    label: 'Investigating', 
    icon: Activity, 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300',
    dotClass: 'bg-purple-500'
  },
};

const incidentStatusConfig = {
  investigating: { 
    label: 'Investigating', 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  identified: { 
    label: 'Identified', 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  monitoring: { 
    label: 'Monitoring', 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300'
  },
  resolved: { 
    label: 'Resolved', 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300'
  },
  scheduled: { 
    label: 'Scheduled', 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
  in_progress: { 
    label: 'In Progress', 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  verifying: { 
    label: 'Verifying', 
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    textClass: 'text-indigo-700 dark:text-indigo-300'
  },
};

const overallStatusConfig = {
  operational: { 
    label: 'All Systems Operational', 
    icon: Heart, 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300',
    iconClass: 'text-green-500 animate-pulse'
  },
  degraded_performance: { 
    label: 'Degraded Performance', 
    icon: Heart, 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    iconClass: 'text-yellow-500 animate-pulse'
  },
  partial_outage: { 
    label: 'Partial Outage', 
    icon: Heart, 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300',
    iconClass: 'text-orange-500 animate-pulse'
  },
  major_outage: { 
    label: 'Major Outage', 
    icon: Heart, 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300',
    iconClass: 'text-red-500 animate-pulse'
  },
  maintenance: { 
    label: 'Under Maintenance', 
    icon: Heart, 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    iconClass: 'text-blue-500 animate-pulse'
  },
  investigating: { 
    label: 'Investigating Issues', 
    icon: Heart, 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300',
    iconClass: 'text-purple-500 animate-pulse'
  },
};

// Function to get overall status label
function getOverallStatusLabel(status: string): string {
  const statusInfo = overallStatusConfig[status as keyof typeof overallStatusConfig];
  return statusInfo?.label || 'All Systems Operational';
}

export function AdminStatusPage({ supabase, currentUserId }: AdminStatusPageProps) {
  const [activeSection, setActiveSection] = useState<'components' | 'groups' | 'incidents'>('components');
  const [groups, setGroups] = useState<StatusComponentGroup[]>([]);
  const [components, setComponents] = useState<StatusComponent[]>([]);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
  const [overallStatus, setOverallStatus] = useState<string>('operational');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [bannerSettings, setBannerSettings] = useState({
    is_enabled: false,
    show_incidents: true,
    only_show_when_issues: true,
    banner_type: 'banner' as 'banner' | 'card' | 'modal',
    modal_position: 'bottom-right' as 'bottom-left' | 'bottom-right',
    refresh_interval: 10,
    max_incidents: 3,
    min_incident_severity: 'none' as 'none' | 'minor' | 'major' | 'critical',
    min_status_threshold: 'operational' as 'operational' | 'investigating' | 'maintenance' | 'degraded_performance' | 'partial_outage' | 'major_outage',
    banner_position: 'top' as 'top' | 'bottom',
    custom_status_messages: {} as Record<string, string>,
    custom_status_page_url: '',
    custom_status_page_link_text: '',
    display_on_all_pages: false,
    visible_to_roles: [] as string[],
    visible_to_plans: [] as string[],
    time_based_rules: {
      enabled: false,
      days: [1, 2, 3, 4, 5, 6, 7] as number[],
      start_hour: 0,
      end_hour: 23,
      timezone: 'UTC',
    },
    enable_status_change_notifications: false,
    notification_channels: [] as string[],
  });
  const [savingBannerSettings, setSavingBannerSettings] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [bannerSettingsCollapsed, setBannerSettingsCollapsed] = useState(false);

  // Group form
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StatusComponentGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
  });

  // Component form
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<StatusComponent | null>(null);
  const [componentFormData, setComponentFormData] = useState({
    name: '',
    description: '',
    group_id: '',
    status: 'operational' as StatusComponent['status'],
    status_message: '',
    display_order: 0,
    is_public: true,
  });

  // Incident form
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<StatusIncident | null>(null);
  const [incidentFormData, setIncidentFormData] = useState({
    title: '',
    description: '',
    status: 'investigating' as StatusIncident['status'],
    impact_scope: 'scaled_down' as StatusIncident['impact_scope'],
    component_status: 'degraded_performance' as string,
    affected_components: [] as string[],
    scheduled_start: '',
    scheduled_end: '',
    is_public: true,
  });

  // Incident update form
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [updateFormData, setUpdateFormData] = useState({
    status: 'investigating' as StatusIncidentUpdate['status'],
    message: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadOverallStatus = async () => {
    try {
      const { data: overallStatusData, error: statusError } = await supabase.rpc('get_overall_system_status');
      if (!statusError && overallStatusData) {
        setOverallStatus(overallStatusData);
      }
      
      // Get last updated timestamp (only if function exists)
      try {
        const { data: lastUpdatedData, error: lastUpdatedError } = await supabase.rpc('get_status_last_updated');
        if (!lastUpdatedError && lastUpdatedData) {
          setLastUpdated(lastUpdatedData);
        }
      } catch (error) {
        // Silently ignore if function doesn't exist
      }
    } catch (error) {
      console.error("Error loading overall status:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadGroups(),
        loadComponents(),
        loadIncidents(),
        loadOverallStatus(),
        loadBannerSettings(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBannerSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("status_banner_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading banner settings:", error);
        return;
      }

      if (data) {
        setBannerSettings({
          is_enabled: data.is_enabled || false,
          show_incidents: data.show_incidents !== false,
          only_show_when_issues: data.only_show_when_issues !== false,
          banner_type: data.banner_type || 'banner',
          refresh_interval: data.refresh_interval ?? 10,
          max_incidents: data.max_incidents ?? 3,
          min_incident_severity: data.min_incident_severity || 'none',
          min_status_threshold: data.min_status_threshold || 'operational',
          banner_position: data.banner_position || 'top',
          modal_position: data.modal_position || 'bottom-right',
          custom_status_messages: data.custom_status_messages || {},
          custom_status_page_url: data.custom_status_page_url || '',
          custom_status_page_link_text: data.custom_status_page_link_text || '',
          display_on_all_pages: data.display_on_all_pages || false,
          visible_to_roles: data.visible_to_roles || [],
          visible_to_plans: data.visible_to_plans || [],
          time_based_rules: data.time_based_rules || {
            enabled: false,
            days: [1, 2, 3, 4, 5, 6, 7],
            start_hour: 0,
            end_hour: 23,
            timezone: 'UTC',
          },
          enable_status_change_notifications: data.enable_status_change_notifications || false,
          notification_channels: data.notification_channels || [],
        });
      }
    } catch (error) {
      console.error("Error loading banner settings:", error);
    }
  };

  const saveBannerSettings = async () => {
    setSavingBannerSettings(true);
    try {
      // Build the update object, only including fields that might exist
      const updateData: any = {
        id: '00000000-0000-0000-0000-000000000001',
        is_enabled: bannerSettings.is_enabled,
        show_incidents: bannerSettings.show_incidents,
        only_show_when_issues: bannerSettings.only_show_when_issues,
        banner_type: bannerSettings.banner_type,
        updated_by: currentUserId,
        updated_at: new Date().toISOString(),
      };

      // Add new fields if they exist (they might not if migration hasn't been run)
      // We'll try to include them, but if they fail, we'll fall back to basic fields only
      try {
        updateData.refresh_interval = bannerSettings.refresh_interval;
        updateData.max_incidents = bannerSettings.max_incidents;
        updateData.min_incident_severity = bannerSettings.min_incident_severity;
        updateData.min_status_threshold = bannerSettings.min_status_threshold;
        updateData.banner_position = bannerSettings.banner_position;
        updateData.modal_position = bannerSettings.modal_position;
        updateData.custom_status_messages = bannerSettings.custom_status_messages;
        updateData.custom_status_page_url = bannerSettings.custom_status_page_url || null;
        updateData.custom_status_page_link_text = bannerSettings.custom_status_page_link_text || null;
        updateData.display_on_all_pages = bannerSettings.display_on_all_pages;
        updateData.visible_to_roles = bannerSettings.visible_to_roles;
        updateData.visible_to_plans = bannerSettings.visible_to_plans;
        updateData.time_based_rules = bannerSettings.time_based_rules;
        updateData.enable_status_change_notifications = bannerSettings.enable_status_change_notifications;
        updateData.notification_channels = bannerSettings.notification_channels;
      } catch (e) {
        // If setting new fields fails, continue with basic fields only
        console.warn("Some new banner settings fields may not be available yet. Please run the migration: supabase/add-status-banner-settings-extended.sql");
      }

      const { error } = await supabase
        .from("status_banner_settings")
        .upsert(updateData, {
          onConflict: 'id',
        });

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        // Check if it's a column doesn't exist error
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          throw new Error(`Database columns not found. Please run the migration: supabase/add-status-banner-settings-extended.sql. Error: ${error.message || error.details || error.hint || 'Unknown'}`);
        }
        
        throw error;
      }
      alert("Notification settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      const errorMessage = error?.message || error?.details || error?.hint || (typeof error === 'string' ? error : JSON.stringify(error)) || "Unknown error";
      alert("Failed to save notification settings: " + errorMessage);
    } finally {
      setSavingBannerSettings(false);
    }
  };

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('status_component_groups')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    setGroups(data || []);
  };

  const loadComponents = async () => {
    const { data, error } = await supabase
      .from('status_components')
      .select(`
        *,
        group:status_component_groups(*)
      `)
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    setComponents(data || []);
  };

  const loadIncidents = async () => {
    const { data: incidentsData, error: incidentsError } = await supabase
      .from('status_incidents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (incidentsError) throw incidentsError;

    // Load updates for each incident
    const incidentsWithUpdates = await Promise.all(
      (incidentsData || []).map(async (incident: StatusIncident) => {
        const { data: updatesData } = await supabase
          .from('status_incident_updates')
          .select('*')
          .eq('incident_id', incident.id)
          .order('created_at', { ascending: false });
        
        return {
          ...incident,
          updates: updatesData || [],
        };
      })
    );

    setIncidents(incidentsWithUpdates);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const groupData: any = {
        name: groupFormData.name,
        description: groupFormData.description || null,
        display_order: groupFormData.display_order,
      };

      if (editingGroup) {
        const { error } = await supabase
          .from('status_component_groups')
          .update(groupData)
          .eq('id', editingGroup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('status_component_groups')
          .insert(groupData);
        if (error) throw error;
      }

      await loadGroups();
      resetGroupForm();
    } catch (error: any) {
      console.error("Error saving group:", error);
      alert("Failed to save group: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComponentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const componentData: any = {
        name: componentFormData.name,
        description: componentFormData.description || null,
        group_id: componentFormData.group_id || null,
        status: componentFormData.status,
        status_message: componentFormData.status_message || null,
        display_order: componentFormData.display_order,
        is_public: componentFormData.is_public,
        created_by: currentUserId,
        updated_by: currentUserId,
      };

      if (editingComponent) {
        const { error } = await supabase
          .from('status_components')
          .update(componentData)
          .eq('id', editingComponent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('status_components')
          .insert(componentData);
        if (error) throw error;
      }

      await loadComponents();
      resetComponentForm();
    } catch (error: any) {
      console.error("Error saving component:", error);
      alert("Failed to save component: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const incidentData: any = {
        title: incidentFormData.title,
        description: incidentFormData.description || null,
        status: incidentFormData.status,
        impact_scope: incidentFormData.impact_scope,
        component_status: incidentFormData.component_status || 'degraded_performance',
        affected_components: incidentFormData.affected_components,
        scheduled_start: incidentFormData.scheduled_start || null,
        scheduled_end: incidentFormData.scheduled_end || null,
        is_public: incidentFormData.is_public,
        created_by: currentUserId,
      };

      if (editingIncident) {
        const { error } = await supabase
          .from('status_incidents')
          .update(incidentData)
          .eq('id', editingIncident.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('status_incidents')
          .insert(incidentData);
        if (error) throw error;
      }

      await loadIncidents();
      // Reload components to reflect automatic status changes from incident
      await loadComponents();
      // Reload overall status
      await loadOverallStatus();
      resetIncidentForm();
    } catch (error: any) {
      console.error("Error saving incident:", error);
      alert("Failed to save incident: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId) return;
    setSaving(true);

    try {
      const updateData: any = {
        incident_id: selectedIncidentId,
        status: updateFormData.status,
        message: updateFormData.message,
        created_by: currentUserId,
      };

      const { error: updateError } = await supabase
        .from('status_incident_updates')
        .insert(updateData);
      if (updateError) throw updateError;

      // Update incident status if changed
      const { error: incidentError } = await supabase
        .from('status_incidents')
        .update({ status: updateFormData.status })
        .eq('id', selectedIncidentId);
      if (incidentError) throw incidentError;

      // If resolved, set resolved_at
      if (updateFormData.status === 'resolved') {
        const { error: resolvedError } = await supabase
          .from('status_incidents')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', selectedIncidentId);
        if (resolvedError) throw resolvedError;
      }

      await loadIncidents();
      // Reload components to reflect automatic status changes from incident update
      await loadComponents();
      // Reload overall status
      await loadOverallStatus();
      resetUpdateForm();
    } catch (error: any) {
      console.error("Error saving update:", error);
      alert("Failed to save update: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group? Components in this group will be ungrouped.")) return;

    try {
      const { error } = await supabase
        .from('status_component_groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadGroups();
      await loadComponents();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group: " + error.message);
    }
  };

  const handleDeleteComponent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this component?")) return;

    try {
      const { error } = await supabase
        .from('status_components')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadComponents();
    } catch (error: any) {
      console.error("Error deleting component:", error);
      alert("Failed to delete component: " + error.message);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm("Are you sure you want to delete this incident? All updates will also be deleted.")) return;

    try {
      const { error } = await supabase
        .from('status_incidents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadIncidents();
    } catch (error: any) {
      console.error("Error deleting incident:", error);
      alert("Failed to delete incident: " + error.message);
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAllGroups = () => {
    const allGroupIds = new Set(groups.map(g => g.id));
    setExpandedGroups(allGroupIds);
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const allGroupsExpanded = groups.length > 0 && groups.every(g => expandedGroups.has(g.id));
  const allGroupsCollapsed = groups.length === 0 || groups.every(g => !expandedGroups.has(g.id));

  // Calculate the worst status for a group based on its components
  const getGroupStatus = (groupComponents: StatusComponent[]): string => {
    if (groupComponents.length === 0) {
      return 'operational';
    }

    // Status priority: worst to best
    const statusPriority: Record<string, number> = {
      'major_outage': 1,
      'partial_outage': 2,
      'degraded_performance': 3,
      'investigating': 4,
      'maintenance': 5,
      'operational': 6,
    };

    // Find the worst status (lowest priority number)
    let worstStatus = 'operational';
    let worstPriority = 6;

    groupComponents.forEach((component) => {
      const priority = statusPriority[component.status] || 6;
      if (priority < worstPriority) {
        worstPriority = priority;
        worstStatus = component.status;
      }
    });

    return worstStatus;
  };

  const toggleIncidentExpanded = (incidentId: string) => {
    const newExpanded = new Set(expandedIncidents);
    if (newExpanded.has(incidentId)) {
      newExpanded.delete(incidentId);
    } else {
      newExpanded.add(incidentId);
    }
    setExpandedIncidents(newExpanded);
  };

  const startEditGroup = (group: StatusComponentGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      display_order: group.display_order,
    });
    setShowGroupModal(true);
  };

  const startEditComponent = (component: StatusComponent) => {
    setEditingComponent(component);
    setComponentFormData({
      name: component.name,
      description: component.description || '',
      group_id: component.group_id || '',
      status: component.status,
      status_message: component.status_message || '',
      display_order: component.display_order,
      is_public: component.is_public,
    });
    setShowComponentModal(true);
  };

  const startEditIncident = (incident: StatusIncident) => {
    setEditingIncident(incident);
    setIncidentFormData({
      title: incident.title,
      description: incident.description || '',
      status: incident.status,
      impact_scope: incident.impact_scope,
      component_status: incident.component_status || 'degraded_performance',
      affected_components: incident.affected_components || [],
      scheduled_start: incident.scheduled_start ? new Date(incident.scheduled_start).toISOString().slice(0, 16) : '',
      scheduled_end: incident.scheduled_end ? new Date(incident.scheduled_end).toISOString().slice(0, 16) : '',
      is_public: incident.is_public,
    });
    setShowIncidentModal(true);
  };

  const startAddUpdate = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    const incident = incidents.find(i => i.id === incidentId);
    if (incident) {
      setUpdateFormData({
        status: incident.status,
        message: '',
      });
    }
    setShowUpdateModal(true);
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: '',
      description: '',
      display_order: 0,
    });
    setEditingGroup(null);
    setShowGroupModal(false);
  };

  const resetComponentForm = () => {
    setComponentFormData({
      name: '',
      description: '',
      group_id: '',
      status: 'operational',
      status_message: '',
      display_order: 0,
      is_public: true,
    });
    setEditingComponent(null);
    setShowComponentModal(false);
  };

  const resetIncidentForm = () => {
    setIncidentFormData({
      title: '',
      description: '',
      status: 'investigating',
      impact_scope: 'scaled_down',
      component_status: 'degraded_performance',
      affected_components: [],
      scheduled_start: '',
      scheduled_end: '',
      is_public: true,
    });
    setEditingIncident(null);
    setShowIncidentModal(false);
  };

  const resetUpdateForm = () => {
    setUpdateFormData({
      status: 'investigating',
      message: '',
    });
    setSelectedIncidentId(null);
    setShowUpdateModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const overallStatusInfo = overallStatusConfig[overallStatus as keyof typeof overallStatusConfig] || overallStatusConfig.operational;
  const OverallIcon = overallStatusInfo.icon;

  return (
    <div className="space-y-6">
      {/* System Status Site Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-6 cursor-pointer" onClick={() => setBannerSettingsCollapsed(!bannerSettingsCollapsed)}>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Status Site Notification
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Control how system status is displayed to users across the site
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBannerSettingsCollapsed(!bannerSettingsCollapsed);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label={bannerSettingsCollapsed ? "Expand settings" : "Collapse settings"}
          >
            {bannerSettingsCollapsed ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {!bannerSettingsCollapsed && (
        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Enable System Status Site Notification
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Show system status notification to users (admins can enable regardless of system status)
              </p>
            </div>
            <button
              onClick={() => setBannerSettings({ ...bannerSettings, is_enabled: !bannerSettings.is_enabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                bannerSettings.is_enabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  bannerSettings.is_enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {bannerSettings.is_enabled && (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Show Incident Information
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Display active incident details in the notification
                  </p>
                </div>
                <button
                  onClick={() => setBannerSettings({ ...bannerSettings, show_incidents: !bannerSettings.show_incidents })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    bannerSettings.show_incidents ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      bannerSettings.show_incidents ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Only Show When Issues
                  </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Hide notification when all systems are operational (admins can override this)
                    </p>
                </div>
                <button
                  onClick={() => setBannerSettings({ ...bannerSettings, only_show_when_issues: !bannerSettings.only_show_when_issues })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    bannerSettings.only_show_when_issues ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      bannerSettings.only_show_when_issues ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Notification Style
                </label>
                <select
                  value={bannerSettings.banner_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'banner' | 'card' | 'modal';
                    setBannerSettings({ 
                      ...bannerSettings, 
                      banner_type: newType,
                      // Reset display_on_all_pages if switching to card or banner (only modal supports it)
                      display_on_all_pages: (newType === 'card' || newType === 'banner') ? false : bannerSettings.display_on_all_pages
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="banner">Banner (Full Width)</option>
                  <option value="card">Card (Dashboard Card)</option>
                  <option value="modal">Modal (Floating Button)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose how the status appears. Banner shows at the top, Card appears in the sidebar, Modal shows as a floating button.
                </p>
              </div>

              {/* Modal Position - Only show for Modal type */}
              {bannerSettings.banner_type === 'modal' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Modal Button Position
                  </label>
                  <select
                    value={bannerSettings.modal_position}
                    onChange={(e) => {
                      setBannerSettings({ 
                        ...bannerSettings, 
                        modal_position: e.target.value as 'bottom-left' | 'bottom-right'
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose where the floating status button appears on the screen.
                  </p>
                </div>
              )}

              {/* Display on All Pages - Only show for Modal type */}
              {bannerSettings.banner_type === 'modal' && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Display on All Pages
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Show the status modal button on all pages across the site, not just the dashboard
                    </p>
                  </div>
                  <button
                    onClick={() => setBannerSettings({ ...bannerSettings, display_on_all_pages: !bannerSettings.display_on_all_pages })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      bannerSettings.display_on_all_pages ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        bannerSettings.display_on_all_pages ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Advanced Settings Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAdvancedSettings(true)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Advanced Settings
                </button>
              </div>
            </>
          )}
        </div>
        )}

        {/* Advanced Settings Modal */}
        {showAdvancedSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Advanced System Status Notification Settings</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure advanced display and notification options</p>
                  </div>
                  <button
                    onClick={() => setShowAdvancedSettings(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Auto-Refresh Interval */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Auto-Refresh Interval
                  </label>
                  <select
                    value={bannerSettings.refresh_interval}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, refresh_interval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="5">5 seconds</option>
                    <option value="10">10 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                    <option value="0">Manual (no auto-refresh)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How often the notification updates with new status information
                  </p>
                </div>

                {/* Maximum Incidents */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Maximum Incidents to Display
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={bannerSettings.max_incidents}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, max_incidents: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum number of active incidents to show in the notification (1-10)
                  </p>
                </div>

                {/* Minimum Incident Severity */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Minimum Incident Severity Filter
                  </label>
                  <select
                    value={bannerSettings.min_incident_severity}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, min_incident_severity: e.target.value as 'none' | 'minor' | 'major' | 'critical' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="none">Show All Incidents (No Filter)</option>
                    <option value="minor">Minor or Higher (Scaled Down Services)</option>
                    <option value="major">Major or Higher (Partial Outage)</option>
                    <option value="critical">Critical Only (Major/Full Outage)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only show incidents at or above this severity level. Severity is based on impact scope: Minor = Scaled Down, Major = Partial Outage, Critical = Major/Full Outage.
                  </p>
                </div>

                {/* Minimum Status Threshold */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Minimum Status Threshold
                  </label>
                  <select
                    value={bannerSettings.min_status_threshold}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, min_status_threshold: e.target.value as 'operational' | 'investigating' | 'maintenance' | 'degraded_performance' | 'partial_outage' | 'major_outage' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="operational">Always Show (All Statuses)</option>
                    <option value="investigating">Investigating or Worse</option>
                    <option value="maintenance">Maintenance or Worse</option>
                    <option value="degraded_performance">Degraded Performance or Worse</option>
                    <option value="partial_outage">Partial Outage or Worse</option>
                    <option value="major_outage">Major Outage Only</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only show notification when system status is at or above this threshold
                  </p>
                </div>

                {/* Banner Position (for banner mode only) */}
                {bannerSettings.banner_type === 'banner' && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Banner Position
                    </label>
                    <select
                      value={bannerSettings.banner_position}
                      onChange={(e) => setBannerSettings({ ...bannerSettings, banner_position: e.target.value as 'top' | 'bottom' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="top">Top of Dashboard</option>
                      <option value="bottom">Bottom of Dashboard</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Where to display the notification on the dashboard (only applies to Banner style)
                    </p>
                  </div>
                )}

                {/* Role-Based Visibility */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Visible to User Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'individual', label: 'Regular Users', description: 'Standard user accounts' },
                      { value: 'admin', label: 'Admin Users', description: 'Users with admin privileges' },
                      { value: 'super_admin', label: 'Super Admins', description: 'Users with full system access' },
                      { value: 'support_staff', label: 'Support Staff', description: 'Users with support role' },
                      { value: 'billing_manager', label: 'Billing Managers', description: 'Users with billing role' },
                      { value: 'content_moderator', label: 'Content Moderators', description: 'Users with moderation role' },
                      { value: 'user_manager', label: 'User Managers', description: 'Users with user management role' },
                    ].map((role) => (
                      <label key={role.value} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={bannerSettings.visible_to_roles.includes(role.value)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...bannerSettings.visible_to_roles, role.value]
                              : bannerSettings.visible_to_roles.filter(r => r !== role.value);
                            setBannerSettings({ ...bannerSettings, visible_to_roles: newRoles });
                          }}
                          className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.label}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{role.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Show notification only to selected user types. Leave all unchecked to show to everyone.
                  </p>
                </div>

                {/* User Groups Visibility */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Visible to User Groups
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'new_users', label: 'New Users', description: 'Users who joined in the last 30 days' },
                      { value: 'suspended_users', label: 'Suspended Users', description: 'Users with active suspensions' },
                      { value: 'verified_users', label: 'Verified Users', description: 'Users with verified accounts' },
                      { value: 'premium_users', label: 'Premium Users', description: 'Users on Pro or Ultimate plans' },
                      { value: 'free_users', label: 'Free Plan Users', description: 'Users on the free plan' },
                    ].map((group) => (
                      <label key={group.value} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={bannerSettings.visible_to_roles.includes(group.value)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...bannerSettings.visible_to_roles, group.value]
                              : bannerSettings.visible_to_roles.filter(r => r !== group.value);
                            setBannerSettings({ ...bannerSettings, visible_to_roles: newRoles });
                          }}
                          className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{group.label}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Show notification only to selected user groups. Leave all unchecked to show to everyone.
                  </p>
                </div>

                {/* Plan-Based Visibility */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Visible to Subscription Plans
                  </label>
                  <div className="space-y-2">
                    {['free', 'pro', 'ultimate'].map((plan) => (
                      <label key={plan} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={bannerSettings.visible_to_plans.includes(plan)}
                          onChange={(e) => {
                            const newPlans = e.target.checked
                              ? [...bannerSettings.visible_to_plans, plan]
                              : bannerSettings.visible_to_plans.filter(p => p !== plan);
                            setBannerSettings({ ...bannerSettings, visible_to_plans: newPlans });
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{plan}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Show notification only to selected subscription plans. Leave all unchecked to show to everyone.
                  </p>
                </div>

                {/* Custom Status Messages */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Custom Status Messages
                  </label>
                  <div className="space-y-2">
                    {['operational', 'degraded_performance', 'partial_outage', 'major_outage', 'maintenance', 'investigating'].map((status) => (
                      <div key={status}>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                          {status.replace('_', ' ')}:
                        </label>
                        <input
                          type="text"
                          value={bannerSettings.custom_status_messages[status] || ''}
                          onChange={(e) => {
                            const newMessages = { ...bannerSettings.custom_status_messages };
                            if (e.target.value) {
                              newMessages[status] = e.target.value;
                            } else {
                              delete newMessages[status];
                            }
                            setBannerSettings({ ...bannerSettings, custom_status_messages: newMessages });
                          }}
                          placeholder={`Default: ${status === 'operational' ? 'All Systems Operational' : status.replace('_', ' ')}`}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Customize the status message text for each status type. Leave empty to use default messages.
                  </p>
                </div>

                {/* Custom Status Page URL */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Custom Status Page URL
                  </label>
                  <input
                    type="text"
                    value={bannerSettings.custom_status_page_url || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, custom_status_page_url: e.target.value })}
                    placeholder="/status (default)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Override the default status page link. Leave empty to use /status
                  </p>
                </div>

                {/* Custom Status Page Link Text */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Custom Status Page Link Text
                  </label>
                  <input
                    type="text"
                    value={bannerSettings.custom_status_page_link_text || ''}
                    onChange={(e) => setBannerSettings({ ...bannerSettings, custom_status_page_link_text: e.target.value })}
                    placeholder="View Status Page (default)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Customize the text for the status page link. Leave empty to use "View Status Page"
                  </p>
                </div>

                {/* Time-Based Display Rules */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Time-Based Display Rules
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Enable Time-Based Rules</span>
                      <button
                        onClick={() => setBannerSettings({ 
                          ...bannerSettings, 
                          time_based_rules: { ...bannerSettings.time_based_rules, enabled: !bannerSettings.time_based_rules.enabled }
                        })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          bannerSettings.time_based_rules.enabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            bannerSettings.time_based_rules.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    {bannerSettings.time_based_rules.enabled && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Days of Week</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 0, label: 'Sun' },
                              { value: 1, label: 'Mon' },
                              { value: 2, label: 'Tue' },
                              { value: 3, label: 'Wed' },
                              { value: 4, label: 'Thu' },
                              { value: 5, label: 'Fri' },
                              { value: 6, label: 'Sat' },
                            ].map((day) => (
                              <label key={day.value} className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={bannerSettings.time_based_rules.days.includes(day.value)}
                                  onChange={(e) => {
                                    const newDays = e.target.checked
                                      ? [...bannerSettings.time_based_rules.days, day.value]
                                      : bannerSettings.time_based_rules.days.filter(d => d !== day.value);
                                    setBannerSettings({ 
                                      ...bannerSettings, 
                                      time_based_rules: { ...bannerSettings.time_based_rules, days: newDays }
                                    });
                                  }}
                                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Hour (0-23)</label>
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={bannerSettings.time_based_rules.start_hour}
                              onChange={(e) => setBannerSettings({ 
                                ...bannerSettings, 
                                time_based_rules: { ...bannerSettings.time_based_rules, start_hour: parseInt(e.target.value) || 0 }
                              })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Hour (0-23)</label>
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={bannerSettings.time_based_rules.end_hour}
                              onChange={(e) => setBannerSettings({ 
                                ...bannerSettings, 
                                time_based_rules: { ...bannerSettings.time_based_rules, end_hour: parseInt(e.target.value) || 23 }
                              })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                          <input
                            type="text"
                            value={bannerSettings.time_based_rules.timezone}
                            onChange={(e) => setBannerSettings({ 
                              ...bannerSettings, 
                              time_based_rules: { ...bannerSettings.time_based_rules, timezone: e.target.value }
                            })}
                            placeholder="UTC"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Only show banner during specified days and hours. Leave disabled to show always.
                  </p>
                </div>

                {/* Status Change Notifications */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Enable Status Change Notifications
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Send notifications when system status changes
                      </p>
                    </div>
                    <button
                      onClick={() => setBannerSettings({ ...bannerSettings, enable_status_change_notifications: !bannerSettings.enable_status_change_notifications })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        bannerSettings.enable_status_change_notifications ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          bannerSettings.enable_status_change_notifications ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {bannerSettings.enable_status_change_notifications && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Notification Channels</label>
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={bannerSettings.notification_channels.includes('web')}
                          onChange={(e) => {
                            const newChannels = e.target.checked
                              ? [...bannerSettings.notification_channels.filter(c => c !== 'email' && c !== 'push' && c !== 'in_app'), 'web']
                              : bannerSettings.notification_channels.filter(c => c !== 'web');
                            setBannerSettings({ ...bannerSettings, notification_channels: newChannels });
                          }}
                          className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Web Notifications</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Users will receive notifications in their notification bell/center when system status changes</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowAdvancedSettings(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await saveBannerSettings();
                    setShowAdvancedSettings(false);
                  }}
                  disabled={savingBannerSettings}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingBannerSettings ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save button - always visible so users can save disabled state */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
          <button
            onClick={saveBannerSettings}
            disabled={savingBannerSettings}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {savingBannerSettings ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overall Status Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OverallIcon className={`w-6 h-6 ${overallStatusInfo.iconClass}`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Overall System Status
              </h2>
              <p className={`text-sm font-medium ${overallStatusInfo.textClass}`}>
                {getOverallStatusLabel(overallStatus)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Last updated: <RelativeTime date={lastUpdated} /></span>
              </div>
            )}
            <button
              onClick={async () => {
                setRefreshingStatus(true);
                try {
                  await loadOverallStatus();
                } finally {
                  setRefreshingStatus(false);
                }
              }}
              disabled={refreshingStatus}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Refresh system status"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingStatus ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSection('components')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'components'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Components
        </button>
        <button
          onClick={() => setActiveSection('groups')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'groups'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Groups
        </button>
        <button
          onClick={() => setActiveSection('incidents')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'incidents'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Incidents
        </button>
      </div>

      {/* Components Section */}
      {activeSection === 'components' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Status Components</h2>
            <div className="flex items-center gap-2">
              {groups.length > 0 && (
                <>
                  {!allGroupsExpanded && (
                    <button
                      onClick={expandAllGroups}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                      title="Expand all groups"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Expand All
                    </button>
                  )}
                  {!allGroupsCollapsed && (
                    <button
                      onClick={collapseAllGroups}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                      title="Collapse all groups"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Collapse All
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  resetComponentForm();
                  setShowComponentModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Component
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {groups.sort((a, b) => a.display_order - b.display_order).map((group) => {
              const groupComponents = components.filter(c => c.group_id === group.id).sort((a, b) => a.display_order - b.display_order);
              const isExpanded = expandedGroups.has(group.id);
              const groupStatus = getGroupStatus(groupComponents);
              const groupStatusInfo = statusConfig[groupStatus as keyof typeof statusConfig];
              const GroupStatusIcon = groupStatusInfo.icon;
              
              return (
                <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleGroupExpanded(group.id)}
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
                              {group.name}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${groupStatusInfo.bgClass} ${groupStatusInfo.textClass} flex items-center gap-1`}>
                              <GroupStatusIcon className="w-3 h-3" />
                              {groupStatusInfo.label}
                            </span>
                          </div>
                          {group.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {groupComponents.length} {groupComponents.length === 1 ? 'component' : 'components'}
                        </span>
                        <button
                          onClick={() => startEditGroup(group)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                          title="Edit Group"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-2">
                      {groupComponents.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No components in this group
                        </p>
                      ) : (
                        groupComponents.map((component) => {
                          const statusInfo = statusConfig[component.status];
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <div
                              key={component.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-3 h-3 rounded-full ${statusInfo.dotClass}`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {component.name}
                                    </h4>
                                    {!component.is_public && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                                        Private
                                      </span>
                                    )}
                                  </div>
                                  {component.status_message && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      {component.status_message}
                                    </p>
                                  )}
                                  {component.original_status && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                                      Original status: {statusConfig[component.original_status as keyof typeof statusConfig]?.label || component.original_status}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass} flex items-center gap-1`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo.label}
                                </span>
                                <button
                                  onClick={() => startEditComponent(component)}
                                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComponent(component.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped Components */}
            {components.filter(c => !c.group_id).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Ungrouped Components
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {components.filter(c => !c.group_id).map((component) => {
                    const statusInfo = statusConfig[component.status];
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div
                        key={component.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-3 h-3 rounded-full ${statusInfo.dotClass}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {component.name}
                              </h4>
                              {!component.is_public && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                                  Private
                                </span>
                              )}
                            </div>
                            {component.status_message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {component.status_message}
                              </p>
                            )}
                            {component.original_status && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                                Original status: {statusConfig[component.original_status as keyof typeof statusConfig]?.label || component.original_status}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                          <button
                            onClick={() => startEditComponent(component)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteComponent(component.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Groups Section */}
      {activeSection === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Component Groups</h2>
            <button
              onClick={() => {
                resetGroupForm();
                setShowGroupModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Group
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditGroup(group)}
                      className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {group.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Order: {group.display_order}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents Section */}
      {activeSection === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Incidents</h2>
            <button
              onClick={() => {
                resetIncidentForm();
                setShowIncidentModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Incident
            </button>
          </div>

          <div className="space-y-4">
            {incidents.map((incident) => {
              const isExpanded = expandedIncidents.has(incident.id);
              const statusInfo = incidentStatusConfig[incident.status];
              const isResolved = incident.status === 'resolved';
              
              // Impact scope labels
              const impactScopeLabels: Record<string, string> = {
                'site_wide': 'Site Wide',
                'scaled_down': 'Scaled Down',
                'limited_users': 'Limited Users',
                'specific_feature': 'Specific Feature',
                'none': 'None',
                'no_effect': 'None', // Legacy support
              };
              const impactScopeLabel = impactScopeLabels[incident.impact_scope] || incident.impact_scope;
              
              return (
                <div
                  key={incident.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleIncidentExpanded(incident.id)}
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
                              {incident.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                              {statusInfo.label}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Impact: {impactScopeLabel}
                            </span>
                            {!incident.is_public && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                                Private
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              Started: {new Date(incident.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={incident.started_at} />
                            </span>
                            {isResolved && incident.resolved_at && (
                              <span>
                                Resolved: {new Date(incident.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={incident.resolved_at} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startAddUpdate(incident.id)}
                          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Add Update
                        </button>
                        <button
                          onClick={() => startEditIncident(incident)}
                          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIncident(incident.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {incident.description && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {incident.description}
                          </p>
                        </div>
                      )}

                      {incident.affected_components && incident.affected_components.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Affected Components
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {incident.affected_components.map((componentId) => {
                              const component = components.find(c => c.id === componentId);
                              return component ? (
                                <span
                                  key={componentId}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                  {component.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {incident.updates && incident.updates.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Updates
                          </h4>
                          <div className="space-y-3">
                            {incident.updates.map((update) => {
                              const updateStatusInfo = incidentStatusConfig[update.status];
                              return (
                                <div
                                  key={update.id}
                                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border-l-4 border-indigo-500"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs px-2 py-1 rounded-full ${updateStatusInfo.bgClass} ${updateStatusInfo.textClass}`}>
                                      {updateStatusInfo.label}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      <RelativeTime date={update.created_at} />
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {update.message}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingGroup ? 'Edit Group' : 'Create Group'}
                </h3>
                <button
                  onClick={resetGroupForm}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleGroupSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={groupFormData.display_order}
                  onChange={(e) => setGroupFormData({ ...groupFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetGroupForm}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Component Modal */}
      {showComponentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingComponent ? 'Edit Component' : 'Create Component'}
                </h3>
                <button
                  onClick={resetComponentForm}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleComponentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={componentFormData.name}
                  onChange={(e) => setComponentFormData({ ...componentFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={componentFormData.description}
                  onChange={(e) => setComponentFormData({ ...componentFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group
                </label>
                <select
                  value={componentFormData.group_id}
                  onChange={(e) => setComponentFormData({ ...componentFormData, group_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">No Group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={componentFormData.status}
                  onChange={(e) => setComponentFormData({ ...componentFormData, status: e.target.value as StatusComponent['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="operational">Operational</option>
                  <option value="degraded_performance">Degraded Performance</option>
                  <option value="partial_outage">Partial Outage</option>
                  <option value="major_outage">Major Outage</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="investigating">Investigating</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Message
                </label>
                <input
                  type="text"
                  value={componentFormData.status_message}
                  onChange={(e) => setComponentFormData({ ...componentFormData, status_message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 'Experiencing higher than normal latency'"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={componentFormData.display_order}
                  onChange={(e) => setComponentFormData({ ...componentFormData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={componentFormData.is_public}
                  onChange={(e) => setComponentFormData({ ...componentFormData, is_public: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Public (visible on status page)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetComponentForm}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingIncident ? 'Edit Incident' : 'Create Incident'}
                </h3>
                <button
                  onClick={resetIncidentForm}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleIncidentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={incidentFormData.title}
                  onChange={(e) => setIncidentFormData({ ...incidentFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={incidentFormData.description}
                  onChange={(e) => setIncidentFormData({ ...incidentFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={incidentFormData.status}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, status: e.target.value as StatusIncident['status'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="verifying">Verifying</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Impact Scope *
                  </label>
                  <select
                    required
                    value={incidentFormData.impact_scope}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, impact_scope: e.target.value as StatusIncident['impact_scope'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="site_wide">Site Wide</option>
                    <option value="scaled_down">Scaled Down</option>
                    <option value="limited_users">Limited Users</option>
                    <option value="specific_feature">Specific Feature</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Component Status *
                  </label>
                  <select
                    required
                    value={incidentFormData.component_status || 'degraded_performance'}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, component_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="degraded_performance">Degraded Performance</option>
                    <option value="partial_outage">Partial Outage</option>
                    <option value="major_outage">Major Outage</option>
                    <option value="investigating">Investigating</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose how affected components should appear. This determines the overall system status.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Affected Components
                </label>
                <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {groups
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((group) => {
                      const groupComponents = components
                        .filter(c => c.is_public && c.group_id === group.id)
                        .sort((a, b) => a.display_order - b.display_order);
                      
                      if (groupComponents.length === 0) return null;
                      
                      return (
                        <div key={group.id} className="space-y-1">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded">
                            {group.name}
                          </div>
                          <div className="space-y-1 pl-2">
                            {groupComponents.map((component) => (
                              <label key={component.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={incidentFormData.affected_components.includes(component.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setIncidentFormData({
                                        ...incidentFormData,
                                        affected_components: [...incidentFormData.affected_components, component.id],
                                      });
                                    } else {
                                      setIncidentFormData({
                                        ...incidentFormData,
                                        affected_components: incidentFormData.affected_components.filter(id => id !== component.id),
                                      });
                                    }
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{component.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  {/* Show components without a group at the end */}
                  {components
                    .filter(c => c.is_public && !c.group_id)
                    .sort((a, b) => a.display_order - b.display_order)
                    .length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded">
                        Other
                      </div>
                      <div className="space-y-1 pl-2">
                        {components
                          .filter(c => c.is_public && !c.group_id)
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((component) => (
                            <label key={component.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={incidentFormData.affected_components.includes(component.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setIncidentFormData({
                                      ...incidentFormData,
                                      affected_components: [...incidentFormData.affected_components, component.id],
                                    });
                                  } else {
                                    setIncidentFormData({
                                      ...incidentFormData,
                                      affected_components: incidentFormData.affected_components.filter(id => id !== component.id),
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{component.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scheduled Start (for scheduled maintenance)
                  </label>
                  <input
                    type="datetime-local"
                    value={incidentFormData.scheduled_start}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, scheduled_start: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scheduled End
                  </label>
                  <input
                    type="datetime-local"
                    value={incidentFormData.scheduled_end}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, scheduled_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incident_is_public"
                  checked={incidentFormData.is_public}
                  onChange={(e) => setIncidentFormData({ ...incidentFormData, is_public: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="incident_is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Public (visible on status page)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetIncidentForm}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && selectedIncidentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add Incident Update
                </h3>
                <button
                  onClick={resetUpdateForm}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={updateFormData.status}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, status: e.target.value as StatusIncidentUpdate['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="verifying">Verifying</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Message *
                </label>
                <textarea
                  required
                  value={updateFormData.message}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Provide an update on the incident..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetUpdateForm}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Add Update
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

