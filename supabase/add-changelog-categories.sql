-- Add new changelog entry categories: general_update and general_notice

-- First, drop the existing constraint
ALTER TABLE changelog_entries
DROP CONSTRAINT IF EXISTS changelog_entries_category_check;

-- Add the new constraint with all categories including the new ones
ALTER TABLE changelog_entries
ADD CONSTRAINT changelog_entries_category_check 
CHECK (category IN (
  'bug_fix',
  'improvement',
  'new_feature',
  'security_update',
  'deprecation',
  'general_update',
  'general_notice',
  'other'
));

