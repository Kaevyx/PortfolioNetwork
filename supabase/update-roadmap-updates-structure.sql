-- Migration to update roadmap_item_updates table structure
-- Changes: title + description -> status + message (like status page incident updates)

-- Drop existing table and recreate with new structure
-- Note: This will delete existing updates. If you have important data, back it up first.

-- First, drop the table (this will cascade delete all updates)
DROP TABLE IF EXISTS roadmap_item_updates CASCADE;

-- Recreate with new structure
CREATE TABLE roadmap_item_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roadmap_item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (
    'planned',
    'in_progress',
    'thinking_about',
    'implemented',
    'cancelled'
  )),
  message TEXT NOT NULL, -- Update message (HTML content)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL, -- Clerk ID
  updated_by TEXT
);

-- Create indexes for roadmap updates
CREATE INDEX IF NOT EXISTS idx_roadmap_updates_item_id ON roadmap_item_updates(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_updates_created_at ON roadmap_item_updates(created_at);

-- Trigger to update updated_at timestamp for updates
DROP TRIGGER IF EXISTS trigger_roadmap_updates_updated_at ON roadmap_item_updates;
CREATE TRIGGER trigger_roadmap_updates_updated_at
  BEFORE UPDATE ON roadmap_item_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- RLS Policies (disabled for Clerk auth)
ALTER TABLE roadmap_item_updates DISABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE roadmap_item_updates IS 'Updates posted by admins on roadmap items, similar to status page incident updates';
COMMENT ON COLUMN roadmap_item_updates.status IS 'Status at the time of update: planned, in_progress, thinking_about, implemented, cancelled';
COMMENT ON COLUMN roadmap_item_updates.message IS 'Update message in HTML format';

