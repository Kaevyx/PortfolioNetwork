-- Function to get support ticket statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_support_ticket_stats()
RETURNS TABLE (
  total_tickets BIGINT,
  open_tickets BIGINT,
  in_progress_tickets BIGINT,
  waiting_user_tickets BIGINT,
  customer_reply_tickets BIGINT,
  resolved_tickets BIGINT,
  closed_tickets BIGINT,
  tickets_created_today BIGINT,
  tickets_created_this_week BIGINT,
  tickets_created_this_month BIGINT,
  outstanding_tickets BIGINT, -- Tickets waiting on admin response (customer_reply or open)
  avg_response_time_hours NUMERIC,
  avg_resolution_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ticket_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE TRUE) as total,
      COUNT(*) FILTER (WHERE st.status = 'open') as open_count,
      COUNT(*) FILTER (WHERE st.status = 'in_progress') as in_progress_count,
      COUNT(*) FILTER (WHERE st.status = 'waiting_user') as waiting_user_count,
      COUNT(*) FILTER (WHERE st.status = 'customer_reply') as customer_reply_count,
      COUNT(*) FILTER (WHERE st.status = 'resolved') as resolved_count,
      COUNT(*) FILTER (WHERE st.status = 'closed') as closed_count,
      COUNT(*) FILTER (WHERE DATE(st.created_at) = CURRENT_DATE) as today_count,
      COUNT(*) FILTER (WHERE st.created_at >= DATE_TRUNC('week', CURRENT_DATE)) as week_count,
      COUNT(*) FILTER (WHERE st.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as month_count,
      COUNT(*) FILTER (WHERE st.status IN ('open', 'customer_reply') AND (st.last_responded_by = 'user' OR st.last_responded_by IS NULL)) as outstanding_count,
      AVG(EXTRACT(EPOCH FROM (COALESCE(first_reply.created_at, NOW()) - st.created_at)) / 3600) FILTER (WHERE first_reply.id IS NOT NULL) as avg_response,
      AVG(EXTRACT(EPOCH FROM (COALESCE(st.resolved_at, NOW()) - st.created_at)) / 3600) FILTER (WHERE st.status IN ('resolved', 'closed')) as avg_resolution
    FROM support_tickets st
    LEFT JOIN LATERAL (
      SELECT id, created_at
      FROM support_ticket_replies
      WHERE ticket_id = st.id
        AND is_admin_reply = TRUE
        AND is_internal = FALSE
      ORDER BY created_at ASC
      LIMIT 1
    ) first_reply ON TRUE
  )
  SELECT 
    ts.total,
    ts.open_count,
    ts.in_progress_count,
    ts.waiting_user_count,
    ts.customer_reply_count,
    ts.resolved_count,
    ts.closed_count,
    ts.today_count,
    ts.week_count,
    ts.month_count,
    ts.outstanding_count,
    COALESCE(ts.avg_response, 0),
    COALESCE(ts.avg_resolution, 0)
  FROM ticket_stats ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION get_support_ticket_stats() TO authenticated;


