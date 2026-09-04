-- Featured Profiles System
-- Allows profiles to be featured in search results, with automatic featuring based on subscription plans
-- and manual override capabilities for admins

-- Add featured status fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS featured_priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_manually_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_boost INTEGER DEFAULT 0; -- Additional boost for manual featuring

-- Create index for faster featured profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_featured_priority ON profiles(featured_priority DESC, featured_boost DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_featured_until ON profiles(featured_until) WHERE featured_until IS NOT NULL;

-- Function to calculate featured priority based on subscription plan
CREATE OR REPLACE FUNCTION calculate_featured_priority(
  p_subscription_plan TEXT,
  p_is_manually_featured BOOLEAN,
  p_featured_boost INTEGER,
  p_subscription_status TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_priority INTEGER := 0;
BEGIN
  -- If subscription is suspended, no featured priority
  IF p_subscription_status = 'suspended' THEN
    RETURN 0;
  END IF;

  -- Base priority from subscription plan
  CASE p_subscription_plan
    WHEN 'ultimate' THEN
      v_priority := 100; -- Highest priority for Ultimate
    WHEN 'pro' THEN
      v_priority := 50;  -- Medium priority for Pro
    ELSE
      v_priority := 0;   -- No priority for Free
  END CASE;

  -- Add manual boost if manually featured
  IF p_is_manually_featured THEN
    v_priority := v_priority + p_featured_boost;
  END IF;

  RETURN v_priority;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update featured priority for a user
CREATE OR REPLACE FUNCTION update_user_featured_priority(p_clerk_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_subscription_plan TEXT;
  v_subscription_status TEXT;
  v_is_manually_featured BOOLEAN;
  v_featured_boost INTEGER;
  v_new_priority INTEGER;
BEGIN
  -- Get user's subscription details
  SELECT 
    p.subscription_plan,
    COALESCE(us.status, 'active') as status,
    COALESCE(p.is_manually_featured, FALSE),
    COALESCE(p.featured_boost, 0)
  INTO 
    v_subscription_plan,
    v_subscription_status,
    v_is_manually_featured,
    v_featured_boost
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.clerk_id
  WHERE p.clerk_id = p_clerk_id;

  -- Calculate new priority
  v_new_priority := calculate_featured_priority(
    v_subscription_plan,
    v_is_manually_featured,
    v_featured_boost,
    v_subscription_status
  );

  -- Update profile
  UPDATE profiles
  SET featured_priority = v_new_priority
  WHERE clerk_id = p_clerk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update featured priority when subscription changes
CREATE OR REPLACE FUNCTION trigger_update_featured_on_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update featured priority when subscription plan or status changes
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.plan_id IS DISTINCT FROM NEW.plan_id) OR 
       (OLD.status IS DISTINCT FROM NEW.status) THEN
      PERFORM update_user_featured_priority(NEW.user_id);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM update_user_featured_priority(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_subscriptions
DROP TRIGGER IF EXISTS update_featured_on_subscription_change ON user_subscriptions;
CREATE TRIGGER update_featured_on_subscription_change
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_featured_on_subscription_change();

-- Trigger to update featured priority when profile subscription_plan changes
CREATE OR REPLACE FUNCTION trigger_update_featured_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update featured priority when subscription_plan changes in profiles
  IF (OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan) OR
     (OLD.is_manually_featured IS DISTINCT FROM NEW.is_manually_featured) OR
     (OLD.featured_boost IS DISTINCT FROM NEW.featured_boost) THEN
    PERFORM update_user_featured_priority(NEW.clerk_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS update_featured_on_profile_change ON profiles;
CREATE TRIGGER update_featured_on_profile_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_featured_on_profile_change();

-- Function to get featured profiles for search/explore
CREATE OR REPLACE FUNCTION get_featured_profiles(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  clerk_id TEXT,
  display_name TEXT,
  profile_type TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  featured_priority INTEGER,
  subscription_plan TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.clerk_id,
    p.display_name,
    p.profile_type,
    p.bio,
    p.avatar_url,
    p.is_verified,
    p.featured_priority,
    p.subscription_plan
  FROM profiles p
  WHERE p.profile_status = 'approved'
    AND p.is_suspended = FALSE
    AND p.featured_priority > 0
    AND (p.featured_until IS NULL OR p.featured_until > NOW())
    AND (p_search_query IS NULL OR 
         p.display_name ILIKE '%' || p_search_query || '%' OR
         p.bio ILIKE '%' || p_search_query || '%')
  ORDER BY 
    p.featured_priority DESC,
    p.featured_boost DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize featured priorities for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT clerk_id, subscription_plan 
    FROM profiles 
    WHERE subscription_plan IN ('pro', 'ultimate')
  LOOP
    PERFORM update_user_featured_priority(user_record.clerk_id);
  END LOOP;
END;
$$;

