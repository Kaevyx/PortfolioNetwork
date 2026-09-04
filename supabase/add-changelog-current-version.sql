-- Add current version tracking to changelog system
-- Similar to policy documents, track which version is "current"

-- Add is_current flag to changelog_entries
ALTER TABLE changelog_entries
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT FALSE;

-- Create index for current version lookups
CREATE INDEX IF NOT EXISTS idx_changelog_entries_is_current ON changelog_entries(is_current);

-- Function to ensure only one version is marked as current
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If this version is being marked as current, unmark all other current versions
  IF NEW.is_current = TRUE AND (OLD.is_current IS NULL OR OLD.is_current = FALSE) THEN
    UPDATE changelog_entries
    SET is_current = FALSE
    WHERE id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single current version
DROP TRIGGER IF EXISTS ensure_single_current_version_trigger ON changelog_entries;
CREATE TRIGGER ensure_single_current_version_trigger
  BEFORE INSERT OR UPDATE ON changelog_entries
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_version();

-- Function to get current version
CREATE OR REPLACE FUNCTION get_current_changelog_version()
RETURNS TEXT AS $$
DECLARE
  current_version TEXT;
BEGIN
  SELECT version INTO current_version
  FROM changelog_entries
  WHERE is_current = TRUE
    AND is_published = TRUE
  ORDER BY published_at DESC
  LIMIT 1;
  
  RETURN current_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest published version (if no current is set)
CREATE OR REPLACE FUNCTION get_latest_changelog_version()
RETURNS TEXT AS $$
DECLARE
  latest_version TEXT;
BEGIN
  SELECT version INTO latest_version
  FROM changelog_entries
  WHERE is_published = TRUE
  ORDER BY published_at DESC
  LIMIT 1;
  
  RETURN latest_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

