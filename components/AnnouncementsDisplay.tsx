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
  display_type: 'banner' | 'card' | 'modal' | 'top_bar' | 'sidebar' | 'inline';
  created_at: string;
}

interface AnnouncementsDisplayProps {
  displayTypes?: ('banner' | 'card' | 'modal' | 'top_bar' | 'sidebar' | 'inline')[];
  className?: string;
}

export function AnnouncementsDisplay({ displayTypes, className = "" }: AnnouncementsDisplayProps) {
  const { user, isLoaded } = useUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState<string | null>(null);
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
          // Fallback: try direct query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('announcements')
            .select('id, title, content, type, priority, display_type, created_at')
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .or('end_date.is.null,end_date.gte.' + new Date().toISOString());

          if (fallbackError) {
            console.error("Fallback query error:", fallbackError);
            setAnnouncements([]);
          } else {
            // Filter out dismissed announcements
            const { data: dismissals } = await supabase
              .from('announcement_dismissals')
              .select('announcement_id')
              .eq('user_id', user.id);

            const dismissedIds = new Set(dismissals?.map(d => d.announcement_id) || []);
            const filtered = (fallbackData || []).filter(a => !dismissedIds.has(a.id));
            setAnnouncements(filtered);
          }
        } else {
          setAnnouncements(data || []);
        }
      } catch (error) {
        console.error("Error loading announcements:", error);
        setAnnouncements([]);
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
      setModalOpen(null);
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

  const getAnnouncementStyles = (type: string, priority: string, displayType: string) => {
    const baseStyles = "rounded-lg shadow-lg relative";
    
    let colorStyles = "";
    switch (type) {
      case 'warning':
        colorStyles = "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
        break;
      case 'information':
        colorStyles = "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
        break;
      case 'maintenance':
        colorStyles = "bg-gradient-to-r from-gray-600 to-gray-700 text-white";
        break;
      case 'announcement':
      default:
        colorStyles = priority === 'urgent' 
          ? "bg-gradient-to-r from-red-600 to-pink-600 text-white"
          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white";
    }

    switch (displayType) {
      case 'top_bar':
        return `${baseStyles} ${colorStyles} p-3 mb-0 sticky top-0 z-50`;
      case 'card':
        return `${baseStyles} ${colorStyles} p-6 mb-4 border-2 border-white/20`;
      case 'modal':
        return `${baseStyles} ${colorStyles} p-6`;
      case 'sidebar':
        return `${baseStyles} ${colorStyles} p-4 mb-3`;
      case 'inline':
        return `${baseStyles} ${colorStyles} p-4 mb-4`;
      case 'banner':
      default:
        return `${baseStyles} ${colorStyles} p-6 mb-4`;
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

  if (loading) return null;

  // Filter by display types if specified
  const filteredAnnouncements = displayTypes 
    ? announcements.filter(a => displayTypes.includes(a.display_type))
    : announcements;

  if (filteredAnnouncements.length === 0) return null;

  // Separate announcements by display type
  const topBarAnnouncements = filteredAnnouncements.filter(a => a.display_type === 'top_bar');
  const modalAnnouncements = filteredAnnouncements.filter(a => a.display_type === 'modal');
  const otherAnnouncements = filteredAnnouncements.filter(a => 
    !['top_bar', 'modal'].includes(a.display_type)
  );

  return (
    <>
      {/* Top Bar Announcements - Fixed at top */}
      {topBarAnnouncements.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          {topBarAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={getAnnouncementStyles(announcement.type, announcement.priority, announcement.display_type)}
            >
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="bg-white/20 rounded-full p-2">
                        {getIcon(announcement.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{announcement.title}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(announcement.id)}
                    disabled={dismissing.has(announcement.id)}
                    className="flex-shrink-0 text-white/80 hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Dismiss"
                  >
                    {dismissing.has(announcement.id) ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Announcements */}
      {modalAnnouncements.map((announcement) => {
        if (modalOpen !== announcement.id) {
          // Show a trigger button if modal isn't open
          return (
            <div key={announcement.id} className="fixed bottom-4 right-4 z-50">
              <button
                onClick={() => setModalOpen(announcement.id)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {announcement.priority === 'urgent' && <span className="text-xs">URGENT</span>}
              </button>
            </div>
          );
        }

        return (
          <div
            key={announcement.id}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setModalOpen(null)}
          >
            <div
              className={getAnnouncementStyles(announcement.type, announcement.priority, announcement.display_type) + " max-w-2xl w-full"}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setModalOpen(null);
                  handleDismiss(announcement.id);
                }}
                disabled={dismissing.has(announcement.id)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors disabled:opacity-50"
                aria-label="Dismiss"
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
          </div>
        );
      })}

      {/* Other Display Types (Banner, Card, Sidebar, Inline) */}
      {otherAnnouncements.length > 0 && (
        <div className={className}>
          {otherAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={getAnnouncementStyles(announcement.type, announcement.priority, announcement.display_type)}
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
                  <h3 className={`${announcement.display_type === 'sidebar' ? 'text-lg' : 'text-xl'} font-bold mb-2 flex items-center gap-2`}>
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
      )}
    </>
  );
}

