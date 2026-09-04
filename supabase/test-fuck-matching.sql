-- Test script to verify "fuck" keyword configuration and matching
-- This helps diagnose why "fuck you" might not be matching

-- 1. Check if "fuck" exists and is active
SELECT 
  id,
  keyword,
  category,
  severity,
  match_type,
  is_active,
  custom_message,
  created_at
FROM blocked_keywords
WHERE LOWER(TRIM(keyword)) = 'fuck'
ORDER BY is_active DESC, created_at DESC;

-- 2. Check for any variations or duplicates
SELECT 
  id,
  keyword,
  match_type,
  is_active
FROM blocked_keywords
WHERE LOWER(keyword) LIKE '%fuck%'
ORDER BY keyword, is_active DESC;

-- 3. Verify the keyword is being loaded by the function
SELECT * FROM get_active_blocked_keywords()
WHERE LOWER(TRIM(keyword)) = 'fuck';

-- Expected result for "fuck you" to be blocked:
-- - keyword: "fuck" (exact, case-insensitive)
-- - match_type: "contains" (not "exact")
-- - is_active: TRUE

-- If the keyword exists but isn't matching, possible issues:
-- 1. match_type is "exact" instead of "contains" → UPDATE to "contains"
-- 2. is_active is FALSE → UPDATE to TRUE
-- 3. Keyword has extra spaces → TRIM and check
-- 4. Cache needs clearing → Clear moderation cache in admin dashboard

