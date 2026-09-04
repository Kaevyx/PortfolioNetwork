-- Fix overall status to show Partial Outage correctly
-- This ensures partial_outage components show as Partial Outage overall, not Major Outage

-- Drop and recreate the function to ensure it's using the latest logic
DROP FUNCTION IF EXISTS get_overall_system_status() CASCADE;

CREATE FUNCTION get_overall_system_status()
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

