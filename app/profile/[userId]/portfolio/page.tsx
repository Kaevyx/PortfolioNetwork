import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Briefcase, GraduationCap, Award, Code, FileText } from "lucide-react";
import { PortfolioOverview } from "@/components/PortfolioOverview";
import { PortfolioSeenButton } from "@/components/PortfolioSeenButton";

export default async function UserPortfolioPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { userId: currentUserId } = await auth();
  const supabase = await createClient();

  // Track portfolio view (if user is logged in and not viewing own portfolio)
  if (currentUserId && currentUserId !== userId) {
    try {
      // Check if view already exists
      const { data: existingView } = await supabase
        .from("portfolio_views")
        .select("id")
        .eq("portfolio_owner_id", userId)
        .eq("viewer_id", currentUserId)
        .single();

      if (!existingView) {
        // Create new view record
        await supabase
          .from("portfolio_views")
          .insert({
            portfolio_owner_id: userId,
            viewer_id: currentUserId,
            marked_seen: false,
          });
      }
    } catch (error) {
      // Ignore errors (table might not exist yet)
    }
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!profile) {
    notFound();
  }

  const isOwnProfile = currentUserId === userId;
  const profileSettings = profile.settings?.profile || {};
  const privacySettings = profile.settings?.privacy || {};

  // Check if portfolio should be visible
  const showPortfolio = profileSettings.showPortfolio !== false || isOwnProfile;
  
  if (!showPortfolio && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Portfolio Not Available</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This user has chosen to keep their portfolio private.
            </p>
            <Link
              href={`/profile/${userId}`}
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Load portfolio data
  const { data: portfolioItems } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  // Load skills (try portfolio_skills first, fallback to profile_skills)
  let skillsData: any[] = [];
  const { data: portfolioSkills, error: portfolioSkillsError } = await supabase
    .from("portfolio_skills")
    .select("*")
    .eq("profile_id", userId)
    .order("display_order", { ascending: true });
  
  if (!portfolioSkillsError && portfolioSkills) {
    skillsData = portfolioSkills;
  } else {
    const { data: profileSkills } = await supabase
      .from("profile_skills")
      .select("*")
      .eq("profile_id", userId)
      .order("display_order", { ascending: true });
    skillsData = profileSkills || [];
  }

  // Load education (try portfolio_education first, fallback to education_entries)
  let educationData: any[] = [];
  const { data: portfolioEdu, error: portfolioEduError } = await supabase
    .from("portfolio_education")
    .select("*")
    .eq("profile_id", userId)
    .order("start_date", { ascending: false });
  
  if (!portfolioEduError && portfolioEdu) {
    educationData = portfolioEdu;
  } else {
    const { data: eduEntries } = await supabase
      .from("education_entries")
      .select("*")
      .eq("profile_id", userId)
      .order("start_date", { ascending: false });
    educationData = eduEntries || [];
  }

  // Load experience (try portfolio_experience first, fallback to work_experience)
  let experienceData: any[] = [];
  const { data: portfolioExp, error: portfolioExpError } = await supabase
    .from("portfolio_experience")
    .select("*")
    .eq("profile_id", userId)
    .order("start_date", { ascending: false });
  
  if (!portfolioExpError && portfolioExp) {
    experienceData = portfolioExp;
  } else {
    const { data: workExp } = await supabase
      .from("work_experience")
      .select("*")
      .eq("profile_id", userId)
      .order("start_date", { ascending: false });
    experienceData = workExp || [];
  }

  // Load certifications (try portfolio_certifications first, fallback to certifications)
  let certificationsData: any[] = [];
  const { data: portfolioCert, error: portfolioCertError } = await supabase
    .from("portfolio_certifications")
    .select("*")
    .eq("profile_id", userId)
    .order("issue_date", { ascending: false });
  
  if (!portfolioCertError && portfolioCert) {
    certificationsData = portfolioCert;
  } else {
    const { data: certs } = await supabase
      .from("certifications")
      .select("*")
      .eq("profile_id", userId)
      .order("issue_date", { ascending: false });
    certificationsData = certs || [];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/profile/${userId}`}
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">
                {profile.display_name}'s Portfolio
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Professional work, skills, and achievements
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isOwnProfile && (
                <PortfolioSeenButton portfolioOwnerId={userId} />
              )}
              {isOwnProfile && (
                <Link
                  href="/portfolio"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  Manage Portfolio
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Overview */}
        <PortfolioOverview
          profile={profile}
          skills={skillsData}
          education={educationData}
          experience={experienceData}
          certifications={certificationsData}
          projects={portfolioItems || []}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </div>
  );
}

