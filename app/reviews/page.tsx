"use client";

import { ReviewSubmission } from "@/components/ReviewSubmission";
import { ReviewsCarousel } from "@/components/ReviewsCarousel";
import { AverageRating } from "@/components/AverageRating";
import { Star, MessageSquare } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
            <Star className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Share Your Experience
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
            We value your feedback! Share your experience with our platform and help others discover what makes us special.
          </p>
          {/* Average Rating */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Rating:</span>
              <AverageRating size="large" showCount={true} />
            </div>
          </div>
        </div>

        {/* Review Submission Form */}
        <div className="mb-12">
          <ReviewSubmission />
        </div>

        {/* Featured Reviews */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Featured Reviews
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              See what other professionals are saying
            </p>
          </div>
          <ReviewsCarousel autoRotate={true} rotateInterval={5000} limit={10} />
        </div>

        {/* Info Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Review Guidelines
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• All reviews are moderated before being published</li>
                <li>• Be honest and constructive in your feedback</li>
                <li>• Featured reviews may be displayed on our homepage</li>
                <li>• You can customize how your name appears on the review</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

