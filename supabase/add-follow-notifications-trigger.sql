-- Add trigger to create follow notifications (not just connections)
CREATE OR REPLACE FUNCTION notify_follow()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
BEGIN
  -- Get follower's display name
  SELECT display_name INTO follower_name FROM profiles WHERE clerk_id = NEW.follower_id;
  
  -- Create follow notification for the user being followed
  INSERT INTO notifications (user_id, type, actor_id, message)
  VALUES (
    NEW.following_id,
    'follow',
    NEW.follower_id,
    COALESCE(follower_name, 'Someone') || ' started following you'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error creating follow notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create follow notifications
DROP TRIGGER IF EXISTS on_follow_notification ON follows;
CREATE TRIGGER on_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_follow();

