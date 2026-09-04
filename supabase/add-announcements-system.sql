-- Announcements System
-- Allows admins to create announcements, information, warnings, and banners for users

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'information', 'warning', 'banner', 'maintenance')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'specific_users', 'new_accounts', 'unverified', 'suspended', 'not_agreed_policies', 'custom_filter')),
  target_user_ids TEXT[], -- Array of Clerk IDs for specific users
  target_criteria JSONB, -- Custom filter criteria (e.g., {"subscription_plan": "free", "created_after": "2024-01-01"})
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE, -- NULL means no end date
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL, -- Clerk ID of admin who created it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_target_type ON announcements(target_type);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_start_date ON announcements(start_date);
CREATE INDEX IF NOT EXISTS idx_announcements_end_date ON announcements(end_date);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- Table to track which users have dismissed announcements
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL,
  user_id TEXT NOT NULL, -- Clerk ID
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_announcement_id ON announcement_dismissals(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user_id ON announcement_dismissals(user_id);

-- Policy Re-confirmation System
-- Track policy versions and require re-confirmation when policies are updated

CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_type TEXT NOT NULL CHECK (policy_type IN ('privacy_policy', 'terms_of_service')),
  version TEXT NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requires_reconfirmation BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL, -- Clerk ID of admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(policy_type, version)
);

-- Update profiles to track which version they agreed to
-- We already have privacy_policy_version and terms_version columns
-- But we'll enhance this to work with the policy_versions table

-- Function to check if user needs to re-confirm policies
CREATE OR REPLACE FUNCTION needs_policy_reconfirmation(user_clerk_id TEXT)
RETURNS TABLE (
  needs_privacy_reconfirmation BOOLEAN,
  needs_terms_reconfirmation BOOLEAN,
  current_privacy_version TEXT,
  current_terms_version TEXT,
  user_privacy_version TEXT,
  user_terms_version TEXT
) AS $$
DECLARE
  user_profile RECORD;
  latest_privacy RECORD;
  latest_terms RECORD;
BEGIN
  -- Get user profile
  SELECT privacy_policy_version, terms_version INTO user_profile
  FROM profiles
  WHERE clerk_id = user_clerk_id;

  -- Get latest privacy policy version that requires reconfirmation
  SELECT version INTO latest_privacy
  FROM policy_versions
  WHERE policy_type = 'privacy_policy'
    AND requires_reconfirmation = TRUE
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Get latest terms version that requires reconfirmation
  SELECT version INTO latest_terms
  FROM policy_versions
  WHERE policy_type = 'terms_of_service'
    AND requires_reconfirmation = TRUE
  ORDER BY effective_date DESC
  LIMIT 1;

  RETURN QUERY SELECT
    (latest_privacy.version IS NOT NULL AND (user_profile.privacy_policy_version IS NULL OR user_profile.privacy_policy_version != latest_privacy.version)) AS needs_privacy_reconfirmation,
    (latest_terms.version IS NOT NULL AND (user_profile.terms_version IS NULL OR user_profile.terms_version != latest_terms.version)) AS needs_terms_reconfirmation,
    COALESCE(latest_privacy.version, '') AS current_privacy_version,
    COALESCE(latest_terms.version, '') AS current_terms_version,
    COALESCE(user_profile.privacy_policy_version, '') AS user_privacy_version,
    COALESCE(user_profile.terms_version, '') AS user_terms_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active announcements for a user
CREATE OR REPLACE FUNCTION get_user_announcements(user_clerk_id TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  type TEXT,
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  user_profile RECORD;
  user_created_at TIMESTAMP WITH TIME ZONE;
  user_is_verified BOOLEAN;
  user_is_suspended BOOLEAN;
  user_has_agreed_policies BOOLEAN;
BEGIN
  -- Get user profile data
  SELECT 
    created_at,
    is_verified,
    is_suspended,
    (privacy_policy_agreed_at IS NOT NULL AND terms_agreed_at IS NOT NULL) AS has_agreed_policies
  INTO user_profile
  FROM profiles
  WHERE clerk_id = user_clerk_id;

  IF user_profile IS NULL THEN
    RETURN;
  END IF;

  user_created_at := user_profile.created_at;
  user_is_verified := user_profile.is_verified;
  user_is_suspended := user_profile.is_suspended;
  user_has_agreed_policies := user_profile.has_agreed_policies;

  -- Return active announcements that match user criteria and haven't been dismissed
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.content,
    a.type,
    a.priority,
    a.created_at
  FROM announcements a
  WHERE a.is_active = TRUE
    AND a.start_date <= NOW()
    AND (a.end_date IS NULL OR a.end_date >= NOW())
    AND NOT EXISTS (
      SELECT 1 FROM announcement_dismissals ad
      WHERE ad.announcement_id = a.id AND ad.user_id = user_clerk_id
    )
    AND (
      -- All users
      a.target_type = 'all'
      OR
      -- Specific users
      (a.target_type = 'specific_users' AND user_clerk_id = ANY(a.target_user_ids))
      OR
      -- New accounts (created in last 7 days)
      (a.target_type = 'new_accounts' AND user_created_at >= NOW() - INTERVAL '7 days')
      OR
      -- Unverified users
      (a.target_type = 'unverified' AND NOT user_is_verified)
      OR
      -- Suspended users
      (a.target_type = 'suspended' AND user_is_suspended)
      OR
      -- Users who haven't agreed to policies
      (a.target_type = 'not_agreed_policies' AND NOT user_has_agreed_policies)
      OR
      -- Custom filter (check JSONB criteria)
      (a.target_type = 'custom_filter' AND a.target_criteria IS NOT NULL)
    )
  ORDER BY 
    CASE a.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

