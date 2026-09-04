"use client";

import { Star } from "lucide-react";
import { DeleteReviewButton } from "./DeleteReviewButton";

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  profiles?: {
    display_name: string;
  };
}

interface ReviewsListProps {
  reviews: Review[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  const handleReviewDeleted = () => {
    window.location.reload();
  };

  if (reviews.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                {review.profiles?.display_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {review.profiles?.display_name || "Anonymous"}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <DeleteReviewButton
              reviewId={review.id}
              reviewerId={review.reviewer_id}
              onDeleted={handleReviewDeleted}
            />
          </div>
          {review.comment && (
            <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}






