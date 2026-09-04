-- Fix Storage RLS for Clerk Authentication
-- Since we're using Clerk (not Supabase Auth), we need to either:
-- 1. Disable RLS on storage buckets (recommended for Clerk)
-- 2. Use service role key for storage operations (already implemented in code)

-- Option 1: Disable RLS on storage buckets (Recommended)
-- Run this in Supabase SQL Editor:

-- Disable RLS for storage.objects (allows service role and anon key to work)
-- Note: Access control is handled at the application level with Clerk

-- For Supabase Storage, RLS is managed via bucket policies
-- Since we're using Clerk, we'll handle access control in the API routes
-- The buckets should be configured to allow uploads via service role

-- If you're still getting RLS errors, you may need to:
-- 1. Go to Supabase Dashboard → Storage → Your Bucket → Policies
-- 2. Remove or disable RLS policies
-- 3. Or ensure the service role key is being used (already implemented)

-- The code now uses createServiceRoleClient() which bypasses RLS
-- Make sure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file






