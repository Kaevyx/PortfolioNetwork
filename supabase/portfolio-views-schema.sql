-- Portfolio Views Tracking Schema
-- Tracks when users view portfolios and mark them as "seen"

-- Portfolio Views Table
CREATE TABLE IF NOT EXISTS portfolio_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_owner_id TEXT NOT NULL, -- Clerk ID of portfolio owner
  viewer_id TEXT, -- Clerk ID of viewer (NULL for anonymous)
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marked_seen BOOLEAN DEFAULT false, -- Whether user clicked "Seen" button
  seen_at TIMESTAMP WITH TIME ZONE, -- When user marked as seen
  FOREIGN KEY (portfolio_owner_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(portfolio_owner_id, viewer_id) -- One view per user per portfolio (can update to mark as seen)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_views_owner_id ON portfolio_views(portfolio_owner_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_viewer_id ON portfolio_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_viewed_at ON portfolio_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_marked_seen ON portfolio_views(marked_seen);

-- RLS Policies (disabled for Clerk authentication)
ALTER TABLE portfolio_views DISABLE ROW LEVEL SECURITY;

-- Function to get portfolio view count
CREATE OR REPLACE FUNCTION get_portfolio_view_count(owner_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT viewer_id) 
    FROM portfolio_views 
    WHERE portfolio_owner_id = owner_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get portfolio seen count
CREATE OR REPLACE FUNCTION get_portfolio_seen_count(owner_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM portfolio_views 
    WHERE portfolio_owner_id = owner_id AND marked_seen = true
  );
END;
$$ LANGUAGE plpgsql;






