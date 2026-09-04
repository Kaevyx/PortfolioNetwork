-- Add suspension-related action types to user_account_history
ALTER TABLE user_account_history DROP CONSTRAINT IF EXISTS user_account_history_action_type_check;

ALTER TABLE user_account_history ADD CONSTRAINT user_account_history_action_type_check CHECK (
  action_type IN (
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
    'account_unsuspended'
  )
);





