"use client";

import { useState } from "react";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Modal } from "./Modal";

interface SuspendUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userId: string;
  onSuspend: (reason: string, durationDays: number | null) => Promise<void>;
}

export function SuspendUserModal({
  isOpen,
  onClose,
  userName,
  userId,
  onSuspend,
}: SuspendUserModalProps) {
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for suspension.");
      return;
    }

    setSubmitting(true);
    try {
      await onSuspend(reason.trim(), durationDays);
      onClose();
      setReason("");
      setDurationDays(null);
    } catch (error: any) {
      alert("Failed to suspend user: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suspend User: ${userName}`}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Suspending a user will lock their account and hide their profile from public view. They will not be able to interact with the platform during the suspension period.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for suspension <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this user is being suspended..."
            rows={4}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Suspension duration
            </div>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="duration"
                checked={durationDays === null}
                onChange={() => setDurationDays(null)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Permanent</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">User will remain suspended until manually unsuspended</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="duration"
                checked={durationDays !== null}
                onChange={() => setDurationDays(7)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Temporary</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={durationDays || ""}
                    onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (durationDays === null) setDurationDays(7);
                    }}
                    placeholder="7"
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
                </div>
              </div>
            </label>
          </div>
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
            disabled={!reason.trim() || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Suspending...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Suspend User
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}





