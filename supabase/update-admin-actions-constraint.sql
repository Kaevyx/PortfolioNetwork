-- Update admin_actions constraint to include new action types
-- This fixes the constraint violation error for warning_issued, user_suspended, and content_removed

DO $$
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_actions_action_type_check'
    ) THEN
        ALTER TABLE admin_actions DROP CONSTRAINT admin_actions_action_type_check;
    END IF;

    -- Add the updated constraint with all action types
    ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_type_check 
    CHECK (action_type IN (
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
    ));
END
$$;

