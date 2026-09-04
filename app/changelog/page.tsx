import { createClient } from "@/lib/supabase/server";
import { RelativeTime } from "@/components/RelativeTime";
import { Bug, Sparkles, FileText, Shield, AlertTriangle, Info, Star } from "lucide-react";

const versionCategoryConfig = {
  minor_update: { 
    label: 'Minor Update', 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  major_update: { 
    label: 'Major Update', 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300'
  },
  patch: { 
    label: 'Patch', 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
  security_patch: { 
    label: 'Security Patch', 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300'
  },
  maintenance: { 
    label: 'Maintenance', 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300'
  },
  release_candidate: { 
    label: 'Release Candidate', 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  beta: { 
    label: 'Beta', 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  alpha: { 
    label: 'Alpha', 
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    textClass: 'text-pink-700 dark:text-pink-300'
  },
};

const categoryConfig = {
  bug_fix: { 
    label: 'Bug Fix', 
    icon: Bug, 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300'
  },
  improvement: { 
    label: 'Improvement', 
    icon: Sparkles, 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  new_feature: { 
    label: 'New Feature', 
    icon: FileText, 
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-300'
  },
  security_update: { 
    label: 'Security Update', 
    icon: Shield, 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  deprecation: { 
    label: 'Deprecation', 
    icon: AlertTriangle, 
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    textClass: 'text-yellow-700 dark:text-yellow-300'
  },
  general_update: { 
    label: 'General Update', 
    icon: Info, 
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  general_notice: { 
    label: 'General Notice', 
    icon: Info, 
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    textClass: 'text-indigo-700 dark:text-indigo-300'
  },
  other: { 
    label: 'Other', 
    icon: Info, 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
};

const priorityConfig = {
  low: { 
    label: 'Low', 
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300'
  },
  normal: { 
    label: 'Normal', 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  high: { 
    label: 'High', 
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  critical: { 
    label: 'Critical', 
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-300'
  },
};

async function getChangelogVersions() {
  const supabase = await createClient();
  
  // Get published versions with their entries
  const { data: versions, error: versionsError } = await supabase
    .from('changelog_versions')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (versionsError) {
    console.error("Error fetching versions:", versionsError);
    return [];
  }

  // Get entries for each version
  const versionsWithEntries = await Promise.all(
    (versions || []).map(async (version: any) => {
      const { data: entries } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('version_id', version.id)
        .order('created_at', { ascending: false });

      return {
        ...version,
        entries: entries || [],
      };
    })
  );

  return versionsWithEntries;
}

async function getLatestVersion() {
  const supabase = await createClient();
  
  // Get latest version
  const { data: latest } = await supabase
    .from('changelog_versions')
    .select('version')
    .eq('is_latest', true)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.version) {
    return latest.version;
  }

  // Fallback to latest published version
  const { data: fallback } = await supabase
    .from('changelog_versions')
    .select('version')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return fallback?.version || null;
}

export default async function ChangelogPage() {
  const versions = await getChangelogVersions();
  const latestVersion = await getLatestVersion();

  // Sort versions - try to parse as numbers first, otherwise string compare
  const sortedVersions = [...versions].sort((a, b) => {
    const aNum = parseFloat(a.version);
    const bNum = parseFloat(b.version);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return bNum - aNum;
    }
    return b.version.localeCompare(a.version);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 gradient-text">Platform Changelog</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay updated with the latest changes, improvements, and new features
            </p>
            {latestVersion && (
              <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2">
                Latest Version: <span className="font-semibold">{latestVersion}</span>
              </p>
            )}
          </div>

          {sortedVersions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No changelog versions have been published yet. Check back soon for updates!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedVersions.map((version) => {
                const versionEntries = version.entries || [];
                const publishedDate = version.published_at;

                return (
                  <div key={version.id} className="border-l-4 border-indigo-500 pl-6 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {version.title ? version.title : `Version ${version.version}`}
                          </h2>
                          {version.category && versionCategoryConfig[version.category] && (
                            <span className={`text-xs px-2 py-1 rounded-full ${versionCategoryConfig[version.category].bgClass} ${versionCategoryConfig[version.category].textClass}`}>
                              {versionCategoryConfig[version.category].label}
                            </span>
                          )}
                          {version.is_latest && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Latest
                            </span>
                          )}
                        </div>
                        {!version.title && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Version {version.version}
                          </p>
                        )}
                        {version.description && (
                          <div 
                            className="text-sm text-gray-600 dark:text-gray-400 mt-2 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: version.description }}
                          />
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {version.created_at && (
                            <span>
                              Created: {new Date(version.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={version.created_at} />
                            </span>
                          )}
                          {publishedDate && (
                            <span>
                              Published: {new Date(publishedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={publishedDate} />
                            </span>
                          )}
                          {version.updated_at && (
                            <span>
                              Last updated: <RelativeTime date={version.updated_at} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {versionEntries.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No entries in this version.
                        </p>
                      ) : (
                        versionEntries.map((entry) => {
                        const categoryConfigEntry = categoryConfig[entry.category];
                        const CategoryIcon = categoryConfigEntry.icon;
                        const priorityConfigEntry = priorityConfig[entry.priority];

                        return (
                          <div
                            key={entry.id}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded-full ${categoryConfigEntry.bgClass} ${categoryConfigEntry.textClass} flex items-center gap-1`}>
                                  <CategoryIcon className="w-3 h-3" />
                                  {categoryConfigEntry.label}
                                </span>
                                {entry.priority !== 'normal' && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${priorityConfigEntry.bgClass} ${priorityConfigEntry.textClass}`}>
                                    {priorityConfigEntry.label}
                                  </span>
                                )}
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {entry.title}
                            </h3>
                            <div 
                              className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-2"
                              dangerouslySetInnerHTML={{ __html: entry.description }}
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <span>
                                Created: {new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={entry.created_at} />
                              </span>
                              {entry.updated_at && entry.updated_at !== entry.created_at && (
                                <span className="ml-3">
                                  Updated: <RelativeTime date={entry.updated_at} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

