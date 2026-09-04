-- Quick Fix for Reviews Table
-- Run this if the main migration fails with "relation 'reviews' does not exist"
-- This handles the case where the table already exists with old columns

-- Make reviewer_id nullable (this is the main issue)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'reviewer_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reviews ALTER COLUMN reviewer_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Make reviewee_id nullable too
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'reviewee_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reviews ALTER COLUMN reviewee_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

