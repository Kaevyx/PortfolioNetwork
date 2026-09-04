-- Remove 'banner' from announcement type constraint
-- 'banner' is now only a display_type, not an announcement type

-- First, update any existing announcements with type 'banner' to 'announcement'
UPDATE announcements
SET type = 'announcement'
WHERE type = 'banner';

-- Drop the old constraint
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_type_check;

-- Add new constraint without 'banner'
ALTER TABLE announcements
ADD CONSTRAINT announcements_type_check 
  CHECK (type IN ('announcement', 'information', 'warning', 'maintenance'));

-- Also update announcement_templates table
UPDATE announcement_templates
SET type = 'announcement'
WHERE type = 'banner';

-- Drop the old constraint for templates
ALTER TABLE announcement_templates
DROP CONSTRAINT IF EXISTS announcement_templates_type_check;

-- Add new constraint without 'banner'
ALTER TABLE announcement_templates
ADD CONSTRAINT announcement_templates_type_check 
  CHECK (type IN ('announcement', 'information', 'warning', 'maintenance'));

