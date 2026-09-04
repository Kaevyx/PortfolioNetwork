"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Loader2, Crown, Sparkles, AlertCircle, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UsernameCustomizerProps {
  currentUsername: string | null;
  subscriptionPlan: string;
  onUpdate?: (newUsername: string) => void;
}

export function UsernameCustomizer({ currentUsername, subscriptionPlan, onUpdate }: UsernameCustomizerProps) {
  const [username, setUsername] = useState(currentUsername || "");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const isProOrUltimate = subscriptionPlan === "pro" || subscriptionPlan === "ultimate";

  useEffect(() => {
    setUsername(currentUsername || "");
  }, [currentUsername]);

  const checkAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailability(null);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });

      const data = await response.json();
      setAvailability(data);
    } catch (err: any) {
      setError("Failed to check username availability");
      setAvailability(null);
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setSuccess(false);
    setError(null);
    setAvailability(null);

    // Debounce availability check
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    if (value && value.length >= 3) {
      checkTimeoutRef.current = setTimeout(() => {
        checkAvailability(value);
      }, 500);
    }
  };

  const handleSave = async () => {
    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (availability && !availability.available) {
      setError(availability.message);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/profile/update-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setError(null);
        if (onUpdate) {
          onUpdate(data.username);
        }
        // Refresh the page after a short delay to show the new URL
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(data.message || "Failed to update username");
      }
    } catch (err: any) {
      setError("Failed to update username. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  if (!isProOrUltimate) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Custom Profile URL
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Customize your profile URL (e.g., /profile/Kaevyx) is available for Pro and Ultimate plan users.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Pro or Ultimate
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Custom Profile URL
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Customize your profile URL to make it more memorable and shareable. Your profile will be accessible at{" "}
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              /profile/{username || "your-username"}
            </code>
          </p>

          <div className="space-y-3">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">/profile/</span>
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`block w-full pl-20 pr-10 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    availability?.available === false
                      ? "border-red-300 dark:border-red-700"
                      : availability?.available === true
                      ? "border-green-300 dark:border-green-700"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="kaevyx"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_-]+"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {checking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                  {!checking && availability?.available === true && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {!checking && availability?.available === false && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              {availability && (
                <p
                  className={`mt-2 text-sm flex items-center gap-1 ${
                    availability.available
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {availability.available ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {availability.message}
                </p>
              )}

              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}

              {success && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Username updated successfully! Redirecting...
                </p>
              )}

              <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p>• 3-30 characters</p>
                  <p>• Letters, numbers, hyphens, and underscores only</p>
                  <p>• Cannot start or end with a hyphen or underscore</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || checking || !username || username.length < 3 || (availability && !availability.available)}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Username"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


