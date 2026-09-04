-- Add read_at column to notifications table for better tracking
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for read_at
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);





