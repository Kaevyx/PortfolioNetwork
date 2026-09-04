-- Changelog System
-- Tracks platform updates, bug fixes, improvements, and new features

CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL, -- Version tag (e.g., "1.2.0", "2024-01-15")
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- Full description of the change
  category TEXT NOT NULL CHECK (category IN ('bug_fix', 'improvement', 'new_feature', 'security_update', 'deprecation', 'other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by TEXT, -- Clerk ID of admin who published
  created_by TEXT NOT NULL, -- Clerk ID of admin who created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_changelog_entries_version ON changelog_entries(version);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_category ON changelog_entries(category);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_is_published ON changelog_entries(is_published);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_published_at ON changelog_entries(published_at);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_created_by ON changelog_entries(created_by);

-- Function to get published changelog entries
CREATE OR REPLACE FUNCTION get_published_changelog_entries(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  version TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  priority TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.version,
    ce.title,
    ce.description,
    ce.category,
    ce.priority,
    ce.published_at,
    ce.created_at
  FROM changelog_entries ce
  WHERE ce.is_published = TRUE
  ORDER BY ce.published_at DESC, ce.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_changelog_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_changelog_entries_updated_at ON changelog_entries;
CREATE TRIGGER update_changelog_entries_updated_at
  BEFORE UPDATE ON changelog_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_changelog_entries_updated_at();

