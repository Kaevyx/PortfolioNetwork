"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, X, AlertCircle } from "lucide-react";
import { VerificationRequestForm } from "./VerificationRequestForm";

interface VerificationRequestSectionProps {
  supabase: any;
  userId: string;
}

export function VerificationRequestSection({ supabase, userId }: VerificationRequestSectionProps) {
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadVerificationStatus();
  }, [userId]);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      
      // Get profile verification status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_verified, verification_status, verification_reason")
        .eq("clerk_id", userId)
        .single();

      // Get latest verification request
      const { data: request } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setVerificationStatus({
        isVerified: profile?.is_verified || false,
        status: profile?.verification_status || "none",
        reason: profile?.verification_reason,
        request: request || null,
      });
    } catch (error) {
      console.error("Error loading verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  const { isVerified, status, request } = verificationStatus || {};

  // User is already verified
  if (isVerified) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-300">Your account is verified</p>
            <p className="text-sm text-green-800 dark:text-green-400">
              You have a verified badge on your profile. Thank you for being part of our trusted network!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User has a pending request
  if (status === "pending" || request?.status === "pending") {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
              Verification Request Pending
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-2">
              Your verification request is under review. We'll notify you once it's been processed.
            </p>
            {request?.created_at && (
              <p className="text-xs text-yellow-700 dark:text-yellow-500">
                Submitted: {new Date(request.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User's request was rejected
  if (status === "rejected" || request?.status === "rejected") {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <X className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-300 mb-1">
                Verification Request Rejected
              </p>
              <p className="text-sm text-red-800 dark:text-red-400 mb-2">
                Your verification request was not approved. You can submit a new request with additional information.
              </p>
              {request?.review_notes && (
                <p className="text-xs text-red-700 dark:text-red-500 mt-2">
                  <strong>Note:</strong> {request.review_notes}
                </p>
              )}
            </div>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Submit New Request
          </button>
        )}
        {showForm && (
          <div className="mt-4">
            <VerificationRequestForm
              onSuccess={() => {
                setShowForm(false);
                loadVerificationStatus();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // User hasn't requested verification yet
  if (!showForm) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <AlertCircle className="w-4 h-4" />
          <span>Get verified to build trust and credibility with your network</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          Request Verification
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(false)}
        className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        ← Cancel
      </button>
      <VerificationRequestForm
        onSuccess={() => {
          setShowForm(false);
          loadVerificationStatus();
        }}
      />
    </div>
  );
}






