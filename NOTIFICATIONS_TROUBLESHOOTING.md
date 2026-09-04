# Comment Notifications Troubleshooting

If you're not receiving comment notifications, follow these steps:

## Step 1: Verify Notifications Table Exists

Run this in Supabase SQL Editor:

```sql
SELECT * FROM notifications LIMIT 1;
```

If you get an error saying the table doesn't exist, you need to run the notifications schema:

1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/notifications-schema.sql`
3. Click Run

## Step 2: Verify Trigger Exists

Run this to check if the comment notification trigger is set up:

```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_comment_notification';
```

If no results, the trigger isn't set up. Re-run `supabase/notifications-schema.sql`.

## Step 3: Test the Trigger Manually

Create a test comment and check if a notification was created:

```sql
-- After someone comments on your post, check:
SELECT * FROM notifications 
WHERE type = 'comment' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Step 4: Check Notification Settings

Make sure comment notifications are enabled in your profile settings:

1. Go to Settings page
2. Check that "New Comment" notifications are enabled
3. Make sure "In-App Notifications" is enabled

## Step 5: Check Browser Console

Open browser DevTools (F12) and check the Console tab for any errors when:
- A comment is posted
- The notification bell is clicked

## Step 6: Verify Foreign Keys

Make sure the foreign keys exist:

```sql
SELECT
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'notifications';
```

You should see foreign keys for both `user_id` and `actor_id`.

## Common Issues

### Issue: Notifications table doesn't exist
**Solution**: Run `supabase/notifications-schema.sql` in Supabase SQL Editor

### Issue: Trigger not firing
**Solution**: 
1. Check if trigger exists (Step 2)
2. Re-run `supabase/notifications-schema.sql`
3. Check Supabase logs for trigger errors

### Issue: Notifications created but not showing
**Solution**:
1. Check notification settings (Step 4)
2. Check browser console for errors
3. Verify the NotificationBell component is loading notifications correctly

### Issue: Foreign key constraint error
**Solution**: 
1. Make sure both `user_id` and `actor_id` reference valid profiles
2. Run the updated `supabase/notifications-schema.sql` which includes the `actor_id` foreign key

## Manual Test

To manually test if notifications work, you can create a test notification:

```sql
-- Replace with your actual user IDs
INSERT INTO notifications (user_id, type, actor_id, target_id, message)
VALUES (
  'your_clerk_id_here', -- Post owner
  'comment',
  'commenter_clerk_id_here', -- Person who commented
  'post_id_here', -- Post ID
  'Test User commented on your post: "Test message"'
);
```

Then check if it appears in the notification bell.






