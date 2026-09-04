-- Roadmap Management System
-- Allows admins to create and manage roadmap items to keep users informed about planned, in-progress, and implemented features

-- Roadmap Items Table
CREATE TABLE IF NOT EXISTS roadmap_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- HTML content
  status TEXT NOT NULL CHECK (status IN (
    'planned',
    'in_progress',
    'thinking_about',
    'implemented',
    'cancelled'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'feature',
    'improvement',
    'bug_fix',
    'performance',
    'security',
    'ui_ux',
    'integration',
    'other'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  target_date DATE, -- Optional target completion date
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE, -- For highlighting important items
  published_at TIMESTAMP WITH TIME ZONE,
  published_by TEXT, -- Clerk ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL, -- Clerk ID
  updated_by TEXT,
  view_count INTEGER DEFAULT 0, -- Track views
  last_viewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_category ON roadmap_items(category);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_published ON roadmap_items(is_published);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_featured ON roadmap_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_display_order ON roadmap_items(display_order);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_target_date ON roadmap_items(target_date);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_roadmap_items_updated_at ON roadmap_items;
CREATE TRIGGER trigger_roadmap_items_updated_at
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- Function to increment roadmap item view count
CREATE OR REPLACE FUNCTION increment_roadmap_item_view(p_item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE roadmap_items
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get published roadmap items grouped by status
CREATE OR REPLACE FUNCTION get_published_roadmap_by_status()
RETURNS TABLE (
  status TEXT,
  item_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  priority TEXT,
  target_date DATE,
  display_order INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.status,
    r.id AS item_id,
    r.title,
    r.description,
    r.category,
    r.priority,
    r.target_date,
    r.display_order,
    r.is_featured,
    r.created_at,
    r.updated_at,
    r.view_count
  FROM roadmap_items r
  WHERE r.is_published = TRUE
  ORDER BY 
    CASE r.status
      WHEN 'implemented' THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'planned' THEN 3
      WHEN 'thinking_about' THEN 4
      WHEN 'cancelled' THEN 5
    END,
    r.display_order,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (disabled for Clerk auth)
ALTER TABLE roadmap_items DISABLE ROW LEVEL SECURITY;

-- Roadmap Item Updates Table
CREATE TABLE IF NOT EXISTS roadmap_item_updates (
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
COMMENT ON TABLE roadmap_items IS 'Roadmap items to keep users informed about planned, in-progress, and implemented features';
COMMENT ON TABLE roadmap_item_updates IS 'Updates posted by admins on roadmap items';
COMMENT ON COLUMN roadmap_items.status IS 'Status: planned, in_progress, thinking_about, implemented, cancelled';
COMMENT ON COLUMN roadmap_items.category IS 'Category: feature, improvement, bug_fix, performance, security, ui_ux, integration, other';
COMMENT ON COLUMN roadmap_items.target_date IS 'Optional target completion date for the roadmap item';
COMMENT ON FUNCTION get_published_roadmap_by_status IS 'Returns all published roadmap items grouped and ordered by status';

