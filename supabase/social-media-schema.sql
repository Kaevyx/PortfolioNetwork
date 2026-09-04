-- Social media account connections
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL, -- Clerk ID
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'instagram', 'youtube', 'linkedin', 'facebook', 'tiktok', 'github', 'discord', 'twitch')),
  username TEXT NOT NULL,
  account_id TEXT, -- Platform-specific account ID
  access_token TEXT, -- OAuth token (encrypted in production)
  refresh_token TEXT, -- OAuth refresh token (encrypted in production)
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  subscribers_count INTEGER DEFAULT 0, -- For YouTube, Twitch
  members_count INTEGER DEFAULT 0, -- For Discord
  posts_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, platform), -- One account per platform per profile
  FOREIGN KEY (profile_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_social_media_profile_id ON social_media_accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_social_media_platform ON social_media_accounts(platform);

-- Update trigger
DROP TRIGGER IF EXISTS update_social_media_accounts_updated_at ON social_media_accounts;
CREATE TRIGGER update_social_media_accounts_updated_at BEFORE UPDATE ON social_media_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();






