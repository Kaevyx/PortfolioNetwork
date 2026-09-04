"use client";

import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspensionWarning } from "@/components/SuspensionWarning";
import { Lock } from "lucide-react";

interface SuspendedAccessBlockProps {
  children: React.ReactNode;
  message?: string;
}

export function SuspendedAccessBlock({ children, message }: SuspendedAccessBlockProps) {
  const { isSuspended, reason, endsAt } = useSuspensionCheck();

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <SuspensionWarning reason={reason} endsAt={endsAt} />
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Suspended</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message || "Your account is currently suspended. You cannot access this feature during this time."}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              All network features are disabled until your suspension is lifted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}





