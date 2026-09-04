"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function FooterVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const supabase = createClient();
        
        // Get latest version with published_at date
        const { data: latest } = await supabase
          .from('changelog_versions')
          .select('version, published_at')
          .eq('is_latest', true)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest?.version) {
          setVersion(latest.version);
          if (latest.published_at) {
            setLastUpdated(new Date(latest.published_at));
          }
        } else {
          // Fallback to latest published version
          const { data: fallback } = await supabase
            .from('changelog_versions')
            .select('version, published_at')
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallback?.version) {
            setVersion(fallback.version);
            if (fallback.published_at) {
              setLastUpdated(new Date(fallback.published_at));
            }
          }
        }
      } catch (error) {
        console.error("Error loading version:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVersion();
  }, []);

  if (loading || !version) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 mt-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Version</span>
        <Link
          href="/changelog"
          className="text-gray-400 hover:text-white transition-colors font-medium"
        >
          {version}
        </Link>
      </div>
      {lastUpdated && (
        <p className="text-xs text-gray-500">
          Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </p>
      )}
    </div>
  );
}

