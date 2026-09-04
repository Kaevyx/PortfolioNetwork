-- Make Categories Global for Both Keywords and Domains
-- Removes the type separation and merges duplicate categories

-- First, create a unified categories table without type
CREATE TABLE IF NOT EXISTS moderation_categories_unified (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'violence', 'hate_speech', 'adult_content'
  display_name TEXT NOT NULL, -- e.g., 'Violence', 'Hate Speech', 'Adult Content'
  default_message TEXT NOT NULL, -- Default message shown to users (works for both keywords and domains)
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  updated_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Migrate and merge categories from both keyword and domain types
-- Use the most appropriate default message (prefer domain messages for shared categories as they're more specific)
INSERT INTO moderation_categories_unified (name, display_name, default_message, display_order, created_by)
SELECT DISTINCT ON (name)
  name,
  display_name,
  default_message,
  display_order,
  created_by
FROM (
  -- Get all keyword categories
  SELECT DISTINCT
    category as name,
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
    1 as priority, -- Lower priority for keyword messages
    ROW_NUMBER() OVER (ORDER BY category) as display_order,
    (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1) as created_by
  FROM blocked_keywords
  WHERE category IS NOT NULL
  
  UNION ALL
  
  -- Get all domain categories (these take priority for shared categories)
  SELECT DISTINCT
    category as name,
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
      WHEN 'adult_content' THEN 'Adult content, explicit sexual material, or inappropriate content is not allowed on our platform.'
      WHEN 'gambling' THEN 'Gambling content and links to gambling websites are not permitted.'
      WHEN 'scam' THEN 'Scam content is strictly prohibited. Please do not attempt to deceive or defraud others.'
      WHEN 'phishing' THEN 'Phishing and malicious content is strictly prohibited.'
      WHEN 'malware' THEN 'Malware and potentially harmful content is not allowed.'
      WHEN 'hate_site' THEN 'Hate speech and discriminatory content is not allowed on our platform.'
      WHEN 'spam' THEN 'Spam content is not allowed. Please ensure your message is relevant and meaningful.'
      ELSE 'This content violates our community guidelines.'
    END as default_message,
    2 as priority, -- Higher priority for domain messages (more specific)
    ROW_NUMBER() OVER (ORDER BY category) + 100 as display_order,
    (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1) as created_by
  FROM blocked_domains
  WHERE category IS NOT NULL
) combined
ORDER BY name, priority DESC
ON CONFLICT (name) DO NOTHING;

-- Drop the old table and rename the new one
DROP TABLE IF EXISTS moderation_categories CASCADE;
ALTER TABLE moderation_categories_unified RENAME TO moderation_categories;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_moderation_categories_is_active ON moderation_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_moderation_categories_display_order ON moderation_categories(display_order);

-- Drop old functions that use type parameter
DROP FUNCTION IF EXISTS get_moderation_categories(TEXT);
DROP FUNCTION IF EXISTS get_category_default_message(TEXT, TEXT);

-- Update functions to remove type parameter
CREATE OR REPLACE FUNCTION get_moderation_categories()
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
  WHERE mc.is_active = TRUE
  ORDER BY mc.display_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get default message for a category (no type needed)
CREATE OR REPLACE FUNCTION get_category_default_message(p_category_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_message TEXT;
BEGIN
  SELECT default_message INTO v_message
  FROM moderation_categories
  WHERE name = p_category_name
    AND is_active = TRUE;
  
  RETURN COALESCE(v_message, 'This content violates our community guidelines.');
END;
$$ LANGUAGE plpgsql;

-- Update comments
COMMENT ON TABLE moderation_categories IS 'Stores global categories for content moderation (used by both keywords and domains)';
COMMENT ON FUNCTION get_moderation_categories IS 'Returns all active categories, sorted alphabetically';
COMMENT ON FUNCTION get_category_default_message IS 'Returns the default message for a category (works for both keywords and domains)';

