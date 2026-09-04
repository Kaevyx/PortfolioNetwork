import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin, Globe, Star, UserPlus, UserMinus, Mail } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/FollowButton";
import { ReviewForm } from "@/components/ReviewForm";
import { CreatePost } from "@/components/CreatePost";
import { PostsFeed } from "@/components/PostsFeed";
import { MutualConnections } from "@/components/MutualConnections";
import { PremiumBadge } from "@/components/PremiumBadge";
import { SocialMediaConnections } from "@/components/SocialMediaConnections";
import { UserLinks } from "@/components/UserLinks";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ReviewsList } from "@/components/ReviewsList";
import { OnlineStatus } from "@/components/OnlineStatus";
import { AvatarImage } from "@/components/AvatarImage";
import { PortfolioSeenButton } from "@/components/PortfolioSeenButton";
import { EmploymentStatusBadge } from "@/components/EmploymentStatusBadge";
import { PortfolioSummarySection } from "@/components/PortfolioSummarySection";
import { ProfileStatusBadge } from "@/components/ProfileStatusBadge";
import { BlockUserButton } from "@/components/BlockUserButton";
import { ReportButton } from "@/components/ReportButton";
import { MessageButton } from "@/components/MessageButton";
import { SuspendedUserRedirect } from "./suspended-check";
import { UserImagesSection } from "@/components/UserImagesSection";
import { formatLocationByPrivacy, shouldShowLocation } from "@/lib/utils/locationPrivacy";
import { SkillEndorsements } from "@/components/SkillEndorsements";
import { ProfileViewCounter } from "@/components/ProfileViewCounter";
import { ProfileViewTracker } from "@/components/ProfileViewTracker";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import { ShareProfileButton } from "@/components/ShareProfileButton";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { userId: currentUserId } = await auth();
  const supabase = await createClient();

  // Get profile by username or clerk_id - only show if approved (or if viewing own profile)
  // Try RPC function first (handles both username and clerk_id)
  const { data: profileData } = await supabase.rpc('get_profile_by_identifier', {
    p_identifier: userId
  });
  
  let profile = null;
  if (profileData && profileData.length > 0) {
    // Get full profile data using the clerk_id from the result
    const { data: fullProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_id", profileData[0].clerk_id)
      .single();
    profile = fullProfile;
  }
  
  // Fallback to direct clerk_id lookup for backward compatibility
  if (!profile) {
    const { data: fallbackProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("clerk_id", userId)
      .single();
    profile = fallbackProfile;
  }

  if (!profile) {
    notFound();
  }

  // If not own profile and (not approved or suspended), show not found
  if (currentUserId !== profile.clerk_id && (profile.profile_status !== "approved" || profile.is_suspended)) {
    notFound();
  }

  // Check if current user is following this profile
  let isFollowing = false;
  if (currentUserId && currentUserId !== profile.clerk_id) {
    const { data: follow } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", profile.clerk_id)
      .single();
    isFollowing = !!follow;
  }

  // Get followers and following counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.clerk_id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.clerk_id);

  // Get connections count (mutual follows)
  const { data: followingProfile } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", profile.clerk_id);

  const { data: profileFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", profile.clerk_id);

  const followingProfileIds = new Set(followingProfile?.map((f: any) => f.follower_id) || []);
  const profileFollowingIds = new Set(profileFollowing?.map((f: any) => f.following_id) || []);
  
  // Connections = mutual follows
  const connectionIds = Array.from(followingProfileIds).filter((id: string) => profileFollowingIds.has(id));
  const connectionsCount = connectionIds.length;

  // Check if current user is connected with this profile
  let isConnected = false;
  if (currentUserId && currentUserId !== profile.clerk_id) {
    isConnected = followingProfileIds.has(currentUserId) && profileFollowingIds.has(currentUserId);
  }

  // Get reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, profiles!reviews_reviewer_id_fkey(*)")
    .eq("reviewee_id", profile.clerk_id)
    .order("created_at", { ascending: false });

  // Calculate average rating
  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
      : 0;

  // Get portfolio items
  const { data: portfolioItems } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("profile_id", profile.clerk_id)
    .order("created_at", { ascending: false });

  // Check if user has any portfolio-related data (items, skills, education, experience, certifications)
  let hasAnyPortfolioData = portfolioItems && portfolioItems.length > 0;
  
  if (!hasAnyPortfolioData) {
    // Check for skills, education, experience, or certifications
    const [skillsResult, eduResult, expResult, certResult] = await Promise.all([
      supabase.from("portfolio_skills").select("id").eq("profile_id", profile.clerk_id).limit(1),
      supabase.from("portfolio_education").select("id").eq("profile_id", profile.clerk_id).limit(1),
      supabase.from("portfolio_experience").select("id").eq("profile_id", profile.clerk_id).limit(1),
      supabase.from("portfolio_certifications").select("id").eq("profile_id", profile.clerk_id).limit(1),
    ]);
    
    // Check if any primary tables have data
    if (skillsResult.data && skillsResult.data.length > 0) hasAnyPortfolioData = true;
    if (eduResult.data && eduResult.data.length > 0) hasAnyPortfolioData = true;
    if (expResult.data && expResult.data.length > 0) hasAnyPortfolioData = true;
    if (certResult.data && certResult.data.length > 0) hasAnyPortfolioData = true;
    
    // Fallback to alternative table names if primary ones don't exist or have no data
    if (!hasAnyPortfolioData) {
      const [profileSkills, eduEntries, workExp, certs] = await Promise.all([
        supabase.from("profile_skills").select("id").eq("profile_id", profile.clerk_id).limit(1),
        supabase.from("education_entries").select("id").eq("profile_id", profile.clerk_id).limit(1),
        supabase.from("work_experience").select("id").eq("profile_id", profile.clerk_id).limit(1),
        supabase.from("certifications").select("id").eq("profile_id", profile.clerk_id).limit(1),
      ]);
      
      if (profileSkills.data && profileSkills.data.length > 0) hasAnyPortfolioData = true;
      if (eduEntries.data && eduEntries.data.length > 0) hasAnyPortfolioData = true;
      if (workExp.data && workExp.data.length > 0) hasAnyPortfolioData = true;
      if (certs.data && certs.data.length > 0) hasAnyPortfolioData = true;
    }
  }

  const isOwnProfile = currentUserId === profile.clerk_id;
  
  // Get profile identifier for URLs (prefer username)
  const profileIdentifier = profile.username || profile.clerk_id;

  // Get profile settings
  const profileSettings = profile.settings?.profile || {};
  const privacySettings = profile.settings?.privacy || {};
  
  // Check profile visibility
  const profileVisibility = privacySettings.profileVisibility || "public";
  const canViewProfile = isOwnProfile || 
    profileVisibility === "public" || 
    (profileVisibility === "followers" && isFollowing);

  // Check if portfolio should be shown (default to true if not set)
  const showPortfolio = profileSettings.showPortfolio !== false;

  if (!canViewProfile && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile is Private</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {profileVisibility === "followers" 
                ? "This profile is only visible to followers. Follow them to view their profile."
                : "This profile is private and not accessible."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isOwnProfile && <SuspendedUserRedirect />}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Profile View Counter - Only show for profile owner */}
        {isOwnProfile && (
          <div className="mb-4">
            <ProfileViewCounter profileUserId={profile.clerk_id} />
          </div>
        )}
        {/* Track view when someone visits this profile */}
        {!isOwnProfile && currentUserId && (
          <ProfileViewTracker profileUserId={profile.clerk_id} />
        )}
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fallbackText={profile.display_name?.charAt(0).toUpperCase() || "U"}
                  className="border-2 border-indigo-500"
                  size="lg"
                  userId={profile.clerk_id}
                />
                {!isOwnProfile && (
                  <div className="absolute -bottom-1 -right-1">
                    <OnlineStatus userId={profile.clerk_id} size="md" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.display_name}
                      </h1>
                      {profile.is_verified && (
                        <VerificationBadge size="md" className="ml-1" />
                      )}
                      {profile.is_premium && profileSettings.showPlanBadge !== false && (
                        <PremiumBadge plan={profile.subscription_plan === "ultimate" ? "ultimate" : "pro"} size="sm" />
                      )}
                    </div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profile.profile_type === "individual" ? "Individual Professional" : "Business"}
                  </p>
                  {profile.employment_status && 
                   profile.employment_status !== "not_specified" && 
                   (isOwnProfile || profileSettings.showEmploymentStatus !== false) && (
                    <EmploymentStatusBadge status={profile.employment_status} size="md" />
                  )}
                  {isOwnProfile && profile.profile_status && (
                    <ProfileStatusBadge status={profile.profile_status} />
                  )}
                </div>
                {profile.bio && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 max-w-2xl line-clamp-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            {!isOwnProfile && currentUserId && (
              <div className="flex items-center gap-2">
                {profileSettings.allowMessages !== false && (
                  <MessageButton userId={profile.clerk_id} />
                )}
                <FollowButton
                  followerId={currentUserId}
                  followingId={profile.clerk_id}
                  isFollowing={isFollowing}
                  showConnectionStatus={true}
                />
                <ShareProfileButton
                  profile={{
                    username: profile.username,
                    clerk_id: profile.clerk_id,
                    display_name: profile.display_name
                  }}
                  variant="icon"
                />
                <BlockUserButton
                  targetUserId={profile.clerk_id}
                  targetUserName={profile.display_name}
                />
                <ReportButton
                  reportType="profile"
                  reportedId={profile.clerk_id}
                  reportedName={profile.display_name}
                  variant="icon"
                />
              </div>
            )}
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Edit Profile
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {isConnected && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg">
                <UserPlus className="w-4 h-4" />
                <span className="text-xs font-semibold">Connected</span>
              </div>
            )}
            <Link
              href={currentUserId === userId ? `/connections` : `#`}
              className={`flex items-center gap-1.5 text-sm transition-colors cursor-pointer ${
                connectionsCount > 0
                  ? "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span className="font-bold text-base">{connectionsCount || 0}</span>
              <span className="text-xs">Connections</span>
            </Link>
            <Link
              href={`/profile/${profileIdentifier}/followers`}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="font-semibold">{followersCount || 0}</span>
              <span className="text-xs">Followers</span>
            </Link>
            <Link
              href={`/profile/${profileIdentifier}/following`}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="font-semibold">{followingCount || 0}</span>
              <span className="text-xs">Following</span>
            </Link>
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-gray-900 dark:text-white">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({reviews?.length || 0})</span>
              </div>
            )}
            {shouldShowLocation(profile.location_privacy) && profileSettings.showLocation !== false && (() => {
              const formattedLocation = formatLocationByPrivacy(
                profile.city,
                profile.state_region,
                profile.country,
                profile.location_privacy
              );
              return formattedLocation ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{formattedLocation}</span>
                </div>
              ) : null;
            })()}
            {profile.website && profileSettings.showWebsite !== false && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Globe className="w-4 h-4" />
                <span>Website</span>
              </a>
            )}
            {profile.email && (isOwnProfile || profileSettings.showEmail !== false) && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <a
                  href={`mailto:${profile.email}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                >
                  {profile.email}
                </a>
              </div>
            )}
          </div>

          {/* Skills or Services */}
          {profile.profile_type === "individual" && profile.skills && profile.skills.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {/* Skill Endorsements */}
              <SkillEndorsements
                userId={userId}
                isOwnProfile={isOwnProfile}
              />
            </div>
          )}

          {profile.profile_type === "business" && profile.services && profile.services.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Services</h3>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((service: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CV Link for Individuals */}
          {profile.profile_type === "individual" && profile.cv_url && (
            <div className="mt-6">
              <a
                href={profile.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                View CV/Resume
              </a>
            </div>
          )}
        </div>

        {/* Portfolio Summary */}
        {(showPortfolio || isOwnProfile) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portfolio Summary</h2>
              <div className="flex items-center gap-3">
                {!isOwnProfile && currentUserId && (
                  <PortfolioSeenButton portfolioOwnerId={userId} />
                )}
                {currentUserId === userId && (
                  <Link
                    href="/portfolio"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Manage →
                  </Link>
                )}
                {!isOwnProfile && (
                  <Link
                    href={`/profile/${profileIdentifier}/portfolio`}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    View Full Portfolio →
                  </Link>
                )}
              </div>
            </div>
            <PortfolioSummarySection 
              profileId={userId}
              isOwnProfile={isOwnProfile}
            />
          </div>
        )}

        {/* User Links */}
        <div className="mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <UserLinks profileId={userId} isOwnProfile={isOwnProfile} />
          </div>
        </div>

        {/* Social Media Connections */}
        <div className="mb-4">
          <SocialMediaConnections profileId={userId} />
        </div>

        {/* Mutual Connections - Only show if not own profile and current user is logged in */}
        {!isOwnProfile && currentUserId && (
          <div className="mb-4">
            <MutualConnections userId={currentUserId} profileUserId={userId} />
          </div>
        )}

        {/* Images Section */}
        <UserImagesSection userId={userId} isOwnProfile={isOwnProfile} />

        {/* Posts/Updates Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {isOwnProfile ? "Your Posts" : "Posts & Updates"}
          </h2>
          <PostsFeed profileId={userId} showCreatePost={isOwnProfile} />
        </div>

        {/* Reviews Section - Only show if reviews are allowed */}
        {profileSettings.allowReviews !== false && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reviews</h2>
              {!isOwnProfile && currentUserId && (
                <ReviewForm revieweeId={userId} reviewerId={currentUserId} />
              )}
            </div>
            <ReviewsList reviews={reviews || []} />
          </div>
        )}
      </div>
    </div>
    </>
  );
}

