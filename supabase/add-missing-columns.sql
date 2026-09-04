-- Add missing columns to support ticket tables if they don't exist
-- This handles cases where tables were created before these columns were added

-- Add custom_fields to support_ticket_categories
ALTER TABLE support_ticket_categories
ADD COLUMN IF NOT EXISTS custom_fields JSONB;

-- Add custom_data to support_tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS custom_data JSONB;

-- Add last_responded_by and last_responded_at to support_tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS last_responded_by TEXT;

ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS last_responded_at TIMESTAMP WITH TIME ZONE;


