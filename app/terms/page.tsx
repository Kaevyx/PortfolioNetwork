import { createClient } from "@/lib/supabase/server";
import { RelativeTime } from "@/components/RelativeTime";

async function getPublishedTermsOfService() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('policy_documents')
    .select('*')
    .eq('policy_type', 'terms_of_service')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getAllTermsVersions() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('policy_documents')
    .select('version, title, published_at, expired_at, is_published')
    .eq('policy_type', 'terms_of_service')
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}

export default async function TermsPage(
  props: {
    searchParams?: Promise<{ v?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  // If version is specified, fetch that version; otherwise fetch published
  const supabase = await createClient();
  let document = null;

  if (searchParams?.v) {
    const { data } = await supabase
      .from('policy_documents')
      .select('*')
      .eq('policy_type', 'terms_of_service')
      .eq('version', searchParams.v)
      .single();
    document = data;
  } else {
    document = await getPublishedTermsOfService();
  }

  // Get all versions for history
  const allVersions = await getAllTermsVersions();

  // If no document found, show a default message or 404
  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 md:p-12">
            <h1 className="text-4xl font-bold mb-8 gradient-text">Terms of Service</h1>
            <p className="text-gray-700 dark:text-gray-300">
              No terms of service document has been published yet. Please check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 gradient-text">{document.title}</h1>
              <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Version {document.version}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {document.created_at && (
                    <span>
                      Created: {new Date(document.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} • <RelativeTime date={document.created_at} />
                    </span>
                  )}
                  {document.updated_at && (
                    <span>
                      Last updated: <RelativeTime date={document.updated_at} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />

          {/* Version History */}
          {allVersions.length > 1 && (
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Version History
              </h2>
              <div className="space-y-2">
                {allVersions.map((version) => (
                  <div
                    key={version.version}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {version.title || `Version ${version.version}`}
                      </span>
                      {version.is_published && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          Current
                        </span>
                      )}
                      {version.expired_at && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          Expired {new Date(version.expired_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {version.published_at && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Published: {new Date(version.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      )}
                      <a
                        href={`/terms?v=${version.version}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Version
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
