"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Component that applies user settings globally across the app
 * Loads and applies appearance settings (theme, font size, compact mode, animations)
 */
export function SettingsManager() {
  const { user, isLoaded } = useUser();
  const supabase = createClient();

  // Apply initial theme immediately (before user loads)
  useEffect(() => {
    // Check localStorage for theme preference first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove("dark");
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const loadAndApplySettings = async () => {
      try {
        // If user is not logged in, use system preference
        if (!user?.id) {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("settings")
          .eq("clerk_id", user.id)
          .single();

        if (!data?.settings?.appearance) {
          // No settings, use system preference
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          return;
        }

        const appearance = data.settings.appearance;

        // Apply theme
        if (appearance.theme === "dark") {
          document.documentElement.classList.add("dark");
          localStorage.setItem('theme', 'dark');
        } else if (appearance.theme === "light") {
          document.documentElement.classList.remove("dark");
          localStorage.setItem('theme', 'light');
        } else {
          // System theme
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          localStorage.setItem('theme', 'system');
        }

        // Apply font size
        document.documentElement.classList.remove("font-size-small", "font-size-medium", "font-size-large");
        if (appearance.fontSize) {
          document.documentElement.classList.add(`font-size-${appearance.fontSize}`);
        }

        // Apply compact mode
        if (appearance.compactMode) {
          document.documentElement.classList.add("compact-mode");
        } else {
          document.documentElement.classList.remove("compact-mode");
        }

        // Apply animations
        if (appearance.showAnimations === false) {
          document.documentElement.classList.add("no-animations");
        } else {
          document.documentElement.classList.remove("no-animations");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        // Fallback to system preference on error
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    loadAndApplySettings();

    // Listen for system theme changes if using system theme
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("settings")
        .eq("clerk_id", user.id)
        .single();

      if (data?.settings?.appearance?.theme === "system") {
        if (mediaQuery.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [isLoaded, user?.id]);

  // This component doesn't render anything
  return null;
}

