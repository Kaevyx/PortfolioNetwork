"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Star, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { showToast } from "@/lib/utils/toast";

interface ReviewSubmissionProps {
  onSuccess?: () => void;
}

export function ReviewSubmission({ onSuccess }: ReviewSubmissionProps) {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerTitle, setReviewerTitle] = useState("");
  const [reviewerCompany, setReviewerCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !isLoaded) {
      showToast("Please sign in to submit a review", "error");
      return;
    }

    if (!content.trim()) {
      showToast("Please enter your review content", "error");
      return;
    }

    try {
      setLoading(true);
      
      // Verify user is authenticated
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Ensure optional fields are null (not empty strings) for database
      const reviewData = {
        user_id: user.id,
        reviewer_name: reviewerName.trim() || null,
        reviewer_title: reviewerTitle.trim() || null,
        reviewer_company: reviewerCompany.trim() || null,
        rating: Number(rating), // Ensure it's a number
        title: title.trim() || null,
        content: content.trim(),
        status: "pending",
        is_approved: false,
        is_featured: false,
        display_order: 0
      };
      
      // Remove any undefined values (convert to null)
      Object.keys(reviewData).forEach(key => {
        if ((reviewData as any)[key] === undefined) {
          (reviewData as any)[key] = null;
        }
      });
      
      console.log("Submitting review with data:", reviewData);
      console.log("User ID:", user.id);
      
      // Try to insert directly - the table check was causing schema cache issues
      // If the table doesn't exist, the insert will fail with a clear error
      
      const { data, error } = await supabase
        .from("reviews")
        .insert(reviewData)
        .select();

      if (error) {
        // Try to extract error information in multiple ways
        const errorInfo: any = {
          rawError: error,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
        };
        
        // Try to get standard Supabase error properties
        if (error && typeof error === 'object') {
          errorInfo.message = (error as any).message;
          errorInfo.details = (error as any).details;
          errorInfo.hint = (error as any).hint;
          errorInfo.code = (error as any).code;
          
          // Try to stringify
          try {
            errorInfo.stringified = JSON.stringify(error, Object.getOwnPropertyNames(error));
          } catch (e) {
            errorInfo.stringifyError = String(e);
          }
          
          // Try to get all keys
          errorInfo.keys = Object.keys(error);
          errorInfo.entries = Object.entries(error);
        }
        
        console.error("Supabase error details:", errorInfo);
        
        // Create a more descriptive error message
        const errorMessage = 
          (error as any)?.message || 
          (error as any)?.details || 
          (error as any)?.hint || 
          (error as any)?.code ||
          String(error) ||
          "Unknown database error. Please check the console for details.";
        
        throw new Error(errorMessage);
      }

      console.log("Review submitted successfully:", data);
      showToast("Thank you! Your review has been submitted and is pending approval.", "success");
      setSubmitted(true);
      setTitle("");
      setContent("");
      setReviewerName("");
      setReviewerTitle("");
      setReviewerCompany("");
      setRating(5);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting review:", {
        error,
        errorType: typeof error,
        errorString: String(error),
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        errorCode: error?.code,
        fullError: JSON.stringify(error, null, 2)
      });
      
      const errorMessage = error?.message || error?.details || error?.hint || "Unknown error occurred";
      showToast("Failed to submit review: " + errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
        <p className="text-yellow-800 dark:text-yellow-300">Please sign in to submit a review</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
          Thank You!
        </h3>
        <p className="text-green-800 dark:text-green-300">
          Your review has been submitted and is pending admin approval.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Submit Another Review
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Share Your Experience</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              {rating} out of 5 stars
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Review Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Great platform for professionals"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Review <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            placeholder="Tell us about your experience..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Optional Reviewer Info */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Optional: Display Information
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            You can customize how your name appears on the review. If left blank, we'll use your profile information.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title (Optional)
              </label>
              <input
                type="text"
                value={reviewerTitle}
                onChange={(e) => setReviewerTitle(e.target.value)}
                placeholder="e.g., Software Engineer"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company (Optional)
              </label>
              <input
                type="text"
                value={reviewerCompany}
                onChange={(e) => setReviewerCompany(e.target.value)}
                placeholder="e.g., Tech Corp"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Review
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

