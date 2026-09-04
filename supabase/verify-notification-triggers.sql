-- Verify all notification triggers are active
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%notification%'
ORDER BY event_object_table, trigger_name;

-- Check if comment notification trigger exists and is active
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_comment_notification'
    ) THEN 'Comment notification trigger EXISTS'
    ELSE 'Comment notification trigger MISSING'
  END AS trigger_status;

-- Check recent notifications to see if they're being created
SELECT 
  type,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY count DESC;

-- Test: Check if notifications are being created for comments
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.message,
  n.created_at,
  n.read,
  pc.id as comment_id,
  pc.post_id,
  pc.user_id as commenter_id,
  p.profile_id as post_owner_id,
  p.content as post_content,
  CASE 
    WHEN n.user_id = p.profile_id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as user_id_match
FROM notifications n
LEFT JOIN post_comments pc ON pc.id::text = n.target_id
LEFT JOIN posts p ON p.id::text = n.target_id
WHERE n.type = 'comment'
  AND n.created_at > NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 10;

-- Check all notification user_ids to see what values are stored
SELECT 
  DISTINCT user_id,
  COUNT(*) as notification_count
FROM notifications
GROUP BY user_id
ORDER BY notification_count DESC
LIMIT 20;

