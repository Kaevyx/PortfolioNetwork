-- Add new notification types for admin actions
-- This updates the notifications table to support file and profile moderation notifications

-- First, drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with additional notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'follow', 
    'connection', 
    'comment', 
    'like', 
    'review', 
    'mention', 
    'repost',
    'file_approved',
    'file_rejected',
    'profile_approved',
    'profile_rejected',
    'verification_approved',
    'verification_rejected'
  ));





