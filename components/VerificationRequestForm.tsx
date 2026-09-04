"use client";

import { useState } from "react";
import { CheckCircle2, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

interface VerificationRequestFormProps {
  onSuccess?: () => void;
}

export function VerificationRequestForm({ onSuccess }: VerificationRequestFormProps) {
  const { user } = useUser();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    documents: [] as string[],
  });
  const [documentLink, setDocumentLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      // Check if user already has a pending request
      const { data: existingRequest } = await supabase
        .from("verification_requests")
        .select("id, status")
        .eq("profile_id", user.id)
        .eq("status", "pending")
        .single();

      if (existingRequest) {
        alert("You already have a pending verification request. Please wait for it to be reviewed.");
        setLoading(false);
        return;
      }

      // Submit verification request
      const { error } = await supabase
        .from("verification_requests")
        .insert({
          profile_id: user.id,
          reason: formData.reason,
          documents: formData.documents.length > 0 ? formData.documents : null,
          status: "pending",
        });

      if (error) throw error;

      // Update profile verification status
      await supabase
        .from("profiles")
        .update({
          verification_status: "pending",
          verification_requested_at: new Date().toISOString(),
          verification_reason: formData.reason,
        })
        .eq("clerk_id", user.id);

      setSubmitted(true);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting verification request:", error);
      alert("Failed to submit verification request: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = () => {
    if (documentLink.trim() && !formData.documents.includes(documentLink.trim())) {
      setFormData({
        ...formData,
        documents: [...formData.documents, documentLink.trim()],
      });
      setDocumentLink("");
    }
  };

  const handleRemoveDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
  };

  if (submitted) {
    return (
      <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
              Verification Request Submitted
            </h3>
            <p className="text-sm text-green-800 dark:text-green-400 mb-2">
              Your verification request has been submitted successfully. Our team will review it and get back to you soon.
            </p>
            <p className="text-xs text-green-700 dark:text-green-500">
              You'll receive a notification once your request has been reviewed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reason for Verification <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          placeholder="Explain why you should be verified (e.g., Public figure, Brand, Organization, Notable professional, etc.)"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formData.reason.length}/1000 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Verification Documents (Optional)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Provide links to documents that verify your identity or status (e.g., official website, LinkedIn, news articles, etc.)
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={documentLink}
            onChange={(e) => setDocumentLink(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddDocument();
              }
            }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            placeholder="https://example.com/verification-document"
          />
          <button
            type="button"
            onClick={handleAddDocument}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Add
          </button>
        </div>
        {formData.documents.length > 0 && (
          <div className="space-y-2">
            {formData.documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600"
              >
                <a
                  href={doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 flex-1 min-w-0"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{doc}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(index)}
                  className="ml-2 text-red-600 hover:text-red-700 p-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Verification Process</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Verification requests are reviewed by our team</li>
              <li>Review typically takes 3-5 business days</li>
              <li>You'll be notified once your request is reviewed</li>
              <li>Verified accounts receive a blue checkmark badge</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !formData.reason.trim()}
        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Submit Verification Request
          </>
        )}
      </button>
    </form>
  );
}






