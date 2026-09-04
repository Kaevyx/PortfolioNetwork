-- Add expiration tracking to policy_documents
-- When a new version is published, previous versions are automatically expired

ALTER TABLE policy_documents
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_policy_documents_expired_at ON policy_documents(expired_at);

-- Update trigger to set expiration when new version is published
CREATE OR REPLACE FUNCTION ensure_single_published_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If this version is being published, expire and unpublish all other versions of the same policy type
  IF NEW.is_published = TRUE AND (OLD.is_published IS NULL OR OLD.is_published = FALSE) THEN
    UPDATE policy_documents
    SET is_published = FALSE,
        published_at = NULL,
        published_by = NULL,
        expired_at = NOW(),
        expired_by = NEW.published_by
    WHERE policy_type = NEW.policy_type
      AND id != NEW.id
      AND is_published = TRUE
      AND expired_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get all versions (including expired) for a policy type
CREATE OR REPLACE FUNCTION get_all_policy_versions(p_document_type TEXT)
RETURNS TABLE (
  id UUID,
  version TEXT,
  title TEXT,
  is_published BOOLEAN,
  published_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.version,
    pd.title,
    pd.is_published,
    pd.published_at,
    pd.expired_at,
    pd.created_at
  FROM policy_documents pd
  WHERE pd.policy_type = p_document_type
  ORDER BY pd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

