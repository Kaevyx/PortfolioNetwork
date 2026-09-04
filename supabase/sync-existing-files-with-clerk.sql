-- Script to sync existing profile pictures with Clerk
-- This updates Clerk user profile images to match Supabase avatar_url

-- Note: This is a reference script - actual Clerk updates must be done via API
-- Run this to identify profiles that need syncing:

SELECT 
  p.clerk_id,
  p.display_name,
  p.avatar_url,
  CASE 
    WHEN p.avatar_url IS NOT NULL AND p.avatar_url != '' THEN 'needs_sync'
    ELSE 'no_avatar'
  END as sync_status
FROM profiles p
WHERE p.avatar_url IS NOT NULL 
  AND p.avatar_url != ''
ORDER BY p.created_at DESC;

-- To actually sync, you'll need to:
-- 1. Use Clerk API to update each user's imageUrl
-- 2. Or create a one-time migration script in your app






