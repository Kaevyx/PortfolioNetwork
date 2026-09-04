-- Add "fuck" and common variations as keywords
-- This ensures we catch "fuck" in various contexts

-- First, ensure "fuck" exists as a single-word keyword
INSERT INTO blocked_keywords (keyword, category, severity, match_type, is_active, created_by)
SELECT 
  'fuck',
  'offensive_language',
  'high',
  'contains',
  TRUE,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_keywords 
  WHERE LOWER(TRIM(keyword)) = 'fuck' 
    AND match_type = 'contains'
    AND is_active = TRUE
);

-- Add "fuck you" as a phrase (catches the specific phrase)
INSERT INTO blocked_keywords (keyword, category, severity, match_type, is_active, created_by)
SELECT 
  'fuck you',
  'offensive_language',
  'high',
  'contains',
  TRUE,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_keywords 
  WHERE LOWER(TRIM(keyword)) = 'fuck you' 
    AND match_type = 'contains'
    AND is_active = TRUE
);

-- Add other common variations
INSERT INTO blocked_keywords (keyword, category, severity, match_type, is_active, created_by)
SELECT 
  keyword_variation,
  'offensive_language',
  'high',
  'contains',
  TRUE,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)
FROM (VALUES 
  ('fucking'),
  ('fucked'),
  ('fucker'),
  ('fuck off'),
  ('fuck that'),
  ('fuck this')
) AS variations(keyword_variation)
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_keywords 
  WHERE LOWER(TRIM(keyword)) = LOWER(TRIM(variations.keyword_variation))
    AND match_type = 'contains'
    AND is_active = TRUE
);

-- Verify all were added
SELECT 
  keyword,
  match_type,
  is_active,
  category,
  severity
FROM blocked_keywords
WHERE LOWER(keyword) LIKE '%fuck%'
  AND is_active = TRUE
ORDER BY keyword;

