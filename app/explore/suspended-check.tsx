"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspensionWarning } from "@/components/SuspensionWarning";
import { Lock } from "lucide-react";

export function SuspendedExploreRedirect() {
  const router = useRouter();
  const { isSuspended, reason, endsAt } = useSuspensionCheck();

  useEffect(() => {
    if (isSuspended) {
      router.push("/dashboard");
    }
  }, [isSuspended, router]);

  if (!isSuspended) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Suspended</h2>
        <SuspensionWarning reason={reason} endsAt={endsAt} />
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Your account is currently suspended. You cannot browse or explore profiles during this time.
        </p>
      </div>
    </div>
  );
}




