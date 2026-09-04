-- File moderation system for content safety
-- Add moderation status to storage_files table
ALTER TABLE storage_files
ADD COLUMN IF NOT EXISTS moderation_status TEXT CHECK (moderation_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_by TEXT, -- Admin Clerk ID who reviewed
ADD COLUMN IF NOT EXISTS review_notes TEXT, -- Reason for rejection or notes
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for moderation queries
CREATE INDEX IF NOT EXISTS idx_storage_files_moderation_status ON storage_files(moderation_status);
CREATE INDEX IF NOT EXISTS idx_storage_files_reviewed_by ON storage_files(reviewed_by);

-- Function to get pending files count for admin dashboard
CREATE OR REPLACE FUNCTION get_pending_files_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM storage_files
    WHERE moderation_status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending verification requests count
CREATE OR REPLACE FUNCTION get_pending_verification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM verification_requests
    WHERE status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;






