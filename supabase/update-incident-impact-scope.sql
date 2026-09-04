-- Update Incident Impact Scope Options
-- Change from 'partial'/'full' to more descriptive options
-- Add component_status field to incidents so admins can directly choose component status

-- First, update the impact_scope constraint
-- Remove 'partial' and 'full', add more realistic options
ALTER TABLE status_incidents
DROP CONSTRAINT IF EXISTS status_incidents_impact_scope_check;

ALTER TABLE status_incidents
ADD CONSTRAINT status_incidents_impact_scope_check 
CHECK (impact_scope IN ('site_wide', 'scaled_down', 'no_effect', 'limited_users', 'specific_feature'));

-- Add component_status field to incidents (allows admins to directly set component status)
-- Make it required (not nullable) since we're removing Auto option
ALTER TABLE status_incidents
ADD COLUMN IF NOT EXISTS component_status TEXT CHECK (component_status IN ('degraded_performance', 'partial_outage', 'major_outage', 'maintenance', 'investigating'));

-- Set default for existing rows
UPDATE status_incidents
SET component_status = 'degraded_performance'
WHERE component_status IS NULL;

-- Update existing incidents with legacy impact_scope values
-- Map 'partial' to 'scaled_down' and 'full' to 'site_wide'
UPDATE status_incidents
SET impact_scope = 'scaled_down'
WHERE impact_scope = 'partial';

UPDATE status_incidents
SET impact_scope = 'site_wide'
WHERE impact_scope = 'full';

-- Make component_status NOT NULL after setting defaults
ALTER TABLE status_incidents
ALTER COLUMN component_status SET NOT NULL;

-- Update function to use component_status directly (no auto-calculation)
-- Drop the old function first to remove default parameters
DROP FUNCTION IF EXISTS get_component_status_from_incident(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_component_status_from_incident(TEXT, TEXT, TEXT);

CREATE FUNCTION get_component_status_from_incident(
  p_severity TEXT,
  p_status TEXT,
  p_impact_scope TEXT,
  p_component_status TEXT
) RETURNS TEXT AS $$
BEGIN
  -- If incident is resolved, return NULL (will restore original status)
  IF p_status = 'resolved' THEN
    RETURN NULL;
  END IF;

  -- Use the component_status directly (admin must set it)
  IF p_component_status IS NOT NULL THEN
    RETURN p_component_status;
  END IF;

  -- Fallback (shouldn't happen, but safe default)
  RETURN 'degraded_performance';
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to pass component_status
CREATE OR REPLACE FUNCTION update_component_statuses_from_incident()
RETURNS TRIGGER AS $$
DECLARE
  affected_component_id UUID;
  component_status TEXT;
  new_component_status TEXT;
BEGIN
  -- Handle affected components
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- For each affected component
    FOREACH affected_component_id IN ARRAY COALESCE(NEW.affected_components, ARRAY[]::UUID[])
    LOOP
      -- Get current component status
      SELECT status, original_status INTO component_status, new_component_status
      FROM status_components
      WHERE id = affected_component_id;

      -- If component doesn't exist, skip
      IF component_status IS NULL THEN
        CONTINUE;
      END IF;

      -- If original_status is NULL, this is the first incident affecting this component
      -- Store the current status as original
      IF new_component_status IS NULL THEN
        UPDATE status_components
        SET original_status = component_status
        WHERE id = affected_component_id;
      END IF;

      -- Use component_status directly (admin must set it)
      new_component_status := get_component_status_from_incident(
        NEW.severity,
        NEW.status,
        NEW.impact_scope,
        NEW.component_status
      );

      -- If incident is resolved, restore original status
      IF NEW.status = 'resolved' THEN
        UPDATE status_components
        SET 
          status = COALESCE(original_status, 'operational'),
          original_status = NULL,
          status_message = NULL
        WHERE id = affected_component_id;
      ELSE
        -- Update component status based on incident
        UPDATE status_components
        SET 
          status = new_component_status,
          status_message = CASE 
            WHEN NEW.status = 'investigating' THEN 'Investigating issue - ' || NEW.title
            WHEN NEW.status = 'identified' THEN 'Issue identified - ' || NEW.title
            WHEN NEW.status = 'in_progress' THEN 'Fixing issue - ' || NEW.title
            WHEN NEW.status = 'monitoring' THEN 'Monitoring - ' || NEW.title
            WHEN NEW.status = 'verifying' THEN 'Verifying fix - ' || NEW.title
            ELSE 'Incident in progress - ' || NEW.title
          END
        WHERE id = affected_component_id;
      END IF;
    END LOOP;
  END IF;

  -- Handle DELETE (restore original statuses)
  IF TG_OP = 'DELETE' THEN
    FOREACH affected_component_id IN ARRAY COALESCE(OLD.affected_components, ARRAY[]::UUID[])
    LOOP
      UPDATE status_components
      SET 
        status = COALESCE(original_status, 'operational'),
        original_status = NULL,
        status_message = NULL
      WHERE id = affected_component_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update get_most_severe_component_status to use component_status
CREATE OR REPLACE FUNCTION get_most_severe_component_status(p_component_id UUID)
RETURNS TEXT AS $$
DECLARE
  most_severe_status TEXT := 'operational';
  incident_record RECORD;
  calculated_status TEXT;
BEGIN
  -- Check all active (non-resolved) incidents affecting this component
  FOR incident_record IN
    SELECT severity, status, impact_scope, component_status
    FROM status_incidents
    WHERE p_component_id = ANY(affected_components)
    AND status != 'resolved'
    AND is_public = TRUE
    ORDER BY 
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'major' THEN 2
        WHEN 'minor' THEN 3
      END,
      CASE impact_scope
        WHEN 'site_wide' THEN 1
        WHEN 'scaled_down' THEN 2
        WHEN 'limited_users' THEN 3
        WHEN 'specific_feature' THEN 4
        WHEN 'no_effect' THEN 5
      END
  LOOP
    calculated_status := get_component_status_from_incident(
      incident_record.severity,
      incident_record.status,
      incident_record.impact_scope,
      incident_record.component_status
    );

    -- Determine most severe status
    -- Priority: major_outage > partial_outage > degraded_performance > investigating > operational
    IF calculated_status = 'major_outage' THEN
      most_severe_status := 'major_outage';
      EXIT; -- Can't get worse than this
    ELSIF calculated_status = 'partial_outage' AND most_severe_status != 'major_outage' THEN
      most_severe_status := 'partial_outage';
    ELSIF calculated_status = 'degraded_performance' AND most_severe_status NOT IN ('major_outage', 'partial_outage') THEN
      most_severe_status := 'degraded_performance';
    ELSIF calculated_status = 'investigating' AND most_severe_status = 'operational' THEN
      most_severe_status := 'investigating';
    END IF;
  END LOOP;

  RETURN most_severe_status;
END;
$$ LANGUAGE plpgsql;

-- Update update_component_statuses_from_all_incidents to use component_status
CREATE OR REPLACE FUNCTION update_component_statuses_from_all_incidents()
RETURNS TRIGGER AS $$
DECLARE
  affected_component_id UUID;
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
    RETURN NEW;
  END IF;

  -- For each affected component, determine the most severe status
  FOR component_record IN
    SELECT DISTINCT id
    FROM status_components
    WHERE id = ANY(all_affected_components)
  LOOP
    -- Get most severe status from all active incidents
    most_severe_status := get_most_severe_component_status(component_record.id);

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
        WHEN 'site_wide' THEN 1
        WHEN 'scaled_down' THEN 2
        WHEN 'limited_users' THEN 3
        WHEN 'specific_feature' THEN 4
        WHEN 'no_effect' THEN 5
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

