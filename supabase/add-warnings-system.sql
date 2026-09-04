-- Warnings System for Content Moderation
-- Tracks warnings issued to users with acknowledgment functionality

CREATE TABLE IF NOT EXISTS content_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  blocked_attempt_id UUID REFERENCES blocked_content_attempts(id) ON DELETE SET NULL,
  warning_message TEXT NOT NULL, -- Custom message from admin
  category TEXT, -- Category of the blocked content
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  issued_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
  is_active BOOLEAN DEFAULT TRUE -- Can be deactivated by admins
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_warnings_user_id ON content_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_warnings_is_acknowledged ON content_warnings(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_content_warnings_is_active ON content_warnings(is_active);
CREATE INDEX IF NOT EXISTS idx_content_warnings_created_at ON content_warnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_warnings_blocked_attempt_id ON content_warnings(blocked_attempt_id);

-- Function to acknowledge a warning
CREATE OR REPLACE FUNCTION acknowledge_warning(p_warning_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_warning_user_id TEXT;
  v_issued_by TEXT;
BEGIN
  -- Get warning details
  SELECT user_id, issued_by INTO v_warning_user_id, v_issued_by
  FROM content_warnings
  WHERE id = p_warning_id AND is_active = TRUE;
  
  -- Verify the user owns this warning
  IF v_warning_user_id != p_user_id THEN
    RAISE EXCEPTION 'User does not own this warning';
  END IF;
  
  -- Update warning
  UPDATE content_warnings
  SET is_acknowledged = TRUE,
      acknowledged_at = NOW()
  WHERE id = p_warning_id;
  
  -- Notify the admin who issued the warning
  INSERT INTO notifications (
    user_id,
    type,
    actor_id,
    target_id,
    message
  ) VALUES (
    v_issued_by,
    'warning_acknowledged',
    p_user_id,
    p_warning_id,
    'A user has acknowledged a warning you issued.'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active warnings for a user
-- Drop the function first if it exists to allow changing return type
DROP FUNCTION IF EXISTS get_active_warnings(TEXT);

CREATE FUNCTION get_active_warnings(p_user_id TEXT)
RETURNS TABLE (
  id UUID,
  warning_message TEXT,
  category TEXT,
  severity TEXT,
  is_acknowledged BOOLEAN,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  post_id UUID,
  comment_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cw.id,
    cw.warning_message,
    cw.category,
    cw.severity,
    cw.is_acknowledged,
    cw.acknowledged_at,
    cw.created_at,
    cw.expires_at,
    cw.post_id,
    cw.comment_id
  FROM content_warnings cw
  WHERE cw.user_id = p_user_id
    AND cw.is_active = TRUE
    AND (cw.expires_at IS NULL OR cw.expires_at > NOW())
    AND cw.is_acknowledged = FALSE
  ORDER BY cw.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add warning_id column to blocked_content_attempts for linking
ALTER TABLE blocked_content_attempts
ADD COLUMN IF NOT EXISTS warning_id UUID REFERENCES content_warnings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blocked_attempts_warning_id ON blocked_content_attempts(warning_id);

-- Add warning notification types to notifications table
-- First, drop the constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Fix any invalid notification types before adding constraint
DO $$
DECLARE
  invalid_types TEXT[];
BEGIN
  -- Find any notification types that might not be in our complete list
  SELECT ARRAY_AGG(DISTINCT type) INTO invalid_types
  FROM notifications
  WHERE type NOT IN (
    'follow', 
    'connection', 
    'comment', 
    'like', 
    'review', 
    'mention', 
    'repost',
    'message',
    'file_approved', 
    'file_rejected', 
    'profile_approved', 
    'profile_rejected', 
    'verification_approved', 
    'verification_rejected',
    'report_resolved',
    'report_dismissed',
    'account_suspended',
    'account_unsuspended',
    'warning_issued',
    'warning_acknowledged',
    'admin_warning',
    'admin_notification',
    'content_removed',
    'ticket_created',
    'ticket_assigned',
    'ticket_replied',
    'ticket_status_changed',
    'ticket_closed',
    'reaction_love',
    'reaction_laugh',
    'reaction_wow',
    'reaction_sad',
    'reaction_angry'
  );
  
  -- If there are invalid types, update them to 'admin_notification' as a fallback
  IF invalid_types IS NOT NULL AND array_length(invalid_types, 1) > 0 THEN
    RAISE WARNING 'Found invalid notification types: %. Updating to admin_notification.', invalid_types;
    UPDATE notifications SET type = 'admin_notification' WHERE type = ANY(invalid_types);
  END IF;
END $$;

-- Add the constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'follow', 
  'connection', 
  'comment', 
  'like', 
  'review', 
  'mention', 
  'repost',
  'message',
  'file_approved', 
  'file_rejected', 
  'profile_approved', 
  'profile_rejected', 
  'verification_approved', 
  'verification_rejected',
  'report_resolved',
  'report_dismissed',
  'account_suspended',
  'account_unsuspended',
  'warning_issued',
  'warning_acknowledged',
  'admin_warning',
  'admin_notification',
  'content_removed',
  'ticket_created',
  'ticket_assigned',
  'ticket_replied',
  'ticket_status_changed',
  'ticket_closed',
  'reaction_love',
  'reaction_laugh',
  'reaction_wow',
  'reaction_sad',
  'reaction_angry'
));

-- Comments
COMMENT ON TABLE content_warnings IS 'Stores warnings issued to users for blocked content attempts';
COMMENT ON FUNCTION acknowledge_warning IS 'Allows a user to acknowledge a warning and notifies the issuing admin';
COMMENT ON FUNCTION get_active_warnings IS 'Returns all active, unacknowledged warnings for a user';

