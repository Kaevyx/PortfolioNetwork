-- Admin Actions Logging Schema
-- Tracks all admin actions for accountability and audit trails

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id TEXT NOT NULL, -- Clerk ID of the admin who performed the action
  action_type TEXT NOT NULL CHECK (action_type IN (
    'profile_approved',
    'profile_rejected',
    'file_approved',
    'file_rejected',
    'verification_approved',
    'verification_rejected',
    'user_edited',
    'admin_granted',
    'admin_revoked',
    'verification_granted',
    'verification_revoked',
    'profile_status_changed',
    'file_deleted',
    'file_uploaded',
    'warning_issued',
    'user_suspended',
    'content_removed'
  )),
  target_user_id TEXT, -- Clerk ID of the user affected
  target_id TEXT, -- ID of the specific item (profile_id, file_id, etc.)
  details JSONB, -- Additional details about the action (reason, old_value, new_value, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (admin_id) REFERENCES profiles(clerk_id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES profiles(clerk_id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id TEXT,
  p_action_type TEXT,
  p_target_user_id TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO admin_actions (admin_id, action_type, target_user_id, target_id, details)
  VALUES (p_admin_id, p_action_type, p_target_user_id, p_target_id, p_details)
  RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





