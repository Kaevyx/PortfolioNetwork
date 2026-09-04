"use client";

import { useState, useEffect } from "react";
import { createClient, SupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import {
  Star,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  Calendar,
  User,
  Building,
  Briefcase,
  Loader2,
  AlertCircle,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { AvatarImage } from "@/components/AvatarImage";

interface Review {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name: string;
  reviewer_name: string | null;
  reviewer_title: string | null;
  reviewer_company: string | null;
  reviewer_avatar_url: string | null;
  rating: number;
  title: string | null;
  content: string;
  is_featured: boolean;
  is_approved: boolean;
  is_verified: boolean;
  display_order: number;
  status: "pending" | "approved" | "rejected" | "hidden";
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile_avatar_url: string | null;
  profile_is_verified: boolean;
}

interface AdminReviewsProps {
  supabase: SupabaseClientType;
  currentUserId: string;
}

export function AdminReviews({ supabase, currentUserId }: AdminReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Review>>({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    averageRating: 0
  });

  useEffect(() => {
    loadReviews();
  }, [statusFilter, featuredFilter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_admin_reviews", {
        p_status: statusFilter !== "all" ? statusFilter : null,
        p_is_featured: featuredFilter !== "all" ? featuredFilter === "featured" : null,
        p_limit: 1000,
        p_offset: 0
      });

      if (error) throw error;
      setReviews(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const total = reviewsData.length;
    const pending = reviewsData.filter(r => r.status === "pending").length;
    const approved = reviewsData.filter(r => r.status === "approved").length;
    const rejected = reviewsData.filter(r => r.status === "rejected").length;
    const featured = reviewsData.filter(r => r.is_featured).length;
    const averageRating = total > 0
      ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

    setStats({ total, pending, approved, rejected, featured, averageRating });
  };

  const handleStatusChange = async (reviewId: string, newStatus: string, isApproved: boolean) => {
    try {
      const updateData: any = {
        status: newStatus,
        is_approved: isApproved,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("reviews")
        .update(updateData)
        .eq("id", reviewId);

      if (error) throw error;
      await loadReviews();
    } catch (error: any) {
      console.error("Error updating review status:", error);
      alert("Failed to update review status: " + error.message);
    }
  };

  const handleToggleFeatured = async (reviewId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_featured: !isFeatured })
        .eq("id", reviewId);

      if (error) throw error;
      await loadReviews();
    } catch (error: any) {
      console.error("Error toggling featured:", error);
      alert("Failed to update featured status: " + error.message);
    }
  };

  const handleUpdateDisplayOrder = async (reviewId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ display_order: newOrder })
        .eq("id", reviewId);

      if (error) throw error;
      await loadReviews();
    } catch (error: any) {
      console.error("Error updating display order:", error);
      alert("Failed to update display order: " + error.message);
    }
  };

  const handleEdit = (review: Review) => {
    setSelectedReview(review);
    setEditFormData({
      reviewer_name: review.reviewer_name,
      reviewer_title: review.reviewer_title,
      reviewer_company: review.reviewer_company,
      reviewer_avatar_url: review.reviewer_avatar_url,
      rating: review.rating,
      title: review.title,
      content: review.content,
      display_order: review.display_order,
      admin_notes: review.admin_notes
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedReview) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .update(editFormData)
        .eq("id", selectedReview.id);

      if (error) throw error;
      setIsEditModalOpen(false);
      setSelectedReview(null);
      await loadReviews();
    } catch (error: any) {
      console.error("Error updating review:", error);
      alert("Failed to update review: " + error.message);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;
      await loadReviews();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      alert("Failed to delete review: " + error.message);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = searchQuery === "" ||
      review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.reviewer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</span>;
      case "hidden":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Hidden</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews & Feedback</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage user reviews and feedback for homepage display
          </p>
        </div>
        <button
          onClick={loadReviews}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Featured</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.featured}</p>
            </div>
            <Star className="w-8 h-8 text-purple-600 dark:text-purple-400 fill-purple-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageRating.toFixed(1)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden</option>
          </select>
          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Reviews</option>
            <option value="featured">Featured Only</option>
            <option value="not-featured">Not Featured</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No reviews found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reviewer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Featured</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <AvatarImage
                          src={review.reviewer_avatar_url || review.profile_avatar_url}
                          alt={review.reviewer_name || review.user_display_name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {review.reviewer_name || review.user_display_name}
                            </p>
                            {review.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          {review.reviewer_title && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{review.reviewer_title}</p>
                          )}
                          {review.reviewer_company && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{review.reviewer_company}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStars(review.rating)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        {review.title && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{review.title}</p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{review.content}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFeatured(review.id, review.is_featured)}
                        className={`p-2 rounded-lg transition-colors ${
                          review.is_featured
                            ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                        }`}
                      >
                        {review.is_featured ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateDisplayOrder(review.id, review.display_order - 1)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                          {review.display_order}
                        </span>
                        <button
                          onClick={() => handleUpdateDisplayOrder(review.id, review.display_order + 1)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {review.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(review.id, "approved", true)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(review.id, "rejected", false)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(review)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Review</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  value={editFormData.reviewer_name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, reviewer_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reviewer Title
                </label>
                <input
                  type="text"
                  value={editFormData.reviewer_title || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, reviewer_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={editFormData.reviewer_company || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, reviewer_company: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rating (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editFormData.rating || 5}
                  onChange={(e) => setEditFormData({ ...editFormData, rating: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editFormData.title || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={editFormData.content || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={editFormData.display_order || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, display_order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={editFormData.admin_notes || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, admin_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Internal notes (not visible to users)"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

