-- Redesign Changelog System with Versions Table
-- Versions are created first, then entries are added to them

-- Create changelog_versions table
CREATE TABLE IF NOT EXISTS changelog_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL UNIQUE, -- Version tag (e.g., "1.2.0", "2024-01-15")
  title TEXT, -- Optional title for the version (e.g., "Major Update", "Security Patch")
  description TEXT, -- Optional description of what this version includes
  is_latest BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by TEXT, -- Clerk ID of admin who published
  created_by TEXT NOT NULL, -- Clerk ID of admin who created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Update changelog_entries to reference versions
ALTER TABLE changelog_entries
ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES changelog_versions(id) ON DELETE CASCADE;

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS idx_changelog_entries_version_id ON changelog_entries(version_id);
CREATE INDEX IF NOT EXISTS idx_changelog_versions_version ON changelog_versions(version);
CREATE INDEX IF NOT EXISTS idx_changelog_versions_is_latest ON changelog_versions(is_latest);
CREATE INDEX IF NOT EXISTS idx_changelog_versions_is_published ON changelog_versions(is_published);

-- Function to ensure only one version is marked as latest
CREATE OR REPLACE FUNCTION ensure_single_latest_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If this version is being marked as latest, unmark all other latest versions
  IF NEW.is_latest = TRUE AND (OLD.is_latest IS NULL OR OLD.is_latest = FALSE) THEN
    UPDATE changelog_versions
    SET is_latest = FALSE
    WHERE id != NEW.id
      AND is_latest = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single latest version
DROP TRIGGER IF EXISTS ensure_single_latest_version_trigger ON changelog_versions;
CREATE TRIGGER ensure_single_latest_version_trigger
  BEFORE INSERT OR UPDATE ON changelog_versions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_latest_version();

-- Function to get latest version
CREATE OR REPLACE FUNCTION get_latest_changelog_version()
RETURNS TEXT AS $$
DECLARE
  latest_version TEXT;
BEGIN
  SELECT version INTO latest_version
  FROM changelog_versions
  WHERE is_latest = TRUE
    AND is_published = TRUE
  ORDER BY published_at DESC
  LIMIT 1;
  
  RETURN latest_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_changelog_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_changelog_versions_updated_at ON changelog_versions;
CREATE TRIGGER update_changelog_versions_updated_at
  BEFORE UPDATE ON changelog_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_changelog_versions_updated_at();

-- Migrate existing data (if any)
-- This assumes existing entries have a version field
DO $$
DECLARE
  entry_record RECORD;
  version_record RECORD;
  new_version_id UUID;
BEGIN
  -- For each unique version in changelog_entries, create a version record
  FOR entry_record IN 
    SELECT DISTINCT version FROM changelog_entries WHERE version IS NOT NULL
  LOOP
    -- Check if version already exists
    SELECT * INTO version_record FROM changelog_versions WHERE version = entry_record.version LIMIT 1;
    
    IF NOT FOUND THEN
      -- Create version record with the first entry's metadata
      INSERT INTO changelog_versions (version, created_by, is_published, published_at, published_by)
      SELECT 
        entry_record.version, 
        created_by, 
        is_published,
        published_at,
        published_by
      FROM changelog_entries
      WHERE version = entry_record.version
        AND is_published = TRUE
      ORDER BY published_at DESC
      LIMIT 1
      RETURNING id INTO new_version_id;
      
      -- If no published entry, create with first entry's creator
      IF new_version_id IS NULL THEN
        INSERT INTO changelog_versions (version, created_by, is_published)
        SELECT version, created_by, FALSE
        FROM changelog_entries
        WHERE version = entry_record.version
        LIMIT 1
        RETURNING id INTO new_version_id;
      END IF;
    ELSE
      new_version_id := version_record.id;
    END IF;
    
    -- Update entries to reference the version
    UPDATE changelog_entries
    SET version_id = new_version_id
    WHERE version = entry_record.version
      AND version_id IS NULL;
  END LOOP;
END $$;

-- Remove the old version column from changelog_entries (optional, can keep for migration period)
-- ALTER TABLE changelog_entries DROP COLUMN IF EXISTS version;

