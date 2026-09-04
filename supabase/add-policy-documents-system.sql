-- Policy Documents System
-- Stores actual document content for Terms of Service and Privacy Policy with versioning

CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_type TEXT NOT NULL CHECK (policy_type IN ('privacy_policy', 'terms_of_service')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Full HTML/text content of the document
  is_published BOOLEAN DEFAULT FALSE, -- Only one version per policy_type can be published at a time
  published_at TIMESTAMP WITH TIME ZONE,
  published_by TEXT, -- Clerk ID of admin who published
  created_by TEXT NOT NULL, -- Clerk ID of admin who created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(policy_type, version),
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_policy_documents_policy_type ON policy_documents(policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_documents_version ON policy_documents(version);
CREATE INDEX IF NOT EXISTS idx_policy_documents_is_published ON policy_documents(is_published);
CREATE INDEX IF NOT EXISTS idx_policy_documents_created_by ON policy_documents(created_by);

-- Function to get published document for a policy type
CREATE OR REPLACE FUNCTION get_published_policy_document(p_document_type TEXT)
RETURNS TABLE (
  id UUID,
  policy_type TEXT,
  version TEXT,
  title TEXT,
  content TEXT,
  published_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.policy_type,
    pd.version,
    pd.title,
    pd.content,
    pd.published_at
  FROM policy_documents pd
  WHERE pd.policy_type = p_document_type
    AND pd.is_published = TRUE
  ORDER BY pd.published_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all versions of a policy document
CREATE OR REPLACE FUNCTION get_policy_document_versions(p_document_type TEXT)
RETURNS TABLE (
  id UUID,
  version TEXT,
  title TEXT,
  is_published BOOLEAN,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.version,
    pd.title,
    pd.is_published,
    pd.published_at,
    pd.created_at,
    pd.created_by
  FROM policy_documents pd
  WHERE pd.policy_type = p_document_type
  ORDER BY pd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure only one published version per policy type
CREATE OR REPLACE FUNCTION ensure_single_published_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If this version is being published, unpublish all other versions of the same policy type
  IF NEW.is_published = TRUE AND (OLD.is_published IS NULL OR OLD.is_published = FALSE) THEN
    UPDATE policy_documents
    SET is_published = FALSE,
        published_at = NULL,
        published_by = NULL
    WHERE policy_type = NEW.policy_type
      AND id != NEW.id
      AND is_published = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_published_version ON policy_documents;
CREATE TRIGGER trigger_ensure_single_published_version
  BEFORE INSERT OR UPDATE ON policy_documents
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_published_version();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_policy_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_policy_documents_updated_at ON policy_documents;
CREATE TRIGGER update_policy_documents_updated_at
  BEFORE UPDATE ON policy_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_policy_documents_updated_at();

-- Link policy_versions to policy_documents (optional relationship)
ALTER TABLE policy_versions
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES policy_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_policy_versions_document_id ON policy_versions(document_id);

