-- Add Modal Display Type and Position Options for Status Banner
-- Adds modal as a display option and modal position settings

DO $$ 
BEGIN
  -- Update banner_type constraint to include 'modal'
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'status_banner_settings_banner_type_check') THEN
    ALTER TABLE status_banner_settings DROP CONSTRAINT status_banner_settings_banner_type_check;
  END IF;
  
  ALTER TABLE status_banner_settings ADD CONSTRAINT status_banner_settings_banner_type_check 
    CHECK (banner_type IN ('banner', 'card', 'modal'));

  -- Add modal position column (left or right for the floating button)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_banner_settings' AND column_name = 'modal_position') THEN
    ALTER TABLE status_banner_settings ADD COLUMN modal_position TEXT DEFAULT 'bottom-right';
    ALTER TABLE status_banner_settings ADD CONSTRAINT check_modal_position CHECK (modal_position IN ('bottom-left', 'bottom-right'));
  END IF;
END $$;

-- Update default settings
UPDATE status_banner_settings
SET modal_position = 'bottom-right'
WHERE id = '00000000-0000-0000-0000-000000000001';

COMMENT ON COLUMN status_banner_settings.modal_position IS 'Position of the modal button when modal type is selected (bottom-left or bottom-right)';


