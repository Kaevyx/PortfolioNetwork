"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";

interface AverageRatingProps {
  size?: "small" | "medium" | "large";
  showCount?: boolean;
  className?: string;
}

export function AverageRating({ size = "medium", showCount = true, className = "" }: AverageRatingProps) {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAverageRating();
  }, []);

  const loadAverageRating = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("is_approved", true)
        .eq("status", "approved");

      if (error) throw error;

      if (data && data.length > 0) {
        const total = data.reduce((sum, review) => sum + (review.rating || 0), 0);
        const average = total / data.length;
        setAverageRating(average);
        setTotalReviews(data.length);
      } else {
        setAverageRating(null);
        setTotalReviews(0);
      }
    } catch (error) {
      console.error("Error loading average rating:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`${size === "small" ? "w-3 h-3" : size === "large" ? "w-6 h-6" : "w-4 h-4"} text-gray-300 dark:text-gray-600`} />
          ))}
        </div>
      </div>
    );
  }

  if (averageRating === null || totalReviews === 0) {
    return null;
  }

  const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
  const fullStars = Math.floor(roundedRating);
  const hasHalfStar = roundedRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const starSizeClass = size === "small" ? "w-3 h-3" : size === "large" ? "w-6 h-6" : "w-4 h-4";
  const textSizeClass = size === "small" ? "text-sm" : size === "large" ? "text-2xl" : "text-lg";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${starSizeClass} fill-yellow-400 text-yellow-400`}
          />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className={`${starSizeClass} text-gray-300 dark:text-gray-600`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
              <Star className={`${starSizeClass} fill-yellow-400 text-yellow-400`} />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${starSizeClass} text-gray-300 dark:text-gray-600`}
          />
        ))}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-bold text-gray-900 dark:text-white ${textSizeClass}`}>
          {roundedRating.toFixed(1)}
        </span>
        {showCount && (
          <span className={`text-gray-600 dark:text-gray-400 ${size === "small" ? "text-xs" : size === "large" ? "text-base" : "text-sm"}`}>
            ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
          </span>
        )}
      </div>
    </div>
  );
}


