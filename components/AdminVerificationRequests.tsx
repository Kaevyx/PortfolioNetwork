"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, X, Clock, AlertCircle, Loader2, Search, User, FileText, ExternalLink } from "lucide-react";

interface AdminVerificationRequestsProps {
  supabase: any;
  currentUserId: string;
}

interface VerificationRequest {
  id: string;
  profile_id: string;
  reason: string;
  documents: string[] | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export function AdminVerificationRequests({ supabase, currentUserId }: AdminVerificationRequestsProps) {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("verification_requests")
        .select(`
          *,
          profile:profiles!verification_requests_profile_id_fkey(
            display_name,
            bio,
            avatar_url,
            is_verified
          )
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading verification requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm("Are you sure you want to approve this verification request?")) {
      return;
    }

    setProcessingId(requestId);
    try {
      const notes = reviewNotes[requestId] || null;

      // Update verification request
      const { error: updateError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_by: currentUserId,
          review_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Update profile
      const { data: request } = await supabase
        .from("verification_requests")
        .select("profile_id")
        .eq("id", requestId)
        .single();

      if (request) {
        await supabase
          .from("profiles")
          .update({
            is_verified: true,
            verification_status: "approved",
            verification_approved_at: new Date().toISOString(),
          })
          .eq("clerk_id", request.profile_id);

        // Create notification for verification approval
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
              user_id: request.profile_id,
              type: "verification_approved",
              actor_id: currentUserId,
              target_id: requestId,
              message: `Your verification request has been approved by ${adminName}. You now have a verified badge!`,
            });
        } catch (notifError) {
          console.error("Error creating approval notification:", notifError);
          // Don't fail the approval if notification fails
        }
      }

      await loadRequests();
      setReviewNotes({ ...reviewNotes, [requestId]: "" });
    } catch (error: any) {
      console.error("Error approving request:", error);
      alert("Failed to approve request: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = reviewNotes[requestId];
    if (!notes || notes.trim().length === 0) {
      alert("Please provide a reason for rejection");
      return;
    }

    if (!confirm("Are you sure you want to reject this verification request?")) {
      return;
    }

    setProcessingId(requestId);
    try {
      // Update verification request
      const { error: updateError } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          reviewed_by: currentUserId,
          review_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Update profile
      const { data: request } = await supabase
        .from("verification_requests")
        .select("profile_id")
        .eq("id", requestId)
        .single();

      if (request) {
        await supabase
          .from("profiles")
          .update({
            verification_status: "rejected",
          })
          .eq("clerk_id", request.profile_id);

        // Create notification for verification rejection
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
              user_id: request.profile_id,
              type: "verification_rejected",
              actor_id: currentUserId,
              target_id: requestId,
              message: `Your verification request has been rejected by ${adminName}. Reason: ${notes}. You can submit a new request with updated information.`,
            });
        } catch (notifError) {
          console.error("Error creating rejection notification:", notifError);
          // Don't fail the rejection if notification fails
        }
      }

      await loadRequests();
      setReviewNotes({ ...reviewNotes, [requestId]: "" });
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.profile?.display_name?.toLowerCase().includes(query) ||
        req.reason?.toLowerCase().includes(query) ||
        req.profile_id.toLowerCase().includes(query)
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, reason, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {filter === "pending" ? "No pending verification requests" : "No requests found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {request.profile?.avatar_url ? (
                    <img
                      src={request.profile.avatar_url}
                      alt={request.profile.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {request.profile?.display_name || "Unknown User"}
                      </h3>
                      {request.profile?.is_verified && (
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({request.profile_id})
                      </span>
                    </div>
                    {request.profile?.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {request.profile.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      {request.status === "pending" && (
                        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                      {request.status === "approved" && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {request.status === "rejected" && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <X className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={`/profile/${request.profile_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  title="View Profile"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Reason for Verification</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{request.reason}</p>
              </div>

              {request.documents && request.documents.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Verification Documents
                  </h4>
                  <div className="space-y-2">
                    {request.documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 truncate"
                      >
                        {doc}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {request.status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Review Notes {request.status === "pending" && "(Required for rejection)"}
                    </label>
                    <textarea
                      value={reviewNotes[request.id] || ""}
                      onChange={(e) =>
                        setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add notes about your decision (required for rejection)..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {processingId === request.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id || !reviewNotes[request.id]?.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {processingId === request.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {request.status !== "pending" && request.review_notes && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Review Notes</p>
                      <p className="text-sm text-blue-800 dark:text-blue-400">{request.review_notes}</p>
                      {request.reviewed_by && (
                        <p className="text-xs text-blue-700 dark:text-blue-500 mt-2">
                          Reviewed by: {request.reviewed_by}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


