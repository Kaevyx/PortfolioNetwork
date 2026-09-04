-- Fix Single Character Keywords
-- This script identifies and optionally removes problematic single-character keywords
-- that can cause false positives (like "?" matching everything)

-- First, let's see what single-character keywords exist
SELECT 
  id,
  keyword,
  category,
  severity,
  match_type,
  is_active,
  created_at
FROM blocked_keywords
WHERE LENGTH(TRIM(keyword)) < 2
ORDER BY keyword, created_at;

-- If you want to deactivate (not delete) these keywords, run:
-- UPDATE blocked_keywords
-- SET is_active = FALSE,
--     updated_at = NOW()
-- WHERE LENGTH(TRIM(keyword)) < 2
--   AND is_active = TRUE;

-- If you want to delete them completely, run:
-- DELETE FROM blocked_keywords
-- WHERE LENGTH(TRIM(keyword)) < 2;

-- Also check for keywords that normalize to empty strings
-- (single punctuation marks, etc.)
-- Note: This is harder to detect in SQL, but the application code now handles this

