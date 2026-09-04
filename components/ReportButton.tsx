"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";

interface ReportButtonProps {
  reportType: "profile" | "post" | "comment" | "file";
  reportedId: string;
  reportedName?: string;
  variant?: "button" | "icon" | "link";
  className?: string;
}

export function ReportButton({
  reportType,
  reportedId,
  reportedName,
  variant = "icon",
  className = "",
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if reportedId is missing
  if (!reportedId) {
    console.warn(`ReportButton: reportedId is missing for reportType: ${reportType}`);
    return null;
  }

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${className}`}
          title={`Report ${reportType}`}
        >
          <Flag className="w-4 h-4" />
        </button>
        <ReportModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          reportType={reportType}
          reportedId={reportedId}
          reportedName={reportedName}
          onReportSubmitted={() => {
            // Could show a toast notification here
          }}
        />
      </>
    );
  }

  if (variant === "link") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`text-sm text-red-600 dark:text-red-400 hover:underline ${className}`}
        >
          Report
        </button>
        <ReportModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          reportType={reportType}
          reportedId={reportedId}
          reportedName={reportedName}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 ${className}`}
      >
        <Flag className="w-4 h-4" />
        Report
      </button>
      <ReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        reportType={reportType}
        reportedId={reportedId}
        reportedName={reportedName}
      />
    </>
  );
}





