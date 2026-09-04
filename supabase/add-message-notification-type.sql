-- Add 'message' notification type to notifications table
DO $$
BEGIN
  -- Check if the constraint exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;

  -- Add new constraint with all notification types including 'message'
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'follow', 
    'connection', 
    'comment', 
    'like', 
    'review', 
    'mention', 
    'repost',
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
    'message'
  ));
END $$;

