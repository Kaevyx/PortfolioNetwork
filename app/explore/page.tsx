"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";
import { CheckCircle2, MapPin, Star, Filter, X, Sparkles } from "lucide-react";
import { SuspendedExploreRedirect } from "./suspended-check";
import { SuspendedAccessBlock } from "@/components/SuspendedAccessBlock";
import { AvatarImage } from "@/components/AvatarImage";

export default function ExplorePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [locationFilter, setLocationFilter] = useState({
    city: searchParams.get("city") || "",
    state: searchParams.get("state") || "",
    country: searchParams.get("country") || "",
    radius: searchParams.get("radius") ? Number(searchParams.get("radius")) : null,
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const initialSkills = searchParams.get("skills")?.split(",").filter(Boolean) || [];
  const [skillFilter, setSkillFilter] = useState<string[]>(initialSkills);
  const [skillInput, setSkillInput] = useState("");

  // Load user's location for radius-based search
  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadUserLocation = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("clerk_id", user.id)
          .single();

        if (profile?.latitude && profile?.longitude) {
          setUserLocation({
            lat: profile.latitude,
            lon: profile.longitude,
          });
        }
      } catch (error) {
        console.error("Error loading user location:", error);
      }
    };

    loadUserLocation();
  }, [user, isLoaded, supabase]);

  // Load profiles with filters
  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      try {
        let profilesData: any[] = [];

        // If skills filter is set, use skills search RPC
        if (skillFilter.length > 0) {
          const { data, error } = await supabase.rpc("search_users_by_skills", {
            p_skill_names: skillFilter,
            p_limit: 100,
            p_min_matching_skills: 1,
          });

          if (error) {
            console.error("Error searching by skills:", error);
            // Fall through to standard query if RPC doesn't exist
          } else {
            profilesData = data || [];
            // Filter out current user's own profile
            if (user?.id) {
              profilesData = profilesData.filter((profile) => profile.clerk_id !== user.id);
            }
          }
        }

        // If location filters are set and no skills filter results, use location search RPC
        if (profilesData.length === 0 && (locationFilter.city || locationFilter.state || locationFilter.country || (locationFilter.radius && userLocation))) {
          const { data, error } = await supabase.rpc("search_users_by_location", {
            p_search_city: locationFilter.city || null,
            p_search_state: locationFilter.state || null,
            p_search_country: locationFilter.country || null,
            p_latitude: userLocation?.lat || null,
            p_longitude: userLocation?.lon || null,
            p_radius_miles: locationFilter.radius || null,
            p_limit: 100,
          });

          if (error) throw error;
          profilesData = data || [];
          // Filter out current user's own profile
          if (user?.id) {
            profilesData = profilesData.filter((profile) => profile.clerk_id !== user.id);
          }
        } else if (profilesData.length === 0) {
          // Standard query
          let query = supabase
            .from("profiles")
            .select("*")
            .eq("profile_status", "approved")
            .eq("is_suspended", false)
            .eq("profile_type", "individual"); // Only show individual profiles

          // Exclude current user's profile
          if (user?.id) {
            query = query.neq("clerk_id", user.id);
          }

          if (searchQuery) {
            query = query.ilike("display_name", `%${searchQuery}%`);
          }

          const { data } = await query
            .order("featured_priority", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(100);

          profilesData = data || [];
        }

        // Filter by search query if needed
        if (searchQuery) {
          profilesData = profilesData.filter(
            (p) =>
              p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.bio?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Filter out profiles that have allowSearch disabled
        profilesData = profilesData.filter((profile) => {
          const allowSearch = profile.settings?.privacy?.allowSearch !== false;
          return allowSearch;
        });

        // Filter out current user's own profile
        if (user?.id) {
          profilesData = profilesData.filter((profile) => profile.clerk_id !== user.id);
        }

        setProfiles(profilesData);
      } catch (error) {
        console.error("Error loading profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [searchQuery, locationFilter, userLocation, skillFilter, supabase]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (locationFilter.city) params.set("city", locationFilter.city);
    if (locationFilter.state) params.set("state", locationFilter.state);
    if (locationFilter.country) params.set("country", locationFilter.country);
    if (locationFilter.radius) params.set("radius", locationFilter.radius.toString());
    if (skillFilter.length > 0) params.set("skills", skillFilter.join(","));

    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }, [searchQuery, locationFilter, skillFilter, router]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !skillFilter.includes(skillInput.trim())) {
      setSkillFilter([...skillFilter, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillFilter(skillFilter.filter((s) => s !== skill));
  };

  const clearLocationFilters = () => {
    setLocationFilter({ city: "", state: "", country: "", radius: null });
  };

  const hasLocationFilters = locationFilter.city || locationFilter.state || locationFilter.country || locationFilter.radius;
  const hasSkillFilter = skillFilter.length > 0;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SuspendedExploreRedirect />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">Explore Profiles</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover professionals on the platform
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or bio..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Skills Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  Skills
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Add skill..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {skillFilter.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skillFilter.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setSkillFilter([])}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Filter Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <button
                  onClick={() => setShowLocationFilters(!showLocationFilters)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {hasLocationFilters ? "Location Filters Active" : "Filter by Location"}
                  </span>
                  {hasLocationFilters && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearLocationFilters();
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Location Filters */}
            {showLocationFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={locationFilter.city}
                    onChange={(e) => setLocationFilter({ ...locationFilter, city: e.target.value })}
                    placeholder="City name..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    County
                  </label>
                  <input
                    type="text"
                    value={locationFilter.state}
                    onChange={(e) => setLocationFilter({ ...locationFilter, state: e.target.value })}
                    placeholder="County..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={locationFilter.country}
                    onChange={(e) => setLocationFilter({ ...locationFilter, country: e.target.value })}
                    placeholder="Country name..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {userLocation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Within Radius (miles)
                    </label>
                    <select
                      value={locationFilter.radius || ""}
                      onChange={(e) =>
                        setLocationFilter({
                          ...locationFilter,
                          radius: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No radius limit</option>
                      <option value="5">5 miles</option>
                      <option value="10">10 miles</option>
                      <option value="25">25 miles</option>
                      <option value="50">50 miles</option>
                      <option value="100">100 miles</option>
                      <option value="250">250 miles</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No profiles found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={getProfileUrl({ username: profile.username, clerk_id: profile.clerk_id })}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      fallbackText={profile.display_name?.charAt(0).toUpperCase() || "U"}
                      className="border-2 border-indigo-500"
                      size="lg"
                      userId={profile.clerk_id}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {profile.display_name}
                        </h3>
                        {profile.is_verified && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                        {profile.featured_priority != null && profile.featured_priority > 0 && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            profile.featured_priority >= 100 
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                              : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                          }`}>
                            <Star className="w-3 h-3 fill-current" />
                            {profile.featured_priority >= 100 ? "Featured" : "Pro"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  {profile.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
