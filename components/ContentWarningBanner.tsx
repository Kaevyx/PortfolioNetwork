"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AlertTriangle, X, CheckCircle, ExternalLink } from "lucide-react";

interface ContentWarning {
  id: string;
  warning_message: string;
  category: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  is_acknowledged: boolean;
  created_at: string;
  post_id?: string | null;
  comment_id?: string | null;
}

export function ContentWarningBanner() {
  const { user } = useUser();
  const [warnings, setWarnings] = useState<ContentWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user?.id) {
      loadWarnings();
    }
  }, [user?.id]);

  const loadWarnings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_warnings', {
        p_user_id: user?.id,
      });

      if (error) throw error;
      setWarnings(data || []);
    } catch (error) {
      console.error("Error loading warnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (warningId: string) => {
    setAcknowledging(warningId);
    try {
      const { error } = await supabase.rpc('acknowledge_warning', {
        p_warning_id: warningId,
        p_user_id: user?.id,
      });

      if (error) throw error;

      // Remove acknowledged warning from list
      setWarnings(warnings.filter(w => w.id !== warningId));
    } catch (error: any) {
      console.error("Error acknowledging warning:", error);
      alert("Failed to acknowledge warning: " + error.message);
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading || warnings.length === 0) {
    return null;
  }

  return (
    <>
      {warnings.map((warning) => {
        const severityColors = {
          low: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-900 dark:text-yellow-200',
          medium: 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-900 dark:text-orange-200',
          high: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-200',
        };

        const colorClass = severityColors[warning.severity || 'medium'] || severityColors.medium;

        return (
          <div
            key={warning.id}
            className={`${colorClass} border-l-4 p-4 mb-4 rounded-r-lg shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                  Content Warning
                  {warning.category && (
                    <span className="text-xs font-normal opacity-75">
                      ({warning.category.replace('_', ' ')})
                    </span>
                  )}
                </h3>
                <p className="text-sm mb-3 whitespace-pre-wrap">
                  {warning.warning_message}
                </p>
                {(warning.post_id || warning.comment_id) && (
                  <div className="mb-3">
                    <Link
                      href={warning.post_id 
                        ? `/feed?post=${warning.post_id}`
                        : warning.comment_id
                        ? `/feed?comment=${warning.comment_id}`
                        : '#'}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {warning.post_id ? 'View Post' : 'View Comment'}
                    </Link>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs opacity-75">
                    Issued: {new Date(warning.created_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleAcknowledge(warning.id)}
                    disabled={acknowledging === warning.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {acknowledging === warning.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        Acknowledging...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        I Understand
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

