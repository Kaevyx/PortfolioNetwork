"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X, Clock, AlertCircle, Loader2, Search, User, Mail, MapPin, Globe, Image as ImageIcon } from "lucide-react";

interface AdminProfileApprovalsProps {
  supabase: any;
  currentUserId: string;
}

interface Profile {
  id: string;
  clerk_id: string;
  display_name: string;
  bio: string | null;
  profile_type: "individual" | "business";
  location: string | null;
  website: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_status: "pending" | "approved" | "rejected";
  profile_approved_at: string | null;
  profile_approved_by: string | null;
  profile_rejection_reason: string | null;
  created_at: string;
}

export function AdminProfileApprovals({ supabase, currentUserId }: AdminProfileApprovalsProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [filter]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("profile_status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (profileId: string, clerkId: string, avatarUrl: string | null) => {
    try {
      setProcessingId(profileId);
      
      // If there's an avatar, find the approved profile picture file
      let approvedProfilePictureId: string | null = null;
      if (avatarUrl) {
        // Find the approved profile picture file that matches this avatar URL
        const { data: profilePictureFiles } = await supabase
          .from("storage_files")
          .select("*")
          .eq("user_id", clerkId)
          .eq("file_type", "profile_picture")
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(1);

        if (profilePictureFiles && profilePictureFiles.length > 0) {
          approvedProfilePictureId = profilePictureFiles[0].id;
        }
      }

      // Update profile status in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          profile_status: "approved",
          profile_approved_at: new Date().toISOString(),
          profile_approved_by: currentUserId,
        })
        .eq("id", profileId);

      if (error) throw error;

      // If there's an approved profile picture, delete any other approved profile pictures
      if (approvedProfilePictureId) {
        const { data: oldFiles } = await supabase
          .from("storage_files")
          .select("*")
          .eq("user_id", clerkId)
          .eq("file_type", "profile_picture")
          .eq("moderation_status", "approved")
          .neq("id", approvedProfilePictureId);

        // Delete old profile pictures
        for (const oldFile of oldFiles || []) {
          try {
            const oldFilePath = oldFile.object_path || oldFile.file_path;
            const oldBucket = oldFile.bucket_name;
            if (oldFilePath && oldBucket) {
              await supabase.storage
                .from(oldBucket)
                .remove([oldFilePath]);
            }

            await supabase
              .from("storage_files")
              .delete()
              .eq("id", oldFile.id);
          } catch (deleteError) {
            console.error("Error deleting old profile picture:", deleteError);
          }
        }
      }

      // Sync profile picture with Clerk if avatar exists
      if (avatarUrl) {
        try {
          const response = await fetch("/api/sync-profile-picture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: clerkId, imageUrl: avatarUrl }),
          });
          
          if (!response.ok) {
            console.error("Failed to sync with Clerk, but profile was approved");
          }
        } catch (clerkError) {
          console.error("Error syncing with Clerk:", clerkError);
          // Don't fail the approval if Clerk sync fails
        }
      }

      // Create notification for profile approval
      try {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("clerk_id", currentUserId)
          .single();

        const adminName = adminProfile?.display_name || "An administrator";
        await supabase
          .from("notifications")
          .insert({
            user_id: clerkId,
            type: "profile_approved",
            actor_id: currentUserId,
            target_id: profileId,
            message: `Your profile has been approved by ${adminName}. Your profile is now publicly visible!`,
          });
      } catch (notifError) {
        console.error("Error creating approval notification:", notifError);
        // Don't fail the approval if notification fails
      }

      await loadProfiles();
    } catch (error: any) {
      console.error("Error approving profile:", error);
      alert("Failed to approve profile: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (profileId: string) => {
    const reason = rejectionReason[profileId] || "";
    if (!reason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      setProcessingId(profileId);
      
      // Get profile info before updating
      const { data: profile } = await supabase
        .from("profiles")
        .select("clerk_id, avatar_url, display_name, profile_status")
        .eq("id", profileId)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Delete profile picture if it exists
      if (profile.avatar_url) {
        try {
          // Find and delete the profile picture file
          const { data: profilePictureFiles } = await supabase
            .from("storage_files")
            .select("*")
            .eq("user_id", profile.clerk_id)
            .eq("file_type", "profile_picture")
            .in("moderation_status", ["pending", "approved"]);

          for (const picFile of profilePictureFiles || []) {
            try {
              const picFilePath = picFile.object_path || picFile.file_path;
              if (picFilePath) {
                await supabase.storage
                  .from(picFile.bucket_name)
                  .remove([picFilePath]);
              }
              await supabase
                .from("storage_files")
                .delete()
                .eq("id", picFile.id);
            } catch (deleteError) {
              console.error("Error deleting profile picture:", deleteError);
            }
          }

          // Clear avatar_url from profile
          await supabase
            .from("profiles")
            .update({ avatar_url: null })
            .eq("id", profileId);

          // Clear Clerk avatar
          try {
            await fetch("/api/sync-profile-picture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: profile.clerk_id, imageUrl: null }),
            });
          } catch (clerkError) {
            console.error("Error clearing Clerk avatar:", clerkError);
          }
        } catch (avatarError) {
          console.error("Error deleting profile picture:", avatarError);
          // Continue even if deletion fails
        }
      }
      
      // Check if profile was previously approved
      const wasApproved = profile.profile_status === "approved";

      // Update profile status
      const { error } = await supabase
        .from("profiles")
        .update({
          profile_status: "rejected",
          profile_rejection_reason: reason,
        })
        .eq("id", profileId);

      if (error) throw error;

      // Log admin action
      try {
        await fetch("/api/log-admin-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "profile_rejected",
            targetUserId: profile.clerk_id,
            targetId: profileId,
            details: {
              wasApproved,
              reason,
            },
          }),
        });
      } catch (logError) {
        console.error("Error logging admin action:", logError);
      }

      // Account history is logged via the log-admin-action API route

      // Create notification for profile rejection
      try {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("clerk_id", currentUserId)
          .single();

        const adminName = adminProfile?.display_name || "An administrator";
        const message = wasApproved
          ? `Your profile has been rejected by ${adminName} after previously being approved. Reason: ${reason}. Your profile picture has been removed. Please review your profile and resubmit.`
          : `Your profile has been rejected by ${adminName}. Reason: ${reason}. Your profile picture has been removed. Please review your profile and resubmit.`;
        
        await supabase
          .from("notifications")
          .insert({
            user_id: profile.clerk_id,
            type: "profile_rejected",
            actor_id: currentUserId,
            target_id: profileId,
            message,
          });
      } catch (notifError) {
        console.error("Error creating rejection notification:", notifError);
        // Don't fail the rejection if notification fails
      }

      setRejectionReason({ ...rejectionReason, [profileId]: "" });
      await loadProfiles();
    } catch (error: any) {
      console.error("Error rejecting profile:", error);
      alert("Failed to reject profile: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        profile.display_name?.toLowerCase().includes(query) ||
        profile.email?.toLowerCase().includes(query) ||
        profile.clerk_id.toLowerCase().includes(query) ||
        profile.bio?.toLowerCase().includes(query)
      );
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Profiles List */}
      {filteredProfiles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No profiles found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {profile.display_name}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          profile.profile_status === "pending"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : profile.profile_status === "approved"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}>
                          {profile.profile_status.charAt(0).toUpperCase() + profile.profile_status.slice(1)}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {profile.profile_type.charAt(0).toUpperCase() + profile.profile_type.slice(1)}
                      </p>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {profile.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                          {profile.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {profile.profile_rejection_reason && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>Rejection Reason:</strong> {profile.profile_rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {profile.profile_status === "pending" && (
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Rejection reason (required for rejection)"
                          value={rejectionReason[profile.id] || ""}
                          onChange={(e) =>
                            setRejectionReason({ ...rejectionReason, [profile.id]: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <button
                        onClick={() => handleApprove(profile.id, profile.clerk_id, profile.avatar_url)}
                        disabled={processingId === profile.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processingId === profile.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(profile.id)}
                        disabled={processingId === profile.id || !rejectionReason[profile.id]?.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processingId === profile.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

