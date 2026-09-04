-- Check Row Level Security policies on user_subscriptions table
-- These might be preventing updates

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'user_subscriptions';

-- List all RLS policies on user_subscriptions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions';

-- Check the actual subscription record
SELECT 
  id,
  user_id,
  status,
  plan_id,
  cancelled_at,
  cancellation_reason,
  created_at
FROM user_subscriptions
WHERE id = '364c90b1-21a2-4a7d-9159-9134fc2630ba';

-- Try a direct update to see if it works
-- This will help us determine if it's a code issue or database permission issue
UPDATE user_subscriptions
SET 
  status = 'suspended',
  cancellation_reason = 'Test suspension',
  cancelled_at = NULL
WHERE id = '364c90b1-21a2-4a7d-9159-9134fc2630ba'
RETURNING id, status, cancellation_reason;

-- Check the status again after update
SELECT 
  id,
  user_id,
  status,
  plan_id,
  cancelled_at,
  cancellation_reason
FROM user_subscriptions
WHERE id = '364c90b1-21a2-4a7d-9159-9134fc2630ba';

