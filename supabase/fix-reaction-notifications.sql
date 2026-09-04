-- Fix reaction notifications to properly tag reaction types
-- This updates the notification trigger to store reaction type information

-- First, add reaction-specific notification types to the constraint
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;

  -- Add new constraint with reaction types
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'follow', 
    'connection', 
    'comment', 
    'like', 
    'reaction_love',
    'reaction_laugh',
    'reaction_wow',
    'reaction_sad',
    'reaction_angry',
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
END $$;

-- Update the reaction notification function to use correct notification types
CREATE OR REPLACE FUNCTION notify_reaction()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id TEXT;
  reactor_name TEXT;
  reaction_emoji TEXT;
  notification_type TEXT;
BEGIN
  -- Get post owner and reactor name
  SELECT profile_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- If post doesn't exist, return early
  IF post_owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT display_name INTO reactor_name FROM profiles WHERE clerk_id = NEW.user_id;
  
  -- Map reaction type to emoji and notification type
  CASE NEW.reaction_type
    WHEN 'like' THEN 
      reaction_emoji := '👍';
      notification_type := 'like';
    WHEN 'love' THEN 
      reaction_emoji := '❤️';
      notification_type := 'reaction_love';
    WHEN 'laugh' THEN 
      reaction_emoji := '😂';
      notification_type := 'reaction_laugh';
    WHEN 'wow' THEN 
      reaction_emoji := '😮';
      notification_type := 'reaction_wow';
    WHEN 'sad' THEN 
      reaction_emoji := '😢';
      notification_type := 'reaction_sad';
    WHEN 'angry' THEN 
      reaction_emoji := '😠';
      notification_type := 'reaction_angry';
    ELSE 
      reaction_emoji := '👍';
      notification_type := 'like';
  END CASE;

  -- Don't notify if user reacts to their own post
  IF post_owner_id != NEW.user_id AND post_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, actor_id, target_id, message)
    VALUES (
      post_owner_id,
      notification_type,
      NEW.user_id,
      NEW.post_id::TEXT,
      COALESCE(reactor_name, 'Someone') || ' ' || reaction_emoji || ' reacted to your post'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error creating reaction notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing 'like' notifications that are actually other reaction types
-- This is a one-time migration to fix existing notifications
-- We'll parse the message to determine the reaction type
UPDATE notifications
SET type = CASE
  WHEN message LIKE '%❤️%' THEN 'reaction_love'
  WHEN message LIKE '%😂%' THEN 'reaction_laugh'
  WHEN message LIKE '%😮%' THEN 'reaction_wow'
  WHEN message LIKE '%😢%' THEN 'reaction_sad'
  WHEN message LIKE '%😠%' THEN 'reaction_angry'
  ELSE type
END
WHERE type = 'like' 
  AND (message LIKE '%❤️%' OR message LIKE '%😂%' OR message LIKE '%😮%' OR message LIKE '%😢%' OR message LIKE '%😠%');

