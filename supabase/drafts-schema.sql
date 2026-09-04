-- Drafts table for saving post drafts
CREATE TABLE IF NOT EXISTS post_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_post_drafts_profile_id ON post_drafts(profile_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_post_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_post_drafts_updated_at ON post_drafts;
CREATE TRIGGER update_post_drafts_updated_at
  BEFORE UPDATE ON post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_drafts_updated_at();

