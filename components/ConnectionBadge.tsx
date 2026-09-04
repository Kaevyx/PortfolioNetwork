"use client";

import { UserPlus } from "lucide-react";

interface ConnectionBadgeProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionBadge({ isConnected, className = "" }: ConnectionBadgeProps) {
  if (!isConnected) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full text-xs font-semibold ${className}`}>
      <UserPlus className="w-3 h-3" />
      <span>Connected</span>
    </div>
  );
}






