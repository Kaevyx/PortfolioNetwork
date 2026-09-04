-- Track Employment Status Changes
-- This creates a trigger to automatically log employment_status changes to user_account_history

-- First, add 'employment_status_changed' to the action_type check constraint
-- Include all existing action types to avoid constraint violations
ALTER TABLE user_account_history 
DROP CONSTRAINT IF EXISTS user_account_history_action_type_check;

ALTER TABLE user_account_history 
ADD CONSTRAINT user_account_history_action_type_check 
CHECK (action_type IN (
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
  'account_modified',
  'account_suspended',
  'account_unsuspended',
  'employment_status_changed'
));

-- Function to log employment status changes
CREATE OR REPLACE FUNCTION log_employment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if employment_status actually changed
  IF OLD.employment_status IS DISTINCT FROM NEW.employment_status THEN
    INSERT INTO user_account_history (
      user_id,
      action_type,
      performed_by,
      details
    ) VALUES (
      NEW.clerk_id,
      'employment_status_changed',
      NULL, -- NULL means self (user changed their own status)
      jsonb_build_object(
        'old_status', OLD.employment_status,
        'new_status', NEW.employment_status,
        'changed_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log employment status changes
DROP TRIGGER IF EXISTS track_employment_status_changes ON profiles;
CREATE TRIGGER track_employment_status_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.employment_status IS DISTINCT FROM NEW.employment_status)
  EXECUTE FUNCTION log_employment_status_change();

-- Also log employment_status when profile is created (if it's set)
CREATE OR REPLACE FUNCTION log_profile_creation_employment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If employment_status is set during profile creation, log it
  IF NEW.employment_status IS NOT NULL AND NEW.employment_status != 'not_specified' THEN
    INSERT INTO user_account_history (
      user_id,
      action_type,
      performed_by,
      details
    ) VALUES (
      NEW.clerk_id,
      'employment_status_changed',
      NULL,
      jsonb_build_object(
        'old_status', NULL,
        'new_status', NEW.employment_status,
        'changed_at', NEW.created_at,
        'initial_setup', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log initial employment status
DROP TRIGGER IF EXISTS track_initial_employment_status ON profiles;
CREATE TRIGGER track_initial_employment_status
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.employment_status IS NOT NULL AND NEW.employment_status != 'not_specified')
  EXECUTE FUNCTION log_profile_creation_employment_status();

