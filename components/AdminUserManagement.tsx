"use client";

import { useState, useEffect } from "react";
import { User, Search, Shield, CheckCircle2, X, Loader2, Mail, Calendar, Crown, Zap, Building2, Download, Ban, CheckCircle, AlertCircle, Trash2, Edit2, HardDrive, FolderOpen, Image as ImageIcon, Upload, FileText, CheckCircle as CheckCircleIcon, Lock, Unlock, MoreVertical, ChevronDown, CreditCard, Star, Sparkles, MapPin, Briefcase, Globe, Plus, Bell, Palette, Key, RefreshCw } from "lucide-react";
import { SuspendUserModal } from "@/components/SuspendUserModal";
import Link from "next/link";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface AdminUserManagementProps {
  supabase: any;
  currentUserId: string;
}

interface UserProfile {
  clerk_id: string;
  username?: string | null;
  display_name: string;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_type: "individual";
  subscription_plan: string;
  is_verified: boolean;
  is_admin: boolean;
  profile_status: "pending" | "approved" | "rejected";
  is_suspended?: boolean;
  suspension_reason?: string | null;
  location?: string | null;
  city?: string | null;
  state_region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  location_privacy?: "exact" | "city" | "city_country" | "county" | "county_country" | "city_county" | "country" | "hidden";
  website?: string | null;
  skills?: string[] | null;
  services?: string[] | null;
  cv_url?: string | null;
  employment_status?: "looking_for_job" | "employed" | "business_owner" | "freelancer" | "student" | "unemployed" | "retired" | "not_specified";
  privacy_policy_agreed_at?: string | null;
  terms_agreed_at?: string | null;
  privacy_policy_version?: string | null;
  terms_version?: string | null;
  featured_priority?: number;
  is_manually_featured?: boolean;
  featured_boost?: number;
  featured_until?: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminUserManagement({ supabase, currentUserId }: AdminUserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | "free" | "pro" | "ultimate">("all");
  const [filterType, setFilterType] = useState<"all" | "individual">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [filterAgreement, setFilterAgreement] = useState<"all" | "agreed" | "not_agreed">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile & { skillInput?: string; serviceInput?: string }>>({});
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsUser, setSettingsUser] = useState<UserProfile | null>(null);
  const [storageData, setStorageData] = useState<Record<string, any>>({});
  const [loadingStorage, setLoadingStorage] = useState<Set<string>>(new Set());
  const [fileManagementUser, setFileManagementUser] = useState<UserProfile | null>(null);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [userBlocks, setUserBlocks] = useState<Record<string, any[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedUserForSuspension, setSelectedUserForSuspension] = useState<{ id: string; name: string } | null>(null);
  const [latestPolicyVersions, setLatestPolicyVersions] = useState<{
    privacy: string | null;
    terms: string | null;
  }>({ privacy: null, terms: null });
  const [publishedDocumentVersions, setPublishedDocumentVersions] = useState<{
    privacy: string | null;
    terms: string | null;
  }>({ privacy: null, terms: null });
  const [detailViewUser, setDetailViewUser] = useState<UserProfile | null>(null);
  const [detailViewTab, setDetailViewTab] = useState<'overview' | 'notifications' | 'billing'>('overview');
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  useEffect(() => {
    loadUsers();
    loadLatestPolicyVersions();
    loadPublishedDocumentVersions();
  }, [filterPlan, filterType, filterStatus, filterAgreement]);

  // Check for viewUser parameter in URL to open user detail view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewUserId = params.get('viewUser');
      if (viewUserId && users.length > 0 && !detailViewUser) {
        const userToView = users.find(u => u.clerk_id === viewUserId);
        if (userToView) {
          // Set Overview tab and open detail view
          setDetailViewTab('overview');
          handleOpenDetailView(userToView);
          // Clean up URL parameter
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('viewUser');
          const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const loadLatestPolicyVersions = async () => {
    try {
      // Get latest privacy policy version that requires reconfirmation
      const { data: latestPrivacy } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_type', 'privacy_policy')
        .eq('requires_reconfirmation', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get latest terms version that requires reconfirmation
      const { data: latestTerms } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_type', 'terms_of_service')
        .eq('requires_reconfirmation', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatestPolicyVersions({
        privacy: latestPrivacy?.version || null,
        terms: latestTerms?.version || null,
      });
    } catch (error) {
      console.error("Error loading latest policy versions:", error);
    }
  };

  const loadPublishedDocumentVersions = async () => {
    try {
      // Get currently published privacy policy document
      const { data: publishedPrivacy } = await supabase
        .from('policy_documents')
        .select('version')
        .eq('policy_type', 'privacy_policy')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get currently published terms document
      const { data: publishedTerms } = await supabase
        .from('policy_documents')
        .select('version')
        .eq('policy_type', 'terms_of_service')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPublishedDocumentVersions({
        privacy: publishedPrivacy?.version || null,
        terms: publishedTerms?.version || null,
      });
    } catch (error) {
      console.error("Error loading published document versions:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openDropdown && !target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterPlan !== "all") {
        query = query.eq("subscription_plan", filterPlan);
      }

      if (filterType !== "all") {
        query = query.eq("profile_type", filterType);
      }

      if (filterStatus !== "all") {
        query = query.eq("profile_status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Ensure is_suspended is boolean
      const usersData = (data || []).map((user: any) => ({
        ...user,
        is_suspended: user.is_suspended || false,
      }));
      
      setUsers(usersData);

      // Load block information for all users
      if (usersData.length > 0) {
        const userIds = usersData.map((u: any) => u.clerk_id);
        const { data: blocksData } = await supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id, reason, created_at")
          .or(`blocker_id.in.(${userIds.join(",")}),blocked_id.in.(${userIds.join(",")})`);

        if (blocksData) {
          const blocksByUser: Record<string, any[]> = {};
          blocksData.forEach((block: any) => {
            if (!blocksByUser[block.blocker_id]) {
              blocksByUser[block.blocker_id] = [];
            }
            if (!blocksByUser[block.blocked_id]) {
              blocksByUser[block.blocked_id] = [];
            }
            blocksByUser[block.blocker_id].push({
              blocked_id: block.blocked_id,
              reason: block.reason,
              created_at: block.created_at,
            });
            blocksByUser[block.blocked_id].push({
              blocked_by: block.blocker_id,
              reason: block.reason,
              created_at: block.created_at,
            });
          });
          setUserBlocks(blocksByUser);
        }
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "remove" : "grant"} admin privileges?`)) {
      return;
    }

    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentStatus })
        .eq("clerk_id", userId);

      if (error) throw error;
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating admin status:", error);
      alert("Failed to update admin status: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "remove" : "grant"} verification?`)) {
      return;
    }

    setProcessingId(userId);
    try {
      const updateData: any = {
        is_verified: !currentStatus,
        verification_status: !currentStatus ? "approved" : "none",
      };
      
      // Set verification_approved_at when granting verification (for time-period tracking)
      if (!currentStatus) {
        updateData.verification_approved_at = new Date().toISOString();
      } else {
        // Clear the timestamp when removing verification
        updateData.verification_approved_at = null;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("clerk_id", userId);

      if (error) throw error;
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating verification status:", error);
      alert("Failed to update verification status: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateProfileStatus = async (userId: string, newStatus: "pending" | "approved" | "rejected") => {
    if (!confirm(`Are you sure you want to set profile status to ${newStatus}?`)) {
      return;
    }

    setProcessingId(userId);
    try {
      const updateData: any = { profile_status: newStatus };
      if (newStatus === "approved") {
        updateData.profile_approved_at = new Date().toISOString();
        updateData.profile_approved_by = currentUserId;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("clerk_id", userId);

      if (error) throw error;
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating profile status:", error);
      alert("Failed to update profile status: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selectedUsers.size === 0) {
      alert("Please select at least one user");
      return;
    }

    const actionText = action === "approve" ? "approve" : action === "reject" ? "reject" : "delete";
    if (!confirm(`Are you sure you want to ${actionText} ${selectedUsers.size} user(s)?`)) {
      return;
    }

    try {
      const userIds = Array.from(selectedUsers);
      
      if (action === "delete") {
        // Delete users (cascade will handle related data)
        for (const userId of userIds) {
          const { error } = await supabase
            .from("profiles")
            .delete()
            .eq("clerk_id", userId);
          if (error) throw error;
        }
      } else {
        // Update profile status
        const updateData: any = { 
          profile_status: action === "approve" ? "approved" : "rejected" 
        };
        if (action === "approve") {
          updateData.profile_approved_at = new Date().toISOString();
          updateData.profile_approved_by = currentUserId;
        }

        const { error } = await supabase
          .from("profiles")
          .update(updateData)
          .in("clerk_id", userIds);

        if (error) throw error;
      }

      setSelectedUsers(new Set());
      await loadUsers();
    } catch (error: any) {
      console.error("Error performing bulk action:", error);
      alert("Failed to perform bulk action: " + error.message);
    }
  };

  const handleExportUsers = () => {
    const csvContent = [
      ["Name", "Email", "Type", "Plan", "Status", "Verified", "Admin", "Joined"],
      ...filteredUsers.map((user) => [
        user.display_name,
        user.email || "",
        user.profile_type,
        user.subscription_plan,
        user.profile_status,
        user.is_verified ? "Yes" : "No",
        user.is_admin ? "Yes" : "No",
        new Date(user.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.clerk_id)));
    }
  };

  const loadUserStorage = async (userId: string) => {
    if (storageData[userId] || loadingStorage.has(userId)) return;
    
    setLoadingStorage(prev => new Set(prev).add(userId));
    try {
      const response = await fetch(`/api/admin/user-storage?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStorageData(prev => ({ ...prev, [userId]: data }));
      }
    } catch (error) {
      console.error("Error loading storage:", error);
    } finally {
      setLoadingStorage(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditFormData({
      display_name: user.display_name,
      bio: user.bio || "",
      email: user.email || "",
      profile_type: user.profile_type,
      subscription_plan: user.subscription_plan,
      location: user.location || "",
      city: user.city || "",
      state_region: user.state_region || "",
      country: user.country || "",
      latitude: user.latitude || null,
      longitude: user.longitude || null,
      timezone: user.timezone || "",
      location_privacy: user.location_privacy || "city_county",
      website: user.website || "",
      skills: user.skills || [],
      services: user.services || [],
      cv_url: user.cv_url || "",
      employment_status: user.employment_status || "not_specified",
      is_manually_featured: user.is_manually_featured || false,
      featured_boost: user.featured_boost || 0,
      featured_until: user.featured_until || null,
      username: user.username || null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setProcessingId(editingUser.clerk_id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editFormData.display_name,
          bio: editFormData.bio || null,
          email: editFormData.email || null,
          profile_type: editFormData.profile_type,
          subscription_plan: editFormData.subscription_plan,
          location: editFormData.location || null,
          city: editFormData.city || null,
          state_region: editFormData.state_region || null,
          country: editFormData.country || null,
          latitude: editFormData.latitude || null,
          longitude: editFormData.longitude || null,
          timezone: editFormData.timezone || null,
          location_privacy: editFormData.location_privacy || "city_county",
          website: editFormData.website || null,
          skills: editFormData.skills || null,
          services: editFormData.services || null,
          cv_url: editFormData.cv_url || null,
          employment_status: editFormData.employment_status || "not_specified",
          is_manually_featured: editFormData.is_manually_featured || false,
          featured_boost: editFormData.featured_boost || 0,
          featured_until: editFormData.featured_until || null,
          username: editFormData.username || null,
          username_lower: editFormData.username ? editFormData.username.toLowerCase() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_id", editingUser.clerk_id);

      if (error) throw error;

      // Trigger featured priority recalculation
      await supabase.rpc("update_user_featured_priority", { p_clerk_id: editingUser.clerk_id });
      
      setEditingUser(null);
      setEditFormData({});
      await loadUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert("Failed to update user: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenFileManagement = async (user: UserProfile) => {
    setFileManagementUser(user);
    setLoadingFiles(true);
    try {
      // Fetch latest user profile data
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("clerk_id", user.clerk_id)
        .single();

      if (updatedProfile) {
        setFileManagementUser(updatedProfile as UserProfile);
      }

      const response = await fetch(`/api/get-user-files?userId=${user.clerk_id}`);
      if (response.ok) {
        const result = await response.json();
        setUserFiles(result.files || []);
      }
      // Also load storage data
      await loadUserStorage(user.clerk_id);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string, bucketName: string) => {
    if (!fileManagementUser) return;
    
    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }

    setDeletingFileId(fileId);
    try {
      const response = await fetch(`/api/admin/delete-file?filePath=${encodeURIComponent(filePath)}&bucketName=${encodeURIComponent(bucketName)}&targetUserId=${encodeURIComponent(fileManagementUser.clerk_id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete file");
      }

      // Reload files and storage
      await handleOpenFileManagement(fileManagementUser);
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Failed to delete file: " + error.message);
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    if (!fileManagementUser || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);
      
      let bucketName = "portfolio-files";
      if (fileType === "profile_picture") {
        bucketName = "profile-pictures";
      } else if (fileType === "cv") {
        bucketName = "cv-resumes";
      }

      formData.append("bucketName", bucketName);
      formData.append("targetUserId", fileManagementUser.clerk_id);

      // Use admin upload endpoint
      const response = await fetch("/api/admin/upload-file", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload file");
      }

      // Reload files, storage, and user profile (to get updated avatar_url)
      await handleOpenFileManagement(fileManagementUser);
      // Also reload the user in the main list to show updated avatar
      await loadUsers();
      // Update the fileManagementUser state to show new avatar
      if (fileManagementUser) {
        const updatedUser = users.find(u => u.clerk_id === fileManagementUser.clerk_id);
        if (updatedUser) {
          setFileManagementUser(updatedUser);
        }
      }
      e.target.value = ""; // Clear input
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Failed to upload file: " + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleReplaceProfilePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleUploadFile(e, "profile_picture");
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleSuspendUser = async (userId: string, isCurrentlySuspended: boolean, userName?: string) => {
    if (isCurrentlySuspended) {
      // Unsuspend
      if (!confirm("Are you sure you want to unsuspend this user?")) {
        return;
      }

      setProcessingId(userId);
      try {
        const response = await fetch(`/api/admin/suspend-user?userId=${userId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to unsuspend user");
        }

        await loadUsers();
      } catch (error: any) {
        console.error("Error unsuspending user:", error);
        alert("Failed to unsuspend user: " + error.message);
      } finally {
        setProcessingId(null);
      }
    } else {
      // Suspend - open modal
      setSelectedUserForSuspension({ id: userId, name: userName || "User" });
      setSuspendModalOpen(true);
    }
  };

  const handleSuspendConfirm = async (reason: string, durationDays: number | null) => {
    if (!selectedUserForSuspension) return;

    setProcessingId(selectedUserForSuspension.id);
    try {
      const response = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUserForSuspension.id,
          reason: reason.trim(),
          durationDays: durationDays,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to suspend user");
      }

      await loadUsers();
      setSuspendModalOpen(false);
      setSelectedUserForSuspension(null);
    } catch (error: any) {
      console.error("Error suspending user:", error);
      alert("Failed to suspend user: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDetailView = async (user: UserProfile) => {
    setDetailViewUser(user);
    setDetailViewTab('overview');
    await loadUserNotifications(user.clerk_id);
    await loadUserSubscription(user.clerk_id);
  };

  const loadUserNotifications = async (userId: string) => {
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setUserNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setUserNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadUserSubscription = async (userId: string) => {
    setLoadingSubscription(true);
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans (
            id,
            name,
            display_name,
            price_monthly,
            price_yearly
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setUserSubscription(data);
    } catch (error) {
      console.error("Error loading subscription:", error);
      setUserSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmText = prompt(`Type "DELETE" to confirm deletion of user "${userName}". This will delete ALL data including files and Clerk account.`);
    
    if (confirmText !== "DELETE") {
      alert("Deletion cancelled. You must type 'DELETE' exactly to confirm.");
      return;
    }

    if (!confirm(`Are you absolutely sure you want to delete "${userName}"? This action cannot be undone and will delete:\n- All files and storage\n- All posts, comments, reviews\n- All connections and follows\n- The Clerk account\n\nThis is permanent!`)) {
      return;
    }

    setProcessingId(userId);
    try {
      const response = await fetch(`/api/admin/delete-user?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete user");
      }

      await loadUsers();
      alert("User account deleted successfully");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "ultimate":
        return "👑";
      case "pro":
        return "✨";
      case "free":
      default:
        return "⚡";
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "ultimate":
        return "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30";
      case "pro":
        return "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30";
      case "free":
      default:
        return "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700";
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "ultimate":
        return "Ultimate";
      case "pro":
        return "Pro";
      case "free":
      default:
        return "Free";
    }
  };


  const filteredUsers = users.filter((user) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        user.display_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.clerk_id.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.bio?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Filter by agreement status
    if (filterAgreement === "agreed") {
      if (!user.privacy_policy_agreed_at || !user.terms_agreed_at) {
        return false;
      }
    } else if (filterAgreement === "not_agreed") {
      if (user.privacy_policy_agreed_at && user.terms_agreed_at) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="ultimate">Ultimate</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterAgreement}
              onChange={(e) => setFilterAgreement(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Agreements</option>
              <option value="agreed">Agreed to Both</option>
              <option value="not_agreed">Not Agreed</option>
            </select>
          </div>
        </div>

        {/* Agreement Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
              </div>
              <User className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Agreed to Both</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {users.filter(u => u.privacy_policy_agreed_at && u.terms_agreed_at).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Updates</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {users.filter(u => {
                    const privacyPending = latestPolicyVersions.privacy && u.privacy_policy_version !== latestPolicyVersions.privacy;
                    const termsPending = latestPolicyVersions.terms && u.terms_version !== latestPolicyVersions.terms;
                    return privacyPending || termsPending;
                  }).length}
                </p>
                {(publishedDocumentVersions.privacy || publishedDocumentVersions.terms) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {publishedDocumentVersions.privacy && (
                      <span>Latest Privacy: v{publishedDocumentVersions.privacy}</span>
                    )}
                    {publishedDocumentVersions.privacy && publishedDocumentVersions.terms && ' • '}
                    {publishedDocumentVersions.terms && (
                      <span>Latest Terms: v{publishedDocumentVersions.terms}</span>
                    )}
                  </p>
                )}
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Not Agreed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {users.filter(u => !u.privacy_policy_agreed_at || !u.terms_agreed_at).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
              {selectedUsers.size} user(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction("approve")}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => handleBulkAction("reject")}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
              >
                <Ban className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1.5 bg-red-700 text-white text-sm rounded-lg hover:bg-red-800 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleSelectAll}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {selectedUsers.size === filteredUsers.length ? "Deselect All" : "Select All"}
          </button>
          <button
            onClick={handleExportUsers}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto max-h-[85vh] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Storage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Policy Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.clerk_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <a
                              href={getProfileUrl({ username: user.username, clerk_id: user.clerk_id })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {user.display_name}
                            </a>
                            {user.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                            {user.is_admin && (
                              <Shield className="w-4 h-4 text-indigo-500" />
                            )}
                          </div>
                          {user.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.clerk_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getPlanIcon(user.subscription_plan)}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {user.subscription_plan}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadUserStorage(user.clerk_id)}
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                          title="View storage details"
                        >
                          <HardDrive className="w-3 h-3" />
                          {loadingStorage.has(user.clerk_id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : storageData[user.clerk_id] ? (
                            <>
                              {storageData[user.clerk_id].usedMB.toFixed(2)} MB / {storageData[user.clerk_id].limitMB.toFixed(2)} MB
                              <span className="text-gray-500 dark:text-gray-400">
                                ({storageData[user.clerk_id].percentage}%)
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                ({storageData[user.clerk_id].fileCount} files)
                              </span>
                            </>
                          ) : (
                            "View"
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full w-fit ${
                          user.profile_status === "approved"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : user.profile_status === "pending"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}>
                          {user.profile_status.charAt(0).toUpperCase() + user.profile_status.slice(1)}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize w-fit mt-1">
                          {user.profile_type}
                        </span>
                        {user.is_suspended && (
                          <div className="flex flex-col gap-1 mt-1">
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 w-fit flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Suspended
                            </span>
                            {user.suspension_reason && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs">
                                <strong>Reason:</strong> {user.suspension_reason}
                              </div>
                            )}
                          </div>
                        )}
                        {userBlocks[user.clerk_id] && userBlocks[user.clerk_id].length > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 w-fit mt-1 flex items-center gap-1" title={`${userBlocks[user.clerk_id].length} block(s)`}>
                            <Ban className="w-3 h-3" />
                            {userBlocks[user.clerk_id].length} block{userBlocks[user.clerk_id].length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        {/* Privacy Policy Status */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Privacy:</span>
                            <div className="flex items-center gap-1">
                              {user.privacy_policy_agreed_at ? (
                                <>
                                  {latestPolicyVersions.privacy && user.privacy_policy_version !== latestPolicyVersions.privacy ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1" title={`Pending Update - Current: ${latestPolicyVersions.privacy}, User has: ${user.privacy_policy_version || 'none'}`}>
                                      <AlertCircle className="w-3 h-3" />
                                      Update Pending
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1" title={`Agreed: ${new Date(user.privacy_policy_agreed_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, Version: ${user.privacy_policy_version || 'N/A'}`}>
                                      <CheckCircle className="w-3 h-3" />
                                      {publishedDocumentVersions.privacy && user.privacy_policy_version === publishedDocumentVersions.privacy ? 'Current' : 'Agreed'}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1" title="Not agreed">
                                  <X className="w-3 h-3" />
                                  Not Agreed
                                </span>
                              )}
                            </div>
                          </div>
                          {user.privacy_policy_version && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 pl-1 flex items-center gap-2">
                              <span>
                                Version: {user.privacy_policy_version}
                                {latestPolicyVersions.privacy && user.privacy_policy_version !== latestPolicyVersions.privacy && (
                                  <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                                    (Latest: {latestPolicyVersions.privacy})
                                  </span>
                                )}
                              </span>
                              <a
                                href={`/privacy?v=${user.privacy_policy_version}`}
                                target="_blank"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                title="View the version this user agreed to"
                              >
                                <FileText className="w-3 h-3" />
                                View
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Terms of Service Status */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Terms:</span>
                            <div className="flex items-center gap-1">
                              {user.terms_agreed_at ? (
                                <>
                                  {latestPolicyVersions.terms && user.terms_version !== latestPolicyVersions.terms ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1" title={`Pending Update - Current: ${latestPolicyVersions.terms}, User has: ${user.terms_version || 'none'}`}>
                                      <AlertCircle className="w-3 h-3" />
                                      Update Pending
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1" title={`Agreed: ${new Date(user.terms_agreed_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, Version: ${user.terms_version || 'N/A'}`}>
                                      <CheckCircle className="w-3 h-3" />
                                      {publishedDocumentVersions.terms && user.terms_version === publishedDocumentVersions.terms ? 'Current' : 'Agreed'}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1" title="Not agreed">
                                  <X className="w-3 h-3" />
                                  Not Agreed
                                </span>
                              )}
                            </div>
                          </div>
                          {user.terms_version && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 pl-1 flex items-center gap-2">
                              <span>
                                Version: {user.terms_version}
                                {latestPolicyVersions.terms && user.terms_version !== latestPolicyVersions.terms && (
                                  <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                                    (Latest: {latestPolicyVersions.terms})
                                  </span>
                                )}
                              </span>
                              <a
                                href={`/terms?v=${user.terms_version}`}
                                target="_blank"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                title="View the version this user agreed to"
                              >
                                <FileText className="w-3 h-3" />
                                View
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Primary Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetailView(user)}
                            disabled={processingId === user.clerk_id}
                            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
                            title="View User Details"
                          >
                            <User className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            disabled={processingId === user.clerk_id}
                            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenFileManagement(user)}
                            disabled={processingId === user.clerk_id}
                            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
                            title="Manage Files"
                          >
                            <FolderOpen className="w-4 h-4" />
                            Files
                          </button>
                        </div>

                        {/* More Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === user.clerk_id ? null : user.clerk_id)}
                            disabled={processingId === user.clerk_id}
                            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                            <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === user.clerk_id ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {openDropdown === user.clerk_id && (
                            <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                              {/* Profile Status Actions */}
                              {user.profile_status !== "approved" && (
                                <button
                                  onClick={async () => {
                                    await handleUpdateProfileStatus(user.clerk_id, "approved");
                                    setOpenDropdown(null);
                                  }}
                                  disabled={processingId === user.clerk_id}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-700 dark:text-green-300 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve Profile
                                </button>
                              )}
                              {user.profile_status !== "rejected" && (
                                <button
                                  onClick={async () => {
                                    await handleUpdateProfileStatus(user.clerk_id, "rejected");
                                    setOpenDropdown(null);
                                  }}
                                  disabled={processingId === user.clerk_id}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-700 dark:text-red-300 disabled:opacity-50"
                                >
                                  <Ban className="w-4 h-4" />
                                  Reject Profile
                                </button>
                              )}
                              
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                              
                              {/* Verification */}
                              <button
                                onClick={async () => {
                                  await handleToggleVerification(user.clerk_id, user.is_verified);
                                  setOpenDropdown(null);
                                }}
                                disabled={processingId === user.clerk_id}
                                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 ${
                                  user.is_verified
                                    ? "text-yellow-700 dark:text-yellow-300"
                                    : "text-blue-700 dark:text-blue-300"
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                                {user.is_verified ? "Remove Verification" : "Grant Verification"}
                              </button>
                              
                              {/* Admin */}
                              {user.clerk_id !== currentUserId && (
                                <button
                                  onClick={async () => {
                                    await handleToggleAdmin(user.clerk_id, user.is_admin);
                                    setOpenDropdown(null);
                                  }}
                                  disabled={processingId === user.clerk_id}
                                  className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 ${
                                    user.is_admin
                                      ? "text-red-700 dark:text-red-300"
                                      : "text-indigo-700 dark:text-indigo-300"
                                  }`}
                                >
                                  <Shield className="w-4 h-4" />
                                  {user.is_admin ? "Remove Admin" : "Make Admin"}
                                </button>
                              )}
                              
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                              
                              {/* Suspend */}
                   <button
                     onClick={async () => {
                       await handleSuspendUser(user.clerk_id, user.is_suspended || false, user.display_name);
                       setOpenDropdown(null);
                     }}
                                disabled={processingId === user.clerk_id}
                                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 ${
                                  user.is_suspended
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-orange-700 dark:text-orange-300"
                                }`}
                              >
                                {user.is_suspended ? (
                                  <>
                                    <Unlock className="w-4 h-4" />
                                    Unsuspend User
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-4 h-4" />
                                    Suspend User
                                  </>
                                )}
                              </button>
                              
                              {/* Delete */}
                              {user.clerk_id !== currentUserId && (
                                <>
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                  <button
                                    onClick={async () => {
                                      await handleDeleteUser(user.clerk_id, user.display_name);
                                      setOpenDropdown(null);
                                    }}
                                    disabled={processingId === user.clerk_id}
                                    className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-700 dark:text-red-300 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Account
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User: {editingUser.display_name}</h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData({});
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.display_name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username (Profile URL)
                  </label>
                  <input
                    type="text"
                    value={editFormData.username || ""}
                    onChange={(e) => {
                      const username = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                      setEditFormData({ ...editFormData, username });
                    }}
                    placeholder="Leave empty to use default"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Custom profile URL: /profile/{editFormData.username || editingUser.clerk_id}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editFormData.bio || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Profile Type
                  </label>
                  <select
                    value={editFormData.profile_type || "individual"}
                    onChange={(e) => setEditFormData({ ...editFormData, profile_type: e.target.value as "individual" })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled
                  >
                    <option value="individual">Individual</option>
                  </select>
                </div>

                {/* Location Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location Information</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        General Location
                      </label>
                      <input
                        type="text"
                        value={editFormData.location || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="City, Country"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={editFormData.city || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          State/Region
                        </label>
                        <input
                          type="text"
                          value={editFormData.state_region || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, state_region: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="State/Region"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={editFormData.country || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Country"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editFormData.latitude || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Latitude"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={editFormData.longitude || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Longitude"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Timezone
                        </label>
                        <input
                          type="text"
                          value={editFormData.timezone || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="e.g., America/New_York"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location Privacy
                      </label>
                      <select
                        value={editFormData.location_privacy || "city_county"}
                        onChange={(e) => setEditFormData({ ...editFormData, location_privacy: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="exact">Exact Location</option>
                        <option value="city">City Only</option>
                        <option value="city_country">City + Country</option>
                        <option value="county">County/Region Only</option>
                        <option value="county_country">County/Region + Country</option>
                        <option value="city_county">City + County/Region</option>
                        <option value="country">Country Only</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Professional Information Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Professional Information</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Employment Status
                      </label>
                      <select
                        value={editFormData.employment_status || "not_specified"}
                        onChange={(e) => setEditFormData({ ...editFormData, employment_status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="not_specified">Not Specified</option>
                        <option value="looking_for_job">Looking for Job</option>
                        <option value="employed">Employed</option>
                        <option value="business_owner">Business Owner</option>
                        <option value="freelancer">Freelancer</option>
                        <option value="student">Student</option>
                        <option value="unemployed">Unemployed</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CV/Resume URL
                      </label>
                      <input
                        type="url"
                        value={editFormData.cv_url || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, cv_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="https://example.com/cv.pdf"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={editFormData.website || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Skills
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(editFormData.skills || []).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => {
                                const newSkills = [...(editFormData.skills || [])];
                                newSkills.splice(idx, 1);
                                setEditFormData({ ...editFormData, skills: newSkills });
                              }}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editFormData.skillInput || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, skillInput: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && editFormData.skillInput) {
                              e.preventDefault();
                              const newSkills = [...(editFormData.skills || []), editFormData.skillInput];
                              setEditFormData({ ...editFormData, skills: newSkills, skillInput: "" });
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Add a skill and press Enter"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editFormData.skillInput) {
                              const newSkills = [...(editFormData.skills || []), editFormData.skillInput];
                              setEditFormData({ ...editFormData, skills: newSkills, skillInput: "" });
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Services (for businesses)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(editFormData.services || []).map((service, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                          >
                            {service}
                            <button
                              type="button"
                              onClick={() => {
                                const newServices = [...(editFormData.services || [])];
                                newServices.splice(idx, 1);
                                setEditFormData({ ...editFormData, services: newServices });
                              }}
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editFormData.serviceInput || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, serviceInput: e.target.value })}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && editFormData.serviceInput) {
                              e.preventDefault();
                              const newServices = [...(editFormData.services || []), editFormData.serviceInput];
                              setEditFormData({ ...editFormData, services: newServices, serviceInput: "" });
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Add a service and press Enter"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editFormData.serviceInput) {
                              const newServices = [...(editFormData.services || []), editFormData.serviceInput];
                              setEditFormData({ ...editFormData, services: newServices, serviceInput: "" });
                            }
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Featured Profile Controls */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Featured Profile Settings</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Control how prominently this user appears in search results. Pro users get priority 50, Ultimate users get 100.
                  </p>

                  <div className="space-y-4">
                    {/* Manual Featured Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Manually Feature This Profile
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Override plan-based featuring and give this user additional boost
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, is_manually_featured: !editFormData.is_manually_featured })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          editFormData.is_manually_featured ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            editFormData.is_manually_featured ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Featured Boost */}
                    {editFormData.is_manually_featured && (
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Featured Boost: +{editFormData.featured_boost || 0}
                        </label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          Additional priority points added to the user's plan-based priority (0-200)
                        </p>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={editFormData.featured_boost || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, featured_boost: parseInt(e.target.value) || 0 })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>0</span>
                          <span>100</span>
                          <span>200</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="200"
                          value={editFormData.featured_boost || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, featured_boost: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) })}
                          className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                    )}

                    {/* Featured Until Date */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Featured Until (Optional)
                      </label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Set an expiration date for manual featuring. Leave empty for permanent featuring.
                      </p>
                      <input
                        type="datetime-local"
                        value={editFormData.featured_until ? new Date(editFormData.featured_until).toISOString().slice(0, 16) : ""}
                        onChange={(e) => {
                          const dateValue = e.target.value ? new Date(e.target.value).toISOString() : null;
                          setEditFormData({ ...editFormData, featured_until: dateValue });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                      {editFormData.featured_until && (
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, featured_until: null })}
                          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Clear expiration date
                        </button>
                      )}
                    </div>

                    {/* Current Priority Display */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Current Featured Priority</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Plan: {editingUser.subscription_plan === "ultimate" ? "100" : editingUser.subscription_plan === "pro" ? "50" : "0"}
                            {editFormData.is_manually_featured && editFormData.featured_boost ? (
                              <span className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400">
                                + Boost: {editFormData.featured_boost} = {(editingUser.subscription_plan === "ultimate" ? 100 : editingUser.subscription_plan === "pro" ? 50 : 0) + (editFormData.featured_boost || 0)}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        {editingUser.featured_priority !== undefined && editingUser.featured_priority > 0 && (
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            editingUser.featured_priority >= 100
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                              : editingUser.featured_priority >= 50
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                              : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                          }`}>
                            Priority: {editingUser.featured_priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3">
                    <Link
                      href={`/admin?tab=billing&user=${editingUser.clerk_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Manage Billing
                    </Link>
                    <button
                      onClick={() => {
                        setSettingsUser(editingUser);
                        setSettingsModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      User Settings
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setEditFormData({});
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={processingId === editingUser.clerk_id}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {processingId === editingUser.clerk_id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Management Modal */}
      {fileManagementUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">File Management</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{fileManagementUser.display_name}</p>
                </div>
                <button
                  onClick={() => {
                    setFileManagementUser(null);
                    setUserFiles([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Storage Usage */}
              {storageData[fileManagementUser.clerk_id] && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage Usage</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {storageData[fileManagementUser.clerk_id].usedMB.toFixed(2)} MB / {storageData[fileManagementUser.clerk_id].limitMB.toFixed(2)} MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        storageData[fileManagementUser.clerk_id].percentage >= 90
                          ? "bg-red-500"
                          : storageData[fileManagementUser.clerk_id].percentage >= 70
                          ? "bg-yellow-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(storageData[fileManagementUser.clerk_id].percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {storageData[fileManagementUser.clerk_id].fileCount} file(s)
                  </p>
                </div>
              )}

              {/* Profile Picture Management */}
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Profile Picture
                  </h3>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReplaceProfilePicture}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <span className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                      {uploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {fileManagementUser.avatar_url ? "Replace" : "Upload"}
                        </>
                      )}
                    </span>
                  </label>
                </div>
                {fileManagementUser.avatar_url ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={fileManagementUser.avatar_url}
                      alt={fileManagementUser.display_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Current profile picture</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Click Replace to upload a new one</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No profile picture set</p>
                )}
                
                {/* Show approved profile pictures if multiple exist */}
                {(() => {
                  const approvedPics = userFiles.filter(f => f.file_type === "profile_picture" && f.moderation_status === "approved");
                  if (approvedPics.length <= 1) return null;
                  
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select from existing approved pictures:</p>
                      <div className="grid grid-cols-4 gap-3">
                        {approvedPics.map((picFile) => {
                          const picPath = picFile.object_path || picFile.file_path || "";
                          const { data: urlData } = supabase.storage.from(picFile.bucket_name).getPublicUrl(picPath);
                          const picUrl = urlData?.publicUrl || null;
                          const isCurrent = fileManagementUser.avatar_url?.includes(picPath) || fileManagementUser.avatar_url?.includes(picFile.file_name || "");
                          
                          return picUrl ? (
                            <button
                              key={picFile.id}
                              onClick={async () => {
                                try {
                                  // Update profile avatar_url
                                  await supabase
                                    .from("profiles")
                                    .update({ avatar_url: picUrl })
                                    .eq("clerk_id", fileManagementUser.clerk_id);

                                  // Sync with Clerk
                                  await fetch("/api/sync-profile-picture", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userId: fileManagementUser.clerk_id, imageUrl: picUrl }),
                                  });

                                  // Reload user data
                                  await handleOpenFileManagement(fileManagementUser);
                                  await loadUsers();
                                } catch (error) {
                                  console.error("Error setting profile picture:", error);
                                  alert("Failed to set profile picture");
                                }
                              }}
                              className={`relative p-1 rounded-lg border-2 transition-all ${
                                isCurrent
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700"
                              }`}
                              title={isCurrent ? "Current profile picture" : "Click to set as profile picture"}
                            >
                              <img
                                src={picUrl}
                                alt="Profile picture option"
                                className="w-full h-20 object-cover rounded"
                              />
                              {isCurrent && (
                                <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-0.5">
                                  <CheckCircleIcon className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Upload New File */}
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </h3>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) => handleUploadFile(e, "cv")}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <span className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CV/Resume
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) => handleUploadFile(e, "portfolio")}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <span className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Portfolio
                    </span>
                  </label>
                </div>
              </div>

              {/* Files List */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">All Files ({userFiles.length})</h3>
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : userFiles.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">No files found</p>
                ) : (
                  <div className="space-y-2">
                    {userFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {file.file_type === "profile_picture" ? (
                            <ImageIcon className="w-5 h-5 text-blue-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {(file.object_path || file.file_path || file.file_name || "").split("/").pop()}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="capitalize">{file.file_type || "unknown"}</span>
                              <span>•</span>
                              <span>{formatBytes(file.file_size_bytes || file.file_size || 0)}</span>
                              <span>•</span>
                              <span className={`${
                                file.moderation_status === "approved"
                                  ? "text-green-600 dark:text-green-400"
                                  : file.moderation_status === "pending"
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {(file.moderation_status || "pending").charAt(0).toUpperCase() + (file.moderation_status || "pending").slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(file.id, file.object_path || file.file_path || "", file.bucket_name)}
                          disabled={deletingFileId === file.id}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete file"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {selectedUserForSuspension && (
        <SuspendUserModal
          isOpen={suspendModalOpen}
          onClose={() => {
            setSuspendModalOpen(false);
            setSelectedUserForSuspension(null);
          }}
          userName={selectedUserForSuspension.name}
          userId={selectedUserForSuspension.id}
          onSuspend={handleSuspendConfirm}
        />
      )}

      {/* User Detail View Modal */}
      {detailViewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                {detailViewUser.avatar_url ? (
                  <img
                    src={detailViewUser.avatar_url}
                    alt={detailViewUser.display_name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {detailViewUser.display_name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{detailViewUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailViewUser(null);
                  setUserNotifications([]);
                  setUserSubscription(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 px-6">
              <button
                onClick={() => setDetailViewTab('overview')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  detailViewTab === 'overview'
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDetailViewTab('notifications')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  detailViewTab === 'notifications'
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Notifications ({userNotifications.length})
              </button>
              <button
                onClick={() => setDetailViewTab('billing')}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  detailViewTab === 'billing'
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Billing
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailViewTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                      <p className="text-gray-900 dark:text-white">{detailViewUser.display_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                      <p className="text-gray-900 dark:text-white">{detailViewUser.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Plan</label>
                      <p className="text-gray-900 dark:text-white capitalize">{detailViewUser.subscription_plan}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Status</label>
                      <p className="text-gray-900 dark:text-white capitalize">{detailViewUser.profile_status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Verified</label>
                      <p className="text-gray-900 dark:text-white">{detailViewUser.is_verified ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin</label>
                      <p className="text-gray-900 dark:text-white">{detailViewUser.is_admin ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Suspended</label>
                      <p className="text-gray-900 dark:text-white">{detailViewUser.is_suspended ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Joined</label>
                      <p className="text-gray-900 dark:text-white">{new Date(detailViewUser.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {detailViewUser.bio && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                      <p className="text-gray-900 dark:text-white">{detailViewUser.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {detailViewTab === 'notifications' && (
                <div>
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                  ) : userNotifications.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">No notifications found</p>
                  ) : (
                    <div className="space-y-2">
                      {userNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg border ${
                            notification.read
                              ? "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                              : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notification.type}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailViewTab === 'billing' && (
                <div>
                  {loadingSubscription ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                  ) : userSubscription ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan</label>
                          <p className="text-gray-900 dark:text-white capitalize">
                            {userSubscription.subscription_plans?.display_name || userSubscription.plan_name || 'Free'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                          <p className="text-gray-900 dark:text-white capitalize">{userSubscription.status || 'active'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing Cycle</label>
                          <p className="text-gray-900 dark:text-white">
                            {userSubscription.billing_cycle === "yearly" ? "Yearly" : 
                             userSubscription.billing_cycle === "monthly" ? "Monthly" : 
                             userSubscription.billing_cycle === "free" ? "Free" :
                             userSubscription.billing_cycle === "lifetime" ? "Lifetime" : 
                             "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Is Trial</label>
                          <p className="text-gray-900 dark:text-white">{userSubscription.is_trial ? 'Yes' : 'No'}</p>
                        </div>
                        {userSubscription.current_period_start && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period Start</label>
                            <p className="text-gray-900 dark:text-white">
                              {new Date(userSubscription.current_period_start).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {userSubscription.current_period_end && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period End</label>
                            <p className="text-gray-900 dark:text-white">
                              {new Date(userSubscription.current_period_end).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          href={`/admin?tab=billing&user=${detailViewUser.clerk_id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Manage Billing
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No subscription found</p>
                      <Link
                        href={`/admin?tab=billing&user=${detailViewUser.clerk_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Create Subscription
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      {settingsModalOpen && settingsUser && (
        <AdminUserSettingsModal
          supabase={supabase}
          user={settingsUser}
          onClose={() => {
            setSettingsModalOpen(false);
            setSettingsUser(null);
          }}
        />
      )}
    </div>
  );
}

// Admin User Settings Modal Component
function AdminUserSettingsModal({ supabase, user, onClose }: { supabase: any; user: UserProfile; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "account", label: "Account", icon: Key },
    { id: "content", label: "Content", icon: Globe },
  ];

  // Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    showEmail: true,
    showLocation: true,
    showWebsite: true,
    allowMessages: true,
    allowReviews: true,
    showPortfolio: true,
    showEmploymentStatus: true,
    showPlanBadge: true,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    newFollower: true,
    newConnection: true,
    newReview: true,
    newComment: true,
    newLike: true,
    newMessage: true,
    newMention: true,
    newRepost: true,
    ticketCreated: true,
    ticketAssigned: true,
    ticketReplied: true,
    ticketStatusChanged: true,
    ticketClosed: true,
    warningIssued: true,
    accountSuspended: true,
    accountUnsuspended: true,
    fileApproved: true,
    fileRejected: true,
    profileApproved: true,
    profileRejected: true,
    verificationApproved: true,
    verificationRejected: true,
    reportResolved: true,
    reportDismissed: true,
    contentRemoved: true,
    adminWarning: true,
    adminNotification: true,
    weeklyDigest: false,
    marketingEmails: false,
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public",
    showOnlineStatus: true,
    allowSearch: true,
    showInNearbyUsers: true,
    showActivity: true,
  });

  // Appearance Settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "system",
    compactMode: false,
    showAnimations: true,
    fontSize: "medium",
    language: "en",
  });

  // Account Settings
  const [accountSettings, setAccountSettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    deleteAccount: false,
  });

  // Content Settings
  const [contentSettings, setContentSettings] = useState({
    autoPlayVideos: false,
    showSensitiveContent: false,
    contentLanguage: "all",
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("settings")
          .eq("clerk_id", user.clerk_id)
          .single();

        if (data?.settings) {
          const settings = data.settings;
          if (settings.profile) {
            setProfileSettings(prev => ({ ...prev, ...settings.profile }));
          }
          if (settings.notifications) {
            setNotificationSettings(prev => ({ ...prev, ...settings.notifications }));
          }
          if (settings.privacy) {
            setPrivacySettings(prev => ({ ...prev, ...settings.privacy }));
          }
          if (settings.appearance) {
            setAppearanceSettings(prev => ({ ...prev, ...settings.appearance }));
          }
          if (settings.account) {
            setAccountSettings(prev => ({ ...prev, ...settings.account }));
          }
          if (settings.content) {
            setContentSettings(prev => ({ ...prev, ...settings.content }));
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user.clerk_id, supabase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = {
        profile: profileSettings,
        notifications: notificationSettings,
        privacy: privacySettings,
        appearance: appearanceSettings,
        account: accountSettings,
        content: contentSettings,
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_id", user.clerk_id);

      if (error) throw error;
      alert("Settings saved successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900 dark:text-white">{label}</label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.display_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 overflow-y-auto">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "profile" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Settings</h3>
                <ToggleSwitch checked={profileSettings.showEmail} onChange={(val) => setProfileSettings({ ...profileSettings, showEmail: val })} label="Show Email" />
                <ToggleSwitch checked={profileSettings.showLocation} onChange={(val) => setProfileSettings({ ...profileSettings, showLocation: val })} label="Show Location" />
                <ToggleSwitch checked={profileSettings.showWebsite} onChange={(val) => setProfileSettings({ ...profileSettings, showWebsite: val })} label="Show Website" />
                <ToggleSwitch checked={profileSettings.allowMessages} onChange={(val) => setProfileSettings({ ...profileSettings, allowMessages: val })} label="Allow Messages" />
                <ToggleSwitch checked={profileSettings.allowReviews} onChange={(val) => setProfileSettings({ ...profileSettings, allowReviews: val })} label="Allow Reviews" />
                <ToggleSwitch checked={profileSettings.showPortfolio} onChange={(val) => setProfileSettings({ ...profileSettings, showPortfolio: val })} label="Show Portfolio" />
                <ToggleSwitch checked={profileSettings.showEmploymentStatus} onChange={(val) => setProfileSettings({ ...profileSettings, showEmploymentStatus: val })} label="Show Employment Status" />
                <ToggleSwitch checked={profileSettings.showPlanBadge} onChange={(val) => setProfileSettings({ ...profileSettings, showPlanBadge: val })} label="Show Plan Badge" />
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Settings</h3>
                <div className="space-y-3">
                  <ToggleSwitch checked={notificationSettings.emailNotifications} onChange={(val) => setNotificationSettings({ ...notificationSettings, emailNotifications: val })} label="Email Notifications" />
                  <ToggleSwitch checked={notificationSettings.pushNotifications} onChange={(val) => setNotificationSettings({ ...notificationSettings, pushNotifications: val })} label="Push Notifications" />
                  <ToggleSwitch checked={notificationSettings.inAppNotifications} onChange={(val) => setNotificationSettings({ ...notificationSettings, inAppNotifications: val })} label="In-App Notifications" />
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Event Notifications</h4>
                  <div className="space-y-2">
                    <ToggleSwitch checked={notificationSettings.newFollower} onChange={(val) => setNotificationSettings({ ...notificationSettings, newFollower: val })} label="New Follower" />
                    <ToggleSwitch checked={notificationSettings.newConnection} onChange={(val) => setNotificationSettings({ ...notificationSettings, newConnection: val })} label="New Connection" />
                    <ToggleSwitch checked={notificationSettings.newReview} onChange={(val) => setNotificationSettings({ ...notificationSettings, newReview: val })} label="New Review" />
                    <ToggleSwitch checked={notificationSettings.newComment} onChange={(val) => setNotificationSettings({ ...notificationSettings, newComment: val })} label="New Comment" />
                    <ToggleSwitch checked={notificationSettings.newLike} onChange={(val) => setNotificationSettings({ ...notificationSettings, newLike: val })} label="New Like" />
                    <ToggleSwitch checked={notificationSettings.newMessage} onChange={(val) => setNotificationSettings({ ...notificationSettings, newMessage: val })} label="New Message" />
                    <ToggleSwitch checked={notificationSettings.warningIssued} onChange={(val) => setNotificationSettings({ ...notificationSettings, warningIssued: val })} label="Warning Issued" />
                    <ToggleSwitch checked={notificationSettings.accountSuspended} onChange={(val) => setNotificationSettings({ ...notificationSettings, accountSuspended: val })} label="Account Suspended" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Visibility</label>
                  <select
                    value={privacySettings.profileVisibility}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <ToggleSwitch checked={privacySettings.showOnlineStatus} onChange={(val) => setPrivacySettings({ ...privacySettings, showOnlineStatus: val })} label="Show Online Status" />
                <ToggleSwitch checked={privacySettings.allowSearch} onChange={(val) => setPrivacySettings({ ...privacySettings, allowSearch: val })} label="Allow Search" />
                <ToggleSwitch checked={privacySettings.showInNearbyUsers} onChange={(val) => setPrivacySettings({ ...privacySettings, showInNearbyUsers: val })} label="Show in Nearby Users" />
                <ToggleSwitch checked={privacySettings.showActivity} onChange={(val) => setPrivacySettings({ ...privacySettings, showActivity: val })} label="Show Activity" />
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                  <select
                    value={appearanceSettings.theme}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, theme: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Size</label>
                  <select
                    value={appearanceSettings.fontSize}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, fontSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <ToggleSwitch checked={appearanceSettings.compactMode} onChange={(val) => setAppearanceSettings({ ...appearanceSettings, compactMode: val })} label="Compact Mode" />
                <ToggleSwitch checked={appearanceSettings.showAnimations} onChange={(val) => setAppearanceSettings({ ...appearanceSettings, showAnimations: val })} label="Show Animations" />
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
                <ToggleSwitch checked={accountSettings.twoFactorAuth} onChange={(val) => setAccountSettings({ ...accountSettings, twoFactorAuth: val })} label="Two-Factor Authentication" description="Coming Soon" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={accountSettings.sessionTimeout}
                    onChange={(e) => setAccountSettings({ ...accountSettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    min="5"
                    max="1440"
                  />
                </div>
              </div>
            )}

            {activeTab === "content" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Settings</h3>
                <ToggleSwitch checked={contentSettings.autoPlayVideos} onChange={(val) => setContentSettings({ ...contentSettings, autoPlayVideos: val })} label="Auto-play Videos" />
                <ToggleSwitch checked={contentSettings.showSensitiveContent} onChange={(val) => setContentSettings({ ...contentSettings, showSensitiveContent: val })} label="Show Sensitive Content" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Language</label>
                  <select
                    value={contentSettings.contentLanguage}
                    onChange={(e) => setContentSettings({ ...contentSettings, contentLanguage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Languages</option>
                    <option value="english">English Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


