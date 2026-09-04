-- Check for problematic "race" keyword
-- This script helps identify if "race" is being blocked incorrectly

-- Check if "race" exists as a keyword
SELECT 
  id,
  keyword,
  category,
  severity,
  match_type,
  custom_message,
  is_active,
  created_at
FROM blocked_keywords
WHERE LOWER(keyword) = 'race'
   OR LOWER(keyword) LIKE '%race%'
ORDER BY 
  CASE 
    WHEN LOWER(keyword) = 'race' THEN 1
    ELSE 2
  END,
  keyword;

-- If you find a standalone "race" keyword that's incorrectly categorized:
-- UPDATE blocked_keywords
-- SET category = 'racism',  -- or appropriate category
--     updated_at = NOW()
-- WHERE LOWER(keyword) = 'race'
--   AND category NOT IN ('racism', 'hate_speech');

-- Or if "race" should not be blocked at all (it's a legitimate word):
-- UPDATE blocked_keywords
-- SET is_active = FALSE,
--     updated_at = NOW()
-- WHERE LOWER(keyword) = 'race';

