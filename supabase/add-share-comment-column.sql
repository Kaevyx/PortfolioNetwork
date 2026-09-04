-- Add share_comment column to posts table
-- This allows users to add a comment when sharing a post

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS share_comment TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_share_comment ON posts(share_comment) WHERE share_comment IS NOT NULL;






