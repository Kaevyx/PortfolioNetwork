-- Cleanup script to remove duplicate post views before adding unique constraint
-- Run this FIRST if you get a duplicate key error

-- Step 1: Delete duplicate views, keeping only the first one for each (post_id, user_id) pair
-- Using ROW_NUMBER() to identify duplicates since MIN() doesn't work on UUID
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

-- Step 2: Now you can safely create the unique index
-- Run the post-views-schema.sql file after this cleanup

