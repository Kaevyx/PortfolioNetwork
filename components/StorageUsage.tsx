"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { HardDrive, Upload, FileText, Image, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function StorageUsage() {
  const { user, isLoaded } = useUser();
  const [storageData, setStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadStorageUsage = async () => {
      try {
        const response = await fetch("/api/storage-usage");
        if (response.ok) {
          const data = await response.json();
          setStorageData(data);
        } else {
          // Silently handle non-OK responses
          setStorageData(null);
        }
      } catch (error) {
        // Silently handle network errors - API might not be available
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.debug("Error loading storage usage:", error);
        }
        setStorageData(null);
      } finally {
        setLoading(false);
      }
    };

    loadStorageUsage();
    
    // Listen for storage update events (when files are deleted/uploaded)
    const handleStorageUpdate = () => {
      loadStorageUsage();
    };
    
    window.addEventListener('storage-updated', handleStorageUpdate);
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStorageUsage, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage-updated', handleStorageUpdate);
    };
  }, [isLoaded, user?.id]);

  if (!isLoaded || !user || loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!storageData) {
    return null;
  }

  const { usedMB, limitMB, percentage, fileCount, breakdown, lastUpdated } = storageData;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "profile_picture":
        return <Image className="w-4 h-4" />;
      case "post_image":
        return <Image className="w-4 h-4" />;
      case "cv":
        return <FileText className="w-4 h-4" />;
      case "portfolio":
        return <Upload className="w-4 h-4" />;
      default:
        return <Upload className="w-4 h-4" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case "profile_picture":
        return "Profile Pictures";
      case "post_image":
        return "Post Images";
      case "cv":
        return "CVs/Resumes";
      case "portfolio":
        return "Portfolio Files";
      default:
        return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Storage Usage</h3>
        </div>
        {isNearLimit && (
          <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-4 h-4" />
            <span>{isAtLimit ? "Limit Reached" : "Near Limit"}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">
            {usedMB.toFixed(1)} MB / {limitMB} MB
          </span>
          <span className={`font-semibold ${
            isAtLimit 
              ? "text-red-600 dark:text-red-400" 
              : isNearLimit 
              ? "text-orange-600 dark:text-orange-400" 
              : "text-gray-900 dark:text-white"
          }`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              isAtLimit
                ? "bg-red-600"
                : isNearLimit
                ? "bg-orange-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* File Count and Last Updated */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
        <span>
          {fileCount} {fileCount === 1 ? "file" : "files"} stored
        </span>
        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" />
            <span>Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* Breakdown by Type */}
      {breakdown && breakdown.length > 0 && (
        <div className="space-y-2 mb-3">
          {breakdown.map((item: any) => (
            <div
              key={item.type}
              className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"
            >
              <div className="flex items-center gap-2">
                {getFileTypeIcon(item.type)}
                <span>{getFileTypeLabel(item.type)}</span>
              </div>
              <span className="font-medium">
                {item.count} files • {item.sizeMB.toFixed(1)} MB
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Warning Message */}
      {isAtLimit && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300 mb-2">
            You've reached your storage limit. Please delete some files or upgrade your plan.
          </p>
          <Link
            href="/pricing"
            className="text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
          >
            Upgrade Plan →
          </Link>
        </div>
      )}

      {isNearLimit && !isAtLimit && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-300">
            You're using {percentage}% of your storage. Consider upgrading for more space.
          </p>
        </div>
      )}

      {/* Manage Storage Link */}
      <Link
        href="/settings?tab=storage"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
      >
        Manage Storage →
      </Link>
    </div>
  );
}






