-- Add Privacy Policy and Terms of Service Agreement Tracking
-- Tracks when users agree to privacy policy and terms of service

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS privacy_policy_agreed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_agreed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT,
ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_policy_agreed_at ON profiles(privacy_policy_agreed_at);
CREATE INDEX IF NOT EXISTS idx_profiles_terms_agreed_at ON profiles(terms_agreed_at);

-- Comments for documentation
COMMENT ON COLUMN profiles.privacy_policy_agreed_at IS 'Timestamp when user agreed to the privacy policy. NULL if not agreed.';
COMMENT ON COLUMN profiles.terms_agreed_at IS 'Timestamp when user agreed to the terms of service. NULL if not agreed.';
COMMENT ON COLUMN profiles.privacy_policy_version IS 'Version of privacy policy that user agreed to (for tracking policy updates).';
COMMENT ON COLUMN profiles.terms_version IS 'Version of terms of service that user agreed to (for tracking terms updates).';

-- Function to check if user has agreed to both policies
CREATE OR REPLACE FUNCTION has_agreed_to_policies(user_clerk_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT privacy_policy_agreed_at IS NOT NULL AND terms_agreed_at IS NOT NULL
    FROM profiles
    WHERE clerk_id = user_clerk_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who haven't agreed to policies
CREATE OR REPLACE FUNCTION get_users_without_agreement()
RETURNS TABLE (
  clerk_id TEXT,
  display_name TEXT,
  email TEXT,
  privacy_policy_agreed_at TIMESTAMP WITH TIME ZONE,
  terms_agreed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.clerk_id,
    p.display_name,
    p.email,
    p.privacy_policy_agreed_at,
    p.terms_agreed_at,
    p.created_at
  FROM profiles p
  WHERE p.privacy_policy_agreed_at IS NULL OR p.terms_agreed_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

