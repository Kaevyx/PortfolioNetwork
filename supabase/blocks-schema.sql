-- Blocks table for blocking users
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id TEXT NOT NULL, -- Clerk ID of the user blocking
  blocked_id TEXT NOT NULL, -- Clerk ID of the user being blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (blocker_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(blocker_id, blocked_id), -- A user can only block another user once
  CHECK (blocker_id != blocked_id) -- Prevent self-blocking
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);






