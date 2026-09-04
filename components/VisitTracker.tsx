"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem("visit_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("visit_session_id", sessionId);
  }
  return sessionId;
}

// Parse user agent to extract device info
function parseUserAgent(): {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
} {
  if (typeof window === "undefined" || !navigator.userAgent) {
    return {
      browserName: "Unknown",
      browserVersion: "",
      osName: "Unknown",
      osVersion: "",
      deviceType: "desktop",
      deviceBrand: "",
      deviceModel: "",
    };
  }

  const ua = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "";
  let osName = "Unknown";
  let osVersion = "";
  let deviceType = "desktop";
  let deviceBrand = "";
  let deviceModel = "";

  // Browser detection
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browserName = "Chrome";
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : "";
  } else if (ua.includes("Firefox")) {
    browserName = "Firefox";
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : "";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browserName = "Safari";
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : "";
  } else if (ua.includes("Edg")) {
    browserName = "Edge";
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : "";
  }

  // OS detection
  if (ua.includes("Windows")) {
    osName = "Windows";
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    osVersion = match ? match[1] : "";
  } else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) {
    osName = "macOS";
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace("_", ".") : "";
  } else if (ua.includes("Linux")) {
    osName = "Linux";
  } else if (ua.includes("Android")) {
    osName = "Android";
    const match = ua.match(/Android (\d+\.\d+)/);
    osVersion = match ? match[1] : "";
    deviceType = "mobile";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    osName = "iOS";
    const match = ua.match(/OS (\d+[._]\d+)/);
    osVersion = match ? match[1].replace("_", ".") : "";
    deviceType = ua.includes("iPad") ? "tablet" : "mobile";
    deviceBrand = "Apple";
    deviceModel = ua.includes("iPad") ? "iPad" : "iPhone";
  }

  // Device type detection
  if (deviceType === "desktop") {
    if (window.innerWidth < 768) {
      deviceType = "mobile";
    } else if (window.innerWidth < 1024) {
      deviceType = "tablet";
    }
  }

  return {
    browserName,
    browserVersion,
    osName,
    osVersion,
    deviceType,
    deviceBrand,
    deviceModel,
  };
}

// Get location from browser (if available)
async function getLocation(): Promise<{
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Try to get location from browser geolocation (requires permission)
  // For privacy, we'll use IP-based geolocation via API instead
  // This would typically be done server-side, but for now we'll return defaults
  
  return {
    country: "",
    countryCode: "",
    region: "",
    city: "",
    latitude: null,
    longitude: null,
    timezone: timezone || "",
  };
}

export function VisitTracker() {
  const pathname = usePathname();
  const { user } = useUser();
  const sessionIdRef = useRef<string>("");
  const pageStartTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>("");
  const scrollDepthRef = useRef<number>(0);
  const hasTrackedRef = useRef<boolean>(false);

  useEffect(() => {
    // Skip tracking for admin pages or API routes
    if (pathname?.startsWith("/api") || pathname?.startsWith("/admin")) {
      return;
    }

    // Initialize session
    if (!sessionIdRef.current) {
      sessionIdRef.current = getSessionId();
    }

    // Check if this is an entry page (first visit in session or new path)
    const isEntryPage = lastPathRef.current === "" || lastPathRef.current !== pathname;
    lastPathRef.current = pathname || "";

    // Reset tracking for new page
    pageStartTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
    hasTrackedRef.current = false;

    // Track page view
    const trackVisit = async () => {
      if (hasTrackedRef.current || !pathname) return;
      hasTrackedRef.current = true;

      const deviceInfo = parseUserAgent();
      const locationInfo = await getLocation();
      const timeOnPage = Math.floor((Date.now() - pageStartTimeRef.current) / 1000);

      try {
        const response = await fetch("/api/visits/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            pagePath: pathname,
            pageTitle: document.title,
            referrer: document.referrer || null,
            entryPage: isEntryPage,
            userAgent: navigator.userAgent,
            browserName: deviceInfo.browserName,
            browserVersion: deviceInfo.browserVersion,
            osName: deviceInfo.osName,
            osVersion: deviceInfo.osVersion,
            deviceType: deviceInfo.deviceType,
            deviceBrand: deviceInfo.deviceBrand,
            deviceModel: deviceInfo.deviceModel,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timeOnPage: timeOnPage > 0 ? timeOnPage : null,
            scrollDepth: scrollDepthRef.current,
            ...locationInfo,
          }),
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          await response.json();
        }
      } catch (error) {
        // Silently fail - don't log to console in production
        if (process.env.NODE_ENV === "development") {
          console.error("Error tracking visit:", error);
        }
      }
    };

    // Track initial page view after a short delay
    const trackTimeout = setTimeout(trackVisit, 1000);

    // Track scroll depth
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );
      scrollDepthRef.current = Math.max(scrollDepthRef.current, scrollPercent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Track time on page when leaving
    const handleBeforeUnload = () => {
      const timeOnPage = Math.floor((Date.now() - pageStartTimeRef.current) / 1000);
      if (timeOnPage > 0 && pathname) {
        // Use sendBeacon for reliable tracking on page unload
        const data = JSON.stringify({
          sessionId: sessionIdRef.current,
          pagePath: pathname,
          pageTitle: document.title,
          timeOnPage,
          scrollDepth: scrollDepthRef.current,
        });
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon("/api/visits/track", blob);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Periodic update for time on page (every 30 seconds)
    const updateInterval = setInterval(() => {
      if (!hasTrackedRef.current) return;
      
      const timeOnPage = Math.floor((Date.now() - pageStartTimeRef.current) / 1000);
      if (timeOnPage > 0 && pathname) {
        fetch("/api/visits/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            pagePath: pathname,
            timeOnPage,
            scrollDepth: scrollDepthRef.current,
            updateOnly: true, // Flag to update existing record
          }),
        }).catch(() => {
          // Silently fail for periodic updates
        });
      }
    }, 30000);

    return () => {
      clearTimeout(trackTimeout);
      clearInterval(updateInterval);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      // Final tracking on component unmount
      if (pathname) {
        const timeOnPage = Math.floor((Date.now() - pageStartTimeRef.current) / 1000);
        if (timeOnPage > 0) {
          const data = JSON.stringify({
            sessionId: sessionIdRef.current,
            pagePath: pathname,
            timeOnPage,
            scrollDepth: scrollDepthRef.current,
          });
          const blob = new Blob([data], { type: "application/json" });
          navigator.sendBeacon("/api/visits/track", blob);
        }
      }
    };
  }, [pathname, user?.id]);

  return null; // This component is invisible
}

