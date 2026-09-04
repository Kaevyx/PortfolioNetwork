-- Ensure reviews table exists and is properly set up
-- Run this if you get "Could not find the table 'public.reviews' in the schema cache"

-- First, check if table exists
DO $$ 
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews'
  ) THEN
    CREATE TABLE public.reviews (
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
    
    RAISE NOTICE 'Created reviews table';
  ELSE
    RAISE NOTICE 'reviews table already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating table: %', SQLERRM;
END $$;

-- Ensure all required columns exist
DO $$ 
BEGIN
  -- Add user_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'reviews' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN user_id TEXT;
    UPDATE public.reviews SET user_id = '' WHERE user_id IS NULL;
    ALTER TABLE public.reviews ALTER COLUMN user_id SET NOT NULL;
  END IF;
  
  -- Add other required columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'reviews' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN content TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'reviews' 
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5);
  END IF;
  
  RAISE NOTICE 'Ensured all required columns exist';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Make reviewer_id and reviewee_id nullable (if they exist)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'reviews' 
    AND column_name = 'reviewer_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.reviews ALTER COLUMN reviewer_id DROP NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'reviews' 
    AND column_name = 'reviewee_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.reviews ALTER COLUMN reviewee_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Disable RLS (since we're using Clerk auth)
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_featured ON public.reviews(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved) WHERE is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_display_order ON public.reviews(display_order);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Create RPC functions for reviews
-- Drop existing functions first (in case of schema changes)
DROP FUNCTION IF EXISTS get_featured_reviews(INTEGER);
DROP FUNCTION IF EXISTS get_admin_reviews(TEXT, BOOLEAN, INTEGER, INTEGER);

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
  FROM public.reviews r
  INNER JOIN public.profiles p ON p.clerk_id = r.user_id
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
  FROM public.reviews r
  INNER JOIN public.profiles p ON p.clerk_id = r.user_id
  LEFT JOIN public.profiles pa ON pa.clerk_id = r.reviewed_by
  WHERE (p_status IS NULL OR r.status = p_status)
    AND (p_is_featured IS NULL OR r.is_featured = p_is_featured)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update trigger for reviews
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Final confirmation
DO $$ 
BEGIN
  RAISE NOTICE 'Reviews table and functions setup complete!';
END $$;

