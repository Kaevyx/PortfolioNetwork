"use client";

import { useState } from "react";
import { Share2, Copy, Check, Twitter, Linkedin, Facebook } from "lucide-react";
import { getProfileUrl } from "@/lib/utils/getProfileUrl";

interface ShareProfileButtonProps {
  profile: {
    username?: string | null;
    clerk_id: string;
    display_name: string;
  };
  variant?: "button" | "icon";
}

export function ShareProfileButton({ profile, variant = "button" }: ShareProfileButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileUrl = getProfileUrl(profile);
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${profileUrl}` : '';

  const handleCopy = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    }
  };

  const handleShare = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const text = `Check out ${profile.display_name}'s profile on Portfolio Network`;
    const encodedUrl = encodeURIComponent(fullUrl);
    const encodedText = encodeURIComponent(text);

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setShowMenu(false);
    }
  };

  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Share profile"
        >
          <Share2 className="w-5 h-5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 min-w-[200px]">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy link</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Twitter className="w-4 h-4" />
              <span>Share on Twitter</span>
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              <span>Share on LinkedIn</span>
            </button>
            <button
              onClick={() => handleShare('facebook')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Facebook className="w-4 h-4" />
              <span>Share on Facebook</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 min-w-[200px]">
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy link</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Twitter className="w-4 h-4" />
            <span>Share on Twitter</span>
          </button>
          <button
            onClick={() => handleShare('linkedin')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            <span>Share on LinkedIn</span>
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Facebook className="w-4 h-4" />
            <span>Share on Facebook</span>
          </button>
        </div>
      )}
    </div>
  );
}


