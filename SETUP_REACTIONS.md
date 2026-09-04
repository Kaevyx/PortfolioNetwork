# Reactions System Setup

## Overview
The platform now uses a reactions system instead of simple likes. Users can:
- Click thumbs up for a quick like (blue)
- Hold down the thumbs up to see more reaction options:
  - 👍 Like
  - ❤️ Love
  - 😂 Haha
  - 😮 Wow
  - 😢 Sad
  - 😠 Angry

## Setup Steps

### Step 1: Run Reactions Schema
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/reactions-schema.sql`
3. Click **Run**

This will:
- Create the `post_reactions` table
- Migrate existing likes from `post_likes` to `post_reactions`
- Set up indexes and triggers

### Step 2: Update Notifications Schema
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/notifications-schema.sql` (if you haven't already)
3. Click **Run**

This will:
- Add the reaction notification trigger
- Create notifications when someone reacts to a post

### Step 3: Update RLS Policies
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/rls-policies.sql` (if you haven't already)
3. Click **Run**

This will disable RLS for `post_reactions` in development.

## Features

### Reaction Button
- **Quick Click**: Toggles like (thumbs up)
- **Long Press/Hold**: Shows reaction picker with all 6 reactions
- **Visual Feedback**: Shows current reaction with emoji
- **Count**: Displays total reaction count

### Notifications
- Users receive notifications when someone reacts to their post
- Notification includes the reaction emoji
- Respects user notification settings

### Analytics
- Dashboard and Analytics pages now show "Reactions" instead of "Likes"
- Uses blue thumbs up icon
- Counts all reaction types

## Migration Notes

- Existing likes are automatically migrated to reactions (type: 'like')
- The system falls back to `post_likes` if `post_reactions` doesn't exist yet
- Both tables can coexist during migration

## Troubleshooting

### Reactions not showing
1. Make sure `post_reactions` table exists
2. Check that the schema was run successfully
3. Verify RLS is disabled (for development)

### Notifications not working
1. Make sure `notifications` table exists
2. Verify the `notify_reaction` function exists
3. Check that the trigger `on_reaction_notification` is set up

### Count not updating
1. Check browser console for errors
2. Verify the reaction was saved in the database
3. Try refreshing the page






