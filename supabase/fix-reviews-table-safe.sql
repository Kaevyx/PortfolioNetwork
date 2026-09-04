-- Safe fix for reviews table - handles all scenarios
-- This will work regardless of schema or table existence

-- First, try to make reviewer_id nullable if it exists
DO $$ 
BEGIN
  -- Check if table exists in public schema
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews'
  ) THEN
    -- Check if column exists and is NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'reviews' 
      AND column_name = 'reviewer_id'
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.reviews ALTER COLUMN reviewer_id DROP NOT NULL;
      RAISE NOTICE 'Made reviewer_id nullable';
    ELSE
      RAISE NOTICE 'reviewer_id column does not exist or is already nullable';
    END IF;
  ELSE
    RAISE NOTICE 'reviews table does not exist in public schema';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error making reviewer_id nullable: %', SQLERRM;
END $$;

-- Make reviewee_id nullable if it exists
DO $$ 
BEGIN
  -- Check if table exists in public schema
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews'
  ) THEN
    -- Check if column exists and is NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'reviews' 
      AND column_name = 'reviewee_id'
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.reviews ALTER COLUMN reviewee_id DROP NOT NULL;
      RAISE NOTICE 'Made reviewee_id nullable';
    ELSE
      RAISE NOTICE 'reviewee_id column does not exist or is already nullable';
    END IF;
  ELSE
    RAISE NOTICE 'reviews table does not exist in public schema';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error making reviewee_id nullable: %', SQLERRM;
END $$;

