-- Custom Profile URLs System
-- Allows Pro/Ultimate users to customize their profile URL (e.g., /profile/Kaevyx)
-- Free users get auto-generated usernames based on their display name

-- Add username field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_lower TEXT; -- For case-insensitive lookups

-- Create unique index on username_lower (case-insensitive uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles(LOWER(username_lower)) WHERE username_lower IS NOT NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower_lookup ON profiles(username_lower) WHERE username_lower IS NOT NULL;

-- Function to generate a default username from display name
CREATE OR REPLACE FUNCTION generate_default_username(p_display_name TEXT, p_clerk_id TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Clean display name: lowercase, remove special chars, replace spaces with hyphens
  base_username := LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(p_display_name, '[^a-z0-9\s-]', '', 'gi'),
    '\s+', '-', 'g'
  ));
  
  -- Remove leading/trailing hyphens
  base_username := TRIM(BOTH '-' FROM base_username);
  
  -- If empty or too short, use a fallback
  IF base_username IS NULL OR LENGTH(base_username) < 3 THEN
    base_username := 'user-' || SUBSTRING(p_clerk_id, 1, 8);
  END IF;
  
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user-' || SUBSTRING(p_clerk_id, 1, 8);
  END IF;
  
  -- Check if username is available, if not append numbers
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username_lower = LOWER(final_username)) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
    
    -- Safety check to prevent infinite loop
    IF counter > 9999 THEN
      final_username := base_username || '-' || SUBSTRING(p_clerk_id, 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Function to check if username is available
CREATE OR REPLACE FUNCTION check_username_availability(p_username TEXT, p_exclude_clerk_id TEXT DEFAULT NULL)
RETURNS TABLE (
  available BOOLEAN,
  message TEXT
) AS $$
DECLARE
  cleaned_username TEXT;
BEGIN
  -- Validate username format
  IF p_username IS NULL OR LENGTH(TRIM(p_username)) = 0 THEN
    RETURN QUERY SELECT FALSE, 'Username cannot be empty'::TEXT;
    RETURN;
  END IF;
  
  cleaned_username := LOWER(TRIM(p_username));
  
  -- Check length (3-30 characters)
  IF LENGTH(cleaned_username) < 3 THEN
    RETURN QUERY SELECT FALSE, 'Username must be at least 3 characters'::TEXT;
    RETURN;
  END IF;
  
  IF LENGTH(cleaned_username) > 30 THEN
    RETURN QUERY SELECT FALSE, 'Username must be 30 characters or less'::TEXT;
    RETURN;
  END IF;
  
  -- Check format (alphanumeric, hyphens, underscores only)
  IF NOT cleaned_username ~ '^[a-z0-9_-]+$' THEN
    RETURN QUERY SELECT FALSE, 'Username can only contain letters, numbers, hyphens, and underscores'::TEXT;
    RETURN;
  END IF;
  
  -- Check if starts/ends with hyphen or underscore
  IF cleaned_username ~ '^[-_]|[-_]$' THEN
    RETURN QUERY SELECT FALSE, 'Username cannot start or end with a hyphen or underscore'::TEXT;
    RETURN;
  END IF;
  
  -- Check for reserved usernames
  IF cleaned_username IN ('admin', 'administrator', 'api', 'www', 'mail', 'support', 'help', 'about', 'contact', 'privacy', 'terms', 'profile', 'dashboard', 'settings', 'explore', 'inbox', 'sign-in', 'sign-up', 'signout', 'auth', 'oauth', 'callback', 'webhook', 'webhooks') THEN
    RETURN QUERY SELECT FALSE, 'This username is reserved'::TEXT;
    RETURN;
  END IF;
  
  -- Check if username is already taken
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE username_lower = cleaned_username 
    AND (p_exclude_clerk_id IS NULL OR clerk_id != p_exclude_clerk_id)
  ) THEN
    RETURN QUERY SELECT FALSE, 'This username is already taken'::TEXT;
    RETURN;
  END IF;
  
  -- Username is available
  RETURN QUERY SELECT TRUE, 'Username is available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update username (with validation and plan check)
CREATE OR REPLACE FUNCTION update_profile_username(
  p_clerk_id TEXT,
  p_new_username TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  username TEXT
) AS $$
DECLARE
  user_plan TEXT;
  cleaned_username TEXT;
  availability_result RECORD;
BEGIN
  -- Get user's subscription plan
  SELECT subscription_plan INTO user_plan
  FROM profiles
  WHERE clerk_id = p_clerk_id;
  
  -- Check if user has Pro or Ultimate plan
  IF user_plan NOT IN ('pro', 'ultimate') THEN
    RETURN QUERY SELECT FALSE, 'Custom usernames are only available for Pro and Ultimate plan users'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check availability
  SELECT * INTO availability_result
  FROM check_username_availability(p_new_username, p_clerk_id);
  
  IF NOT availability_result.available THEN
    RETURN QUERY SELECT FALSE, availability_result.message, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Update username
  cleaned_username := LOWER(TRIM(p_new_username));
  
  UPDATE profiles
  SET 
    username = p_new_username,
    username_lower = cleaned_username,
    updated_at = NOW()
  WHERE clerk_id = p_clerk_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Username updated successfully'::TEXT, p_new_username;
  ELSE
    RETURN QUERY SELECT FALSE, 'Profile not found'::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate username for new profiles
CREATE OR REPLACE FUNCTION auto_generate_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if username is not set
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := generate_default_username(NEW.display_name, NEW.clerk_id);
    NEW.username_lower := LOWER(NEW.username);
  ELSE
    -- Ensure username_lower is set
    NEW.username_lower := LOWER(NEW.username);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_username ON profiles;
CREATE TRIGGER trigger_auto_generate_username
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.username IS NULL OR NEW.username = '' OR NEW.username_lower IS NULL)
  EXECUTE FUNCTION auto_generate_username();

-- Function to get profile by username or clerk_id
CREATE OR REPLACE FUNCTION get_profile_by_identifier(p_identifier TEXT)
RETURNS TABLE (
  clerk_id TEXT,
  username TEXT,
  display_name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  subscription_plan TEXT,
  is_suspended BOOLEAN,
  profile_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.clerk_id,
    p.username,
    p.display_name,
    p.email,
    p.bio,
    p.avatar_url,
    p.is_verified,
    p.subscription_plan,
    p.is_suspended,
    p.profile_status,
    p.created_at
  FROM profiles p
  WHERE 
    p.clerk_id = p_identifier 
    OR p.username_lower = LOWER(p_identifier)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing profiles with usernames
DO $$
DECLARE
  profile_record RECORD;
  generated_username TEXT;
BEGIN
  -- Only update profiles that don't have a username
  FOR profile_record IN 
    SELECT clerk_id, display_name 
    FROM profiles 
    WHERE username IS NULL OR username = ''
  LOOP
    generated_username := generate_default_username(
      profile_record.display_name, 
      profile_record.clerk_id
    );
    
    UPDATE profiles
    SET 
      username = generated_username,
      username_lower = LOWER(generated_username)
    WHERE clerk_id = profile_record.clerk_id;
  END LOOP;
END $$;


