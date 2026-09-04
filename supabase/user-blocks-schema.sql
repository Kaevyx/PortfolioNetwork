-- User Blocks Schema
-- Allows users to block other users

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id TEXT NOT NULL, -- Clerk ID of user who is blocking
  blocked_id TEXT NOT NULL, -- Clerk ID of user who is blocked
  reason TEXT, -- Optional reason for blocking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (blocker_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- Function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION is_blocked(blocker_clerk_id TEXT, blocked_clerk_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = blocker_clerk_id
    AND blocked_id = blocked_clerk_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users have blocked each other (mutual block)
CREATE OR REPLACE FUNCTION are_mutually_blocked(user1_clerk_id TEXT, user2_clerk_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM user_blocks
      WHERE blocker_id = user1_clerk_id AND blocked_id = user2_clerk_id
    ) OR EXISTS (
      SELECT 1 FROM user_blocks
      WHERE blocker_id = user2_clerk_id AND blocked_id = user1_clerk_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





