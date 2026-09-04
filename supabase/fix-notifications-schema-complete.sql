-- Ensure read_at column exists
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for read_at if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- Drop the constraint first so we can fix invalid types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Now fix any invalid notification types
DO $$
DECLARE
  invalid_types TEXT[];
BEGIN
  -- Find any notification types that might not be in our list
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
    'ticket_closed'
  );
  
  -- If there are invalid types, update them to 'admin_notification' as a fallback
  IF invalid_types IS NOT NULL AND array_length(invalid_types, 1) > 0 THEN
    RAISE WARNING 'Found invalid notification types: %. Updating to admin_notification.', invalid_types;
    -- Update invalid types to 'admin_notification' as a fallback
    UPDATE notifications SET type = 'admin_notification' WHERE type = ANY(invalid_types);
  END IF;
END $$;

-- Add the new constraint with all notification types
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
  'ticket_closed'
));

-- Ensure read column defaults to false
ALTER TABLE notifications ALTER COLUMN read SET DEFAULT false;

-- Add index for better query performance on unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

