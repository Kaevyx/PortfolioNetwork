-- Content Moderation System
-- Allows admins to manage blocked keywords and domains with categories and custom messages

-- Blocked Keywords Table
CREATE TABLE IF NOT EXISTS blocked_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'violence',
    'hate_speech',
    'bullying',
    'sexual_harassment',
    'self_harm',
    'offensive_language',
    'doxxing',
    'homophobia',
    'body_shaming',
    'gender_discrimination',
    'spam',
    'scam',
    'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'regex')),
  custom_message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Blocked Domains Table
CREATE TABLE IF NOT EXISTS blocked_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'adult_content',
    'gambling',
    'scam',
    'phishing',
    'malware',
    'hate_site',
    'spam',
    'other'
  )),
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high')),
  custom_message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_keywords_keyword ON blocked_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_blocked_keywords_category ON blocked_keywords(category);
CREATE INDEX IF NOT EXISTS idx_blocked_keywords_is_active ON blocked_keywords(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_keywords_match_type ON blocked_keywords(match_type);

CREATE INDEX IF NOT EXISTS idx_blocked_domains_domain ON blocked_domains(domain);
CREATE INDEX IF NOT EXISTS idx_blocked_domains_category ON blocked_domains(category);
CREATE INDEX IF NOT EXISTS idx_blocked_domains_is_active ON blocked_domains(is_active);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_keywords_unique ON blocked_keywords(keyword, match_type) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_domains_unique ON blocked_domains(domain) WHERE is_active = TRUE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_moderation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_blocked_keywords_updated_at
  BEFORE UPDATE ON blocked_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_content_moderation_updated_at();

CREATE TRIGGER update_blocked_domains_updated_at
  BEFORE UPDATE ON blocked_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_content_moderation_updated_at();

-- Function to get all active blocked keywords
CREATE OR REPLACE FUNCTION get_active_blocked_keywords()
RETURNS TABLE (
  id UUID,
  keyword TEXT,
  category TEXT,
  severity TEXT,
  match_type TEXT,
  custom_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bk.id,
    bk.keyword,
    bk.category,
    bk.severity,
    bk.match_type,
    bk.custom_message
  FROM blocked_keywords bk
  WHERE bk.is_active = TRUE
  ORDER BY bk.category, bk.severity DESC, bk.keyword;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active blocked domains
CREATE OR REPLACE FUNCTION get_active_blocked_domains()
RETURNS TABLE (
  id UUID,
  domain TEXT,
  category TEXT,
  severity TEXT,
  custom_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bd.id,
    bd.domain,
    bd.category,
    bd.severity,
    bd.custom_message
  FROM blocked_domains bd
  WHERE bd.is_active = TRUE
  ORDER BY bd.category, bd.severity DESC, bd.domain;
END;
$$ LANGUAGE plpgsql;

-- Function to check if text contains blocked keywords
CREATE OR REPLACE FUNCTION check_blocked_keywords(p_text TEXT)
RETURNS TABLE (
  keyword TEXT,
  category TEXT,
  severity TEXT,
  custom_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bk.keyword,
    bk.category,
    bk.severity,
    COALESCE(bk.custom_message, '') as custom_message
  FROM blocked_keywords bk
  WHERE bk.is_active = TRUE
  AND (
    (bk.match_type = 'exact' AND LOWER(p_text) = LOWER(bk.keyword))
    OR (bk.match_type = 'contains' AND LOWER(p_text) LIKE '%' || LOWER(bk.keyword) || '%')
    OR (bk.match_type = 'regex' AND p_text ~* bk.keyword)
  )
  ORDER BY 
    CASE bk.severity
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if domain is blocked
CREATE OR REPLACE FUNCTION check_blocked_domain(p_domain TEXT)
RETURNS TABLE (
  domain TEXT,
  category TEXT,
  severity TEXT,
  custom_message TEXT
) AS $$
DECLARE
  normalized_domain TEXT;
BEGIN
  -- Normalize domain (remove protocol, www, etc.)
  normalized_domain := LOWER(REGEXP_REPLACE(p_domain, '^https?://', '', 'gi'));
  normalized_domain := REGEXP_REPLACE(normalized_domain, '^www\.', '', 'gi');
  normalized_domain := SPLIT_PART(normalized_domain, '/', 1);
  normalized_domain := SPLIT_PART(normalized_domain, '?', 1);
  normalized_domain := SPLIT_PART(normalized_domain, '#', 1);
  normalized_domain := SPLIT_PART(normalized_domain, ':', 1);
  
  RETURN QUERY
  SELECT 
    bd.domain,
    bd.category,
    bd.severity,
    COALESCE(bd.custom_message, '') as custom_message
  FROM blocked_domains bd
  WHERE bd.is_active = TRUE
  AND (
    LOWER(bd.domain) = normalized_domain
    OR normalized_domain LIKE '%.' || LOWER(bd.domain)
  )
  ORDER BY 
    CASE bd.severity
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

