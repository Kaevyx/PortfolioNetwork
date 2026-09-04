-- Fix Incident Severity Logic
-- Severity should determine component status, not incident status
-- Status is just informational about where we are in the resolution process

-- Update function to use severity and impact_scope only (not incident status)
CREATE OR REPLACE FUNCTION get_component_status_from_incident(
  p_severity TEXT,
  p_status TEXT,
  p_impact_scope TEXT
) RETURNS TEXT AS $$
BEGIN
  -- If incident is resolved, return NULL (will restore original status)
  IF p_status = 'resolved' THEN
    RETURN NULL;
  END IF;

  -- Severity determines the component status, not the incident status
  -- Critical incidents
  IF p_severity = 'critical' THEN
    IF p_impact_scope = 'full' THEN
      RETURN 'major_outage';
    ELSE
      RETURN 'partial_outage';
    END IF;
  END IF;

  -- Major incidents
  IF p_severity = 'major' THEN
    IF p_impact_scope = 'full' THEN
      RETURN 'partial_outage';
    ELSE
      RETURN 'degraded_performance';
    END IF;
  END IF;

  -- Minor incidents - always degraded_performance (regardless of impact_scope or status)
  IF p_severity = 'minor' THEN
    RETURN 'degraded_performance';
  END IF;

  -- Default: degraded_performance (shouldn't reach here, but safe fallback)
  RETURN 'degraded_performance';
END;
$$ LANGUAGE plpgsql;

-- Update overall system status to use worst component status only
-- This ensures overall status always matches component statuses
CREATE OR REPLACE FUNCTION get_overall_system_status()
RETURNS TEXT AS $$
DECLARE
  worst_status TEXT;
BEGIN
  -- Get the worst status from all public components
  -- Priority: major_outage > partial_outage > degraded_performance > investigating > maintenance > operational
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'major_outage') > 0 THEN 'major_outage'
      WHEN COUNT(*) FILTER (WHERE status = 'partial_outage') > 0 THEN 'partial_outage' -- partial_outage shows as partial_outage overall
      WHEN COUNT(*) FILTER (WHERE status = 'degraded_performance') > 0 THEN 'degraded_performance'
      WHEN COUNT(*) FILTER (WHERE status = 'investigating') > 0 THEN 'degraded_performance'
      WHEN COUNT(*) FILTER (WHERE status = 'maintenance') > 0 THEN 'maintenance'
      ELSE 'operational'
    END
  INTO worst_status
  FROM status_components
  WHERE is_public = TRUE;
  
  RETURN COALESCE(worst_status, 'operational');
END;
$$ LANGUAGE plpgsql;

-- Update the function that handles multiple incidents affecting the same component
-- Remove "investigating" from the priority list since we're not using it anymore
CREATE OR REPLACE FUNCTION get_most_severe_component_status(p_component_id UUID)
RETURNS TEXT AS $$
DECLARE
  most_severe_status TEXT := 'operational';
  incident_record RECORD;
  calculated_status TEXT;
BEGIN
  -- Check all active (non-resolved) incidents affecting this component
  FOR incident_record IN
    SELECT severity, status, impact_scope
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
        WHEN 'full' THEN 1
        WHEN 'partial' THEN 2
      END
  LOOP
    calculated_status := get_component_status_from_incident(
      incident_record.severity,
      incident_record.status,
      incident_record.impact_scope
    );

    -- Determine most severe status
    -- Priority: major_outage > partial_outage > degraded_performance > operational
    IF calculated_status = 'major_outage' THEN
      most_severe_status := 'major_outage';
      EXIT; -- Can't get worse than this
    ELSIF calculated_status = 'partial_outage' AND most_severe_status != 'major_outage' THEN
      most_severe_status := 'partial_outage';
    ELSIF calculated_status = 'degraded_performance' AND most_severe_status NOT IN ('major_outage', 'partial_outage') THEN
      most_severe_status := 'degraded_performance';
    END IF;
  END LOOP;

  RETURN most_severe_status;
END;
$$ LANGUAGE plpgsql;

