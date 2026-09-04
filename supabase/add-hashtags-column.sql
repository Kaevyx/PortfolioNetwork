-- Add hashtags and mentions columns to posts table if they don't exist
-- This migration adds support for hashtags and mentions in posts

-- Add hashtags column (array of hashtag strings)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS hashtags TEXT[];

-- Add mentions column (array of mentioned user IDs - Clerk IDs)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS mentions TEXT[];

-- Create GIN index for hashtags array for better search performance
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN (hashtags) WHERE hashtags IS NOT NULL;

-- Create GIN index for mentions array for better search performance
CREATE INDEX IF NOT EXISTS idx_posts_mentions ON posts USING GIN (mentions) WHERE mentions IS NOT NULL;

-- Add comment
COMMENT ON COLUMN posts.hashtags IS 'Array of hashtags extracted from post content';
COMMENT ON COLUMN posts.mentions IS 'Array of mentioned user IDs (Clerk IDs) extracted from post content';

