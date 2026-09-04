-- Post Scheduling Feature
-- Allows Pro and Ultimate users to schedule posts for future publication

-- Add scheduled_at column to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Create index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at) WHERE is_scheduled = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_is_scheduled ON posts(is_scheduled) WHERE is_scheduled = TRUE;

-- Function to publish scheduled posts
CREATE OR REPLACE FUNCTION publish_scheduled_posts()
RETURNS void AS $$
BEGIN
  -- Update posts that are scheduled and their scheduled_at time has passed
  UPDATE posts
  SET 
    is_scheduled = FALSE,
    published_at = COALESCE(published_at, NOW()),
    created_at = COALESCE(published_at, NOW())
  WHERE 
    is_scheduled = TRUE 
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW()
    AND published_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job (this would typically be set up in pg_cron or a similar scheduler)
-- For now, this function can be called manually or via a cron job
COMMENT ON FUNCTION publish_scheduled_posts() IS 'Publishes scheduled posts whose scheduled_at time has passed. Should be run periodically (e.g., every minute)';

-- Add comment to columns
COMMENT ON COLUMN posts.scheduled_at IS 'When the post should be published (for scheduled posts)';
COMMENT ON COLUMN posts.is_scheduled IS 'Whether this post is scheduled for future publication';
COMMENT ON COLUMN posts.published_at IS 'When the post was actually published (for scheduled posts, this is set when published)';

