-- Storage Management Schema
-- This schema handles file storage, storage limits per plan, and usage tracking

-- Add storage limits to subscription plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 100; -- Storage in MB

-- Update existing plans with storage limits
UPDATE subscription_plans 
SET max_storage_mb = CASE 
  WHEN name = 'free' THEN 50      -- 50 MB for free plan
  WHEN name = 'pro' THEN 500      -- 500 MB for pro plan
  WHEN name = 'business' THEN 5000 -- 5 GB for business plan
  ELSE 50
END
WHERE max_storage_mb IS NULL OR max_storage_mb = 100;

-- Storage usage tracking table
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE, -- Clerk ID
  total_bytes BIGINT DEFAULT 0, -- Total storage used in bytes
  file_count INTEGER DEFAULT 0,  -- Number of files stored
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Storage files tracking table (for detailed tracking)
CREATE TABLE IF NOT EXISTS storage_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk ID
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'cv', 'profile_picture', 'portfolio_image', etc.
  file_size BIGINT NOT NULL, -- Size in bytes
  mime_type TEXT,
  bucket_name TEXT NOT NULL, -- Which bucket the file is in
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_storage_usage_user_id ON storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_user_id ON storage_files(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_file_type ON storage_files(file_type);
CREATE INDEX IF NOT EXISTS idx_storage_files_bucket_name ON storage_files(bucket_name);

-- Function to update storage usage when a file is added
CREATE OR REPLACE FUNCTION update_storage_usage_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO storage_usage (user_id, total_bytes, file_count, last_updated)
  VALUES (NEW.user_id, NEW.file_size, 1, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_bytes = storage_usage.total_bytes + NEW.file_size,
    file_count = storage_usage.file_count + 1,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update storage usage when a file is deleted
CREATE OR REPLACE FUNCTION update_storage_usage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE storage_usage
  SET 
    total_bytes = GREATEST(0, total_bytes - OLD.file_size),
    file_count = GREATEST(0, file_count - 1),
    last_updated = NOW()
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update storage usage when a file is updated (size changed)
CREATE OR REPLACE FUNCTION update_storage_usage_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.file_size != NEW.file_size THEN
    UPDATE storage_usage
    SET 
      total_bytes = total_bytes - OLD.file_size + NEW.file_size,
      last_updated = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_storage_usage_insert ON storage_files;
CREATE TRIGGER trigger_storage_usage_insert
  AFTER INSERT ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage_on_insert();

DROP TRIGGER IF EXISTS trigger_storage_usage_delete ON storage_files;
CREATE TRIGGER trigger_storage_usage_delete
  AFTER DELETE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage_on_delete();

DROP TRIGGER IF EXISTS trigger_storage_usage_update ON storage_files;
CREATE TRIGGER trigger_storage_usage_update
  AFTER UPDATE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage_on_update();

-- Function to get user's storage limit based on their plan
CREATE OR REPLACE FUNCTION get_user_storage_limit(user_clerk_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  user_plan TEXT;
  storage_limit INTEGER;
BEGIN
  SELECT subscription_plan INTO user_plan
  FROM profiles
  WHERE clerk_id = user_clerk_id;
  
  SELECT max_storage_mb INTO storage_limit
  FROM subscription_plans
  WHERE name = COALESCE(user_plan, 'free');
  
  RETURN COALESCE(storage_limit, 50) * 1024 * 1024; -- Convert MB to bytes
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has enough storage
CREATE OR REPLACE FUNCTION check_storage_available(user_clerk_id TEXT, file_size_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  storage_limit BIGINT;
BEGIN
  -- Get current usage
  SELECT COALESCE(total_bytes, 0) INTO current_usage
  FROM storage_usage
  WHERE user_id = user_clerk_id;
  
  -- Get storage limit
  SELECT get_user_storage_limit(user_clerk_id) INTO storage_limit;
  
  -- Check if adding this file would exceed limit
  RETURN (current_usage + file_size_bytes) <= storage_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (disabled for Clerk auth)
ALTER TABLE storage_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_files DISABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE storage_usage IS 'Tracks total storage usage per user';
COMMENT ON TABLE storage_files IS 'Tracks individual files stored by users';
COMMENT ON COLUMN subscription_plans.max_storage_mb IS 'Maximum storage allocation in MB for this plan';
COMMENT ON FUNCTION get_user_storage_limit IS 'Returns storage limit in bytes for a user based on their subscription plan';
COMMENT ON FUNCTION check_storage_available IS 'Checks if user has enough storage space for a new file';






