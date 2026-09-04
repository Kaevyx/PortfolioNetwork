"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, X, ExternalLink, Briefcase, GraduationCap, Award, 
  FileText, Code, User, Edit2, Trash2, Save, Upload, Link as LinkIcon,
  TrendingUp, Calendar, MapPin, Building2
} from "lucide-react";
import Link from "next/link";
// Simple toast notification system
const showToast = (message: string, type: "success" | "error" = "success") => {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
    type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
  } animate-fade-in`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
};

type TabType = "overview" | "skills" | "education" | "experience" | "certifications" | "projects" | "cv";

export default function PortfolioPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Data states
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    loadAllData();
  }, [user, isLoaded]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("clerk_id", user?.id)
        .single();
      setProfile(profileData);

      // Load skills (try portfolio_skills first, fallback to profile_skills, then profiles.skills array)
      let skillsData: any[] = [];
      const { data: portfolioSkills, error: portfolioSkillsError } = await supabase
        .from("portfolio_skills")
        .select("*")
        .eq("profile_id", user?.id)
        .order("display_order", { ascending: true });
      
      if (!portfolioSkillsError && portfolioSkills) {
        skillsData = portfolioSkills;
      } else {
        const { data: profileSkills, error: profileSkillsError } = await supabase
          .from("profile_skills")
          .select("*")
          .eq("profile_id", user?.id)
          .order("display_order", { ascending: true });
        
        if (!profileSkillsError && profileSkills) {
          skillsData = profileSkills;
        } else {
          // Fallback to profiles.skills array if tables don't exist
          if (profile?.skills && Array.isArray(profile.skills)) {
            skillsData = profile.skills.map((skill: string, idx: number) => ({
              id: `skill-${idx}`,
              skill_name: skill,
              proficiency_level: "intermediate",
              category: "technical",
            }));
          }
        }
      }
      setSkills(skillsData);

      // Load education (try portfolio_education first, fallback to education_entries)
      let eduData: any[] = [];
      const { data: portfolioEdu, error: portfolioEduError } = await supabase
        .from("portfolio_education")
        .select("*")
        .eq("profile_id", user?.id)
        .order("start_date", { ascending: false });
      
      if (!portfolioEduError && portfolioEdu) {
        eduData = portfolioEdu;
      } else {
        const { data: eduEntries, error: eduEntriesError } = await supabase
          .from("education_entries")
          .select("*")
          .eq("profile_id", user?.id)
          .order("start_date", { ascending: false });
        
        if (!eduEntriesError && eduEntries) {
          eduData = eduEntries;
        }
      }
      setEducation(eduData);

      // Load experience (try portfolio_experience first, fallback to work_experience)
      let expData: any[] = [];
      const { data: portfolioExp, error: portfolioExpError } = await supabase
        .from("portfolio_experience")
        .select("*")
        .eq("profile_id", user?.id)
        .order("start_date", { ascending: false });
      
      if (!portfolioExpError && portfolioExp) {
        expData = portfolioExp;
      } else {
        const { data: workExp, error: workExpError } = await supabase
          .from("work_experience")
          .select("*")
          .eq("profile_id", user?.id)
          .order("start_date", { ascending: false });
        
        if (!workExpError && workExp) {
          expData = workExp;
        }
      }
      setExperience(expData);

      // Load certifications (try portfolio_certifications first, fallback to certifications)
      let certData: any[] = [];
      const { data: portfolioCert, error: portfolioCertError } = await supabase
        .from("portfolio_certifications")
        .select("*")
        .eq("profile_id", user?.id)
        .order("issue_date", { ascending: false });
      
      if (!portfolioCertError && portfolioCert) {
        certData = portfolioCert;
      } else {
        const { data: certs, error: certsError } = await supabase
          .from("certifications")
          .select("*")
          .eq("profile_id", user?.id)
          .order("issue_date", { ascending: false });
        
        if (!certsError && certs) {
          certData = certs;
        }
      }
      setCertifications(certData);

      // Load projects (portfolio_items where project_type is 'project' or null)
      const { data: projectsData } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("profile_id", user?.id)
        .in("project_type", ["project", null])
        .order("created_at", { ascending: false });
      setProjects(projectsData || []);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      showToast("Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to manage your portfolio</p>
          <Link
            href="/sign-in"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: User },
    { id: "skills" as TabType, label: "Skills", icon: Code },
    { id: "education" as TabType, label: "Education", icon: GraduationCap },
    { id: "experience" as TabType, label: "Experience", icon: Briefcase },
    { id: "certifications" as TabType, label: "Certifications", icon: Award },
    { id: "projects" as TabType, label: "Projects", icon: FileText },
    { id: "cv" as TabType, label: "CV/Resume", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Professional Portfolio</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Showcase your skills, experience, and achievements
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab 
                  profile={profile}
                  skills={skills}
                  education={education}
                  experience={experience}
                  certifications={certifications}
                  projects={projects}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
              {activeTab === "skills" && (
                <SkillsTab 
                  skills={skills}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
              {activeTab === "education" && (
                <EducationTab 
                  education={education}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
              {activeTab === "experience" && (
                <ExperienceTab 
                  experience={experience}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
              {activeTab === "certifications" && (
                <CertificationsTab 
                  certifications={certifications}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
              {activeTab === "projects" && (
                <ProjectsTab 
                  projects={projects}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
              {activeTab === "cv" && (
                <CVTab 
                  profile={profile}
                  userId={user.id}
                  supabase={supabase}
                  onUpdate={loadAllData}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ profile, skills, education, experience, certifications, projects, userId, supabase, onUpdate }: any) {
  const stats = [
    { label: "Skills", value: skills.length, icon: Code, color: "indigo" },
    { label: "Education", value: education.length, icon: GraduationCap, color: "blue" },
    { label: "Experience", value: experience.length, icon: Briefcase, color: "green" },
    { label: "Certifications", value: certifications.length, icon: Award, color: "yellow" },
    { label: "Projects", value: projects.length, icon: FileText, color: "purple" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Portfolio Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your professional portfolio at a glance. Complete each section to build a comprehensive showcase.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800 text-center"
            >
              <Icon className={`w-8 h-8 mx-auto mb-2 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Quick Actions</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Add your skills to showcase expertise</li>
            <li>• List your education background</li>
            <li>• Add work experience</li>
            <li>• Upload certifications</li>
            <li>• Showcase your projects</li>
            <li>• Link your CV/Resume</li>
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Portfolio Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Keep your information up to date</li>
            <li>• Add detailed descriptions</li>
            <li>• Include relevant links and documents</li>
            <li>• Highlight your best work</li>
            <li>• Use tags and categories effectively</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Skills Tab Component
function SkillsTab({ skills, userId, supabase, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    skill_name: "",
    proficiency_level: "intermediate",
    category: "technical",
    years_experience: "",
    description: "",
  });

  const handleEdit = (skill: any) => {
    setEditingId(skill.id);
    setFormData({
      skill_name: skill.skill_name || "",
      proficiency_level: skill.proficiency_level || "intermediate",
      category: skill.category || "technical",
      years_experience: skill.years_experience?.toString() || "",
      description: skill.description || "",
    });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      skill_name: "",
      proficiency_level: "intermediate",
      category: "technical",
      years_experience: "",
      description: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate description length (max 1000 characters)
      if (formData.description && formData.description.length > 1000) {
        showToast("Description must be 1000 characters or less", "error");
        return;
      }

      let tableName = "portfolio_skills";
      let data: any = {
        skill_name: formData.skill_name,
        proficiency_level: formData.proficiency_level,
        category: formData.category,
      };
      if (formData.years_experience) {
        data.years_experience = parseInt(formData.years_experience);
      }
      if (formData.description) {
        data.description = formData.description;
      }

      if (editingId) {
        // Update existing skill
        let { error } = await supabase.from(tableName).update(data).eq("id", editingId);
        
        if (error) {
          const { error: err } = await supabase.from("profile_skills").update(data).eq("id", editingId);
          if (err) throw err;
        }
        
        showToast("Skill updated successfully!", "success");
        setEditingId(null);
      } else {
        // Insert new skill
        data.profile_id = userId;
        let { error } = await supabase.from(tableName).insert(data);
        
        if (error) {
          const { error: err } = await supabase.from("profile_skills").insert(data);
          if (err) {
            // Final fallback: update profiles.skills array
            const { data: profile } = await supabase
              .from("profiles")
              .select("skills")
              .eq("clerk_id", userId)
              .single();
            
            const currentSkills = profile?.skills || [];
            if (!currentSkills.includes(formData.skill_name)) {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ skills: [...currentSkills, formData.skill_name] })
                .eq("clerk_id", userId);
              if (updateError) throw updateError;
            }
          }
        }
        
        showToast("Skill added successfully!", "success");
        setIsAdding(false);
      }

      setFormData({
        skill_name: "",
        proficiency_level: "intermediate",
        category: "technical",
        years_experience: "",
        description: "",
      });
      onUpdate();
    } catch (error: any) {
      console.error("Error saving skill:", error);
      showToast(error.message || "Failed to save skill");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;
    try {
      // Try portfolio_skills first, fallback to profile_skills, then update profiles.skills array
      let { error } = await supabase.from("portfolio_skills").delete().eq("id", id);
      
      if (error) {
        const { error: err } = await supabase.from("profile_skills").delete().eq("id", id);
        if (err) {
          // Fallback: remove from profiles.skills array
          const skillName = skills.find((s: any) => s.id === id)?.skill_name;
          if (skillName) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("skills")
              .eq("clerk_id", userId)
              .single();
            
            const currentSkills = profile?.skills || [];
            const updatedSkills = currentSkills.filter((s: string) => s !== skillName);
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ skills: updatedSkills })
              .eq("clerk_id", userId);
            if (updateError) throw updateError;
          }
        }
      } else if (error) {
        throw error;
      }
      showToast("Skill deleted successfully!", "success");
      onUpdate();
    } catch (error) {
      console.error("Error deleting skill:", error);
      showToast("Failed to delete skill");
    }
  };

  const proficiencyColors: Record<string, string> = {
    beginner: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    advanced: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    expert: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Skills</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Showcase your technical and soft skills</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Skill Name *</label>
              <input
                type="text"
                required
                value={formData.skill_name}
                onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., JavaScript, Project Management"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Proficiency Level *</label>
              <select
                value={formData.proficiency_level}
                onChange={(e) => setFormData({ ...formData, proficiency_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="technical">Technical</option>
                <option value="soft">Soft Skills</option>
                <option value="language">Language</option>
                <option value="certification">Certification</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Years of Experience</label>
              <input
                type="number"
                min="0"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-gray-500 text-xs">(Optional, max 1000 characters)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                if (e.target.value.length <= 1000) {
                  setFormData({ ...formData, description: e.target.value });
                }
              }}
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe your experience with this skill, projects you've used it in, achievements, etc."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.description.length}/1000 characters
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              {editingId ? "Update Skill" : "Add Skill"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {skills.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill: any) => (
            <div
              key={skill.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{skill.skill_name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{skill.category}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(skill)}
                    className="text-indigo-600 hover:text-indigo-700 p-1"
                    title="Edit skill"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Delete skill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${proficiencyColors[skill.proficiency_level] || proficiencyColors.intermediate}`}>
                  {skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1)}
                </span>
                {skill.years_experience && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {skill.years_experience} {skill.years_experience === 1 ? "year" : "years"}
                  </span>
                )}
              </div>
              {skill.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                  {skill.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No skills added yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Skill
          </button>
        </div>
      )}
    </div>
  );
}

// Education Tab Component
function EducationTab({ education, userId, supabase, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    institution_name: "",
    degree: "",
    field_of_study: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  });

  const handleEdit = (edu: any) => {
    setEditingId(edu.id);
    setFormData({
      institution_name: edu.institution_name || "",
      degree: edu.degree || "",
      field_of_study: edu.field_of_study || "",
      start_date: edu.start_date ? new Date(edu.start_date).toISOString().split('T')[0] : "",
      end_date: edu.end_date ? new Date(edu.end_date).toISOString().split('T')[0] : "",
      is_current: edu.is_current || false,
      description: edu.description || "",
    });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      institution_name: "",
      degree: "",
      field_of_study: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate description length (max 1000 characters)
      if (formData.description && formData.description.length > 1000) {
        showToast("Description must be 1000 characters or less", "error");
        return;
      }

      let tableName = "portfolio_education";
      let data: any = {
        institution_name: formData.institution_name,
        degree: formData.degree,
        field_of_study: formData.field_of_study || null,
        start_date: formData.start_date || null,
        end_date: formData.is_current ? null : (formData.end_date || null),
        description: formData.description || null,
      };

      if (editingId) {
        // Update existing entry
        let { error } = await supabase.from(tableName).update(data).eq("id", editingId);
        if (error) {
          const { error: err } = await supabase.from("education_entries").update(data).eq("id", editingId);
          if (err) throw err;
        }
        showToast("Education entry updated successfully!", "success");
        setEditingId(null);
      } else {
        // Insert new entry
        data.profile_id = userId;
        const { error } = await supabase.from(tableName).insert(data);
        if (error) {
          const { error: err } = await supabase.from("education_entries").insert(data);
          if (err) throw err;
        }
        showToast("Education entry added successfully!", "success");
        setIsAdding(false);
      }

      setFormData({
        institution_name: "",
        degree: "",
        field_of_study: "",
        start_date: "",
        end_date: "",
        is_current: false,
        description: "",
      });
      onUpdate();
    } catch (error: any) {
      console.error("Error saving education:", error);
      showToast(error.message || "Failed to save education entry");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this education entry?")) return;
    try {
      // Try portfolio_education first, fallback to education_entries
      let { error } = await supabase.from("portfolio_education").delete().eq("id", id);
      if (error) {
        const { error: err } = await supabase.from("education_entries").delete().eq("id", id);
        if (err) throw err;
      }
      showToast("Education entry deleted successfully!", "success");
      onUpdate();
    } catch (error) {
      console.error("Error deleting education:", error);
      showToast("Failed to delete education entry");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Education</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">List your educational background</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Education
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Institution Name *</label>
              <input
                type="text"
                required
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., University of Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Degree *</label>
              <input
                type="text"
                required
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Bachelor of Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Field of Study</label>
              <input
                type="text"
                value={formData.field_of_study}
                onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={formData.is_current}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_current_edu"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is_current_edu" className="text-sm text-gray-700 dark:text-gray-300">
                Currently studying
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-gray-500 text-xs">(Optional, max 1000 characters)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                if (e.target.value.length <= 1000) {
                  setFormData({ ...formData, description: e.target.value });
                }
              }}
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe your educational experience, achievements, coursework, etc."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.description.length}/1000 characters
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              {editingId ? "Update Education" : "Add Education"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {education.length > 0 ? (
        <div className="space-y-4">
          {education.map((edu: any) => (
            <div
              key={edu.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{edu.degree || edu.institution_name}</h3>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium">{edu.institution_name || edu.institution}</p>
                  {edu.field_of_study && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{edu.field_of_study}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {edu.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(edu.start_date).getFullYear()} - {edu.end_date ? new Date(edu.end_date).getFullYear() : edu.is_current ? "Present" : "N/A"}
                      </span>
                    )}
                  </div>
                  {edu.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{edu.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(edu)}
                    className="text-indigo-600 hover:text-indigo-700 p-1"
                    title="Edit education"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(edu.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Delete education"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No education entries yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Education Entry
          </button>
        </div>
      )}
    </div>
  );
}

// Experience Tab Component
function ExperienceTab({ experience, userId, supabase, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    job_title: "",
    location: "",
    employment_type: "full-time",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Try portfolio_experience first, fallback to work_experience
      let tableName = "portfolio_experience";
      let insertData: any = {
        profile_id: userId,
        company_name: formData.company_name,
        job_title: formData.job_title,
        location: formData.location || null,
        employment_type: formData.employment_type,
        start_date: formData.start_date || null,
        end_date: formData.is_current ? null : (formData.end_date || null),
        description: formData.description || null,
      };

      // Adjust field names for work_experience table
      if (tableName === "work_experience") {
        insertData = {
          profile_id: userId,
          company_name: formData.company_name,
          position: formData.job_title,
          location: formData.location || null,
          start_date: formData.start_date || null,
          end_date: formData.is_current ? null : (formData.end_date || null),
          is_current: formData.is_current,
          description: formData.description || null,
        };
      }

      let { error } = await supabase.from(tableName).insert(insertData);
      
      // Fallback to work_experience
      if (error) {
        tableName = "work_experience";
        insertData = {
          profile_id: userId,
          company_name: formData.company_name,
          position: formData.job_title,
          location: formData.location || null,
          start_date: formData.start_date || null,
          end_date: formData.is_current ? null : (formData.end_date || null),
          is_current: formData.is_current,
          description: formData.description || null,
        };
        const { error: err } = await supabase.from(tableName).insert(insertData);
        if (err) throw err;
      }

      showToast("Experience added successfully!", "success");
      setFormData({
        company_name: "",
        job_title: "",
        location: "",
        employment_type: "full-time",
        start_date: "",
        end_date: "",
        is_current: false,
        description: "",
      });
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error adding experience:", error);
      showToast(error.message || "Failed to add experience");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience entry?")) return;
    try {
      // Try portfolio_experience first, fallback to work_experience
      let { error } = await supabase.from("portfolio_experience").delete().eq("id", id);
      if (error) {
        const { error: err } = await supabase.from("work_experience").delete().eq("id", id);
        if (err) throw err;
      }
      showToast("Experience deleted successfully!", "success");
      onUpdate();
    } catch (error) {
      console.error("Error deleting experience:", error);
      showToast("Failed to delete experience");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Work Experience</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Showcase your professional experience</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Experience
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Tech Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Job Title *</label>
              <input
                type="text"
                required
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Senior Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., New York, NY"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={formData.is_current}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_current_exp"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is_current_exp" className="text-sm text-gray-700 dark:text-gray-300">
                Current position
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe your responsibilities and achievements..."
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              Add Experience
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData({
                  company_name: "",
                  job_title: "",
                  location: "",
                  employment_type: "full-time",
                  start_date: "",
                  end_date: "",
                  is_current: false,
                  description: "",
                });
              }}
              className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {experience.length > 0 ? (
        <div className="space-y-4">
          {experience.map((exp: any) => (
            <div
              key={exp.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{exp.job_title || exp.position}</h3>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium">{exp.company_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {exp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {exp.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : "N/A"} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : exp.is_current ? "Present" : "N/A"}
                    </span>
                    <span className="capitalize">{exp.employment_type}</span>
                  </div>
                  {exp.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{exp.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No work experience entries yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Experience
          </button>
        </div>
      )}
    </div>
  );
}

// Certifications Tab Component
function CertificationsTab({ certifications, userId, supabase, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    issuing_organization: "",
    issue_date: "",
    expiration_date: "",
    credential_id: "",
    credential_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Try portfolio_certifications first, fallback to certifications
      let tableName = "portfolio_certifications";
      let insertData: any = {
        profile_id: userId,
        name: formData.name,
        issuing_organization: formData.issuing_organization || null,
        issue_date: formData.issue_date || null,
        expiration_date: formData.expiration_date || null,
        credential_id: formData.credential_id || null,
        credential_url: formData.credential_url || null,
      };

      let { error } = await supabase.from(tableName).insert(insertData);
      
      // Fallback to certifications
      if (error) {
        tableName = "certifications";
        const { error: err } = await supabase.from(tableName).insert(insertData);
        if (err) throw err;
      }

      showToast("Certification added successfully!", "success");
      setFormData({
        name: "",
        issuing_organization: "",
        issue_date: "",
        expiration_date: "",
        credential_id: "",
        credential_url: "",
      });
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error adding certification:", error);
      showToast(error.message || "Failed to add certification");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this certification?")) return;
    try {
      // Try portfolio_certifications first, fallback to certifications
      let { error } = await supabase.from("portfolio_certifications").delete().eq("id", id);
      if (error) {
        const { error: err } = await supabase.from("certifications").delete().eq("id", id);
        if (err) throw err;
      }
      showToast("Certification deleted successfully!", "success");
      onUpdate();
    } catch (error) {
      console.error("Error deleting certification:", error);
      showToast("Failed to delete certification");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Certifications</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Showcase your professional certifications</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Certification Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., AWS Certified Solutions Architect"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Issuing Organization</label>
              <input
                type="text"
                value={formData.issuing_organization}
                onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Amazon Web Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Issue Date</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expiration Date</label>
              <input
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Credential ID</label>
              <input
                type="text"
                value={formData.credential_id}
                onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Certificate number or ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Verification URL</label>
              <input
                type="url"
                value={formData.credential_url}
                onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              Add Certification
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData({
                  name: "",
                  issuing_organization: "",
                  issue_date: "",
                  expiration_date: "",
                  credential_id: "",
                  credential_url: "",
                });
              }}
              className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {certifications.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {certifications.map((cert: any) => (
            <div
              key={cert.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{cert.name}</h3>
                  {cert.issuing_organization && (
                    <p className="text-indigo-600 dark:text-indigo-400 text-sm">{cert.issuing_organization}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(cert.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {cert.issue_date && (
                  <p>Issued: {new Date(cert.issue_date).toLocaleDateString()}</p>
                )}
                {cert.expiration_date && (
                  <p>Expires: {new Date(cert.expiration_date).toLocaleDateString()}</p>
                )}
                {cert.credential_id && (
                  <p>ID: {cert.credential_id}</p>
                )}
                {cert.credential_url && (
                  <a
                    href={cert.credential_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Verify
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No certifications added yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Certification
          </button>
        </div>
      )}
    </div>
  );
}

// Projects Tab Component (renamed from Portfolio Items)
function ProjectsTab({ projects, userId, supabase, onUpdate }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    project_url: "",
    github_url: "",
    technologies: [] as string[],
    tags: [] as string[],
  });
  const [techInput, setTechInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const handleAddTech = () => {
    if (techInput.trim() && !formData.technologies.includes(techInput.trim())) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, techInput.trim()],
      });
      setTechInput("");
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter((t) => t !== tech),
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("portfolio_items").insert({
        profile_id: userId,
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url || null,
        project_url: formData.project_url || null,
        github_url: formData.github_url || null,
        technologies: formData.technologies,
        tags: formData.tags,
        project_type: "project",
      });

      if (error) throw error;

      showToast("Project added successfully!", "success");
      setFormData({
        title: "",
        description: "",
        image_url: "",
        project_url: "",
        github_url: "",
        technologies: [],
        tags: [],
      });
      setIsAdding(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error adding project:", error);
      showToast(error.message || "Failed to add project");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
      if (error) throw error;
      showToast("Project deleted successfully!", "success");
      onUpdate();
    } catch (error) {
      console.error("Error deleting project:", error);
      showToast("Failed to delete project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Showcase your work and projects</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Project Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., E-Commerce Platform"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe your project..."
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Project URL</label>
              <input
                type="url"
                value={formData.project_url}
                onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">GitHub URL</label>
              <input
                type="url"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://github.com/..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Image URL</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Technologies</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., React, Node.js"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.technologies.map((tech, idx) => (
                <span
                  key={idx}
                  className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => handleRemoveTech(tech)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Add Project
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData({
                  title: "",
                  description: "",
                  image_url: "",
                  project_url: "",
                  github_url: "",
                  technologies: [],
                  tags: [],
                });
              }}
              className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {projects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <div
              key={project.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
            >
              {project.image_url && (
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{project.title}</h3>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                    {project.description}
                  </p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.technologies.map((tech: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  {project.project_url && (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Project
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm hover:underline"
                    >
                      <Code className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="ml-auto text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No projects added yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Project
          </button>
        </div>
      )}
    </div>
  );
}

// CV Tab Component
function CVTab({ profile, userId, supabase, onUpdate }: any) {
  const [cvUrl, setCvUrl] = useState(profile?.cv_url || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ cv_url: cvUrl || null })
        .eq("clerk_id", userId);

      if (error) throw error;

      showToast("CV/Resume link updated successfully!", "success");
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error updating CV:", error);
      showToast(error.message || "Failed to update CV link");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">CV/Resume</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Link your CV or resume for potential employers</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">CV/Resume URL</label>
              <input
                type="url"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/cv.pdf or Google Drive/Dropbox link"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You can upload your CV to Google Drive, Dropbox, or any file hosting service and paste the link here
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setCvUrl(profile?.cv_url || "");
                }}
                className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {cvUrl ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your CV/Resume:</p>
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  <LinkIcon className="w-5 h-5" />
                  View CV/Resume
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No CV/Resume linked yet</p>
              </div>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              {cvUrl ? "Update CV/Resume Link" : "Add CV/Resume Link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
