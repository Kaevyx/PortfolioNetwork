"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { SocialMediaAccountForm } from "@/components/SocialMediaAccountForm";
import { EmploymentStatusBadge } from "@/components/EmploymentStatusBadge";
import { useSuspensionCheck } from "@/hooks/useSuspensionCheck";
import { SuspensionWarning } from "@/components/SuspensionWarning";
import { UsernameCustomizer } from "@/components/UsernameCustomizer";
import { Plus, Trash2, Edit2, Twitter, Instagram, Youtube, Linkedin, Facebook, Github, MessageCircle, Twitch, X, Upload, Image, Loader2, MapPin, Lock } from "lucide-react";

export default function ProfileEditPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const supabase = createClient();
  const { isSuspended, reason, endsAt } = useSuspensionCheck();

  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    profile_type: "individual" as "individual" | "business",
    location: "",
    city: "",
    state_region: "",
    country: "",
    latitude: null as number | null,
    longitude: null as number | null,
    timezone: "",
    location_privacy: "city_county" as "exact" | "city" | "city_country" | "county" | "county_country" | "city_county" | "country" | "hidden",
    website: "",
    email: "",
    skills: [] as string[],
    services: [] as string[],
    cv_url: "",
    employment_status: "not_specified" as "looking_for_job" | "employed" | "business_owner" | "freelancer" | "student" | "unemployed" | "retired" | "not_specified",
  });

  const [skillInput, setSkillInput] = useState("");
  const [serviceInput, setServiceInput] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  
  // Location autocomplete state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newAccount, setNewAccount] = useState({
    platform: "",
    username: "",
    followers_count: 0,
    following_count: 0,
    subscribers_count: 0,
    members_count: 0,
    posts_count: 0,
    verified: false,
  });

  useEffect(() => {
    if (!isLoaded || !user) return;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("clerk_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setFormData({
            display_name: data.display_name || "",
            bio: data.bio || "",
            profile_type: data.profile_type || "individual",
            location: data.location || "",
            city: data.city || "",
            state_region: data.state_region || "",
            country: data.country || "",
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            timezone: data.timezone || "",
            location_privacy: data.location_privacy || "city_county",
            website: data.website || "",
            email: data.email || user.emailAddresses[0]?.emailAddress || "",
            skills: data.skills || [],
            services: data.services || [],
            cv_url: data.cv_url || "",
            employment_status: data.employment_status || "not_specified",
          });
          setCurrentAvatarUrl(data.avatar_url);
          setCurrentUsername(data.username || null);
          setSubscriptionPlan(data.subscription_plan || "free");
        } else {
          // If no profile exists, initialize with Clerk email
          setFormData({
            ...formData,
            email: user.emailAddresses[0]?.emailAddress || "",
          });
        }

        // Load social media accounts
        const { data: accounts } = await supabase
          .from("social_media_accounts")
          .select("*")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false });

        setSocialAccounts(accounts || []);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user, isLoaded, supabase]);

  // Cleanup geocode timeout on unmount
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show suspension warning and disable all inputs if suspended
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <SuspensionWarning reason={reason} endsAt={endsAt} />
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Suspended</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your account is currently suspended. You cannot edit your profile or make any changes to your account during this time.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              All profile editing features are disabled until your suspension is lifted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const handleAddService = () => {
    if (serviceInput.trim() && !formData.services.includes(serviceInput.trim())) {
      setFormData({
        ...formData,
        services: [...formData.services, serviceInput.trim()],
      });
      setServiceInput("");
    }
  };

  const handleRemoveService = (service: string) => {
    setFormData({
      ...formData,
      services: formData.services.filter((s) => s !== service),
    });
  };

  const handleAddSocialAccount = (account: any) => {
    if (account.id) {
      // Update existing
      setSocialAccounts(socialAccounts.map(a => a.id === account.id ? account : a));
    } else {
      // Add new
      setSocialAccounts([...socialAccounts, { ...account, id: `temp-${Date.now()}` }]);
    }
    setEditingAccount(null);
    setNewAccount({
      platform: "",
      username: "",
      followers_count: 0,
      following_count: 0,
      subscribers_count: 0,
      members_count: 0,
      posts_count: 0,
      verified: false,
    });
  };

  const handleDeleteSocialAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to remove this social media account?")) return;
    
    try {
      // If it's a temporary ID, just remove from state
      if (accountId.startsWith('temp-')) {
        setSocialAccounts(socialAccounts.filter(a => a.id !== accountId));
        return;
      }

      const { error } = await supabase
        .from("social_media_accounts")
        .delete()
        .eq("id", accountId)
        .eq("profile_id", user?.id);

      if (error) throw error;
      
      setSocialAccounts(socialAccounts.filter(a => a.id !== accountId));
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account");
    }
  };

  const handleEditSocialAccount = (accountId: string) => {
    const account = socialAccounts.find(a => a.id === accountId);
    if (account) {
      setNewAccount(account);
      setEditingAccount(accountId);
    }
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile pictures cannot be removed - users must have a profile picture
  // Instead, allow them to upload a new one to replace it
  const handleRemovePicture = () => {
    // Don't allow removal - show message instead
    alert("Profile pictures are required and cannot be removed. Please upload a new picture to replace your current one.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload profile picture if a new one was selected
      // Profile picture is required - if no current avatar and no new picture, require upload
      let avatarUrl = currentAvatarUrl;
      if (profilePicture) {
        setUploadingPicture(true);
        const formDataToUpload = new FormData();
        formDataToUpload.append("file", profilePicture);
        formDataToUpload.append("fileType", "profile_picture");
        formDataToUpload.append("bucketName", "profile-pictures");

        const uploadResponse = await fetch("/api/upload-file", {
          method: "POST",
          body: formDataToUpload,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          alert(uploadResult.error || "Failed to upload profile picture");
          setLoading(false);
          setUploadingPicture(false);
          return;
        }

        avatarUrl = uploadResult.fileUrl;
        setUploadingPicture(false);
      } else if (!currentAvatarUrl) {
        // If no current avatar and no new picture selected, require upload
        alert("Profile picture is required. Please upload a profile picture.");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          clerk_id: user.id,
          display_name: formData.display_name,
          bio: formData.bio,
          profile_type: formData.profile_type,
          location: formData.location,
          city: formData.city || null,
          state_region: formData.state_region || null,
          country: formData.country || null,
          latitude: formData.latitude || null,
          longitude: formData.longitude || null,
          timezone: formData.timezone || null,
          location_privacy: formData.location_privacy || "city_county",
          website: formData.website,
          skills: formData.skills,
          services: formData.services,
          cv_url: formData.cv_url,
          employment_status: formData.employment_status,
          email: formData.email || user.emailAddresses[0]?.emailAddress,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(), // Explicitly set updated_at
        }, {
          onConflict: 'clerk_id'
        });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Save social media accounts
      if (socialAccounts.length > 0) {
        for (const account of socialAccounts) {
          // Skip temporary IDs - they'll be inserted as new
          if (account.id && !account.id.startsWith('temp-')) {
            // Update existing account
            const { error: updateError } = await supabase
              .from("social_media_accounts")
              .update({
                platform: account.platform,
                username: account.username,
                followers_count: account.followers_count || 0,
                following_count: account.following_count || 0,
                subscribers_count: account.subscribers_count || 0,
                members_count: account.members_count || 0,
                posts_count: account.posts_count || 0,
                verified: account.verified || false,
              })
              .eq("id", account.id);
            
            if (updateError) {
              console.error("Error updating social account:", updateError);
            }
          } else {
            // Insert new account
            const { error: insertError } = await supabase
              .from("social_media_accounts")
              .insert({
                profile_id: user.id,
                platform: account.platform,
                username: account.username,
                followers_count: account.followers_count || 0,
                following_count: account.following_count || 0,
                subscribers_count: account.subscribers_count || 0,
                members_count: account.members_count || 0,
                posts_count: account.posts_count || 0,
                verified: account.verified || false,
              });
            
            if (insertError) {
              console.error("Error inserting social account:", insertError);
            }
          }
        }
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold gradient-text mb-2">Edit Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Update your profile information</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                Basic Information
              </h2>
              
              {/* Custom Username Section */}
              <UsernameCustomizer
                currentUsername={currentUsername}
                subscriptionPlan={subscriptionPlan}
                onUpdate={(newUsername) => {
                  setCurrentUsername(newUsername);
                }}
              />
              
                {/* Profile Picture Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Picture <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Required - cannot be removed)</span>
                  </label>
                <div className="flex items-center gap-4">
                  {(profilePicturePreview || currentAvatarUrl) ? (
                    <div className="relative">
                      <img
                        src={profilePicturePreview || currentAvatarUrl || ""}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
                      />
                 <button
                   type="button"
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute -top-2 -right-2 p-1 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                   title="Change profile picture (required)"
                 >
                   <Upload className="w-4 h-4" />
                 </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePictureChange}
                      disabled={isSuspended}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture || isSuspended}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploadingPicture ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {profilePicture || currentAvatarUrl ? "Change Picture" : "Upload Picture"}
                        </>
                      )}
                    </button>
               <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                 JPG, PNG, or GIF. Max 5MB. Will be reviewed by admin. Profile pictures are required and cannot be deleted - upload a new picture to replace your current one.
               </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  disabled={isSuspended}
                  readOnly={isSuspended}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.profile_type}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                >
                  <option value="individual">Individual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={4}
                  disabled={isSuspended}
                  readOnly={isSuspended}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            {/* Contact & Location Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                Contact & Location
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location (Town/City, County, Country)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Enter your location details. You can type a town/city, county, or country name and select from suggestions, or type manually. Use the Location Privacy setting below to control which parts are visible to others.
                  </p>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={locationQuery || formData.location}
                      onChange={(e) => {
                        const value = e.target.value;
                        setLocationQuery(value);
                        setFormData({ ...formData, location: value });
                        
                        // Clear previous timeout
                        if (geocodeTimeoutRef.current) {
                          clearTimeout(geocodeTimeoutRef.current);
                        }
                        
                        if (value.length < 3) {
                          setLocationSuggestions([]);
                          setShowLocationSuggestions(false);
                          setGeocodingLocation(false);
                          return;
                        }
                        
                        // Debounce geocoding API calls (wait 500ms after user stops typing)
                        setGeocodingLocation(true);
                        geocodeTimeoutRef.current = setTimeout(async () => {
                          try {
                            const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
                            if (!response.ok) {
                              // Handle timeout and other errors gracefully
                              if (response.status === 408) {
                                // Timeout - silently fail, user can still type manually
                                setLocationSuggestions([]);
                                setShowLocationSuggestions(false);
                                setGeocodingLocation(false);
                                return;
                              }
                              // For other errors, log but don't throw
                              console.warn(`Geocoding failed: ${response.status}`);
                              setLocationSuggestions([]);
                              setShowLocationSuggestions(false);
                              setGeocodingLocation(false);
                              return;
                            }
                            const data = await response.json();
                            if (data.results && Array.isArray(data.results)) {
                              setLocationSuggestions(data.results);
                              setShowLocationSuggestions(true);
                            } else {
                              setLocationSuggestions([]);
                              setShowLocationSuggestions(false);
                            }
                          } catch (error: any) {
                            // Handle network errors and timeouts gracefully
                            if (error?.name === "AbortError" || error?.message?.includes("408") || error?.message?.includes("timeout")) {
                              // Timeout or abort - silently fail
                              setLocationSuggestions([]);
                              setShowLocationSuggestions(false);
                            } else {
                              // Other errors - log but don't break the UI
                              console.warn("Geocoding error:", error);
                              setLocationSuggestions([]);
                              setShowLocationSuggestions(false);
                            }
                          } finally {
                            setGeocodingLocation(false);
                          }
                        }, 500);
                      }}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) {
                          setShowLocationSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowLocationSuggestions(false), 200);
                      }}
                      disabled={isSuspended}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Start typing your town/city, county, or country..."
                    />
                    {geocodingLocation && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setLocationQuery(suggestion.display_name);
                              setFormData({
                                ...formData,
                                location: suggestion.display_name,
                                city: suggestion.city || "",
                                state_region: suggestion.state_region || "",
                                country: suggestion.country || "",
                                latitude: suggestion.latitude || null,
                                longitude: suggestion.longitude || null,
                              });
                              setLocationSuggestions([]);
                              setShowLocationSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {suggestion.display_name}
                            </div>
                            {(suggestion.city || suggestion.state_region || suggestion.country) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {[suggestion.city, suggestion.state_region, suggestion.country].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(formData.city || formData.state_region || formData.country) && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {formData.city && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          <MapPin className="w-3 h-3" />
                          {formData.city}
                          {formData.state_region && `, ${formData.state_region}`}
                          {formData.country && `, ${formData.country}`}
                        </span>
                      )}
                      {formData.state_region && !formData.city && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          <MapPin className="w-3 h-3" />
                          {formData.state_region}
                          {formData.country && `, ${formData.country}`}
                        </span>
                      )}
                      {formData.country && !formData.city && !formData.state_region && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          <MapPin className="w-3 h-3" />
                          {formData.country}
                        </span>
                      )}
                      {formData.latitude && formData.longitude && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Location Privacy
                  </label>
                  <select
                    value={formData.location_privacy}
                    onChange={(e) =>
                      setFormData({ ...formData, location_privacy: e.target.value as any })
                    }
                    disabled={isSuspended}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="exact">Town / City + County + Country (Full Location)</option>
                    <option value="city_county">Town / City + County</option>
                    <option value="city_country">Town / City + Country</option>
                    <option value="county_country">County + Country</option>
                    <option value="city">Town / City Only</option>
                    <option value="county">County Only</option>
                    <option value="country">Country Only</option>
                    <option value="hidden">Hide Location</option>
                  </select>
                  <div className="mt-2 space-y-2">
                    {formData.location_privacy === "exact" && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                          ⚠️ Full Public Location Warning
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          When set to "Town / City + County + Country", all location details you enter (Town/City, County, and Country) will be visible to other users. This includes everything shown in your location field above.
                        </p>
                      </div>
                    )}
                    {formData.location_privacy === "city_county" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Your Town/City and County will be shown. Your Country will be hidden.
                      </p>
                    )}
                    {formData.location_privacy === "city_country" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Your Town/City and Country will be shown. Your County will be hidden.
                      </p>
                    )}
                    {formData.location_privacy === "county_country" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Your County and Country will be shown. Your Town/City will be hidden.
                      </p>
                    )}
                    {formData.location_privacy === "city" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Only your Town/City will be shown. Your County and Country will be hidden.
                      </p>
                    )}
                    {formData.location_privacy === "county" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Only your County will be shown. Your Town/City and Country will be hidden.
                      </p>
                    )}
                    {formData.location_privacy === "country" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Only your Country will be shown. Your Town/City and County will be hidden.
                      </p>
                    )}
                    {formData.location_privacy === "hidden" && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Your location will not be visible to other users, but you can still use location-based features like "Users Near You".
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      This setting controls what location information appears on your profile and in search results. The location input box above will help you fill in all location details, and this setting determines which parts are visible to others.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This email will be displayed on your profile if you enable "Show Email Address" in settings.
                </p>
              </div>
            </div>

            {/* Profile-Specific Information */}
            {formData.profile_type === "individual" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                  Professional Information
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employment Status
                  </label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employment_status: e.target.value as typeof formData.employment_status,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="not_specified">Not Specified</option>
                    <option value="looking_for_job">Looking for Job</option>
                    <option value="employed">Employed</option>
                    <option value="business_owner">Business Owner</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="student">Student</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                  </select>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Preview:</span>
                    <EmploymentStatusBadge status={formData.employment_status} size="sm" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This helps others understand your current professional status and will be used for job board features.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skills
                  </label>
                  <div className="flex gap-2 mb-2">
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
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add a skill"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CV/Resume URL
                  </label>
                  <input
                    type="url"
                    value={formData.cv_url}
                    onChange={(e) =>
                      setFormData({ ...formData, cv_url: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/cv.pdf"
                  />
                </div>
              </div>
            )}

            {formData.profile_type === "business" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                  Business Information
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Services
                  </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Add a service"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.services.map((service, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {service}
                      <button
                        type="button"
                        onClick={() => handleRemoveService(service)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                </div>
              </div>
            )}

            {/* Social Media Accounts Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                Social Media Accounts
              </h2>

              {/* Existing Accounts */}
              {socialAccounts.length > 0 && (
                <div className="space-y-3">
                  {socialAccounts.map((account) => {
                    const platformIcons: { [key: string]: any } = {
                      twitter: Twitter,
                      instagram: Instagram,
                      youtube: Youtube,
                      linkedin: Linkedin,
                      facebook: Facebook,
                      github: Github,
                      discord: MessageCircle,
                      twitch: Twitch,
                      tiktok: X,
                    };
                    const Icon = platformIcons[account.platform] || X;

                    if (editingAccount === account.id) {
                      return (
                        <SocialMediaAccountForm
                          key={account.id}
                          account={account}
                          onSave={handleAddSocialAccount}
                          onCancel={() => {
                            setEditingAccount(null);
                            setNewAccount({
                              platform: "",
                              username: "",
                              followers_count: 0,
                              following_count: 0,
                              subscribers_count: 0,
                              members_count: 0,
                              posts_count: 0,
                              verified: false,
                            });
                          }}
                        />
                      );
                    }

                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                {account.platform}
                              </span>
                              {account.verified && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                  Verified
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">@{account.username}</span>
                            {(account.followers_count > 0 || account.subscribers_count > 0) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {account.followers_count > 0 && `${account.followers_count.toLocaleString()} followers`}
                                {account.subscribers_count > 0 && ` • ${account.subscribers_count.toLocaleString()} subscribers`}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditSocialAccount(account.id!)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSocialAccount(account.id!)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Account Form */}
              {editingAccount === 'new' ? (
                <SocialMediaAccountForm
                  account={null}
                  onSave={handleAddSocialAccount}
                  onCancel={() => {
                    setEditingAccount(null);
                    setNewAccount({
                      platform: "",
                      username: "",
                      followers_count: 0,
                      following_count: 0,
                      subscribers_count: 0,
                      members_count: 0,
                      posts_count: 0,
                      verified: false,
                    });
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingAccount('new')}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  <Plus className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Add Social Media Account</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-8 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

