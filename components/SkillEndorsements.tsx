"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { ThumbsUp, Users, CheckCircle2 } from "lucide-react";
import { AvatarImage } from "./AvatarImage";

interface SkillEndorsement {
  skill_name: string;
  endorsement_count: number;
  endorsers: string[];
}

interface SkillEndorsementsProps {
  userId: string;
  skillName?: string;
  isOwnProfile?: boolean;
}

export function SkillEndorsements({ userId, skillName, isOwnProfile = false }: SkillEndorsementsProps) {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [endorsements, setEndorsements] = useState<SkillEndorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [endorsing, setEndorsing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) {
      setLoading(false);
      return;
    }

    const loadEndorsements = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_user_skill_endorsements", {
          p_user_id: userId,
          p_skill_name: skillName || null,
        });

        if (error) {
          console.error("Error loading skill endorsements:", error);
          const errorCode = (error as any)?.code;
          if (errorCode === 'PGRST202' || errorCode === '42883') {
            console.warn("Skills features not yet configured. Please run the database migration: supabase/skills-features-system.sql");
          }
          setEndorsements([]);
          return;
        }

        setEndorsements(data || []);

        // Check which skills the current user has endorsed
        if (user?.id && user.id !== userId) {
          const { data: myEndorsements } = await supabase
            .from("skill_endorsements")
            .select("skill_name")
            .eq("endorser_id", user.id)
            .eq("endorsee_id", userId);

          if (myEndorsements) {
            setEndorsing(new Set(myEndorsements.map((e) => e.skill_name)));
          }
        }
      } catch (error) {
        console.error("Error loading skill endorsements:", error);
        setEndorsements([]);
      } finally {
        setLoading(false);
      }
    };

    loadEndorsements();
  }, [userId, skillName, user, isLoaded, supabase]);

  const handleToggleEndorsement = async (skillName: string) => {
    if (!user?.id || user.id === userId) return; // Can't endorse yourself

    const isEndorsing = endorsing.has(skillName);
    setEndorsing((prev) => {
      const newSet = new Set(prev);
      if (isEndorsing) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });

    try {
      const { data, error } = await supabase.rpc("toggle_skill_endorsement", {
        p_endorser_id: user.id,
        p_endorsee_id: userId,
        p_skill_name: skillName,
      });

      if (error) {
        console.error("Error toggling endorsement:", error);
        // Revert optimistic update
        setEndorsing((prev) => {
          const newSet = new Set(prev);
          if (isEndorsing) {
            newSet.add(skillName);
          } else {
            newSet.delete(skillName);
          }
          return newSet;
        });
        return;
      }

      // Update endorsement count in state
      setEndorsements((prev) =>
        prev.map((end) => {
          if (end.skill_name === skillName) {
            return {
              ...end,
              endorsement_count: (data as any)?.endorsement_count || end.endorsement_count,
            };
          }
          return end;
        })
      );
    } catch (error) {
      console.error("Error toggling endorsement:", error);
      // Revert optimistic update
      setEndorsing((prev) => {
        const newSet = new Set(prev);
        if (isEndorsing) {
          newSet.add(skillName);
        } else {
          newSet.delete(skillName);
        }
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    );
  }

  if (endorsements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {endorsements.map((endorsement) => (
        <div
          key={endorsement.skill_name}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white">
                {endorsement.skill_name}
              </span>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <ThumbsUp className="w-4 h-4" />
                <span>{endorsement.endorsement_count}</span>
                <span>endorsement{endorsement.endorsement_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {endorsement.endorsers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">Endorsed by:</span>
                <div className="flex items-center gap-1">
                  {endorsement.endorsers.slice(0, 3).map((name, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-gray-600 dark:text-gray-400 font-medium"
                    >
                      {name}
                      {idx < Math.min(2, endorsement.endorsers.length - 1) && ","}
                    </span>
                  ))}
                  {endorsement.endorsers.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{endorsement.endorsers.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          {!isOwnProfile && user?.id && user.id !== userId && (
            <button
              onClick={() => handleToggleEndorsement(endorsement.skill_name)}
              className={`ml-4 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                endorsing.has(endorsement.skill_name)
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${endorsing.has(endorsement.skill_name) ? "fill-current" : ""}`} />
              {endorsing.has(endorsement.skill_name) ? "Endorsed" : "Endorse"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

