-- Add report-related notification types
DO $$
BEGIN
    -- Check if the constraint exists and drop it if it does
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notifications_type_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;

    -- Alter column type to TEXT if not already
    ALTER TABLE notifications ALTER COLUMN type TYPE TEXT;

    -- Add new constraint with report types
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'follow', 
        'connection', 
        'comment', 
        'like', 
        'review', 
        'mention', 
        'repost', 
        'file_approved', 
        'file_rejected', 
        'profile_approved', 
        'profile_rejected', 
        'verification_approved', 
        'verification_rejected',
        'report_resolved',
        'report_dismissed',
        'account_suspended',
        'account_unsuspended',
        'warning_issued',
        'content_removed'
    ));
END
$$;




