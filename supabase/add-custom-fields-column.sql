-- Add custom_fields column to support_ticket_categories if it doesn't exist
ALTER TABLE support_ticket_categories
ADD COLUMN IF NOT EXISTS custom_fields JSONB;


