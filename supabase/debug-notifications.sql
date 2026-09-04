-- Debug script to check notification user_id values and compare with profiles
-- Check what user_ids are in notifications
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.message,
  n.created_at,
  n.read,
  p.clerk_id as profile_clerk_id,
  p.display_name,
  CASE 
    WHEN p.clerk_id IS NULL THEN 'NO PROFILE MATCH'
    WHEN p.clerk_id = n.user_id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM notifications n
LEFT JOIN profiles p ON p.clerk_id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- Check if there are any notifications with user_ids that don't match profiles
SELECT 
  COUNT(*) as orphaned_notifications,
  COUNT(DISTINCT user_id) as unique_orphaned_users
FROM notifications n
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.clerk_id = n.user_id
);

-- Check recent comment notifications specifically
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.message,
  n.created_at,
  pc.id as comment_id,
  pc.user_id as commenter_id,
  p.profile_id as post_owner_id,
  p.content as post_content
FROM notifications n
LEFT JOIN post_comments pc ON pc.id::text = n.target_id
LEFT JOIN posts p ON p.id::text = n.target_id
WHERE n.type = 'comment'
  AND n.created_at > NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 10;

