-- Fix Category Constraint Issue
-- The CHECK constraint might be blocking valid categories from moderation_categories table

-- 1. Check current CHECK constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'blocked_keywords'::regclass
  AND conname = 'blocked_keywords_category_check';

-- 2. Check what categories exist in moderation_categories
SELECT 
  name,
  display_name,
  is_active
FROM moderation_categories
WHERE is_active = TRUE
ORDER BY display_name;

-- 3. Check if "adult_content" exists
SELECT 
  name,
  display_name,
  is_active
FROM moderation_categories
WHERE LOWER(name) = 'adult_content'
   OR LOWER(display_name) LIKE '%adult%';

-- 4. Drop the CHECK constraint to allow dynamic categories
-- This allows any category that exists in moderation_categories to be used
ALTER TABLE blocked_keywords
DROP CONSTRAINT IF EXISTS blocked_keywords_category_check;

-- 5. Verify the constraint is dropped
SELECT 
  conname as constraint_name
FROM pg_constraint
WHERE conrelid = 'blocked_keywords'::regclass
  AND conname = 'blocked_keywords_category_check';
-- Should return no rows

-- Note: Categories are now validated through the moderation_categories table
-- The application should ensure categories exist before saving keywords

