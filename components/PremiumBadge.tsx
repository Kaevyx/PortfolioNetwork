"use client";

import { Crown, Sparkles } from "lucide-react";

interface PremiumBadgeProps {
  plan?: "pro" | "ultimate";
  size?: "sm" | "md" | "lg";
}

export function PremiumBadge({ plan = "pro", size = "sm" }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full shadow-sm ${
      plan === "ultimate" 
        ? "bg-gradient-to-r from-purple-500 via-pink-500 to-pink-600"
        : "bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600"
    }`}>
      {plan === "ultimate" ? (
        <Crown className={`${sizeClasses[size]} text-white`} />
      ) : (
        <Sparkles className={`${sizeClasses[size]} text-white`} />
      )}
      <span className={`${textSizeClasses[size]} font-bold text-white uppercase`}>
        {plan === "ultimate" ? "Ultimate" : "Pro"}
      </span>
    </div>
  );
}






