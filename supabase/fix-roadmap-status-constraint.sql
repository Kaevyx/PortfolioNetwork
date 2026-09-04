-- Quick fix: Drop and recreate the status constraint
-- Run this if the main migration script didn't work

-- Step 1: Check what status values currently exist
DO $$
DECLARE
  status_values TEXT;
BEGIN
  SELECT string_agg(DISTINCT status, ', ') INTO status_values
  FROM roadmap_items;
  RAISE NOTICE 'Current status values in roadmap_items: %', status_values;
END $$;

-- Step 2: Drop the constraint FIRST (so we can update data freely)
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_status_check CASCADE;
ALTER TABLE roadmap_item_updates DROP CONSTRAINT IF EXISTS roadmap_item_updates_status_check CASCADE;

-- Also try to find and drop any auto-generated constraint names
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all CHECK constraints on roadmap_items
  FOR r IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'roadmap_items'::regclass 
      AND contype = 'c'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE roadmap_items DROP CONSTRAINT %I CASCADE', r.conname);
      RAISE NOTICE 'Dropped constraint: %', r.conname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping %: %', r.conname, SQLERRM;
    END;
  END LOOP;
  
  -- Drop all CHECK constraints on roadmap_item_updates
  FOR r IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'roadmap_item_updates'::regclass 
      AND contype = 'c'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE roadmap_item_updates DROP CONSTRAINT %I CASCADE', r.conname);
      RAISE NOTICE 'Dropped constraint: %', r.conname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping %: %', r.conname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Now update all existing records (constraint is dropped, so this will work)
UPDATE roadmap_items
SET status = 'considering'
WHERE status = 'thinking_about';

UPDATE roadmap_item_updates
SET status = 'considering'
WHERE status = 'thinking_about';

-- Step 4: Verify no invalid status values remain
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM roadmap_items
  WHERE status NOT IN ('considering', 'planned', 'in_progress', 'cancelled', 'implemented');
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % rows with invalid status values. Please fix these before adding constraint.', invalid_count;
  ELSE
    RAISE NOTICE 'All status values are valid. Proceeding to add constraint.';
  END IF;
END $$;

-- Step 5: Now add the new constraints with 'considering'
ALTER TABLE roadmap_items
ADD CONSTRAINT roadmap_items_status_check CHECK (status IN (
  'considering',
  'planned',
  'in_progress',
  'cancelled',
  'implemented'
));

ALTER TABLE roadmap_item_updates
ADD CONSTRAINT roadmap_item_updates_status_check CHECK (status IN (
  'considering',
  'planned',
  'in_progress',
  'cancelled',
  'implemented'
));

-- Verify
SELECT 
  conname, 
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid IN ('roadmap_items'::regclass, 'roadmap_item_updates'::regclass)
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%status%';

