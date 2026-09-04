"use client";

import { AlertTriangle, Lock } from "lucide-react";

interface SuspensionWarningProps {
  reason: string | null;
  endsAt: string | null;
}

export function SuspensionWarning({ reason, endsAt }: SuspensionWarningProps) {
  const isPermanent = !endsAt;
  const endDate = endsAt ? new Date(endsAt) : null;
  const isExpired = endDate && endDate < new Date();

  if (isExpired) {
    return null; // Suspension expired, don't show warning
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Account Suspended
          </h3>
          {reason && (
            <p className="text-sm text-red-800 dark:text-red-300 mb-2">
              <strong>Reason:</strong> {reason}
            </p>
          )}
          {!isPermanent && endDate && (
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>Suspension ends:</strong> {endDate.toLocaleString()}
            </p>
          )}
          {isPermanent && (
            <p className="text-sm text-red-800 dark:text-red-300">
              This is a permanent suspension. Your profile is not visible to other users.
            </p>
          )}
          <p className="text-xs text-red-700 dark:text-red-400 mt-2">
            Your profile is not visible to other users during this time. Please contact support if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
  );
}





