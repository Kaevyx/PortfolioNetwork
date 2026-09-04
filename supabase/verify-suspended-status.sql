-- Verify that suspended subscriptions are being returned correctly
-- Run this query to check if a specific user's subscription status is 'suspended'

-- Replace 'USER_CLERK_ID_HERE' with the actual user's Clerk ID
SELECT 
  us.id,
  us.user_id,
  us.status,
  us.plan_id,
  sp.name as plan_name,
  us.billing_cycle,
  us.cancelled_at,
  us.cancellation_reason
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'USER_CLERK_ID_HERE'
ORDER BY us.created_at DESC
LIMIT 1;

-- Test the RPC function directly
-- Replace 'USER_CLERK_ID_HERE' with the actual user's Clerk ID
SELECT * FROM get_user_subscription_details('USER_CLERK_ID_HERE');

-- Check if there are any subscriptions with status 'suspended'
SELECT 
  COUNT(*) as suspended_count,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'trial') as trial
FROM user_subscriptions;

