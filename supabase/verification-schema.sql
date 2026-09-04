-- Profile verification system
-- Add verification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_reason TEXT, -- Reason for verification (e.g., "Public figure", "Brand", "Organization")
ADD COLUMN IF NOT EXISTS verification_documents JSONB; -- Store verification documents/links

-- Verification requests table (for admin review)
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  reason TEXT NOT NULL,
  documents JSONB, -- Links to verification documents
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by TEXT, -- Admin Clerk ID who reviewed
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_requests_profile_id ON verification_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);

-- Update trigger
DROP TRIGGER IF EXISTS update_verification_requests_updated_at ON verification_requests;
CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to approve verification
CREATE OR REPLACE FUNCTION approve_verification(request_id UUID, reviewer_id TEXT, notes TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  profile_clerk_id TEXT;
BEGIN
  -- Get profile ID from request
  SELECT profile_id INTO profile_clerk_id FROM verification_requests WHERE id = request_id;
  
  -- Update request
  UPDATE verification_requests
  SET status = 'approved',
      reviewed_by = reviewer_id,
      review_notes = notes,
      updated_at = NOW()
  WHERE id = request_id;
  
  -- Update profile
  UPDATE profiles
  SET is_verified = TRUE,
      verification_status = 'approved',
      verification_approved_at = NOW()
  WHERE clerk_id = profile_clerk_id;
END;
$$ LANGUAGE plpgsql;






