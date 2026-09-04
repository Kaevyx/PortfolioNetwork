"use client";

import { CheckCircle2 } from "lucide-react";

interface VerificationBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerificationBadge({ size = 'md', className = '' }: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-blue-500 text-white ${className}`}
      title="Verified Account"
    >
      <CheckCircle2 className={sizeClasses[size]} />
    </span>
  );
}






