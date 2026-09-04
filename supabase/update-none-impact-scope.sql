-- Update Impact Scope: Change "no_effect" to "none" and ensure it doesn't affect component status
-- Also update logic so "none" impact scope doesn't change component status

-- First, update the impact_scope constraint to include "none" (keep "no_effect" for backward compatibility)
ALTER TABLE status_incidents
DROP CONSTRAINT IF EXISTS status_incidents_impact_scope_check;

ALTER TABLE status_incidents
ADD CONSTRAINT status_incidents_impact_scope_check 
CHECK (impact_scope IN ('site_wide', 'scaled_down', 'no_effect', 'none', 'limited_users', 'specific_feature'));

-- Update existing "no_effect" to "none"
UPDATE status_incidents
SET impact_scope = 'none'
WHERE impact_scope = 'no_effect';

-- Update get_component_status_from_incident to return NULL (no status change) for "none" impact
DROP FUNCTION IF EXISTS get_component_status_from_incident CASCADE;

CREATE FUNCTION get_component_status_from_incident(
  p_status TEXT,
  p_impact_scope TEXT,
  p_component_status TEXT
) RETURNS TEXT AS $$
BEGIN
  -- If incident is resolved, return NULL (will restore original status)
  IF p_status = 'resolved' THEN
    RETURN NULL;
  END IF;

  -- If impact scope is "none" or "no_effect", don't change component status (informational only)
  IF p_impact_scope IN ('none', 'no_effect') THEN
    RETURN NULL; -- No status change for informational incidents
  END IF;

  -- Use the component_status directly (admin must set it)
  IF p_component_status IS NOT NULL THEN
    RETURN p_component_status;
  END IF;

  -- Fallback (shouldn't happen, but safe default)
  RETURN 'degraded_performance';
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to properly handle NULL (none impact)
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

      -- Use component_status directly (admin must set it)
      new_component_status := get_component_status_from_incident(
        NEW.status,
        NEW.impact_scope,
        NEW.component_status
      );

      -- If impact is "none" (informational only), skip updating component status
      IF new_component_status IS NULL THEN
        CONTINUE; -- Don't change component status for informational incidents
      END IF;

      -- If original_status is NULL, this is the first incident affecting this component
      -- Store the current status as original
      IF (SELECT original_status FROM status_components WHERE id = affected_component_id) IS NULL THEN
        UPDATE status_components
        SET original_status = component_status
        WHERE id = affected_component_id;
      END IF;

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

-- Recreate triggers
DROP TRIGGER IF EXISTS trigger_update_component_statuses_from_incident ON status_incidents;
CREATE TRIGGER trigger_update_component_statuses_from_incident
  AFTER INSERT OR UPDATE OF status, impact_scope, component_status, affected_components ON status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_component_statuses_from_incident();

DROP TRIGGER IF EXISTS trigger_restore_component_statuses_on_incident_delete ON status_incidents;
CREATE TRIGGER trigger_restore_component_statuses_on_incident_delete
  AFTER DELETE ON status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_component_statuses_from_incident();

DROP TRIGGER IF EXISTS trigger_update_component_statuses_from_all_incidents ON status_incidents;
CREATE TRIGGER trigger_update_component_statuses_from_all_incidents
  AFTER INSERT OR UPDATE OF status, impact_scope, component_status, affected_components OR DELETE ON status_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_component_statuses_from_all_incidents();

