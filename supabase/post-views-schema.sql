-- Post views table for tracking post views
CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL,
  user_id TEXT, -- Clerk ID, NULL for anonymous views
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- IMPORTANT: If you get a duplicate key error, run cleanup-post-views-duplicates.sql first!

-- Step 1: Clean up any existing duplicates (only if needed)
-- Uncomment the following if you have duplicates:
/*
WITH ranked_views AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY post_id, user_id 
      ORDER BY viewed_at ASC, id ASC
    ) as row_num
  FROM post_views
  WHERE user_id IS NOT NULL
)
DELETE FROM post_views
WHERE id IN (
  SELECT id 
  FROM ranked_views 
  WHERE row_num > 1
);
*/

-- Step 2: Create unique constraint for authenticated users only (handles NULL user_id)
-- This ensures a user can only view a post once
-- Drop the index first if it exists to avoid errors
DROP INDEX IF EXISTS idx_post_views_unique_user;

CREATE UNIQUE INDEX idx_post_views_unique_user 
ON post_views(post_id, user_id) 
WHERE user_id IS NOT NULL;

-- For anonymous views, we'll use a partial index or handle differently
-- Anonymous views can be tracked multiple times (by IP or session)

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);

