"use client";

import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";

interface ProfileStatusBadgeProps {
  status: "pending" | "approved" | "rejected";
  showLabel?: boolean;
}

export function ProfileStatusBadge({ status, showLabel = true }: ProfileStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "approved":
        return {
          icon: CheckCircle2,
          bgColor: "bg-green-100 dark:bg-green-900/30",
          textColor: "text-green-700 dark:text-green-300",
          borderColor: "border-green-200 dark:border-green-800",
          label: "Approved",
        };
      case "pending":
        return {
          icon: Clock,
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          textColor: "text-yellow-700 dark:text-yellow-300",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          label: "Pending Review",
        };
      case "rejected":
        return {
          icon: XCircle,
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-300",
          borderColor: "border-red-200 dark:border-red-800",
          label: "Rejected",
        };
      default:
        return {
          icon: AlertCircle,
          bgColor: "bg-gray-100 dark:bg-gray-800",
          textColor: "text-gray-700 dark:text-gray-300",
          borderColor: "border-gray-200 dark:border-gray-700",
          label: "Unknown",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </div>
  );
}





