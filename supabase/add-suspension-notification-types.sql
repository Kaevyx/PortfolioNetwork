-- Add suspension-related notification types
DO $$
BEGIN
    -- Check if constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_type_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
    
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
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
            'account_suspended',
            'account_unsuspended'
        )
    );
END
$$;





