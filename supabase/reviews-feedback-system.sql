-- User Reviews and Feedback System
-- Allows users to submit reviews/feedback and admins to manage them
-- Reviews can be displayed on the homepage in a rotating carousel

-- Drop existing functions first (in case of schema changes)
DROP FUNCTION IF EXISTS get_featured_reviews(INTEGER);
DROP FUNCTION IF EXISTS get_admin_reviews(TEXT, BOOLEAN, INTEGER, INTEGER);

-- Check if old reviews table exists with reviewer_id/reviewee_id structure
-- If so, we need to handle migration or rename the old table
DO $$ 
BEGIN
  -- Check if reviews table exists at all (check in public schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews'
  ) THEN
    -- If old schema exists (has reviewer_id and reviewee_id but no user_id), rename it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'reviews' 
      AND column_name = 'reviewer_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'reviews' 
      AND column_name = 'reviewee_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'reviews' 
      AND column_name = 'user_id'
    ) THEN
      -- This is the old user-to-user reviews table, rename it
      ALTER TABLE reviews RENAME TO user_reviews_old;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, just continue - table might not exist yet
  NULL;
END $$;

-- Reviews Table (create if not exists, or alter if it does)
-- First, ensure the table exists - create it if it doesn't
DO $$ 
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews'
  ) THEN
    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      reviewer_name TEXT,
      reviewer_title TEXT,
      reviewer_company TEXT,
      reviewer_avatar_url TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      content TEXT NOT NULL,
      is_featured BOOLEAN DEFAULT FALSE,
      is_approved BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
      admin_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If creation fails, try to continue - table might exist with different structure
  NULL;
END $$;

-- Add columns if they don't exist (for existing tables) - MUST happen before foreign keys
DO $$ 
BEGIN
  -- Only proceed if table exists (check in public schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews'
  ) THEN
    RETURN;
  END IF;
  
  -- Handle old schema columns (reviewer_id, reviewee_id, comment)
  -- If old columns exist, make them nullable so they don't conflict with new schema
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public'
             AND table_name = 'reviews' 
             AND column_name = 'reviewer_id'
             AND is_nullable = 'NO') THEN
    -- First, set any existing NULL values to empty string (if any)
    BEGIN
      UPDATE reviews SET reviewer_id = '' WHERE reviewer_id IS NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If update fails, continue
      NULL;
    END;
    -- Make reviewer_id nullable (we'll use user_id instead for new reviews)
    BEGIN
      ALTER TABLE reviews ALTER COLUMN reviewer_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If alter fails, continue
      NULL;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public'
             AND table_name = 'reviews' 
             AND column_name = 'reviewee_id'
             AND is_nullable = 'NO') THEN
    -- Make reviewee_id nullable (not needed for platform reviews)
    BEGIN
      ALTER TABLE reviews ALTER COLUMN reviewee_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If alter fails, continue
      NULL;
    END;
  END IF;
  
  -- Handle reviewer_id -> user_id migration (if old schema exists and user_id doesn't)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public'
             AND table_name = 'reviews' 
             AND column_name = 'reviewer_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    AND table_name = 'reviews' 
                    AND column_name = 'user_id') THEN
    -- Rename reviewer_id to user_id
    BEGIN
      ALTER TABLE reviews RENAME COLUMN reviewer_id TO user_id;
    EXCEPTION WHEN OTHERS THEN
      -- If rename fails, continue
      NULL;
    END;
  END IF;
  
  -- Add user_id if missing (handle NOT NULL carefully)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'user_id') THEN
    -- First add as nullable
    ALTER TABLE reviews ADD COLUMN user_id TEXT;
    -- Update any existing rows (if any)
    UPDATE reviews SET user_id = '' WHERE user_id IS NULL;
    -- Then make it NOT NULL
    ALTER TABLE reviews ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE reviews ALTER COLUMN user_id SET DEFAULT '';
  END IF;
  
  -- Add other columns if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'reviewer_name') THEN
    ALTER TABLE reviews ADD COLUMN reviewer_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'reviewer_title') THEN
    ALTER TABLE reviews ADD COLUMN reviewer_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'reviewer_company') THEN
    ALTER TABLE reviews ADD COLUMN reviewer_company TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'reviewer_avatar_url') THEN
    ALTER TABLE reviews ADD COLUMN reviewer_avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'rating') THEN
    ALTER TABLE reviews ADD COLUMN rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'title') THEN
    ALTER TABLE reviews ADD COLUMN title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'content') THEN
    ALTER TABLE reviews ADD COLUMN content TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'is_featured') THEN
    ALTER TABLE reviews ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'is_approved') THEN
    ALTER TABLE reviews ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'is_verified') THEN
    ALTER TABLE reviews ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'display_order') THEN
    ALTER TABLE reviews ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'status') THEN
    ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'admin_notes') THEN
    ALTER TABLE reviews ADD COLUMN admin_notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'reviewed_by') THEN
    ALTER TABLE reviews ADD COLUMN reviewed_by TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'reviewed_at') THEN
    ALTER TABLE reviews ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'created_at') THEN
    ALTER TABLE reviews ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'reviews' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Ensure user_id is NOT NULL if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public'
             AND table_name = 'reviews' 
             AND column_name = 'user_id') THEN
    -- Update any NULL user_id values (shouldn't happen, but safety check)
    UPDATE reviews SET user_id = '' WHERE user_id IS NULL;
    -- Make sure it's NOT NULL
    BEGIN
      ALTER TABLE reviews ALTER COLUMN user_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If it fails, it might already be NOT NULL, which is fine
      NULL;
    END;
  END IF;
END $$;

-- Add foreign key constraints AFTER ensuring columns exist
DO $$ 
BEGIN
  -- Only add foreign key if column exists and constraint doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'user_id')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_fkey') THEN
    ALTER TABLE reviews 
    ADD CONSTRAINT reviews_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE;
  END IF;
  
  -- Only add foreign key if column exists and constraint doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewed_by')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewed_by_fkey') THEN
    ALTER TABLE reviews 
    ADD CONSTRAINT reviews_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES profiles(clerk_id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_featured ON reviews(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved) WHERE is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_display_order ON reviews(display_order);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Update trigger for reviews
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Function to get approved and featured reviews for homepage
CREATE OR REPLACE FUNCTION get_featured_reviews(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  reviewer_name TEXT,
  reviewer_title TEXT,
  reviewer_company TEXT,
  reviewer_avatar_url TEXT,
  rating INTEGER,
  title TEXT,
  content TEXT,
  is_verified BOOLEAN,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  profile_display_name TEXT,
  profile_avatar_url TEXT,
  profile_is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    COALESCE(r.reviewer_name, p.display_name, p.email) as reviewer_name,
    r.reviewer_title,
    r.reviewer_company,
    COALESCE(r.reviewer_avatar_url, p.avatar_url) as reviewer_avatar_url,
    r.rating,
    r.title,
    r.content,
    COALESCE(r.is_verified, p.is_verified, FALSE) as is_verified,
    r.display_order,
    r.created_at,
    p.display_name as profile_display_name,
    p.avatar_url as profile_avatar_url,
    p.is_verified as profile_is_verified
  FROM reviews r
  INNER JOIN profiles p ON p.clerk_id = r.user_id
  WHERE r.status = 'approved'
    AND r.is_featured = TRUE
    AND (r.is_approved = TRUE OR r.status = 'approved')
  ORDER BY r.display_order ASC, r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all reviews for admin dashboard
CREATE OR REPLACE FUNCTION get_admin_reviews(
  p_status TEXT DEFAULT NULL,
  p_is_featured BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  user_email TEXT,
  user_display_name TEXT,
  reviewer_name TEXT,
  reviewer_title TEXT,
  reviewer_company TEXT,
  reviewer_avatar_url TEXT,
  rating INTEGER,
  title TEXT,
  content TEXT,
  is_featured BOOLEAN,
  is_approved BOOLEAN,
  is_verified BOOLEAN,
  display_order INTEGER,
  status TEXT,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  profile_avatar_url TEXT,
  profile_is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    p.email as user_email,
    p.display_name as user_display_name,
    r.reviewer_name,
    r.reviewer_title,
    r.reviewer_company,
    r.reviewer_avatar_url,
    r.rating,
    r.title,
    r.content,
    r.is_featured,
    r.is_approved,
    r.is_verified,
    r.display_order,
    r.status,
    r.admin_notes,
    r.reviewed_by,
    pa.display_name as reviewed_by_name,
    r.reviewed_at,
    r.created_at,
    r.updated_at,
    p.avatar_url as profile_avatar_url,
    p.is_verified as profile_is_verified
  FROM reviews r
  INNER JOIN profiles p ON p.clerk_id = r.user_id
  LEFT JOIN profiles pa ON pa.clerk_id = r.reviewed_by
  WHERE (p_status IS NULL OR r.status = p_status)
    AND (p_is_featured IS NULL OR r.is_featured = p_is_featured)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies (disabled for Clerk authentication)
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE reviews IS 'User reviews and feedback that can be displayed on the homepage';
COMMENT ON COLUMN reviews.is_featured IS 'Whether this review should be displayed on the homepage';
COMMENT ON COLUMN reviews.is_approved IS 'Whether admin has approved this review';
COMMENT ON COLUMN reviews.display_order IS 'Order for homepage display (lower numbers appear first)';
COMMENT ON COLUMN reviews.status IS 'Review status: pending, approved, rejected, or hidden';

