-- Add mentions column to post_comments table
ALTER TABLE post_comments 
ADD COLUMN IF NOT EXISTS mentions TEXT[];

-- Create GIN index for mentions array for better search performance
CREATE INDEX IF NOT EXISTS idx_post_comments_mentions ON post_comments USING GIN (mentions) WHERE mentions IS NOT NULL;

-- Add comment
COMMENT ON COLUMN post_comments.mentions IS 'Array of mentioned user IDs (Clerk IDs) extracted from comment content';

