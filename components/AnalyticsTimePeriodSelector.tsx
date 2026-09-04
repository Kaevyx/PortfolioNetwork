"use client";

import { useState } from "react";
import { AnalyticsPageContent } from "./AnalyticsPageContent";

type TimePeriod = "24h" | "7d" | "30d" | "all";

export function AnalyticsTimePeriodSelector() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("7d");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your profile performance and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold cursor-pointer"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
      <AnalyticsPageContent timePeriod={timePeriod} />
    </div>
  );
}






