-- Function to get the most recent update time from status components, incidents, and updates
CREATE OR REPLACE FUNCTION get_status_last_updated()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  component_updated TIMESTAMP WITH TIME ZONE;
  incident_updated TIMESTAMP WITH TIME ZONE;
  update_created TIMESTAMP WITH TIME ZONE;
  last_updated TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get most recent component update
  SELECT MAX(updated_at)
  INTO component_updated
  FROM status_components
  WHERE is_public = TRUE;

  -- Get most recent incident update
  SELECT MAX(updated_at)
  INTO incident_updated
  FROM status_incidents
  WHERE is_public = TRUE;

  -- Get most recent incident update creation
  SELECT MAX(created_at)
  INTO update_created
  FROM status_incident_updates
  WHERE incident_id IN (
    SELECT id FROM status_incidents WHERE is_public = TRUE
  );

  -- Return the most recent of all three
  last_updated := GREATEST(
    COALESCE(component_updated, '1970-01-01'::TIMESTAMP WITH TIME ZONE),
    COALESCE(incident_updated, '1970-01-01'::TIMESTAMP WITH TIME ZONE),
    COALESCE(update_created, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
  );

  -- If all are null, return current time
  IF last_updated = '1970-01-01'::TIMESTAMP WITH TIME ZONE THEN
    RETURN NOW();
  END IF;

  RETURN last_updated;
END;
$$ LANGUAGE plpgsql;

