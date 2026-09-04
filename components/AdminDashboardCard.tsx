"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Shield, CheckCircle2, FileText, AlertCircle, ArrowRight, Flag, User, MessageSquare, Star } from "lucide-react";

interface PendingItem {
  id: string;
  label: string;
  count: number;
  href: string;
  icon: any;
  permission: string;
}

export function AdminDashboardCard() {
  const { user } = useUser();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, is_super_admin")
          .eq("clerk_id", user.id)
          .single();

        if (!profile?.is_admin && !profile?.is_super_admin) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        // Load user permissions
        let permissions: Set<string> = new Set();
        if (profile?.is_super_admin) {
          // Super admins get all permissions
          const { data: allPerms } = await supabase
            .from("admin_permissions")
            .select("name");
          if (allPerms) {
            permissions = new Set(allPerms.map((p: any) => p.name));
          }
        } else {
          // Regular admins get permissions from roles
          const { data: permsData } = await supabase.rpc("get_user_permissions", {
            p_clerk_id: user.id,
          });
          if (permsData) {
            permissions = new Set(permsData.map((p: any) => p.permission_name));
          }
        }
        setUserPermissions(permissions);

        // Define all possible pending items with their permissions
        const allPendingItems: PendingItem[] = [
          {
            id: "profiles",
            label: "Profile Approvals",
            count: 0,
            href: "/admin?tab=profiles",
            icon: User,
            permission: "profiles.approve",
          },
          {
            id: "verifications",
            label: "Verification Requests",
            count: 0,
            href: "/admin?tab=verifications",
            icon: CheckCircle2,
            permission: "verifications.manage",
          },
          {
            id: "files",
            label: "File Moderation",
            count: 0,
            href: "/admin?tab=files",
            icon: FileText,
            permission: "files.moderate",
          },
          {
            id: "reports",
            label: "Reports",
            count: 0,
            href: "/admin?tab=reports",
            icon: Flag,
            permission: "reports.manage",
          },
          {
            id: "support",
            label: "Support Tickets",
            count: 0,
            href: "/admin?tab=support",
            icon: MessageSquare,
            permission: "support.manage",
          },
          {
            id: "reviews",
            label: "Reviews & Feedback",
            count: 0,
            href: "/admin?tab=reviews",
            icon: Star,
            permission: "reviews.manage",
          },
          {
            id: "moderation",
            label: "Content Moderation",
            count: 0,
            href: "/admin?tab=moderation",
            icon: Shield,
            permission: "content.moderate",
          },
        ];

        // Filter items to only those the user has permission for
        const accessibleItems = allPendingItems.filter(item => 
          permissions.has(item.permission)
        );

        // Fetch counts for accessible items in parallel
        const countPromises = accessibleItems.map(async (item) => {
          let count = 0;
          try {
            switch (item.id) {
              case "profiles": {
                const { count: profileCount } = await supabase
                  .from("profiles")
                  .select("id", { count: "exact", head: true })
                  .eq("profile_status", "pending");
                count = profileCount || 0;
                break;
              }
              case "verifications": {
                const { count: verifCount } = await supabase
                  .from("verification_requests")
                  .select("id", { count: "exact", head: true })
                  .eq("status", "pending");
                count = verifCount || 0;
                break;
              }
              case "files": {
                const { count: filesCount } = await supabase
                  .from("storage_files")
                  .select("id", { count: "exact", head: true })
                  .eq("moderation_status", "pending");
                count = filesCount || 0;
                break;
              }
              case "reports": {
                const { count: reportsCount } = await supabase
                  .from("reports")
                  .select("id", { count: "exact", head: true })
                  .eq("status", "pending");
                count = reportsCount || 0;
                break;
              }
              case "support": {
                const { count: ticketsCount } = await supabase
                  .from("support_tickets")
                  .select("id", { count: "exact", head: true })
                  .in("status", ["open", "pending"]);
                count = ticketsCount || 0;
                break;
              }
              case "reviews": {
                const { count: reviewsCount } = await supabase
                  .from("reviews")
                  .select("id", { count: "exact", head: true })
                  .eq("status", "pending");
                count = reviewsCount || 0;
                break;
              }
              case "moderation": {
                // Count posts/comments that need moderation (you may need to adjust this based on your schema)
                const { count: postsCount } = await supabase
                  .from("posts")
                  .select("id", { count: "exact", head: true })
                  .eq("moderation_status", "pending");
                count = postsCount || 0;
                break;
              }
            }
          } catch (error) {
            console.error(`Error loading count for ${item.id}:`, error);
          }
          return { ...item, count };
        });

        const itemsWithCounts = await Promise.all(countPromises);
        setPendingItems(itemsWithCounts);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [user?.id, supabase]);

  if (loading || !isAdmin) {
    return null;
  }

  const totalPending = pendingItems.reduce((sum, item) => sum + item.count, 0);
  const itemsWithPending = pendingItems.filter(item => item.count > 0);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Admin Dashboard</h3>
            <p className="text-sm text-white/80">
              {pendingItems.length > 0 
                ? `${pendingItems.length} section${pendingItems.length !== 1 ? 's' : ''} available`
                : "Manage platform content"}
            </p>
          </div>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-red-500 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {totalPending}
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {pendingItems.length === 0 ? (
          <div className="text-center py-4 text-white/60 text-sm">
            No admin sections available
          </div>
        ) : (
          pendingItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count > 0 ? (
                    <span className="px-2 py-1 bg-yellow-500 rounded-full text-xs font-medium">
                      {item.count} pending
                    </span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-300" />
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {itemsWithPending.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-xs text-white/70 mb-2">
            {itemsWithPending.length} section{itemsWithPending.length !== 1 ? 's' : ''} with outstanding actions
          </div>
        </div>
      )}

      <Link
        href="/admin"
        className="mt-4 flex items-center justify-between text-sm font-medium hover:opacity-80 transition-opacity"
      >
        <span>Go to Admin Panel</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}


