-- User Account History Schema
-- Tracks all actions and changes related to a user's account

CREATE TABLE IF NOT EXISTS user_account_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk ID of the user
  action_type TEXT NOT NULL CHECK (action_type IN (
    'profile_created',
    'profile_updated',
    'profile_approved',
    'profile_rejected',
    'file_uploaded',
    'file_approved',
    'file_rejected',
    'file_deleted',
    'verification_requested',
    'verification_approved',
    'verification_rejected',
    'admin_action',
    'account_modified'
  )),
  performed_by TEXT, -- Clerk ID of who performed the action (null if self, admin_id if admin)
  details JSONB, -- Additional details (reason, changes, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_account_history_user_id ON user_account_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_account_history_action_type ON user_account_history(action_type);
CREATE INDEX IF NOT EXISTS idx_user_account_history_created_at ON user_account_history(created_at DESC);

-- Function to log user account history
CREATE OR REPLACE FUNCTION log_user_account_history(
  p_user_id TEXT,
  p_action_type TEXT,
  p_performed_by TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO user_account_history (user_id, action_type, performed_by, details)
  VALUES (p_user_id, p_action_type, p_performed_by, p_details)
  RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





