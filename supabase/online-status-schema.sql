-- Online Status Schema
-- Tracks when users are online/offline

-- Create online_status table
CREATE TABLE IF NOT EXISTS online_status (
  user_id TEXT PRIMARY KEY REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_online_status_is_online ON online_status(is_online);
CREATE INDEX IF NOT EXISTS idx_online_status_last_seen ON online_status(last_seen);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_online_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_online_status_updated_at ON online_status;
CREATE TRIGGER update_online_status_updated_at
  BEFORE UPDATE ON online_status
  FOR EACH ROW
  EXECUTE FUNCTION update_online_status_updated_at();

-- Function to set user as online
CREATE OR REPLACE FUNCTION set_user_online(user_clerk_id TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO online_status (user_id, is_online, last_seen, updated_at)
  VALUES (user_clerk_id, true, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_online = true,
    last_seen = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to set user as offline
CREATE OR REPLACE FUNCTION set_user_offline(user_clerk_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE online_status
  SET is_online = false,
      last_seen = NOW(),
      updated_at = NOW()
  WHERE user_id = user_clerk_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_seen (heartbeat)
CREATE OR REPLACE FUNCTION update_last_seen(user_clerk_id TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO online_status (user_id, is_online, last_seen, updated_at)
  VALUES (user_clerk_id, true, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    last_seen = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

