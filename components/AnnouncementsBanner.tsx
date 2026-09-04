"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, X, Info, AlertTriangle, Bell, Wrench, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'information' | 'warning' | 'maintenance';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export function AnnouncementsBanner() {
  const { user, isLoaded } = useUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadAnnouncements = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_announcements', {
          user_clerk_id: user.id
        });

        if (error) {
          // Enhanced error logging - try multiple methods to capture error details
          const errorInfo: any = {
            rawError: error,
            errorString: String(error),
            errorType: typeof error,
            errorConstructor: error?.constructor?.name,
          };
          
          // Try to access error properties directly
          try {
            if (error instanceof Error) {
              errorInfo.message = error.message;
              errorInfo.stack = error.stack;
              errorInfo.name = error.name;
            }
            
            // Try accessing as PostgREST error
            const pgError = error as any;
            errorInfo.code = pgError.code;
            errorInfo.details = pgError.details;
            errorInfo.hint = pgError.hint;
            errorInfo.message = pgError.message || errorInfo.message;
            
            // Try to get all own properties
            const ownProps = Object.getOwnPropertyNames(error);
            errorInfo.ownProperties = {};
            ownProps.forEach(prop => {
              try {
                errorInfo.ownProperties[prop] = (error as any)[prop];
              } catch (e) {
                errorInfo.ownProperties[prop] = '[Cannot access]';
              }
            });
            
            // Try to stringify
            try {
              errorInfo.jsonString = JSON.stringify(error, null, 2);
            } catch (e) {
              errorInfo.jsonError = String(e);
            }
            
            // Try with replacer function
            try {
              errorInfo.jsonWithReplacer = JSON.stringify(error, (key, value) => {
                if (value instanceof Error) {
                  return {
                    name: value.name,
                    message: value.message,
                    stack: value.stack,
                  };
                }
                return value;
              }, 2);
            } catch (e) {
              // Ignore
            }
          } catch (e) {
            errorInfo.captureError = String(e);
          }
          
          console.error("RPC error - get_user_announcements:", errorInfo);
          console.error("Error code (if available):", (error as any)?.code);
          console.error("Error message (if available):", (error as any)?.message);
          
          // Check for common error codes
          const errorCode = (error as any)?.code;
          if (errorCode === 'PGRST202' || errorCode === '42883') {
            console.warn("⚠️ RPC function 'get_user_announcements' may not exist in the database. Please run the SQL migration: supabase/add-announcement-display-types.sql");
          }
          throw error;
        }
        setAnnouncements(data || []);
      } catch (error) {
        console.error("Error loading announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();

    // Subscribe to announcements changes
    const channel = supabase
      .channel(`announcements-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded, user?.id, supabase]);

  const handleDismiss = async (announcementId: string) => {
    if (!user?.id) return;

    setDismissing(prev => new Set(prev).add(announcementId));
    try {
      const { error } = await supabase
        .from('announcement_dismissals')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
        });

      if (error) throw error;

      // Remove from local state
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
    } catch (error) {
      console.error("Error dismissing announcement:", error);
    } finally {
      setDismissing(prev => {
        const newSet = new Set(prev);
        newSet.delete(announcementId);
        return newSet;
      });
    }
  };

  const getAnnouncementStyles = (type: string, priority: string) => {
    const baseStyles = "rounded-lg shadow-lg p-6 mb-4 relative";
    
    switch (type) {
      case 'warning':
        return `${baseStyles} bg-gradient-to-r from-yellow-500 to-orange-500 text-white`;
      case 'information':
        return `${baseStyles} bg-gradient-to-r from-blue-500 to-indigo-500 text-white`;
      case 'maintenance':
        return `${baseStyles} bg-gradient-to-r from-gray-600 to-gray-700 text-white`;
      case 'announcement':
      default:
        return priority === 'urgent' 
          ? `${baseStyles} bg-gradient-to-r from-red-600 to-pink-600 text-white`
          : `${baseStyles} bg-gradient-to-r from-indigo-600 to-purple-600 text-white`;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />;
      case 'information':
        return <Info className="w-6 h-6" />;
      case 'maintenance':
        return <Wrench className="w-6 h-6" />;
      case 'announcement':
      default:
        return <Bell className="w-6 h-6" />;
    }
  };

  if (loading || announcements.length === 0) return null;

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={getAnnouncementStyles(announcement.type, announcement.priority)}
        >
          <button
            onClick={() => handleDismiss(announcement.id)}
            disabled={dismissing.has(announcement.id)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Dismiss announcement"
          >
            {dismissing.has(announcement.id) ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="bg-white/20 rounded-full p-3">
                {getIcon(announcement.type)}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                {announcement.title}
                {announcement.priority === 'urgent' && (
                  <span className="text-xs bg-red-700 px-2 py-1 rounded-full">URGENT</span>
                )}
              </h3>
              <div 
                className="text-white/90 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: announcement.content }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

