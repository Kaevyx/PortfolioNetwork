"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, X, FileText, Shield, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function PrivacyTermsBanner() {
  const { user, isLoaded } = useUser();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agreeing, setAgreeing] = useState(false);
  const [needsPrivacyReconfirmation, setNeedsPrivacyReconfirmation] = useState(false);
  const [needsTermsReconfirmation, setNeedsTermsReconfirmation] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const checkAgreement = async () => {
      try {
        // Check if user needs to re-confirm policies
        const { data: reconfirmationData, error: reconfirmationError } = await supabase.rpc(
          'needs_policy_reconfirmation',
          { user_clerk_id: user.id }
        );

        if (reconfirmationError) {
          // Fallback to basic check if function doesn't exist yet
          const { data, error } = await supabase
            .from("profiles")
            .select("privacy_policy_agreed_at, terms_agreed_at")
            .eq("clerk_id", user.id)
            .single();

          if (error) throw error;

          // Show banner if user hasn't agreed to either policy
          if (!data?.privacy_policy_agreed_at || !data?.terms_agreed_at) {
            setShowBanner(true);
          }
        } else if (reconfirmationData && reconfirmationData.length > 0) {
          const needs = reconfirmationData[0];
          setNeedsPrivacyReconfirmation(needs.needs_privacy_reconfirmation || false);
          setNeedsTermsReconfirmation(needs.needs_terms_reconfirmation || false);
          
          // Show banner if user needs to re-confirm or hasn't agreed
          if (needs.needs_privacy_reconfirmation || needs.needs_terms_reconfirmation || 
              !needs.user_privacy_version || !needs.user_terms_version) {
            setShowBanner(true);
          }
        }
      } catch (error) {
        console.error("Error checking agreement status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAgreement();
  }, [isLoaded, user?.id, supabase]);

  const handleAgree = async () => {
    if (!user?.id) return;

    setAgreeing(true);
    try {
      const response = await fetch("/api/agree-to-policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agreeToPrivacy: true,
          agreeToTerms: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save agreement");
      }

      // Hide banner after successful agreement
      setShowBanner(false);
    } catch (error: any) {
      console.error("Error agreeing to policies:", error);
      alert("Failed to save your agreement. Please try again.");
    } finally {
      setAgreeing(false);
    }
  };

  if (loading || !showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-6 relative">
      <button
        onClick={() => setShowBanner(false)}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="bg-white/20 rounded-full p-3">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {needsPrivacyReconfirmation || needsTermsReconfirmation 
              ? "Policy Update: Re-confirmation Required" 
              : "Action Required: Privacy Policy & Terms Agreement"}
          </h3>
          <p className="text-white/90 mb-4 leading-relaxed">
            {needsPrivacyReconfirmation || needsTermsReconfirmation ? (
              <>
                We've updated our{" "}
                {needsPrivacyReconfirmation && (
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="underline font-semibold hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                )}
                {needsPrivacyReconfirmation && needsTermsReconfirmation && " and "}
                {needsTermsReconfirmation && (
                  <Link
                    href="/terms"
                    target="_blank"
                    className="underline font-semibold hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                )}
                . Please review the changes and confirm your agreement to continue using Portfolio Network.
              </>
            ) : (
              <>
                To continue using Portfolio Network, please review and agree to our{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="underline font-semibold hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="underline font-semibold hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                . These documents outline how we protect your data and the rules for using our platform.
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleAgree}
              disabled={agreeing}
              className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {agreeing ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  I Agree to Privacy Policy & Terms
                </>
              )}
            </button>
            <Link
              href="/privacy"
              target="_blank"
              className="text-white/90 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              Read Privacy Policy
            </Link>
            <Link
              href="/terms"
              target="_blank"
              className="text-white/90 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              Read Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

