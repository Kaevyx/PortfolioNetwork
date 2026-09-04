-- Add settings column to profiles table if it doesn't exist
-- This is a migration script for existing databases

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.settings IS 'User settings stored as JSONB (notifications, privacy, appearance, etc.)';






