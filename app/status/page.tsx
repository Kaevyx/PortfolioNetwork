import { createClient } from "@/lib/supabase/server";
import { RelativeTime } from "@/components/RelativeTime";
import { StatusPageHeader } from "@/components/StatusPageHeader";
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Settings, 
  Activity,
  Clock,
  Server,
  Heart,
  Info
} from "lucide-react";

const statusConfig = {
  operational: { 
    label: 'Operational', 
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
    label: 'Maintenance', 
    icon: Heart, 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    iconClass: 'text-blue-500 animate-pulse'
  },
  investigating: { 
    label: 'Investigating', 
    icon: Heart, 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300',
    iconClass: 'text-purple-500 animate-pulse'
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


// Function to get properly capitalized overall status label
function getOverallStatusLabel(status: string, allAffected: boolean = false): string {
  // Only use "All Systems" if all components are affected, otherwise use status-based labels
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
    // Use status-based labels when not all components are affected
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

export default async function StatusPage() {
  const supabase = await createClient();

  // Get overall system status
  const { data: overallStatus, error: statusError } = await supabase.rpc('get_overall_system_status');
  
  // If RPC fails, default to operational
  const overallStatusValue = overallStatus || 'operational';

  // Get last updated timestamp (only if function exists)
  let lastUpdated: string | null = null;
  try {
    const { data: lastUpdatedData, error: lastUpdatedError } = await supabase.rpc('get_status_last_updated');
    
    if (lastUpdatedError) {
      // Function might not exist yet - silently ignore
      if (lastUpdatedError.code !== 'PGRST202') {
        console.error("Error loading last updated:", lastUpdatedError);
      }
    } else if (lastUpdatedData) {
      lastUpdated = lastUpdatedData;
    }
  } catch (error) {
    // Silently ignore if function doesn't exist
  }

  // Load public components with their groups
  const { data: componentsData, error: componentsError } = await supabase
    .from('status_components')
    .select(`
      *,
      group:status_component_groups(*)
    `)
    .eq('is_public', true)
    .order('display_order', { ascending: true });

  if (componentsError) {
    console.error("Error loading components:", componentsError);
  }

  const components = componentsData || [];

  // Group components by group and sort by display_order
  const groupedComponents = components.reduce((acc: any, component: any) => {
    const groupName = component.group?.name || 'Other';
    if (!acc[groupName]) {
      acc[groupName] = {
        group: component.group,
        components: [],
      };
    }
    acc[groupName].components.push(component);
    return acc;
  }, {});

  // Sort groups by display_order and components within each group
  const sortedGroupedComponents = Object.entries(groupedComponents).sort(([nameA, dataA]: [string, any], [nameB, dataB]: [string, any]) => {
    const orderA = dataA.group?.display_order ?? 999;
    const orderB = dataB.group?.display_order ?? 999;
    return orderA - orderB;
  }).reduce((acc: any, [groupName, groupData]: [string, any]) => {
    acc[groupName] = {
      ...groupData,
      components: groupData.components.sort((a: any, b: any) => a.display_order - b.display_order),
    };
    return acc;
  }, {});

  // Load active incidents (not resolved, public)
  const { data: activeIncidentsData, error: activeIncidentsError } = await supabase
    .from('status_incidents')
    .select('*')
    .eq('is_public', true)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false });

  if (activeIncidentsError) {
    console.error("Error loading active incidents:", activeIncidentsError);
  }

  const activeIncidents = activeIncidentsData || [];

  // Load updates for active incidents
  const activeIncidentsWithUpdates = await Promise.all(
    activeIncidents.map(async (incident: any) => {
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

  // Load resolved incidents (last 30 days, public)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: resolvedIncidentsData, error: resolvedIncidentsError } = await supabase
    .from('status_incidents')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'resolved')
    .gte('resolved_at', thirtyDaysAgo.toISOString())
    .order('resolved_at', { ascending: false })
    .limit(10);

  if (resolvedIncidentsError) {
    console.error("Error loading resolved incidents:", resolvedIncidentsError);
  }

  const resolvedIncidents = resolvedIncidentsData || [];

  // Load updates for resolved incidents
  const resolvedIncidentsWithUpdates = await Promise.all(
    resolvedIncidents.map(async (incident: any) => {
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

  const overallStatusInfo = statusConfig[overallStatusValue as keyof typeof statusConfig] || statusConfig.operational;
  const OverallIcon = overallStatusInfo.icon;

  // Check if all public components are affected (not operational or maintenance)
  const totalPublicComponents = components.length;
  const affectedComponents = components.filter((c: any) => 
    c.status !== 'operational' && c.status !== 'maintenance'
  ).length;
  const allAffected = totalPublicComponents > 0 && affectedComponents === totalPublicComponents;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Refresh Button */}
        <StatusPageHeader 
          initialStatus={overallStatusValue}
          initialLastUpdated={lastUpdated}
          initialAllAffected={allAffected}
        />

        {/* Active Incidents */}
        {activeIncidentsWithUpdates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Active Incidents
            </h2>
            <div className="space-y-4">
              {activeIncidentsWithUpdates.map((incident: any) => {
                const statusInfo = incidentStatusConfig[incident.status];
                
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
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {incident.title}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Impact: {impactScopeLabel}
                          </span>
                        </div>
                        {incident.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {incident.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            Started: {new Date(incident.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={incident.started_at} />
                          </span>
                        </div>
                      </div>
                    </div>

                    {incident.updates && incident.updates.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Updates
                        </h4>
                        {incident.updates.map((update: any) => {
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Component Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Component Status
          </h2>
          <div className="space-y-6">
            {Object.entries(sortedGroupedComponents).map(([groupName, groupData]: [string, any]) => (
              <div
                key={groupName}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {groupName}
                  </h3>
                  {groupData.group?.description && (
                    <div className="relative group">
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors flex-shrink-0" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl border border-gray-700 pointer-events-none">
                        <p className="whitespace-normal text-left">{groupData.group.description}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700 transform rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {groupData.components.map((component: any) => {
                    const statusInfo = statusConfig[component.status];
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div
                        key={component.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <statusInfo.icon className={`w-4 h-4 ${statusInfo.iconClass}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {component.name}
                              </h4>
                              {component.description && (
                                <div className="relative group">
                                  <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors flex-shrink-0" />
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-72 p-3 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl border border-gray-700 pointer-events-none">
                                    <p className="whitespace-normal text-left">{component.description}</p>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700 transform rotate-45"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {component.status_message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {component.status_message}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolved Incidents */}
        {resolvedIncidentsWithUpdates.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Resolved Incidents (Last 30 Days)
            </h2>
            <div className="space-y-4">
              {resolvedIncidentsWithUpdates.map((incident: any) => {
                const statusInfo = incidentStatusConfig[incident.status];
                
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
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 opacity-75"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {incident.title}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Impact: {impactScopeLabel}
                          </span>
                        </div>
                        {incident.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {incident.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {incident.resolved_at && (
                            <span>
                              Resolved: {new Date(incident.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={incident.resolved_at} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {incident.updates && incident.updates.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {incident.updates.map((update: any) => {
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Active Incidents Message */}
        {activeIncidentsWithUpdates.length === 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
            <Heart className="w-12 h-12 text-green-500 mx-auto mb-2 animate-pulse" />
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              All Systems Operational
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              No active incidents at this time.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

