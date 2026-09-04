-- Add display_type and template support to announcements

-- Add display_type column
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS display_type TEXT NOT NULL DEFAULT 'banner' 
  CHECK (display_type IN ('banner', 'card', 'modal', 'top_bar', 'sidebar', 'inline'));

-- Create announcement_templates table
CREATE TABLE IF NOT EXISTS announcement_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'information', 'warning', 'maintenance')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  display_type TEXT NOT NULL DEFAULT 'banner' CHECK (display_type IN ('banner', 'card', 'modal', 'top_bar', 'sidebar', 'inline')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'specific_users', 'new_accounts', 'unverified', 'suspended', 'not_agreed_policies', 'custom_filter')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_announcement_templates_created_by ON announcement_templates(created_by);

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS get_user_announcements(TEXT);

-- Update get_user_announcements function to include display_type
CREATE FUNCTION get_user_announcements(user_clerk_id TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  type TEXT,
  priority TEXT,
  display_type TEXT,
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
    profiles.created_at,
    profiles.is_verified,
    profiles.is_suspended,
    (profiles.privacy_policy_agreed_at IS NOT NULL AND profiles.terms_agreed_at IS NOT NULL) AS has_agreed_policies
  INTO user_profile
  FROM profiles
  WHERE profiles.clerk_id = user_clerk_id;

  IF user_profile IS NULL THEN
    RETURN;
  END IF;

  user_created_at := user_profile.created_at;
  user_is_verified := user_profile.is_verified;
  user_is_suspended := user_profile.is_suspended;
  user_has_agreed_policies := user_profile.has_agreed_policies;

  -- Return active announcements that match user criteria and haven't been dismissed
  -- Use explicit column references to avoid ambiguity
  RETURN QUERY
  SELECT 
    announcements.id,
    announcements.title,
    announcements.content,
    announcements.type,
    announcements.priority,
    announcements.display_type,
    announcements.created_at
  FROM announcements
  WHERE announcements.is_active = TRUE
    AND announcements.start_date <= NOW()
    AND (announcements.end_date IS NULL OR announcements.end_date >= NOW())
    AND NOT EXISTS (
      SELECT 1 FROM announcement_dismissals
      WHERE announcement_dismissals.announcement_id = announcements.id 
        AND announcement_dismissals.user_id = user_clerk_id
    )
    AND (
      -- All users
      announcements.target_type = 'all'
      OR
      -- Specific users
      (announcements.target_type = 'specific_users' AND user_clerk_id = ANY(announcements.target_user_ids))
      OR
      -- New accounts (created in last 7 days)
      (announcements.target_type = 'new_accounts' AND user_created_at >= NOW() - INTERVAL '7 days')
      OR
      -- Unverified users
      (announcements.target_type = 'unverified' AND NOT user_is_verified)
      OR
      -- Suspended users
      (announcements.target_type = 'suspended' AND user_is_suspended)
      OR
      -- Users who haven't agreed to policies
      (announcements.target_type = 'not_agreed_policies' AND NOT user_has_agreed_policies)
      OR
      -- Custom filter (check JSONB criteria)
      (announcements.target_type = 'custom_filter' AND announcements.target_criteria IS NOT NULL)
    )
  ORDER BY 
    CASE announcements.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    announcements.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at for templates
CREATE OR REPLACE FUNCTION update_announcement_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcement_templates_updated_at ON announcement_templates;
CREATE TRIGGER update_announcement_templates_updated_at
  BEFORE UPDATE ON announcement_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_templates_updated_at();

