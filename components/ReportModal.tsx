"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AlertTriangle, Flag } from "lucide-react";
import { Modal } from "./Modal";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: "profile" | "post" | "comment" | "file";
  reportedId: string;
  reportedName?: string; // For display purposes
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = {
  profile: [
    "Inappropriate content",
    "Spam or fake account",
    "Harassment or bullying",
    "Impersonation",
    "Other",
  ],
  post: [
    "Spam",
    "Inappropriate content",
    "Harassment or bullying",
    "False information",
    "Copyright violation",
    "Other",
  ],
  comment: [
    "Spam",
    "Inappropriate content",
    "Harassment or bullying",
    "Other",
  ],
  file: [
    "Inappropriate content",
    "Copyright violation",
    "Spam",
    "Other",
  ],
};

export function ReportModal({
  isOpen,
  onClose,
  reportType,
  reportedId,
  reportedName,
  onReportSubmitted,
}: ReportModalProps) {
  const { user } = useUser();
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = REPORT_REASONS[reportType] || REPORT_REASONS.profile;

  const handleSubmit = async () => {
    if (!selectedReason || !user?.id || !reportedId) {
      alert("Missing required information. Please ensure all fields are filled.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedType: reportType,
          reportedId,
          reason: selectedReason,
          details: details.trim() || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMessage = result.error || `Failed to submit report (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Show success message
      alert(result.message || "Report submitted successfully!");
      
      onReportSubmitted?.();
      onClose();
      
      // Reset form
      setSelectedReason("");
      setDetails("");
    } catch (error: any) {
      console.error("Report submission error:", error);
      alert("Failed to submit report: " + (error.message || "Unknown error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Report ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Reports are reviewed by our moderation team. False reports may result in action against your account.
            </p>
          </div>
        </div>

        {reportedName && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reporting:</p>
            <p className="font-medium text-gray-900 dark:text-white">{reportedName}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for reporting <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {reasons.map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional details (optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Provide any additional information that might help us review this report..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}





