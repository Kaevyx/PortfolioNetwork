-- Profile Approval System
-- All profiles must be approved by an admin before they can be fully active

-- Add profile_status column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_status TEXT CHECK (profile_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS profile_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_approved_by TEXT, -- Clerk ID of admin who approved
ADD COLUMN IF NOT EXISTS profile_rejection_reason TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_status ON profiles(profile_status);

-- Function to get pending profiles count
CREATE OR REPLACE FUNCTION get_pending_profiles_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM profiles
    WHERE profile_status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON COLUMN profiles.profile_status IS 'Profile approval status: pending, approved, rejected';
COMMENT ON COLUMN profiles.profile_approved_at IS 'Timestamp when profile was approved';
COMMENT ON COLUMN profiles.profile_approved_by IS 'Clerk ID of admin who approved the profile';
COMMENT ON COLUMN profiles.profile_rejection_reason IS 'Reason for profile rejection if rejected';






