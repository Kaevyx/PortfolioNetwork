"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RelativeTime } from "@/components/RelativeTime";
import { Heart, RefreshCw } from "lucide-react";

const statusConfig = {
  operational: { 
    label: 'Operational', 
    icon: Heart, 
    iconClass: 'text-green-500 animate-pulse'
  },
  degraded_performance: { 
    label: 'Degraded Performance', 
    icon: Heart, 
    iconClass: 'text-yellow-500 animate-pulse'
  },
  partial_outage: { 
    label: 'Partial Outage', 
    icon: Heart, 
    iconClass: 'text-orange-500 animate-pulse'
  },
  major_outage: { 
    label: 'Major Outage', 
    icon: Heart, 
    iconClass: 'text-red-500 animate-pulse'
  },
  maintenance: { 
    label: 'Maintenance', 
    icon: Heart, 
    iconClass: 'text-blue-500 animate-pulse'
  },
  investigating: { 
    label: 'Investigating', 
    icon: Heart, 
    iconClass: 'text-purple-500 animate-pulse'
  },
};

function getOverallStatusLabel(status: string, allAffected: boolean = false): string {
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

interface StatusPageHeaderProps {
  initialStatus: string;
  initialLastUpdated: string | null;
  initialAllAffected: boolean;
}

export function StatusPageHeader({ 
  initialStatus, 
  initialLastUpdated, 
  initialAllAffected 
}: StatusPageHeaderProps) {
  const supabase = createClient();
  const [overallStatus, setOverallStatus] = useState(initialStatus);
  const [lastUpdated, setLastUpdated] = useState<string | null>(initialLastUpdated);
  const [allAffected, setAllAffected] = useState(initialAllAffected);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      // Get overall system status
      const { data: statusData, error: statusError } = await supabase.rpc('get_overall_system_status');
      
      if (!statusError && statusData) {
        setOverallStatus(statusData || 'operational');
      }

      // Get last updated timestamp
      try {
        const { data: lastUpdatedData, error: lastUpdatedError } = await supabase.rpc('get_status_last_updated');
        
        if (!lastUpdatedError && lastUpdatedData) {
          setLastUpdated(lastUpdatedData);
        }
      } catch (error) {
        // Silently ignore if function doesn't exist
      }

      // Check if all components are affected
      const { data: componentsData } = await supabase
        .from('status_components')
        .select("id, status")
        .eq('is_public', true);

      if (componentsData) {
        const totalPublicComponents = componentsData.length;
        const affectedComponents = componentsData.filter((c: any) => 
          c.status !== 'operational' && c.status !== 'maintenance'
        ).length;
        const allComponentsAffected = totalPublicComponents > 0 && affectedComponents === totalPublicComponents;
        setAllAffected(allComponentsAffected);
      }
      
      // Refresh the entire page to get updated components and incidents
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing status:", error);
      setRefreshing(false);
    }
  };

  const overallStatusInfo = statusConfig[overallStatus as keyof typeof statusConfig] || statusConfig.operational;
  const OverallIcon = overallStatusInfo.icon;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          System Status
        </h1>
        <button
          onClick={refreshStatus}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh system status"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <OverallIcon className={`w-5 h-5 ${overallStatusInfo.iconClass}`} />
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {getOverallStatusLabel(overallStatus, allAffected)}
        </span>
      </div>
      {lastUpdated && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: <RelativeTime date={lastUpdated} />
        </p>
      )}
    </div>
  );
}

