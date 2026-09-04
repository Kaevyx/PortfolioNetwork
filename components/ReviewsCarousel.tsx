"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star, ChevronLeft, ChevronRight, Quote, CheckCircle2, Clock, Shield } from "lucide-react";
import { AvatarImage } from "@/components/AvatarImage";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_title: string | null;
  reviewer_company: string | null;
  reviewer_avatar_url: string | null;
  rating: number;
  title: string | null;
  content: string;
  is_verified: boolean;
  profile_avatar_url: string | null;
  profile_is_verified: boolean;
  created_at: string;
}

interface ReviewsCarouselProps {
  autoRotate?: boolean;
  rotateInterval?: number; // in milliseconds
  limit?: number;
}

export function ReviewsCarousel({ 
  autoRotate = true, 
  rotateInterval = 5000,
  limit = 10 
}: ReviewsCarouselProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    if (autoRotate && reviews.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
      }, rotateInterval);
      return () => clearInterval(interval);
    }
  }, [autoRotate, reviews.length, rotateInterval]);

  const loadReviews = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_featured_reviews", {
        p_limit: limit
      });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null; // Don't show anything if no reviews
  }

  const currentReview = reviews[currentIndex];
  const displayName = currentReview.reviewer_name;
  const displayAvatar = currentReview.reviewer_avatar_url || currentReview.profile_avatar_url;
  const isVerified = currentReview.is_verified || currentReview.profile_is_verified;

  return (
    <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-8 md:p-12">
      {/* Quote Icon */}
      <div className="absolute top-4 left-4 text-indigo-200 dark:text-indigo-800 z-0">
        <Quote className="w-12 h-12" />
      </div>

      {/* Review Content */}
      <div className="relative z-10 pl-16 md:pl-20">
        {/* Rating and Meta Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= currentReview.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            {isVerified && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Verified Review</span>
              </div>
            )}
            {currentReview.created_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDistanceToNow(new Date(currentReview.created_at), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        {currentReview.title && (
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {currentReview.title}
          </h3>
        )}

        {/* Content */}
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          "{currentReview.content}"
        </p>

        {/* Reviewer Info */}
        <div className="flex items-center gap-4">
          <AvatarImage
            src={displayAvatar}
            alt={displayName}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
              {isVerified && (
                <span title="Verified user">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </span>
              )}
            </div>
            {(currentReview.reviewer_title || currentReview.reviewer_company) && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {[currentReview.reviewer_title, currentReview.reviewer_company]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      {reviews.length > 1 && (
        <>
          {/* Previous/Next Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-20"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-20"
            aria-label="Next review"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-indigo-600 w-8"
                    : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

