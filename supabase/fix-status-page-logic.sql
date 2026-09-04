-- Fix Status Page Logic
-- Ensure component statuses match incident statuses correctly
-- Ensure overall status reflects active incidents immediately

-- Update the function to better handle minor incidents with different statuses
-- Note: "identified" status means the issue is identified but still being investigated/fixed
-- So component should show as "investigating" until it's resolved or in progress
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

  -- Minor incidents - map status more accurately
  IF p_severity = 'minor' THEN
    -- If status is investigating or identified, show as investigating
    -- (identified means we know what the issue is, but it's still being worked on)
    IF p_status IN ('investigating', 'identified') THEN
      RETURN 'investigating';
    -- If status is in_progress, monitoring, or verifying, show as degraded_performance
    ELSIF p_status IN ('in_progress', 'monitoring', 'verifying') THEN
      RETURN 'degraded_performance';
    ELSE
      -- Default for minor incidents
      RETURN 'investigating';
    END IF;
  END IF;

  -- Default: investigating
  RETURN 'investigating';
END;
$$ LANGUAGE plpgsql;

-- Update overall system status to check incidents FIRST before components
-- This ensures active incidents immediately affect the status
CREATE OR REPLACE FUNCTION get_overall_system_status()
RETURNS TEXT AS $$
DECLARE
  has_outage BOOLEAN;
  has_degraded BOOLEAN;
  has_maintenance BOOLEAN;
  has_investigating BOOLEAN;
BEGIN
  -- FIRST: Check for active incidents (this should take priority)
  -- Check for active critical incidents
  SELECT EXISTS(
    SELECT 1 FROM status_incidents 
    WHERE is_public = TRUE 
    AND status IN ('investigating', 'identified', 'in_progress', 'monitoring', 'verifying')
    AND status != 'resolved'
    AND severity = 'critical'
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'major_outage';
  END IF;
  
  -- Check for active major incidents
  SELECT EXISTS(
    SELECT 1 FROM status_incidents 
    WHERE is_public = TRUE 
    AND status IN ('investigating', 'identified', 'in_progress', 'monitoring', 'verifying')
    AND status != 'resolved'
    AND severity = 'major'
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'major_outage';
  END IF;
  
  -- Check for active minor incidents (should update status from operational)
  SELECT EXISTS(
    SELECT 1 FROM status_incidents 
    WHERE is_public = TRUE 
    AND status IN ('investigating', 'identified', 'in_progress', 'monitoring', 'verifying')
    AND status != 'resolved'
    AND severity = 'minor'
  ) INTO has_degraded;
  
  IF has_degraded THEN
    RETURN 'degraded_performance';
  END IF;
  
  -- SECOND: Check component statuses (these should reflect incident statuses via triggers)
  -- Check for major outages on components
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'major_outage'
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'major_outage';
  END IF;
  
  -- Check for partial outages on components
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'partial_outage'
  ) INTO has_outage;
  
  IF has_outage THEN
    RETURN 'partial_outage';
  END IF;
  
  -- Check for degraded performance on components
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'degraded_performance'
  ) INTO has_degraded;
  
  IF has_degraded THEN
    RETURN 'degraded_performance';
  END IF;
  
  -- Check for investigating status on components
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'investigating'
  ) INTO has_investigating;
  
  IF has_investigating THEN
    RETURN 'degraded_performance';
  END IF;
  
  -- Check for maintenance
  SELECT EXISTS(
    SELECT 1 FROM status_components 
    WHERE is_public = TRUE 
    AND status = 'maintenance'
  ) INTO has_maintenance;
  
  IF has_maintenance THEN
    RETURN 'maintenance';
  END IF;
  
  -- Default to operational (only if no active incidents and all components operational)
  RETURN 'operational';
END;
$$ LANGUAGE plpgsql;

