-- Category Management System for Content Moderation
-- Allows admins to create, update, and delete categories for blocked keywords and domains

-- Moderation Categories Table (for keywords)
CREATE TABLE IF NOT EXISTS moderation_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'violence', 'hate_speech'
  display_name TEXT NOT NULL, -- e.g., 'Violence', 'Hate Speech'
  default_message TEXT NOT NULL, -- Default message shown to users
  type TEXT NOT NULL CHECK (type IN ('keyword', 'domain')) DEFAULT 'keyword',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0, -- For sorting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  updated_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_moderation_categories_type ON moderation_categories(type);
CREATE INDEX IF NOT EXISTS idx_moderation_categories_is_active ON moderation_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_moderation_categories_display_order ON moderation_categories(display_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moderation_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_moderation_categories_updated_at
  BEFORE UPDATE ON moderation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_categories_updated_at();

-- Migrate existing categories to moderation_categories table
-- First, insert keyword categories
INSERT INTO moderation_categories (name, display_name, default_message, type, display_order, created_by)
SELECT DISTINCT
  category,
  CASE category
    WHEN 'violence' THEN 'Violence'
    WHEN 'hate_speech' THEN 'Hate Speech'
    WHEN 'bullying' THEN 'Bullying'
    WHEN 'sexual_harassment' THEN 'Sexual Harassment'
    WHEN 'self_harm' THEN 'Self Harm'
    WHEN 'offensive_language' THEN 'Offensive Language'
    WHEN 'doxxing' THEN 'Doxxing'
    WHEN 'homophobia' THEN 'Homophobia'
    WHEN 'body_shaming' THEN 'Body Shaming'
    WHEN 'gender_discrimination' THEN 'Gender Discrimination'
    WHEN 'racism' THEN 'Racism'
    WHEN 'drugs' THEN 'Drugs'
    WHEN 'adult_content' THEN 'Adult Content'
    WHEN 'illegal_activities' THEN 'Illegal Activities'
    WHEN 'spam' THEN 'Spam'
    WHEN 'scam' THEN 'Scam'
    ELSE 'Other'
  END as display_name,
  CASE category
    WHEN 'violence' THEN 'Content containing references to violence, threats, or harm is not permitted.'
    WHEN 'hate_speech' THEN 'Hate speech and discriminatory content is not allowed on our platform.'
    WHEN 'bullying' THEN 'Bullying and harassment are not tolerated. Please treat others with respect.'
    WHEN 'sexual_harassment' THEN 'Sexual harassment and inappropriate sexual content is strictly prohibited.'
    WHEN 'self_harm' THEN 'Content promoting self-harm or suicide is not permitted. If you need help, please reach out to support services.'
    WHEN 'offensive_language' THEN 'Offensive language and slurs are not allowed. Please communicate respectfully.'
    WHEN 'doxxing' THEN 'Doxxing and privacy violations are strictly prohibited.'
    WHEN 'homophobia' THEN 'Homophobia, transphobia, and discrimination against LGBTQ+ individuals is not tolerated. We support and respect all sexual orientations and gender identities.'
    WHEN 'body_shaming' THEN 'Body shaming and appearance-based discrimination is not allowed. Please be respectful of others regardless of their appearance.'
    WHEN 'gender_discrimination' THEN 'Gender-based discrimination, sexism, and misogyny are not permitted. We promote equality and respect for all genders.'
    WHEN 'racism' THEN 'Racist language, slurs, and discriminatory content based on race or ethnicity are strictly prohibited.'
    WHEN 'drugs' THEN 'Content promoting, selling, or discussing illegal drugs or substance abuse is not permitted on our platform.'
    WHEN 'adult_content' THEN 'Adult content, explicit sexual material, or inappropriate content is not allowed on our platform.'
    WHEN 'illegal_activities' THEN 'Content promoting, describing, or facilitating illegal activities is strictly prohibited.'
    WHEN 'spam' THEN 'Spam content is not allowed. Please ensure your message is relevant and meaningful.'
    WHEN 'scam' THEN 'Scam content is strictly prohibited. Please do not attempt to deceive or defraud others.'
    ELSE 'This content violates our community guidelines.'
  END as default_message,
  'keyword' as type,
  ROW_NUMBER() OVER (ORDER BY category) as display_order,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1) as created_by
FROM blocked_keywords
WHERE category NOT IN (SELECT name FROM moderation_categories WHERE type = 'keyword')
ON CONFLICT (name) DO NOTHING;

-- Insert domain categories
INSERT INTO moderation_categories (name, display_name, default_message, type, display_order, created_by)
SELECT DISTINCT
  category,
  CASE category
    WHEN 'adult_content' THEN 'Adult Content'
    WHEN 'gambling' THEN 'Gambling'
    WHEN 'scam' THEN 'Scam'
    WHEN 'phishing' THEN 'Phishing'
    WHEN 'malware' THEN 'Malware'
    WHEN 'hate_site' THEN 'Hate Site'
    WHEN 'spam' THEN 'Spam'
    ELSE 'Other'
  END as display_name,
  CASE category
    WHEN 'adult_content' THEN 'Your content contains a link to an adult content website. Posts containing links to inappropriate or adult content websites are not allowed.'
    WHEN 'gambling' THEN 'Your content contains a link to a gambling website. Links to gambling sites are not permitted.'
    WHEN 'scam' THEN 'Your content contains a link to a website that may be a scam. Please do not share links to potentially fraudulent websites.'
    WHEN 'phishing' THEN 'Your content contains a link to a potentially malicious website. Links to phishing or malware sites are strictly prohibited.'
    WHEN 'malware' THEN 'Your content contains a link to a website that may contain malware. Links to potentially harmful websites are not allowed.'
    WHEN 'hate_site' THEN 'Your content contains a link to a website that promotes hate speech or discrimination. Such links are not permitted.'
    WHEN 'spam' THEN 'Your content contains a link to a spam website. Links to spam sites are not allowed.'
    ELSE 'Your content contains a link to a website that violates our community guidelines.'
  END as default_message,
  'domain' as type,
  ROW_NUMBER() OVER (ORDER BY category) as display_order,
  (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1) as created_by
FROM blocked_domains
WHERE category NOT IN (SELECT name FROM moderation_categories WHERE type = 'domain')
ON CONFLICT (name) DO NOTHING;

-- Now we need to update the blocked_keywords and blocked_domains tables
-- to remove the CHECK constraint and allow any category from moderation_categories

-- Drop existing CHECK constraints
ALTER TABLE blocked_keywords
DROP CONSTRAINT IF EXISTS blocked_keywords_category_check;

ALTER TABLE blocked_domains
DROP CONSTRAINT IF EXISTS blocked_domains_category_check;

-- Add foreign key constraints (optional, but we'll keep it flexible)
-- We'll validate categories exist in moderation_categories via application logic
-- or we can add a trigger/function to validate

-- Function to get categories by type, sorted alphabetically
CREATE OR REPLACE FUNCTION get_moderation_categories(p_type TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  display_name TEXT,
  default_message TEXT,
  is_active BOOLEAN,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.name,
    mc.display_name,
    mc.default_message,
    mc.is_active,
    mc.display_order,
    mc.created_at,
    mc.updated_at
  FROM moderation_categories mc
  WHERE mc.type = p_type
    AND mc.is_active = TRUE
  ORDER BY mc.display_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get default message for a category
CREATE OR REPLACE FUNCTION get_category_default_message(p_category_name TEXT, p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_message TEXT;
BEGIN
  SELECT default_message INTO v_message
  FROM moderation_categories
  WHERE name = p_category_name
    AND type = p_type
    AND is_active = TRUE;
  
  RETURN COALESCE(v_message, 'This content violates our community guidelines.');
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE moderation_categories IS 'Stores categories for content moderation (keywords and domains)';
COMMENT ON FUNCTION get_moderation_categories IS 'Returns active categories for a given type (keyword or domain), sorted alphabetically';
COMMENT ON FUNCTION get_category_default_message IS 'Returns the default message for a category';

