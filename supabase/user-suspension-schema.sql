-- User Suspension/Lock Schema
-- Allows admins to suspend user accounts

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by TEXT,
ADD COLUMN IF NOT EXISTS suspension_ends_at TIMESTAMP WITH TIME ZONE; -- NULL for permanent suspension

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended);

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_clerk_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  suspended BOOLEAN;
  ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT is_suspended, suspension_ends_at INTO suspended, ends_at
  FROM profiles
  WHERE clerk_id = user_clerk_id;
  
  -- If suspended and has end date, check if suspension has expired
  IF suspended AND ends_at IS NOT NULL THEN
    IF ends_at < NOW() THEN
      -- Suspension expired, auto-unsuspend
      UPDATE profiles SET is_suspended = FALSE, suspension_ends_at = NULL WHERE clerk_id = user_clerk_id;
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN COALESCE(suspended, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





