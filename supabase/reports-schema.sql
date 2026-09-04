-- Reports Schema
-- Allows users to report profiles, posts, comments, etc.

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('profile', 'post', 'comment', 'file')),
  reported_id TEXT NOT NULL, -- ID of the reported entity (clerk_id for profile, UUID for post/comment/file)
  reason TEXT NOT NULL,
  details TEXT, -- Additional details from the reporter
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT, -- Admin notes on the review
  action_taken TEXT, -- e.g., 'content_removed', 'user_suspended', 'warning_issued', 'no_action'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_type ON reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Function to get pending reports count
CREATE OR REPLACE FUNCTION get_pending_reports_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM reports
    WHERE status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





