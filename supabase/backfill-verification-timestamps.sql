-- Backfill verification_approved_at for users who are verified but don't have a timestamp
-- This is useful for users who were verified before the timestamp tracking was added

-- Option 1: Set verification_approved_at to the profile's created_at date (if they were verified from the start)
-- This assumes users who are verified but have no timestamp were verified when their profile was created
UPDATE profiles
SET verification_approved_at = created_at
WHERE is_verified = TRUE
  AND verification_approved_at IS NULL
  AND created_at IS NOT NULL;

-- Option 2: Set verification_approved_at to a recent date (e.g., 7 days ago)
-- Uncomment this if you prefer to use a fixed recent date instead
-- UPDATE profiles
-- SET verification_approved_at = NOW() - INTERVAL '7 days'
-- WHERE is_verified = TRUE
--   AND verification_approved_at IS NULL;

-- Option 3: Set verification_approved_at to the verification_request's updated_at if it exists
-- This is the most accurate if verification requests table has the approval date
UPDATE profiles p
SET verification_approved_at = (
  SELECT updated_at
  FROM verification_requests vr
  WHERE vr.profile_id = p.clerk_id
    AND vr.status = 'approved'
  ORDER BY updated_at DESC
  LIMIT 1
)
WHERE p.is_verified = TRUE
  AND p.verification_approved_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM verification_requests vr
    WHERE vr.profile_id = p.clerk_id
      AND vr.status = 'approved'
  );

-- Check how many users were updated
SELECT 
  COUNT(*) as backfilled_count,
  MIN(verification_approved_at) as earliest_timestamp,
  MAX(verification_approved_at) as latest_timestamp
FROM profiles
WHERE is_verified = TRUE
  AND verification_approved_at IS NOT NULL;

