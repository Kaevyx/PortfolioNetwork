-- Notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk ID of the user receiving the notification
  type TEXT NOT NULL CHECK (type IN ('follow', 'connection', 'comment', 'like', 'review', 'mention', 'repost')),
  actor_id TEXT NOT NULL, -- Clerk ID of the user who triggered the notification
  target_id TEXT, -- Optional: ID of the target (post_id, review_id, etc.)
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Function to create connection notification
CREATE OR REPLACE FUNCTION notify_connection()
RETURNS TRIGGER AS $$
DECLARE
  user1_follows_user2 BOOLEAN;
  user2_follows_user1 BOOLEAN;
  user1_name TEXT;
  user2_name TEXT;
BEGIN
  -- Check if user2 follows user1 (reverse direction)
  SELECT EXISTS(
    SELECT 1 FROM follows 
    WHERE follower_id = NEW.following_id 
    AND following_id = NEW.follower_id
  ) INTO user2_follows_user1;

  -- If both follow each other, create connection notifications for both
  IF user2_follows_user1 THEN
    -- Get display names
    SELECT display_name INTO user1_name FROM profiles WHERE clerk_id = NEW.follower_id;
    SELECT display_name INTO user2_name FROM profiles WHERE clerk_id = NEW.following_id;

    -- Notify user2 that they're now connected with user1
    INSERT INTO notifications (user_id, type, actor_id, message)
    VALUES (
      NEW.following_id,
      'connection',
      NEW.follower_id,
      user1_name || ' is now connected with you!'
    );

    -- Notify user1 that they're now connected with user2
    INSERT INTO notifications (user_id, type, actor_id, message)
    VALUES (
      NEW.follower_id,
      'connection',
      NEW.following_id,
      user2_name || ' is now connected with you!'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create connection notifications
DROP TRIGGER IF EXISTS on_follow_connection_notification ON follows;
CREATE TRIGGER on_follow_connection_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_connection();

-- Function to create comment notification
CREATE OR REPLACE FUNCTION notify_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id TEXT;
  commenter_name TEXT;
  post_content_preview TEXT;
BEGIN
  -- Get post owner and commenter name
  SELECT profile_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- If post doesn't exist, return early
  IF post_owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT display_name INTO commenter_name FROM profiles WHERE clerk_id = NEW.user_id;
  SELECT LEFT(content, 50) INTO post_content_preview FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user comments on their own post
  IF post_owner_id != NEW.user_id AND post_owner_id IS NOT NULL THEN
    -- Use COALESCE to handle NULL values
    INSERT INTO notifications (user_id, type, actor_id, target_id, message)
    VALUES (
      post_owner_id,
      'comment',
      NEW.user_id,
      NEW.post_id::TEXT,
      COALESCE(commenter_name, 'Someone') || ' commented on your post: "' || COALESCE(post_content_preview, 'your post') || '"'
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

-- Trigger to create comment notifications
DROP TRIGGER IF EXISTS on_comment_notification ON post_comments;
CREATE TRIGGER on_comment_notification
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment();

-- Function to create like/reaction notification
CREATE OR REPLACE FUNCTION notify_reaction()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id TEXT;
  reactor_name TEXT;
  reaction_emoji TEXT;
BEGIN
  -- Get post owner and reactor name
  SELECT profile_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- If post doesn't exist, return early
  IF post_owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT display_name INTO reactor_name FROM profiles WHERE clerk_id = NEW.user_id;
  
  -- Map reaction type to emoji
  CASE NEW.reaction_type
    WHEN 'like' THEN reaction_emoji := '👍';
    WHEN 'love' THEN reaction_emoji := '❤️';
    WHEN 'laugh' THEN reaction_emoji := '😂';
    WHEN 'wow' THEN reaction_emoji := '😮';
    WHEN 'sad' THEN reaction_emoji := '😢';
    WHEN 'angry' THEN reaction_emoji := '😠';
    ELSE reaction_emoji := '👍';
  END CASE;

  -- Don't notify if user reacts to their own post
  IF post_owner_id != NEW.user_id AND post_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, actor_id, target_id, message)
    VALUES (
      post_owner_id,
      'like',
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

-- Trigger to create reaction notifications
DROP TRIGGER IF EXISTS on_reaction_notification ON post_reactions;
CREATE TRIGGER on_reaction_notification
  AFTER INSERT OR UPDATE ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_reaction();

