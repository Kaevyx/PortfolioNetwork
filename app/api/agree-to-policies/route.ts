import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route for users to agree to Privacy Policy and Terms of Service
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agreeToPrivacy, agreeToTerms } = body;

    if (!agreeToPrivacy && !agreeToTerms) {
      return NextResponse.json(
        { error: "Must agree to at least one policy" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current profile to check existing agreements
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("privacy_policy_agreed_at, terms_agreed_at, privacy_policy_version, terms_version")
      .eq("clerk_id", userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    // Get latest policy versions that require reconfirmation
    let latestPrivacyVersion = null;
    let latestTermsVersion = null;

    if (agreeToPrivacy) {
      const { data: privacyVersions } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_type', 'privacy_policy')
        .eq('requires_reconfirmation', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      
      latestPrivacyVersion = privacyVersions?.version || new Date().toISOString().split('T')[0];
    }

    if (agreeToTerms) {
      const { data: termsVersions } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_type', 'terms_of_service')
        .eq('requires_reconfirmation', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      
      latestTermsVersion = termsVersions?.version || new Date().toISOString().split('T')[0];
    }

    // Prepare update data
    const updateData: any = {};
    const currentDate = new Date().toISOString();

    // Check if user needs to re-confirm or hasn't agreed
    if (agreeToPrivacy) {
      const needsUpdate = !currentProfile?.privacy_policy_agreed_at || 
                         (latestPrivacyVersion && currentProfile?.privacy_policy_version !== latestPrivacyVersion);
      
      if (needsUpdate) {
        updateData.privacy_policy_agreed_at = currentDate;
        updateData.privacy_policy_version = latestPrivacyVersion;
      }
    }

    if (agreeToTerms) {
      const needsUpdate = !currentProfile?.terms_agreed_at || 
                         (latestTermsVersion && currentProfile?.terms_version !== latestTermsVersion);
      
      if (needsUpdate) {
        updateData.terms_agreed_at = currentDate;
        updateData.terms_version = latestTermsVersion;
      }
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: "You have already agreed to the selected policies",
      });
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("clerk_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save agreement", details: updateError.message },
        { status: 500 }
      );
    }

    // Log to user account history
    try {
      await supabase.rpc("log_user_account_history", {
        p_user_id: userId,
        p_action_type: "account_modified",
        p_performed_by: null, // Self
        p_details: {
          action: "agreed_to_policies",
          privacy_policy: agreeToPrivacy,
          terms_of_service: agreeToTerms,
          timestamp: currentDate,
        },
      });
    } catch (historyError) {
      // Don't fail the request if history logging fails
      console.error("Error logging to account history:", historyError);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for agreeing to our policies",
      agreedToPrivacy: agreeToPrivacy,
      agreedToTerms: agreeToTerms,
    });
  } catch (error: any) {
    console.error("Error processing policy agreement:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

