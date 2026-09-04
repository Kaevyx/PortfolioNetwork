"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";

const statusConfig = {
  operational: { 
    iconClass: 'text-green-500 animate-pulse'
  },
  degraded_performance: { 
    iconClass: 'text-yellow-500 animate-pulse'
  },
  partial_outage: { 
    iconClass: 'text-orange-500 animate-pulse'
  },
  major_outage: { 
    iconClass: 'text-red-500 animate-pulse'
  },
  maintenance: { 
    iconClass: 'text-blue-500 animate-pulse'
  },
  investigating: { 
    iconClass: 'text-purple-500 animate-pulse'
  },
};

// Function to get properly capitalized overall status label
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

export function FooterStatus() {
  const [status, setStatus] = useState<string>('operational');
  const [allAffected, setAllAffected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const supabase = createClient();
        
        // Get overall system status
        const { data: overallStatus, error: rpcError } = await supabase.rpc('get_overall_system_status');
        
        // Get last updated timestamp (only if function exists)
        try {
          const { data: lastUpdatedData, error: lastUpdatedError } = await supabase.rpc('get_status_last_updated');
          
          if (lastUpdatedError) {
            // Function might not exist yet - silently ignore
            if (lastUpdatedError.code !== 'PGRST202') {
              console.error("Error loading last updated:", lastUpdatedError);
            }
          } else if (lastUpdatedData) {
            setLastUpdated(lastUpdatedData);
          }
        } catch (error) {
          // Silently ignore if function doesn't exist
        }
        
        if (rpcError) {
          // Only log if it's not a "function doesn't exist" error
          if (rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
            console.error("RPC Error loading status:", rpcError.message || rpcError);
          }
          // Fallback: calculate status from components
          const { data: componentsData } = await supabase
            .from('status_components')
            .select('id, status')
            .eq('is_public', true);
          
          const components = componentsData || [];
          let calculatedStatus = 'operational';
          
          // Calculate status from components (worst status first)
          if (components.some((c: any) => c.status === 'major_outage')) {
            calculatedStatus = 'major_outage';
          } else if (components.some((c: any) => c.status === 'partial_outage')) {
            calculatedStatus = 'partial_outage';
          } else if (components.some((c: any) => c.status === 'degraded_performance')) {
            calculatedStatus = 'degraded_performance';
          } else if (components.some((c: any) => c.status === 'investigating')) {
            calculatedStatus = 'degraded_performance';
          } else if (components.some((c: any) => c.status === 'maintenance')) {
            calculatedStatus = 'maintenance';
          }
          
          const totalPublicComponents = components.length;
          const affectedComponents = components.filter((c: any) => 
            c.status !== 'operational' && c.status !== 'maintenance'
          ).length;
          const allComponentsAffected = totalPublicComponents > 0 && affectedComponents === totalPublicComponents;
          
          setStatus(calculatedStatus);
          setAllAffected(allComponentsAffected);
          setLoading(false);
          return;
        }
        
        const overallStatusValue = overallStatus || 'operational';
        
        // Load public components to check if all are affected
        const { data: componentsData, error: componentsError } = await supabase
          .from('status_components')
          .select('id, status')
          .eq('is_public', true);
        
        if (componentsError) {
          console.error("Error loading components:", componentsError);
        }
        
        const components = componentsData || [];
        const totalPublicComponents = components.length;
        const affectedComponents = components.filter((c: any) => 
          c.status !== 'operational' && c.status !== 'maintenance'
        ).length;
        const allComponentsAffected = totalPublicComponents > 0 && affectedComponents === totalPublicComponents;
        
        console.log("Footer Status Update:", { overallStatusValue, allComponentsAffected, componentsCount: totalPublicComponents, affectedCount: affectedComponents });
        
        setStatus(overallStatusValue);
        setAllAffected(allComponentsAffected);
      } catch (error) {
        console.error("Error loading status:", error);
        // Default to operational on error
        setStatus('operational');
        setAllAffected(false);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return null;
  }

  const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.operational;

  return (
    <div className="flex flex-col items-center gap-1 mt-4">
      <div className="flex items-center justify-center gap-2">
        <Heart className={`w-4 h-4 ${statusInfo.iconClass}`} />
        <Link
          href="/status"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {getOverallStatusLabel(status, allAffected)}
        </Link>
      </div>
      {lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Updated <RelativeTime date={lastUpdated} />
        </p>
      )}
    </div>
  );
}

