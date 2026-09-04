-- Extended Status Banner Settings
-- Adds additional configuration options for status banner

-- Add new columns to status_banner_settings table
DO $$ 
BEGIN
  -- Refresh interval (5, 10, 30, 60 seconds, or 0 for manual)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'refresh_interval') THEN
    ALTER TABLE status_banner_settings ADD COLUMN refresh_interval INTEGER DEFAULT 10;
    ALTER TABLE status_banner_settings ADD CONSTRAINT check_refresh_interval CHECK (refresh_interval IN (5, 10, 30, 60, 0));
  END IF;

  -- Maximum incidents to display
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'max_incidents') THEN
    ALTER TABLE status_banner_settings ADD COLUMN max_incidents INTEGER DEFAULT 3;
    ALTER TABLE status_banner_settings ADD CONSTRAINT check_max_incidents CHECK (max_incidents > 0 AND max_incidents <= 10);
  END IF;

  -- Minimum incident severity filter
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'min_incident_severity') THEN
    ALTER TABLE status_banner_settings ADD COLUMN min_incident_severity TEXT DEFAULT 'none';
    ALTER TABLE status_banner_settings ADD CONSTRAINT check_min_incident_severity CHECK (min_incident_severity IN ('none', 'minor', 'major', 'critical'));
  END IF;

  -- Minimum status threshold
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'min_status_threshold') THEN
    ALTER TABLE status_banner_settings ADD COLUMN min_status_threshold TEXT DEFAULT 'operational';
    ALTER TABLE status_banner_settings ADD CONSTRAINT check_min_status_threshold CHECK (min_status_threshold IN ('operational', 'degraded_performance', 'partial_outage', 'major_outage'));
  END IF;

  -- Banner position
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'banner_position') THEN
    ALTER TABLE status_banner_settings ADD COLUMN banner_position TEXT DEFAULT 'top';
    ALTER TABLE status_banner_settings ADD CONSTRAINT check_banner_position CHECK (banner_position IN ('top', 'bottom'));
  END IF;

  -- Custom status messages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'custom_status_messages') THEN
    ALTER TABLE status_banner_settings ADD COLUMN custom_status_messages JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Custom status page URL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'custom_status_page_url') THEN
    ALTER TABLE status_banner_settings ADD COLUMN custom_status_page_url TEXT;
  END IF;

  -- Custom status page link text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'custom_status_page_link_text') THEN
    ALTER TABLE status_banner_settings ADD COLUMN custom_status_page_link_text TEXT;
  END IF;

  -- Visible to roles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'visible_to_roles') THEN
    ALTER TABLE status_banner_settings ADD COLUMN visible_to_roles TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Visible to plans
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'visible_to_plans') THEN
    ALTER TABLE status_banner_settings ADD COLUMN visible_to_plans TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Time-based rules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'time_based_rules') THEN
    ALTER TABLE status_banner_settings ADD COLUMN time_based_rules JSONB DEFAULT '{"enabled": false, "days": [1,2,3,4,5,6,7], "start_hour": 0, "end_hour": 23, "timezone": "UTC"}'::jsonb;
  END IF;

  -- Enable status change notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'enable_status_change_notifications') THEN
    ALTER TABLE status_banner_settings ADD COLUMN enable_status_change_notifications BOOLEAN DEFAULT FALSE;
  END IF;

  -- Notification channels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'notification_channels') THEN
    ALTER TABLE status_banner_settings ADD COLUMN notification_channels TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Display on all pages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'display_on_all_pages') THEN
    ALTER TABLE status_banner_settings ADD COLUMN display_on_all_pages BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update default settings
UPDATE status_banner_settings
SET 
  refresh_interval = 10,
  max_incidents = 3,
  min_incident_severity = 'none',
  min_status_threshold = 'operational',
  banner_position = 'top',
  custom_status_messages = '{}'::jsonb,
  custom_status_page_url = NULL,
  custom_status_page_link_text = NULL,
  visible_to_roles = ARRAY[]::TEXT[],
  visible_to_plans = ARRAY[]::TEXT[],
  time_based_rules = '{"enabled": false, "days": [1,2,3,4,5,6,7], "start_hour": 0, "end_hour": 23, "timezone": "UTC"}'::jsonb,
  enable_status_change_notifications = FALSE,
  notification_channels = ARRAY[]::TEXT[],
  display_on_all_pages = FALSE
WHERE id = '00000000-0000-0000-0000-000000000001';

COMMENT ON COLUMN status_banner_settings.refresh_interval IS 'Auto-refresh interval in seconds (5, 10, 30, 60, or 0 for manual)';
COMMENT ON COLUMN status_banner_settings.max_incidents IS 'Maximum number of incidents to display in the banner';
COMMENT ON COLUMN status_banner_settings.min_incident_severity IS 'Minimum incident severity to display (none, minor, major, critical)';
COMMENT ON COLUMN status_banner_settings.min_status_threshold IS 'Minimum system status threshold to show banner';
COMMENT ON COLUMN status_banner_settings.banner_position IS 'Banner position on dashboard (top or bottom)';
COMMENT ON COLUMN status_banner_settings.custom_status_messages IS 'Custom status messages per status type';
COMMENT ON COLUMN status_banner_settings.custom_status_page_url IS 'Custom URL for status page link';
COMMENT ON COLUMN status_banner_settings.custom_status_page_link_text IS 'Custom text for status page link (default: "View Status Page")';
COMMENT ON COLUMN status_banner_settings.visible_to_roles IS 'Array of user roles that can see the banner';
COMMENT ON COLUMN status_banner_settings.visible_to_plans IS 'Array of subscription plans that can see the banner';
COMMENT ON COLUMN status_banner_settings.time_based_rules IS 'Time-based display rules (days, hours, timezone)';
COMMENT ON COLUMN status_banner_settings.enable_status_change_notifications IS 'Enable notifications when system status changes';
COMMENT ON COLUMN status_banner_settings.notification_channels IS 'Notification channels (web - adds to notification bell)';
COMMENT ON COLUMN status_banner_settings.display_on_all_pages IS 'Display banner/card on all pages, not just dashboard';

