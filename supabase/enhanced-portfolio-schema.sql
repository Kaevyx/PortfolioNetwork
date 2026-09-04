-- Enhanced portfolio/CV features
-- Extends portfolio_items with additional professional information

-- Add new columns to portfolio_items if they don't exist
ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'project', -- 'project', 'certification', 'education', 'experience', 'skill'
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false, -- For ongoing projects/positions
  ADD COLUMN IF NOT EXISTS company_name TEXT, -- For work experience
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[], -- Additional skills array
  ADD COLUMN IF NOT EXISTS achievements TEXT[], -- List of achievements
  ADD COLUMN IF NOT EXISTS technologies TEXT[], -- Technologies used
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false, -- Featured portfolio items
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Skills table (for individual profiles)
CREATE TABLE IF NOT EXISTS profile_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  skill_name TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  years_experience INTEGER,
  category TEXT, -- 'technical', 'soft', 'language', 'certification'
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(profile_id, skill_name)
);

-- Education entries
CREATE TABLE IF NOT EXISTS education_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  gpa TEXT, -- e.g., "3.8/4.0"
  description TEXT,
  achievements TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Work experience entries
CREATE TABLE IF NOT EXISTS work_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  achievements TEXT[],
  skills_used TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  issue_date DATE,
  expiration_date DATE,
  credential_id TEXT, -- Certificate ID or license number
  credential_url TEXT, -- Link to verify the certification
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_skills_profile_id ON profile_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_education_entries_profile_id ON education_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_profile_id ON work_experience(profile_id);
CREATE INDEX IF NOT EXISTS idx_certifications_profile_id ON certifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured ON portfolio_items(featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_project_type ON portfolio_items(project_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_portfolio_items_updated_at ON portfolio_items;
CREATE TRIGGER update_portfolio_items_updated_at
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_education_updated_at ON education_entries;
CREATE TRIGGER update_education_updated_at
    BEFORE UPDATE ON education_entries
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_work_experience_updated_at ON work_experience;
CREATE TRIGGER update_work_experience_updated_at
    BEFORE UPDATE ON work_experience
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

DROP TRIGGER IF EXISTS update_certifications_updated_at ON certifications;
CREATE TRIGGER update_certifications_updated_at
    BEFORE UPDATE ON certifications
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();






