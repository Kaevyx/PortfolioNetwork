-- Create portfolio tables if they don't exist
-- These tables are used by the portfolio page

-- Portfolio Skills Table
CREATE TABLE IF NOT EXISTS portfolio_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  skill_name TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  category TEXT, -- 'technical', 'soft', 'language', 'certification'
  years_experience INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(profile_id, skill_name)
);

-- Portfolio Education Table
CREATE TABLE IF NOT EXISTS portfolio_education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  institution_name TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Portfolio Experience Table
CREATE TABLE IF NOT EXISTS portfolio_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  employment_type TEXT, -- 'full-time', 'part-time', 'freelance', 'contract'
  start_date DATE NOT NULL,
  end_date DATE, -- NULL if current
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Portfolio Certifications Table
CREATE TABLE IF NOT EXISTS portfolio_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  name TEXT NOT NULL,
  issuing_organization TEXT,
  issue_date DATE,
  expiration_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_skills_profile_id ON portfolio_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_education_profile_id ON portfolio_education(profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_experience_profile_id ON portfolio_experience(profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_certifications_profile_id ON portfolio_certifications(profile_id);

-- RLS Policies
-- Since we're using Clerk for authentication, we disable RLS for development
-- Authentication is handled at the application level via Clerk
-- For production, you should implement proper RLS policies that work with Clerk

ALTER TABLE portfolio_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_education DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_experience DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_certifications DISABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_portfolio_skills_updated_at ON portfolio_skills;
CREATE TRIGGER update_portfolio_skills_updated_at
    BEFORE UPDATE ON portfolio_skills
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_portfolio_education_updated_at ON portfolio_education;
CREATE TRIGGER update_portfolio_education_updated_at
    BEFORE UPDATE ON portfolio_education
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_portfolio_experience_updated_at ON portfolio_experience;
CREATE TRIGGER update_portfolio_experience_updated_at
    BEFORE UPDATE ON portfolio_experience
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_portfolio_certifications_updated_at ON portfolio_certifications;
CREATE TRIGGER update_portfolio_certifications_updated_at
    BEFORE UPDATE ON portfolio_certifications
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

