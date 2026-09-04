-- Test script to manually create a comment notification
-- This can be used to test if notifications are working
-- Replace the values with actual IDs from your database

-- Example usage:
-- 1. Find a post_id and user_id (commenter) from your database
-- 2. Find the post owner's clerk_id
-- 3. Run this with actual values

-- Example (replace with your actual values):
/*
INSERT INTO notifications (user_id, type, actor_id, target_id, message)
VALUES (
  'user_xxxxx', -- Post owner's clerk_id
  'comment',
  'user_yyyyy', -- Commenter's clerk_id
  'post-uuid-here', -- Post ID
  'Test User commented on your post: "Test post content..."'
);
*/

-- Check if notifications table exists and has data
SELECT * FROM notifications WHERE type = 'comment' ORDER BY created_at DESC LIMIT 10;

-- Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_comment_notification';






