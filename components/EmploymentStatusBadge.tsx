"use client";

import { Briefcase, Search, Building2, User, GraduationCap, Coffee, Home } from "lucide-react";

interface EmploymentStatusBadgeProps {
  status: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  looking_for_job: {
    label: "Looking for Job",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    icon: Search,
  },
  employed: {
    label: "Employed",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    icon: Briefcase,
  },
  business_owner: {
    label: "Business Owner",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
    icon: Building2,
  },
  freelancer: {
    label: "Freelancer",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
    icon: User,
  },
  student: {
    label: "Student",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700",
    icon: GraduationCap,
  },
  unemployed: {
    label: "Unemployed",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
    icon: Coffee,
  },
  retired: {
    label: "Retired",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
    icon: Home,
  },
  not_specified: {
    label: "Not Specified",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
    icon: User,
  },
};

export function EmploymentStatusBadge({ status, size = "md", showIcon = true }: EmploymentStatusBadgeProps) {
  if (!status || status === "not_specified") {
    return null;
  }

  const config = statusConfig[status] || statusConfig.not_specified;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={`inline-flex items-center ${sizeClasses[size]} ${config.bgColor} ${config.color} border rounded-full font-semibold transition-all hover:scale-105`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </div>
  );
}






