"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";

interface AvatarImageProps {
  src: string | null | undefined;
  alt: string;
  fallbackText?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showOnlineStatus?: boolean;
  userId?: string;
  eager?: boolean; // If true, use eager loading instead of lazy
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-2xl",
};

export function AvatarImage({
  src,
  alt,
  fallbackText,
  className = "",
  size = "md",
  showOnlineStatus = false,
  userId,
  eager = false,
}: AvatarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize src - handle empty strings, null, undefined, and non-string values
  const normalizedSrc = src && typeof src === 'string' && src.trim() ? src.trim() : null;

  // Reset error state when src changes
  useEffect(() => {
    if (normalizedSrc) {
      setImageError(false);
      setIsLoading(true);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  }, [normalizedSrc]);

  // If no src or image error, show fallback
  if (!normalizedSrc || imageError) {
    const initials = fallbackText || alt?.charAt(0).toUpperCase() || "U";
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold ${className}`}>
        {initials}
      </div>
    );
  }

  // Verify avatar exists when image fails to load
  const handleImageError = async () => {
    console.log("AvatarImage: Image failed to load", { src: normalizedSrc, userId });
    setImageError(true);
    setIsLoading(false);
    
    // If image fails to load, verify with backend and clean up if needed
    if (normalizedSrc && userId) {
      try {
        const response = await fetch("/api/verify-avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, avatarUrl: normalizedSrc }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.cleaned) {
            // Avatar was cleaned up, trigger a page refresh or state update
            // The component will re-render with the updated src (null)
            console.log("Avatar cleaned up:", result.message);
            // Force a re-render by clearing the src
            window.location.reload();
          }
        }
      } catch (error) {
        console.error("Error verifying avatar:", error);
      }
    }
  };

  return (
    <div className="relative">
      <img
        src={normalizedSrc}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover ${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity`}
        onError={handleImageError}
        onLoad={() => {
          setIsLoading(false);
          setImageError(false);
        }}
        loading={eager ? "eager" : "lazy"}
      />
      {isLoading && (
        <div className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center absolute inset-0 z-10`}>
          <User className={`${size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : size === "lg" ? "w-8 h-8" : "w-12 h-12"} text-gray-400 animate-pulse`} />
        </div>
      )}
    </div>
  );
}

