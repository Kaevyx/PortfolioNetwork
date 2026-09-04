"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Code, GraduationCap, Briefcase, Award, FileText, ExternalLink, Calendar, MapPin, Building2 } from "lucide-react";
import Link from "next/link";

interface PortfolioSummarySectionProps {
  profileId: string;
  isOwnProfile: boolean;
}

// Helper function to capitalize text
const capitalize = (text: string) => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function PortfolioSummarySection({ profileId, isOwnProfile }: PortfolioSummarySectionProps) {
  const [skills, setSkills] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadPortfolioData();
  }, [profileId]);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      // Load skills (try portfolio_skills first, fallback to profile_skills)
      let skillsData: any[] = [];
      const { data: portfolioSkills, error: portfolioSkillsError } = await supabase
        .from("portfolio_skills")
        .select("*")
        .eq("profile_id", profileId)
        .order("display_order", { ascending: true })
        .limit(6);
      
      if (!portfolioSkillsError && portfolioSkills) {
        skillsData = portfolioSkills;
      } else {
        const { data: profileSkills } = await supabase
          .from("profile_skills")
          .select("*")
          .eq("profile_id", profileId)
          .order("display_order", { ascending: true })
          .limit(6);
        skillsData = profileSkills || [];
      }
      setSkills(skillsData);

      // Load education
      let eduData: any[] = [];
      const { data: portfolioEdu, error: portfolioEduError } = await supabase
        .from("portfolio_education")
        .select("*")
        .eq("profile_id", profileId)
        .order("start_date", { ascending: false })
        .limit(3);
      
      if (!portfolioEduError && portfolioEdu) {
        eduData = portfolioEdu;
      } else {
        const { data: eduEntries } = await supabase
          .from("education_entries")
          .select("*")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false })
          .limit(3);
        eduData = eduEntries || [];
      }
      setEducation(eduData);

      // Load experience
      let expData: any[] = [];
      const { data: portfolioExp, error: portfolioExpError } = await supabase
        .from("portfolio_experience")
        .select("*")
        .eq("profile_id", profileId)
        .order("start_date", { ascending: false })
        .limit(3);
      
      if (!portfolioExpError && portfolioExp) {
        expData = portfolioExp;
      } else {
        const { data: workExp } = await supabase
          .from("work_experience")
          .select("*")
          .eq("profile_id", profileId)
          .order("start_date", { ascending: false })
          .limit(3);
        expData = workExp || [];
      }
      setExperience(expData);

      // Load certifications
      let certData: any[] = [];
      const { data: portfolioCert, error: portfolioCertError } = await supabase
        .from("portfolio_certifications")
        .select("*")
        .eq("profile_id", profileId)
        .order("issue_date", { ascending: false })
        .limit(3);
      
      if (!portfolioCertError && portfolioCert) {
        certData = portfolioCert;
      } else {
        const { data: certs } = await supabase
          .from("certifications")
          .select("*")
          .eq("profile_id", profileId)
          .order("issue_date", { ascending: false })
          .limit(3);
        certData = certs || [];
      }
      setCertifications(certData);

      // Load projects (portfolio_items)
      const { data: portfolioItems } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(3);
      setProjects(portfolioItems || []);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasAnyContent = skills.length > 0 || education.length > 0 || experience.length > 0 || certifications.length > 0 || projects.length > 0;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading portfolio...</p>
      </div>
    );
  }

  if (!hasAnyContent) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {isOwnProfile 
            ? "Your portfolio will be displayed here once you add content to Skills, Education, Experience, Certifications, or Projects sections."
            : "This user hasn't added any portfolio content yet."}
        </p>
        {isOwnProfile && (
          <Link
            href="/portfolio"
            className="inline-block mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Portfolio Content
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Skills Card */}
      {skills.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Skills</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">({skills.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill: any) => (
              <div
                key={skill.id}
                className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium"
              >
                {skill.skill_name}
                {skill.proficiency_level && (
                  <span className="ml-2 text-xs opacity-75">
                    ({capitalize(skill.proficiency_level)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education Card */}
      {education.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Education</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">({education.length})</span>
          </div>
          <div className="space-y-3">
            {education.map((edu: any) => (
              <div key={edu.id} className="pb-3 border-b border-gray-200 dark:border-gray-600 last:border-0 last:pb-0">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {edu.degree || edu.institution_name || edu.institution}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {edu.institution_name || edu.institution}
                  {edu.field_of_study && ` • ${edu.field_of_study}`}
                </p>
                {edu.start_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(edu.start_date).getFullYear()}
                    {edu.end_date && ` - ${new Date(edu.end_date).getFullYear()}`}
                    {edu.is_current && " (Current)"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Card */}
      {experience.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Work Experience</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">({experience.length})</span>
          </div>
          <div className="space-y-3">
            {experience.map((exp: any) => (
              <div key={exp.id} className="pb-3 border-b border-gray-200 dark:border-gray-600 last:border-0 last:pb-0">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {exp.job_title || exp.position}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {exp.company_name}
                  {exp.location && (
                    <span className="flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3" />
                      {exp.location}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {exp.start_date && (
                    <span>
                      {new Date(exp.start_date).toLocaleDateString()}
                      {exp.end_date && ` - ${new Date(exp.end_date).toLocaleDateString()}`}
                      {exp.is_current && " (Current)"}
                    </span>
                  )}
                  {exp.employment_type && (
                    <span className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                      {capitalize(exp.employment_type)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications Card */}
      {certifications.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Certifications</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">({certifications.length})</span>
          </div>
          <div className="space-y-3">
            {certifications.map((cert: any) => (
              <div key={cert.id} className="pb-3 border-b border-gray-200 dark:border-gray-600 last:border-0 last:pb-0">
                <h4 className="font-medium text-gray-900 dark:text-white">{cert.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{cert.issuing_organization}</p>
                {cert.issue_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Issued: {new Date(cert.issue_date).toLocaleDateString()}
                    {cert.expiration_date && ` • Expires: ${new Date(cert.expiration_date).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Card */}
      {projects.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Projects</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">({projects.length})</span>
          </div>
          <div className="space-y-3">
            {projects.map((project: any) => (
              <div key={project.id} className="pb-3 border-b border-gray-200 dark:border-gray-600 last:border-0 last:pb-0">
                <h4 className="font-medium text-gray-900 dark:text-white">{project.title}</h4>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                    {project.description}
                  </p>
                )}
                {project.project_url && (
                  <a
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Project
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}






