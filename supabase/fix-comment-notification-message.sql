-- Fix comment notification to show comment text instead of post text
-- Also store comment_id in target_id for linking to specific comments

CREATE OR REPLACE FUNCTION notify_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id TEXT;
  commenter_name TEXT;
  comment_content_preview TEXT;
  user_notification_prefs JSONB;
  in_app_enabled BOOLEAN;
  comment_enabled BOOLEAN;
BEGIN
  -- Get post owner and commenter name
  SELECT profile_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- If post doesn't exist, return early
  IF post_owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Don't notify if user comments on their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Check user's notification preferences
  SELECT settings->'notifications' INTO user_notification_prefs
  FROM profiles
  WHERE clerk_id = post_owner_id;
  
  -- Check if in-app notifications are enabled (default to true if not set)
  in_app_enabled := COALESCE((user_notification_prefs->>'inAppNotifications')::boolean, true);
  
  -- Check if comment notifications are enabled (default to true if not set)
  comment_enabled := COALESCE((user_notification_prefs->>'newComment')::boolean, true);
  
  -- Only create notification if both are enabled
  IF in_app_enabled AND comment_enabled THEN
    SELECT display_name INTO commenter_name FROM profiles WHERE clerk_id = NEW.user_id;
    -- Get comment content instead of post content
    SELECT LEFT(NEW.content, 100) INTO comment_content_preview;

    -- Use COALESCE to handle NULL values
    -- Store comment_id in target_id for linking to specific comment
    INSERT INTO notifications (user_id, type, actor_id, target_id, message)
    VALUES (
      post_owner_id,
      'comment',
      NEW.user_id,
      NEW.id::TEXT, -- Store comment_id instead of post_id
      COALESCE(commenter_name, 'Someone') || ' commented: "' || COALESCE(comment_content_preview, 'your post') || '"'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error creating comment notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

