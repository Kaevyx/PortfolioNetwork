"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: "indigo" | "green" | "yellow" | "purple" | "blue" | "red";
  subtitle?: string;
  timePeriod?: string; // e.g., "Last 7 Days", "Last 30 Days", "All Time"
  tooltip?: string; // Tooltip text to show on hover
}

export function AnalyticsCard({ title, value, change, icon, color, subtitle, timePeriod, tooltip }: AnalyticsCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colorClasses = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  };

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 card-hover relative">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon()}
              <span className={change > 0 ? "text-green-600 dark:text-green-400" : change < 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}>
                {Math.abs(change)}%
              </span>
            </div>
            {timePeriod && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                vs previous {timePeriod}
              </span>
            )}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          {tooltip && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl z-50">
                  <p className="whitespace-normal">{tooltip}</p>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

