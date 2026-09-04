-- Status Banner Settings for Dashboard
-- Allows admins to control visibility of status banner on user dashboards

CREATE TABLE IF NOT EXISTS status_banner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_enabled BOOLEAN DEFAULT FALSE, -- Whether banner is shown to users
  show_incidents BOOLEAN DEFAULT TRUE, -- Whether to show incident information
  only_show_when_issues BOOLEAN DEFAULT TRUE, -- Only show when status is not operational
  banner_type TEXT DEFAULT 'banner' CHECK (banner_type IN ('banner', 'card')), -- Display style
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create a single row constraint (only one settings record)
CREATE UNIQUE INDEX IF NOT EXISTS idx_status_banner_settings_single ON status_banner_settings((1));

-- Insert default settings if none exist
INSERT INTO status_banner_settings (id, is_enabled, show_incidents, only_show_when_issues, banner_type)
VALUES ('00000000-0000-0000-0000-000000000001', FALSE, TRUE, TRUE, 'banner')
ON CONFLICT DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER update_status_banner_settings_updated_at
  BEFORE UPDATE ON status_banner_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_status_updated_at();

COMMENT ON TABLE status_banner_settings IS 'Settings for displaying system status banner on user dashboards';
COMMENT ON COLUMN status_banner_settings.is_enabled IS 'Whether the status banner is currently enabled and visible to users';
COMMENT ON COLUMN status_banner_settings.show_incidents IS 'Whether to display active incident information in the banner';
COMMENT ON COLUMN status_banner_settings.only_show_when_issues IS 'If true, only show banner when system status is not operational';
COMMENT ON COLUMN status_banner_settings.banner_type IS 'Display style: banner (full width) or card (contained)';


