# New Features Setup Guide

## Overview
This guide covers the setup for the new features added:
1. Fixed notification clearing
2. Reaction analytics over time periods
3. Improved analytics and profile dashboards
4. Fixed profile edit/update
5. Social media account connections
6. Profile verification system

## Setup Steps

### Step 1: Run Social Media Schema
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/social-media-schema.sql`
3. Click **Run**

This creates:
- `social_media_accounts` table for storing connected social media accounts
- Support for Twitter, Instagram, YouTube, LinkedIn, Facebook, TikTok, GitHub, Discord, Twitch
- Stats tracking: followers, following, subscribers, members, posts

### Step 2: Run Verification Schema
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/verification-schema.sql`
3. Click **Run**

This creates:
- Verification fields on `profiles` table
- `verification_requests` table for admin review
- Functions to approve/reject verification requests

### Step 3: Update RLS Policies
1. Go to Supabase SQL Editor
2. Copy and paste the contents of `supabase/rls-policies.sql` (if you haven't already)
3. Click **Run**

This disables RLS for:
- `social_media_accounts`
- `verification_requests`

## New Features

### 1. Notification Clearing
- **Fixed**: Notifications now properly clear when marked as read
- **How it works**: Clicking a notification or "Mark all as read" updates both database and local state
- **Location**: Notification bell in navbar

### 2. Reaction Analytics
- **Component**: `ReactionAnalytics`
- **Features**:
  - Shows breakdown of all 6 reaction types (Like, Love, Haha, Wow, Sad, Angry)
  - Time period filters: 7 days, 30 days, 90 days, All time
  - Visual progress bars for each reaction type
  - Total reactions count
- **Location**: Analytics page

### 3. Improved Analytics Dashboard
- **Added**: Reaction analytics widget
- **Updated**: All analytics components now use `post_reactions` (with fallback to `post_likes`)
- **Features**:
  - Network Insights
  - Engagement Metrics
  - Post Performance Chart
  - Reaction Analytics (NEW)

### 4. Improved Profile Dashboard
- **Added**: Social media connections display
- **Updated**: Verification badge display
- **Features**:
  - Shows connected social media accounts
  - Displays follower/subscriber/member counts
  - Verification checkmark for verified accounts

### 5. Profile Edit Fix
- **Fixed**: Profile updates now work correctly
- **Changes**:
  - Explicitly sets `updated_at` timestamp
  - Uses `onConflict: 'clerk_id'` for upsert
  - Better error handling and logging

### 6. Social Media Connections
- **Component**: `SocialMediaConnections`
- **Features**:
  - Display connected social media accounts
  - Show stats: followers, following, subscribers, members, posts
  - Platform-specific icons and colors
  - Verified badge for verified accounts
- **Location**: Profile pages

### 7. Profile Verification
- **Component**: `VerificationBadge`
- **Features**:
  - Blue checkmark badge for verified accounts
  - Appears next to display name
  - Database support for verification requests
- **Location**: Profile pages, posts, comments

## Database Tables

### social_media_accounts
- `id`: UUID primary key
- `profile_id`: Clerk ID (foreign key)
- `platform`: Platform name (twitter, instagram, youtube, etc.)
- `username`: Account username
- `followers_count`: Number of followers
- `following_count`: Number following
- `subscribers_count`: Subscribers (YouTube, Twitch)
- `members_count`: Members (Discord)
- `posts_count`: Number of posts
- `verified`: Whether account is verified on platform
- `last_synced_at`: Last sync timestamp

### verification_requests
- `id`: UUID primary key
- `profile_id`: Clerk ID (foreign key)
- `reason`: Reason for verification
- `documents`: JSONB with verification documents
- `status`: pending, approved, rejected
- `reviewed_by`: Admin Clerk ID
- `review_notes`: Admin notes

## Usage

### Adding Social Media Accounts
Currently, social media accounts need to be added manually via Supabase or through an admin interface (to be built). Future: OAuth integration.

### Requesting Verification
Users can request verification through a form (to be built). Admins can approve/reject through the database or admin panel.

### Viewing Analytics
- Go to `/analytics` to see reaction analytics
- Filter by time period (7d, 30d, 90d, all)
- View breakdown of all reaction types

## Future Enhancements

1. **OAuth Integration**: Connect social media accounts via OAuth
2. **Auto-sync**: Automatically sync social media stats
3. **Verification Request Form**: UI for users to request verification
4. **Admin Panel**: Interface for managing verification requests
5. **Social Media Stats on Dashboard**: Show aggregated stats on user dashboard






