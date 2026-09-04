-- Link tracking system for user profiles
-- Allows users to add custom links and track clicks with spam prevention

-- User links table
CREATE TABLE IF NOT EXISTS user_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  title TEXT NOT NULL, -- Display name for the link (e.g., "My Website", "Portfolio", "LinkedIn")
  url TEXT NOT NULL,
  icon TEXT, -- Optional icon name or emoji
  display_order INTEGER DEFAULT 0, -- For ordering links
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Link clicks table (for analytics and spam prevention)
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL,
  user_id TEXT, -- Clerk ID of the user who clicked (null for anonymous)
  ip_address TEXT, -- For spam prevention
  user_agent TEXT, -- Browser/device info
  referrer TEXT, -- Where they came from
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (link_id) REFERENCES user_links(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_links_profile_id ON user_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_links_active ON user_links(is_active);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_user_id ON link_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_ip_user ON link_clicks(ip_address, user_id);

-- Function to update click count (only for valid clicks)
CREATE OR REPLACE FUNCTION update_link_click_count()
RETURNS TRIGGER AS $$
DECLARE
  link_owner_id TEXT;
BEGIN
    -- Get the link owner's profile_id
    SELECT profile_id INTO link_owner_id
    FROM user_links
    WHERE id = NEW.link_id;
    
    -- Only increment count if:
    -- 1. Not clicked by the link owner
    -- 2. This is the first click from this user/IP
    IF (NEW.user_id IS NULL OR NEW.user_id != link_owner_id) THEN
        -- Check if this is the first click from this user/IP
        IF NEW.user_id IS NOT NULL THEN
            -- Check if user has clicked before
            IF NOT EXISTS (
                SELECT 1 FROM link_clicks 
                WHERE link_id = NEW.link_id 
                AND user_id = NEW.user_id 
                AND id != NEW.id
            ) THEN
                UPDATE user_links
                SET click_count = click_count + 1,
                    updated_at = NOW()
                WHERE id = NEW.link_id;
            END IF;
        ELSIF NEW.ip_address IS NOT NULL THEN
            -- Check if IP has clicked before (for anonymous users)
            IF NOT EXISTS (
                SELECT 1 FROM link_clicks 
                WHERE link_id = NEW.link_id 
                AND ip_address = NEW.ip_address 
                AND user_id IS NULL
                AND id != NEW.id
            ) THEN
                UPDATE user_links
                SET click_count = click_count + 1,
                    updated_at = NOW()
                WHERE id = NEW.link_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update click count
DROP TRIGGER IF EXISTS update_link_click_count_trigger ON link_clicks;
CREATE TRIGGER update_link_click_count_trigger
    AFTER INSERT ON link_clicks
    FOR EACH ROW EXECUTE FUNCTION update_link_click_count();

-- Function to check if this is a valid click (first click per user, not own link)
CREATE OR REPLACE FUNCTION is_valid_click(
  p_link_id UUID,
  p_user_id TEXT,
  p_ip_address TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  link_owner_id TEXT;
  existing_click INTEGER;
BEGIN
  -- Get the link owner's profile_id
  SELECT profile_id INTO link_owner_id
  FROM user_links
  WHERE id = p_link_id;
  
  -- Don't count clicks from the link owner
  IF p_user_id IS NOT NULL AND p_user_id = link_owner_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this user has already clicked this link (only count first click per user)
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO existing_click
    FROM link_clicks
    WHERE link_id = p_link_id
      AND user_id = p_user_id;
    
    IF existing_click > 0 THEN
      RETURN FALSE; -- Already clicked, don't count again
    END IF;
  END IF;
  
  -- For anonymous users, check IP address (only count first click per IP)
  IF p_user_id IS NULL AND p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO existing_click
    FROM link_clicks
    WHERE link_id = p_link_id
      AND ip_address = p_ip_address
      AND user_id IS NULL;
    
    IF existing_click > 0 THEN
      RETURN FALSE; -- Already clicked from this IP, don't count again
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ language 'plpgsql';

