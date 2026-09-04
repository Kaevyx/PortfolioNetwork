"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export function ClerkErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Clerk errors
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes("Clerk") || event.error?.code === "failed_to_load_clerk_js_timeout") {
        setHasError(true);
        setErrorMessage(event.error?.message || "Failed to load Clerk authentication");
      }
    };

    window.addEventListener("error", handleError);
    
    // Also check for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes("Clerk") || event.reason?.code === "failed_to_load_clerk_js_timeout") {
        setHasError(true);
        setErrorMessage(event.reason?.message || "Failed to load Clerk authentication");
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Authentication Service Unavailable
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We're having trouble loading the authentication service. This could be due to:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
            <li>Network connectivity issues</li>
            <li>Browser extensions blocking scripts</li>
            <li>Temporary service interruption</li>
          </ul>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
          {errorMessage && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded">
              Error: {errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


