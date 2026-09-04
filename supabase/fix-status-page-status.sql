-- Diagnostic and Fix Script for Status Page
-- This script helps identify and fix issues with component statuses

-- 1. Check current overall status
SELECT 'Current Overall Status' as check_type, get_overall_system_status() as result;

-- 2. Check for components with non-operational status
SELECT 'Components with Issues' as check_type, COUNT(*) as count
FROM status_components
WHERE is_public = TRUE
AND status != 'operational';

-- 3. Check for active (non-resolved) incidents
SELECT 'Active Incidents' as check_type, COUNT(*) as count
FROM status_incidents
WHERE is_public = TRUE
AND status != 'resolved';

-- 4. List all components and their statuses
SELECT 
  'Component Statuses' as check_type,
  name,
  status,
  original_status,
  status_message,
  CASE 
    WHEN original_status IS NOT NULL THEN 'Affected by incident'
    ELSE 'Manual or default'
  END as status_source
FROM status_components
WHERE is_public = TRUE
ORDER BY 
  CASE status
    WHEN 'major_outage' THEN 1
    WHEN 'partial_outage' THEN 2
    WHEN 'degraded_performance' THEN 3
    WHEN 'investigating' THEN 4
    WHEN 'maintenance' THEN 5
    WHEN 'operational' THEN 6
  END;

-- 5. List all active incidents
SELECT 
  'Active Incidents' as check_type,
  title,
  severity,
  status,
  impact_scope,
  array_length(affected_components, 1) as affected_components_count
FROM status_incidents
WHERE is_public = TRUE
AND status != 'resolved'
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'major' THEN 2
    WHEN 'minor' THEN 3
  END;

-- 6. Fix: Restore components that have original_status but no active incidents affecting them
-- This will restore components to their original status if they're stuck
DO $$
DECLARE
  component_record RECORD;
  has_active_incident BOOLEAN;
BEGIN
  FOR component_record IN
    SELECT id, original_status, status
    FROM status_components
    WHERE is_public = TRUE
    AND original_status IS NOT NULL
  LOOP
    -- Check if this component is affected by any active incident
    SELECT EXISTS(
      SELECT 1
      FROM status_incidents
      WHERE component_record.id = ANY(affected_components)
      AND status != 'resolved'
      AND is_public = TRUE
    ) INTO has_active_incident;
    
    -- If no active incident, restore original status
    IF NOT has_active_incident THEN
      UPDATE status_components
      SET 
        status = COALESCE(original_status, 'operational'),
        original_status = NULL,
        status_message = NULL
      WHERE id = component_record.id;
      
      RAISE NOTICE 'Restored component % to status %', component_record.id, COALESCE(component_record.original_status, 'operational');
    END IF;
  END LOOP;
END $$;

-- 7. Manually trigger status recalculation for all components
-- This ensures all components reflect the current incident state
-- We'll do this by updating a dummy incident or by directly calling the logic
DO $$
DECLARE
  all_affected_components UUID[] := ARRAY[]::UUID[];
  component_record RECORD;
  most_severe_status TEXT;
  incident_title TEXT;
BEGIN
  -- Collect all affected components from active incidents
  SELECT ARRAY_AGG(DISTINCT unnest_components)
  INTO all_affected_components
  FROM (
    SELECT UNNEST(affected_components) as unnest_components
    FROM status_incidents
    WHERE status != 'resolved'
    AND is_public = TRUE
  ) sub;

  -- If no active incidents, restore all components to original status
  IF all_affected_components IS NULL OR array_length(all_affected_components, 1) IS NULL THEN
    UPDATE status_components
    SET 
      status = COALESCE(original_status, 'operational'),
      original_status = NULL,
      status_message = NULL
    WHERE original_status IS NOT NULL;
    RAISE NOTICE 'No active incidents - restored all components';
  ELSE
    -- For each affected component, determine the most severe status
    FOR component_record IN
      SELECT DISTINCT id
      FROM status_components
      WHERE id = ANY(all_affected_components)
    LOOP
      -- Get most severe status from all active incidents
      SELECT get_most_severe_component_status(component_record.id) INTO most_severe_status;

      -- Get the title of the most critical incident affecting this component
      SELECT title INTO incident_title
      FROM status_incidents
      WHERE component_record.id = ANY(affected_components)
      AND status != 'resolved'
      AND is_public = TRUE
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'major' THEN 2
          WHEN 'minor' THEN 3
        END,
        CASE impact_scope
          WHEN 'full' THEN 1
          WHEN 'partial' THEN 2
        END
      LIMIT 1;

      -- Store original status if not already stored
      IF (SELECT original_status FROM status_components WHERE id = component_record.id) IS NULL THEN
        UPDATE status_components
        SET original_status = status
        WHERE id = component_record.id AND status != most_severe_status;
      END IF;

      -- Update component status
      UPDATE status_components
      SET 
        status = most_severe_status,
        status_message = CASE 
          WHEN incident_title IS NOT NULL THEN 'Incident: ' || incident_title
          ELSE NULL
        END
      WHERE id = component_record.id;
    END LOOP;

    -- Restore components that are no longer affected by any incident
    UPDATE status_components
    SET 
      status = COALESCE(original_status, 'operational'),
      original_status = NULL,
      status_message = NULL
    WHERE id NOT IN (SELECT UNNEST(all_affected_components))
    AND original_status IS NOT NULL;
    
    RAISE NOTICE 'Recalculated statuses for all components';
  END IF;
END $$;

-- 8. Verify final status
SELECT 'Final Overall Status' as check_type, get_overall_system_status() as result;

