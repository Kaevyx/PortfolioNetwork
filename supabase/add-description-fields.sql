-- Add description fields to portfolio tables if they don't exist
-- These fields allow users to provide detailed explanations about their skills, certifications, etc.

-- Add description to portfolio_skills if it doesn't exist
ALTER TABLE portfolio_skills 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add description to portfolio_certifications if it doesn't exist
ALTER TABLE portfolio_certifications 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add description to portfolio_items (projects) if it doesn't exist (it should already exist, but just in case)
ALTER TABLE portfolio_items 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Note: portfolio_education and portfolio_experience already have description fields






