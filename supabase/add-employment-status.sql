-- Add employment status field to profiles table
-- This will be used for job board functionality

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS employment_status TEXT CHECK (employment_status IN (
  'looking_for_job',
  'employed',
  'business_owner',
  'freelancer',
  'student',
  'unemployed',
  'retired',
  'not_specified'
)) DEFAULT 'not_specified';

-- Create index for job board queries
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON profiles(employment_status);

-- Add comment for documentation
COMMENT ON COLUMN profiles.employment_status IS 'Current employment status: looking_for_job, employed, business_owner, freelancer, student, unemployed, retired, or not_specified';






