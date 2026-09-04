"use client";

import { Briefcase, GraduationCap, Award, Code, FileText, ExternalLink, MapPin, Calendar, Building2 } from "lucide-react";
import Link from "next/link";

interface PortfolioOverviewProps {
  profile: any;
  skills: any[];
  education: any[];
  experience: any[];
  certifications: any[];
  projects: any[];
  isOwnProfile: boolean;
}

export function PortfolioOverview({
  profile,
  skills,
  education,
  experience,
  certifications,
  projects,
  isOwnProfile,
}: PortfolioOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Skills Section */}
      {skills.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Skills</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill: any) => (
              <div
                key={skill.id}
                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium"
              >
                {skill.skill_name}
                {skill.proficiency_level && (
                  <span className="ml-2 text-xs opacity-75">
                    ({skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education Section */}
      {education.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Education</h2>
          </div>
          <div className="space-y-4">
            {education.map((edu: any) => (
              <div
                key={edu.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {edu.degree || edu.institution_name || edu.institution}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {edu.institution_name || edu.institution}
                      {edu.field_of_study && ` • ${edu.field_of_study}`}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {edu.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(edu.start_date).getFullYear()}
                          {edu.end_date && ` - ${new Date(edu.end_date).getFullYear()}`}
                          {edu.is_current && " (Current)"}
                        </span>
                      )}
                    </div>
                    {edu.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {edu.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Section */}
      {experience.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Work Experience</h2>
          </div>
          <div className="space-y-4">
            {experience.map((exp: any) => (
              <div
                key={exp.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {exp.job_title || exp.position}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {exp.company_name}
                      {exp.location && (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3" />
                          {exp.location}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {exp.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(exp.start_date).toLocaleDateString()}
                          {exp.end_date && ` - ${new Date(exp.end_date).toLocaleDateString()}`}
                          {exp.is_current && " (Current)"}
                        </span>
                      )}
                      {exp.employment_type && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                          {exp.employment_type}
                        </span>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications Section */}
      {certifications.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Certifications</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {certifications.map((cert: any) => (
              <div
                key={cert.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                  {cert.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {cert.issuing_organization}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {cert.issue_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Issued: {new Date(cert.issue_date).toLocaleDateString()}
                    </span>
                  )}
                  {cert.expiration_date && (
                    <span>
                      Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {cert.credential_url && (
                  <a
                    href={cert.credential_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline mt-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Verify Credential
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Projects</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => (
              <div
                key={project.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
              >
                {project.image_url && (
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    {project.title}
                  </h3>
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
                  {project.project_url && (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Project
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {skills.length === 0 && education.length === 0 && experience.length === 0 && certifications.length === 0 && projects.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Portfolio Items Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isOwnProfile
              ? "Start building your portfolio to showcase your work and achievements."
              : "This user hasn't added any portfolio items yet."}
          </p>
        </div>
      )}
    </div>
  );
}

