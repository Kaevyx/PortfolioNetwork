-- Migration: Rename 'thinking_about' status to 'considering' in roadmap system
-- This updates the database schema and all existing records

-- Step 1: Update all existing records in roadmap_items
UPDATE roadmap_items
SET status = 'considering'
WHERE status = 'thinking_about';

-- Step 2: Update all existing records in roadmap_item_updates
UPDATE roadmap_item_updates
SET status = 'considering'
WHERE status = 'thinking_about';

-- Step 3: Drop all CHECK constraints on roadmap_items.status
-- Try multiple approaches to ensure the constraint is dropped
DO $$
DECLARE
  constraint_record RECORD;
  constraint_def TEXT;
BEGIN
  -- First, try to drop by the known name
  BEGIN
    ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_status_check;
    RAISE NOTICE 'Attempted to drop constraint: roadmap_items_status_check';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop roadmap_items_status_check: %', SQLERRM;
  END;
  
  -- Find and drop all CHECK constraints on roadmap_items that involve status
  FOR constraint_record IN
    SELECT conname, pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint
    WHERE conrelid = 'roadmap_items'::regclass
      AND contype = 'c'
  LOOP
    constraint_def := constraint_record.constraint_def;
    -- Check if this constraint involves the status column
    IF constraint_def LIKE '%status%' OR constraint_def LIKE '%thinking_about%' THEN
      BEGIN
        EXECUTE format('ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: % (definition: %)', constraint_record.conname, constraint_def;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop constraint %: %', constraint_record.conname, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- Step 4: Add new CHECK constraint with 'considering' instead of 'thinking_about'
ALTER TABLE roadmap_items
ADD CONSTRAINT roadmap_items_status_check CHECK (status IN (
  'considering',
  'planned',
  'in_progress',
  'cancelled',
  'implemented'
));

-- Step 5: Drop all CHECK constraints on roadmap_item_updates.status
DO $$
DECLARE
  constraint_record RECORD;
  constraint_def TEXT;
BEGIN
  -- First, try to drop by the known name
  BEGIN
    ALTER TABLE roadmap_item_updates DROP CONSTRAINT IF EXISTS roadmap_item_updates_status_check;
    RAISE NOTICE 'Attempted to drop constraint: roadmap_item_updates_status_check';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not drop roadmap_item_updates_status_check: %', SQLERRM;
  END;
  
  -- Find and drop all CHECK constraints on roadmap_item_updates that involve status
  FOR constraint_record IN
    SELECT conname, pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint
    WHERE conrelid = 'roadmap_item_updates'::regclass
      AND contype = 'c'
  LOOP
    constraint_def := constraint_record.constraint_def;
    -- Check if this constraint involves the status column
    IF constraint_def LIKE '%status%' OR constraint_def LIKE '%thinking_about%' THEN
      BEGIN
        EXECUTE format('ALTER TABLE roadmap_item_updates DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: % (definition: %)', constraint_record.conname, constraint_def;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop constraint %: %', constraint_record.conname, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- Step 6: Add new CHECK constraint with 'considering' instead of 'thinking_about'
ALTER TABLE roadmap_item_updates
ADD CONSTRAINT roadmap_item_updates_status_check CHECK (status IN (
  'considering',
  'planned',
  'in_progress',
  'cancelled',
  'implemented'
));

-- Step 7: Update the get_published_roadmap_by_status function
DROP FUNCTION IF EXISTS get_published_roadmap_by_status();
CREATE OR REPLACE FUNCTION get_published_roadmap_by_status()
RETURNS TABLE (
  status TEXT,
  item_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  priority TEXT,
  target_date DATE,
  display_order INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.status,
    r.id AS item_id,
    r.title,
    r.description,
    r.category,
    r.priority,
    r.target_date,
    r.display_order,
    r.is_featured,
    r.created_at,
    r.updated_at,
    r.view_count
  FROM roadmap_items r
  WHERE r.is_published = TRUE
  ORDER BY 
    CASE r.status
      WHEN 'considering' THEN 1
      WHEN 'planned' THEN 2
      WHEN 'in_progress' THEN 3
      WHEN 'cancelled' THEN 4
      WHEN 'implemented' THEN 5
    END,
    r.display_order,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Update the comment
COMMENT ON COLUMN roadmap_items.status IS 'Status: considering, planned, in_progress, cancelled, implemented';

-- Verify the changes
DO $$
DECLARE
  items_count INTEGER;
  updates_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO items_count FROM roadmap_items WHERE status = 'considering';
  SELECT COUNT(*) INTO updates_count FROM roadmap_item_updates WHERE status = 'considering';
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Roadmap items with "considering" status: %', items_count;
  RAISE NOTICE '  - Roadmap updates with "considering" status: %', updates_count;
END $$;

