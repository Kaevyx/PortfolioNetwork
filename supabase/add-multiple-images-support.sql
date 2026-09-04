-- Migration to support multiple images per post
-- Change image_url from TEXT to TEXT[] to support multiple image URLs

-- Step 1: Create a temporary column to store the array
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS image_url_array TEXT[];

-- Step 2: Migrate existing single image_url values to arrays
-- Convert existing single image URLs to arrays
UPDATE posts 
SET image_url_array = CASE 
  WHEN image_url IS NULL OR image_url = '' THEN NULL
  ELSE ARRAY[image_url]
END;

-- Step 3: Drop the old column
ALTER TABLE posts 
DROP COLUMN IF EXISTS image_url;

-- Step 4: Rename the new column to image_url
ALTER TABLE posts 
RENAME COLUMN image_url_array TO image_url;

-- Step 5: Add a check constraint to limit array size (max 5 images)
-- Drop constraint if it exists, then add it
ALTER TABLE posts 
DROP CONSTRAINT IF EXISTS posts_image_url_max_length;

ALTER TABLE posts 
ADD CONSTRAINT posts_image_url_max_length CHECK (
  image_url IS NULL OR array_length(image_url, 1) <= 5
);

