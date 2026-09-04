-- Check "fuck" keyword configuration
-- This helps identify why "fuck you" might not be matching

-- Check if "fuck" exists as a keyword
SELECT 
  id,
  keyword,
  category,
  severity,
  match_type,
  is_active,
  custom_message,
  created_at,
  updated_at
FROM blocked_keywords
WHERE LOWER(keyword) = 'fuck'
ORDER BY is_active DESC, match_type, created_at;

-- If "fuck" exists but has match_type = 'exact', it will only match the exact text "fuck"
-- To match "fuck" in phrases like "fuck you", it needs match_type = 'contains'

-- To fix: Update "fuck" to use 'contains' match type
-- UPDATE blocked_keywords
-- SET match_type = 'contains',
--     updated_at = NOW()
-- WHERE LOWER(keyword) = 'fuck'
--   AND match_type = 'exact';

-- Also check for variations
SELECT 
  id,
  keyword,
  category,
  severity,
  match_type,
  is_active
FROM blocked_keywords
WHERE LOWER(keyword) LIKE '%fuck%'
ORDER BY keyword, is_active DESC;

