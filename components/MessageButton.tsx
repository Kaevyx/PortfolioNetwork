"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

interface MessageButtonProps {
  userId: string;
  className?: string;
}

export function MessageButton({ userId, className = "" }: MessageButtonProps) {
  const router = useRouter();

  const handleMessage = () => {
    // Navigate to inbox with the user ID as a query parameter
    router.push(`/inbox?user=${userId}`);
  };

  return (
    <button
      onClick={handleMessage}
      className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ${className}`}
    >
      <MessageSquare className="w-4 h-4" />
      Message
    </button>
  );
}

