"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Shield,
  Users,
  Key,
  CheckCircle2,
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Search,
  UserCheck,
  UserX,
  AlertCircle,
  Crown,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  category: string;
  description: string | null;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role?: Role;
  user?: {
    display_name: string;
    email: string;
  };
}

interface UserProfile {
  clerk_id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  is_super_admin: boolean;
}

export function SuperAdminDashboard({ supabase, currentUserId }: { supabase: SupabaseClient; currentUserId: string }) {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "users">("roles");
  
  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplayName, setNewRoleDisplayName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  
  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({});
  
  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "admin" | "super_admin" | "regular">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
  
  const [updating, setUpdating] = useState(false);
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isLoaded) {
      loadData();
    }
  }, [activeTab, isLoaded]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "roles") {
        await loadRoles();
        await loadPermissions();
        await loadRolePermissions();
      } else if (activeTab === "permissions") {
        await loadPermissions();
        await loadRoles();
        await loadRolePermissions();
      } else if (activeTab === "users") {
        await loadUsers();
        await loadUserRoles();
        await loadRoles();
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToastMessage("Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from("admin_roles")
      .select("*")
      .order("display_name");
    
    if (error) throw error;
    setRoles(data || []);
  };

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from("admin_permissions")
      .select("*")
      .order("category, display_name");
    
    if (error) throw error;
    setPermissions(data || []);
  };

  const loadRolePermissions = async () => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role_id, permission_id");
    
    if (error) throw error;
    
    const rolePerms: Record<string, Set<string>> = {};
    (data || []).forEach((rp: RolePermission) => {
      if (!rolePerms[rp.role_id]) {
        rolePerms[rp.role_id] = new Set();
      }
      rolePerms[rp.role_id].add(rp.permission_id);
    });
    setRolePermissions(rolePerms);
  };

  const loadUsers = async () => {
    // Load all users, not just admins - we'll filter in the UI
    const { data, error } = await supabase
      .from("profiles")
      .select("clerk_id, display_name, email, is_admin, is_super_admin")
      .order("display_name");
    
    if (error) throw error;
    setUsers(data || []);
  };

  const loadUserRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        *,
        role:admin_roles(*)
      `);
    
    if (error) throw error;
    setUserRoles(data || []);
  };

  const showToastMessage = (message: string, type: "success" | "error") => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleDisplayName.trim()) {
      showToastMessage("Role name and display name are required", "error");
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from("admin_roles")
        .insert({
          name: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"),
          display_name: newRoleDisplayName.trim(),
          description: newRoleDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      showToastMessage("Role created successfully", "success");
      setNewRoleName("");
      setNewRoleDisplayName("");
      setNewRoleDescription("");
      await loadRoles();
    } catch (error: any) {
      console.error("Error creating role:", error);
      showToastMessage(error.message || "Error creating role", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateRole = async (role: Role) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("admin_roles")
        .update({
          display_name: role.display_name,
          description: role.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", role.id);

      if (error) throw error;

      showToastMessage("Role updated successfully", "success");
      setEditingRole(null);
      await loadRoles();
    } catch (error: any) {
      console.error("Error updating role:", error);
      showToastMessage(error.message || "Error updating role", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role? This will remove it from all users.")) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("admin_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      showToastMessage("Role deleted successfully", "success");
      await loadRoles();
      await loadUserRoles();
    } catch (error: any) {
      console.error("Error deleting role:", error);
      showToastMessage(error.message || "Error deleting role", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePermission = async (roleId: string, permissionId: string) => {
    setUpdating(true);
    try {
      const hasPermission = rolePermissions[roleId]?.has(permissionId);
      
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", roleId)
          .eq("permission_id", permissionId);

        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from("role_permissions")
          .insert({
            role_id: roleId,
            permission_id: permissionId,
          });

        if (error) throw error;
      }

      await loadRolePermissions();
    } catch (error: any) {
      console.error("Error updating permission:", error);
      showToastMessage(error.message || "Error updating permission", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: currentUserId,
        });

      if (error) {
        if (error.code === "23505") {
          showToastMessage("User already has this role", "error");
        } else {
          throw error;
        }
      } else {
        showToastMessage("Role assigned successfully", "success");
        await loadUserRoles();
      }
    } catch (error: any) {
      console.error("Error assigning role:", error);
      showToastMessage(error.message || "Error assigning role", "error");
    } finally {
      setUpdating(false);
      setAssigningRole(null);
    }
  };

  const handleRemoveRole = async (userRoleId: string) => {
    if (!confirm("Are you sure you want to remove this role from the user?")) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", userRoleId);

      if (error) throw error;

      showToastMessage("Role removed successfully", "success");
      await loadUserRoles();
    } catch (error: any) {
      console.error("Error removing role:", error);
      showToastMessage(error.message || "Error removing role", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    if (currentStatus && !confirm("Are you sure you want to remove admin access from this user?")) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentStatus })
        .eq("clerk_id", userId);

      if (error) throw error;

      showToastMessage(
        currentStatus ? "Admin access removed successfully" : "User granted admin access successfully",
        "success"
      );
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating admin status:", error);
      showToastMessage(error.message || "Error updating admin status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleSuperAdminStatus = async (userId: string, currentStatus: boolean) => {
    if (currentStatus && !confirm("Are you sure you want to remove super admin access from this user? This is a critical change.")) {
      return;
    }

    if (!currentStatus && !confirm("Are you sure you want to grant super admin access? This user will have full system access.")) {
      return;
    }

    setUpdating(true);
    try {
      // When making someone super admin, also make them admin
      const updateData: any = { is_super_admin: !currentStatus };
      if (!currentStatus) {
        updateData.is_admin = true;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("clerk_id", userId);

      if (error) throw error;

      showToastMessage(
        currentStatus ? "Super admin access removed successfully" : "User granted super admin access successfully",
        "success"
      );
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating super admin status:", error);
      showToastMessage(error.message || "Error updating super admin status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Apply search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      u.display_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.clerk_id.toLowerCase().includes(query);
    
    if (!matchesSearch) return false;

    // Apply role filter
    if (userFilter === "admin") {
      return u.is_admin || u.is_super_admin;
    } else if (userFilter === "super_admin") {
      return u.is_super_admin;
    } else if (userFilter === "regular") {
      return !u.is_admin && !u.is_super_admin;
    }
    
    return true; // "all"
  });

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <AlertCircle className="w-8 h-8 text-red-600" />
        <p className="ml-3 text-sm text-red-600">User not authenticated</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Super Admin Dashboard</h2>
        </div>
        <p className="text-indigo-100">
          Manage roles, permissions, and user access to the admin dashboard
        </p>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl border-2 ${
            showToast.type === "success"
              ? "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {showToast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{showToast.message}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <nav className="flex gap-1 p-2">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all ${
              activeTab === "roles"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </div>
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all ${
              activeTab === "permissions"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Key className="w-4 h-4" />
              Permissions
            </div>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </div>
          </button>
        </nav>
      </div>

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          {/* Create New Role */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Role</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role Name (internal)
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., support_staff"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Lowercase, underscores only (auto-generated from display name)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newRoleDisplayName}
                  onChange={(e) => setNewRoleDisplayName(e.target.value)}
                  placeholder="e.g., Support Staff"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe what this role can do..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={handleCreateRole}
                disabled={updating || !newRoleDisplayName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            </div>
          </div>

          {/* Roles List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Existing Roles ({roles.length})</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {roles.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No roles created yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Create your first role above</p>
                </div>
              ) : (
                roles.map((role) => (
                  <div key={role.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {editingRole?.id === role.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={editingRole.display_name}
                          onChange={(e) =>
                            setEditingRole({ ...editingRole, display_name: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editingRole.description || ""}
                          onChange={(e) =>
                            setEditingRole({ ...editingRole, description: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRole(editingRole)}
                          disabled={updating}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {role.display_name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {role.name}
                        </p>
                        {role.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRole(role)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          disabled={updating}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Role Permissions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Select which permissions each role should have. Users with a role will inherit all permissions assigned to that role.
            </p>

            {roles.length === 0 ? (
              <div className="p-8 text-center">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No roles available</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Create roles first to assign permissions</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                        {category}
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Permission
                            </th>
                            {roles.map((role) => (
                              <th
                                key={role.id}
                                className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[140px]"
                              >
                                {role.display_name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {perms.map((perm) => (
                            <tr
                              key={perm.id}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {perm.display_name}
                                  </p>
                                  {perm.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </td>
                              {roles.map((role) => (
                                <td key={role.id} className="text-center py-3 px-4">
                                  <button
                                    onClick={() => handleTogglePermission(role.id, perm.id)}
                                    disabled={updating}
                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110 ${
                                      rolePermissions[role.id]?.has(perm.id)
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                        : "border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                    title={rolePermissions[role.id]?.has(perm.id) ? "Remove permission" : "Grant permission"}
                                  >
                                    {rolePermissions[role.id]?.has(perm.id) && (
                                      <CheckCircle2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, email, or ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins Only</option>
                  <option value="super_admin">Super Admins Only</option>
                  <option value="regular">Regular Users</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>

          {/* Users List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Management ({filteredUsers.length})
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage admin access and role assignments
              </p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No users found</p>
                </div>
              ) : (
                filteredUsers.map((userProfile) => {
                  const userRolesForUser = userRoles.filter((ur) => ur.user_id === userProfile.clerk_id);
                  const userRoleIds = userRolesForUser.map((ur) => ur.role_id);

                  return (
                    <div key={userProfile.clerk_id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                {userProfile.display_name?.charAt(0)?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {userProfile.display_name}
                                </h4>
                                {userProfile.is_super_admin && (
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-sm">
                                    Super Admin
                                  </span>
                                )}
                                {userProfile.is_admin && !userProfile.is_super_admin && (
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-sm">
                                    Admin
                                  </span>
                                )}
                                {!userProfile.is_admin && !userProfile.is_super_admin && (
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                                    Regular User
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {userProfile.email}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                                {userProfile.clerk_id}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Status Controls */}
                      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Admin Access</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Grant or remove admin dashboard access
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleAdminStatus(userProfile.clerk_id, userProfile.is_admin || false)}
                            disabled={updating || userProfile.is_super_admin}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              userProfile.is_admin || userProfile.is_super_admin
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {userProfile.is_admin || userProfile.is_super_admin ? (
                              <span className="flex items-center gap-2">
                                <UserX className="w-4 h-4" />
                                Remove Admin
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4" />
                                Make Admin
                              </span>
                            )}
                          </button>
                        </div>
                        {userProfile.is_super_admin && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                            Super admins automatically have admin access
                          </p>
                        )}
                      </div>

                      {/* Super Admin Status Controls */}
                      <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Super Admin Access</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Grant full system access and role management
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleSuperAdminStatus(userProfile.clerk_id, userProfile.is_super_admin || false)}
                            disabled={updating}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              userProfile.is_super_admin
                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {userProfile.is_super_admin ? (
                              <span className="flex items-center gap-2">
                                <UserX className="w-4 h-4" />
                                Remove Super Admin
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Crown className="w-4 h-4" />
                                Make Super Admin
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Current Roles */}
                      {userRolesForUser.length > 0 && (
                        <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Current Roles:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {userRolesForUser.map((ur) => {
                              const role = roles.find((r) => r.id === ur.role_id);
                              return role ? (
                                <span
                                  key={ur.id}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                                >
                                  {role.display_name}
                                  <button
                                    onClick={() => handleRemoveRole(ur.id)}
                                    disabled={updating}
                                    className="hover:text-red-600 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Assign Role */}
                      {!userProfile.is_super_admin && (
                        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Assign Role
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Assign roles to grant specific permissions to this user
                          </p>
                          <div className="flex gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignRole(userProfile.clerk_id, e.target.value);
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                              disabled={updating}
                            >
                              <option value="">Select a role to assign...</option>
                              {roles
                                .filter((r) => !userRoleIds.includes(r.id))
                                .map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.display_name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {userProfile.is_super_admin && (
                        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                            <Crown className="w-4 h-4" />
                            Super Admins have all permissions and don't need roles assigned.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

