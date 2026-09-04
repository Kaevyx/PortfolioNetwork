"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
}

export function RelativeTime({ date, className = "" }: RelativeTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setRelativeTime(formatDistanceToNow(new Date(date), { addSuffix: true }));
    };
    updateTime();
    
    // Update every minute to keep it fresh
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [date]);

  // Show a placeholder during SSR and initial render to avoid hydration mismatch
  if (!mounted) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{relativeTime}</span>;
}

