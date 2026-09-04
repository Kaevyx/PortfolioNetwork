-- Add category field to changelog_versions table
-- Categories: minor_update, major_update, patch, security_patch, maintenance, release_candidate, beta, alpha

ALTER TABLE changelog_versions
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
  'minor_update',
  'major_update',
  'patch',
  'security_patch',
  'maintenance',
  'release_candidate',
  'beta',
  'alpha'
));

-- Create index for version category lookups
CREATE INDEX IF NOT EXISTS idx_changelog_versions_category ON changelog_versions(category);

