-- Add "punch" keyword for violence category
-- This ensures consistency between frontend and backend moderation

-- Check if "punch" already exists
SELECT 
  id,
  keyword,
  category,
  severity,
  match_type,
  is_active
FROM blocked_keywords
WHERE LOWER(keyword) = 'punch';

-- If it doesn't exist, add it:
INSERT INTO blocked_keywords (keyword, category, severity, match_type, is_active, created_by)
SELECT 
  'punch',
  'violence',
  'medium',
  'contains',
  TRUE,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_keywords 
  WHERE LOWER(keyword) = 'punch' 
    AND match_type = 'contains'
    AND is_active = TRUE
);

-- Also add "punching" if it doesn't exist
INSERT INTO blocked_keywords (keyword, category, severity, match_type, is_active, created_by)
SELECT 
  'punching',
  'violence',
  'medium',
  'contains',
  TRUE,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_keywords 
  WHERE LOWER(keyword) = 'punching' 
    AND match_type = 'contains'
    AND is_active = TRUE
);

