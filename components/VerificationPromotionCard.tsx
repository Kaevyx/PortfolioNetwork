"use client";

import Link from "next/link";
import { CheckCircle2, Shield, Sparkles, ArrowRight, X } from "lucide-react";
import { useState } from "react";

export function VerificationPromotionCard() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-800 p-6 mb-4 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 dark:bg-blue-800/30 rounded-full -mr-16 -mt-16 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/30 dark:bg-purple-800/30 rounded-full -ml-12 -mb-12 blur-2xl" />
      
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Get Verified
              </h3>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Stand out with a verified badge! Get your profile verified to build trust and credibility with your network.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Build trust with your audience</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Stand out in search results</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>Increase profile visibility</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>Professional credibility</span>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/settings?tab=account#verification"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Apply for Verification
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

