-- Diagnostic script to check roadmap_item_updates table structure
-- Run this to see what columns your table currently has

-- Check if table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'roadmap_item_updates'
ORDER BY ordinal_position;

-- Check if there are any existing updates
SELECT COUNT(*) as update_count FROM roadmap_item_updates;

-- Show a sample update if any exist
SELECT * FROM roadmap_item_updates LIMIT 1;

