"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { TrendingUp, Users, ThumbsUp, Search, ArrowRight, Sparkles } from "lucide-react";

interface TrendingSkill {
  skill_name: string;
  user_count: number;
  endorsement_count: number;
  search_count: number;
  trending_score: number;
  growth_rate: number;
}

export function SkillsAnalytics({ limit = 20 }: { limit?: number }) {
  const supabase = createClient();
  const [trendingSkills, setTrendingSkills] = useState<TrendingSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrendingSkills = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_trending_skills", {
          p_limit: limit,
          p_min_users: 2,
        });

        if (error) {
          // Log detailed error information
          console.error("Error loading trending skills:", error);
          console.error("Error type:", typeof error);
          console.error("Error keys:", Object.keys(error || {}));
          console.error("Error stringified:", JSON.stringify(error, null, 2));
          
          const errorCode = (error as any)?.code;
          const errorMessage = (error as any)?.message || String(error);
          
          // Check if function doesn't exist
          if (errorCode === 'PGRST202' || errorCode === '42883' || 
              (errorMessage && errorMessage.toLowerCase().includes('function') && 
               errorMessage.toLowerCase().includes('does not exist'))) {
            console.warn("Skills features not yet configured. Please run the database migration: supabase/skills-features-system.sql");
          }
          setTrendingSkills([]);
          return;
        }

        setTrendingSkills(data || []);
      } catch (error) {
        console.error("Error loading trending skills:", error);
        setTrendingSkills([]);
      } finally {
        setLoading(false);
      }
    };

    loadTrendingSkills();
  }, [limit, supabase]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (trendingSkills.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700 text-center">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No trending skills data available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Trending Skills</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Most popular skills on the platform</p>
          </div>
        </div>
        <Link
          href="/explore?filter=skills"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {trendingSkills.map((skill, index) => (
          <Link
            key={skill.skill_name}
            href={`/explore?skill=${encodeURIComponent(skill.skill_name)}`}
            className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {skill.skill_name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{skill.user_count} users</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{skill.endorsement_count} endorsements</span>
                    </div>
                    {skill.search_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        <span>{skill.search_count} searches</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {skill.growth_rate > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{skill.growth_rate.toFixed(0)}%</span>
                </div>
              )}
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (skill.trending_score / (trendingSkills[0]?.trending_score || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

