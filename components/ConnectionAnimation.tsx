"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Users } from "lucide-react";

interface ConnectionAnimationProps {
  show: boolean;
  userName: string;
  onComplete: () => void;
}

export function ConnectionAnimation({ show, userName, onComplete }: ConnectionAnimationProps) {
  const [phase, setPhase] = useState<"sparkles" | "check" | "complete">("sparkles");

  useEffect(() => {
    if (!show) {
      setPhase("sparkles");
      return;
    }

    // Phase 1: Sparkles animation
    const sparklesTimer = setTimeout(() => {
      setPhase("check");
    }, 800);

    // Phase 2: Check mark
    const checkTimer = setTimeout(() => {
      setPhase("complete");
    }, 1600);

    // Phase 3: Complete and fade out
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(sparklesTimer);
      clearTimeout(checkTimer);
      clearTimeout(completeTimer);
    };
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-500 scale-100 border-2 border-indigo-200 dark:border-indigo-800">
        <div className="text-center">
          {phase === "sparkles" && (
            <div className="animate-pulse">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <Sparkles className="w-24 h-24 text-indigo-500 animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="w-12 h-12 text-purple-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Creating Connection...
              </h3>
            </div>
          )}

          {phase === "check" && (
            <div className="animate-scale-in">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-slide-up">
                Connected!
              </h3>
            </div>
          )}

          {phase === "complete" && (
            <div className="animate-fade-in">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're now connected with {userName}!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start building your professional network together
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

