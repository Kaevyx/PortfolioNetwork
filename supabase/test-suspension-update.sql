-- Diagnostic query to test if subscription suspension works
-- Replace the subscription_id with the actual ID from your data

-- First, check the current status
SELECT 
  id,
  user_id,
  status,
  plan_id,
  cancelled_at,
  cancellation_reason
FROM user_subscriptions
WHERE id = '364c90b1-21a2-4a7d-9159-9134fc2630ba';

-- Try to update the status manually
UPDATE user_subscriptions
SET 
  status = 'suspended',
  cancellation_reason = 'Suspended by admin',
  cancelled_at = NULL
WHERE id = '364c90b1-21a2-4a7d-9159-9134fc2630ba';

-- Check the status again
SELECT 
  id,
  user_id,
  status,
  plan_id,
  cancelled_at,
  cancellation_reason
FROM user_subscriptions
WHERE id = '364c90b1-21a2-4a7d-9159-9134fc2630ba';

-- Check if the status constraint allows 'suspended'
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_subscriptions'::regclass
  AND conname LIKE '%status%';

