-- ============================================================================
-- CREATE RPC FUNCTIONS FOR DASHBOARD ANALYTICS
-- ============================================================================
-- Migration: 20251028000001_create_dashboard_analytics_rpc.sql
-- Date: October 28, 2025
-- Author: CateringHub Development Team
--
-- Purpose:
--   Create RPC functions to efficiently compute dashboard analytics data
--   including revenue metrics, booking statistics, staff utilization, and
--   expense tracking.
--
-- Functions:
--   1. get_revenue_metrics(provider_id, start_date, end_date)
--   2. get_booking_statistics(provider_id, start_date, end_date)
--   3. get_staff_utilization(provider_id, start_date, end_date)
--   4. get_expense_summary(provider_id, start_date, end_date)
--   5. get_dashboard_analytics(provider_id, start_date, end_date) - Combined
--
-- Estimated Time: < 1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION 1: GET REVENUE METRICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_revenue_metrics(
  p_provider_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
BEGIN
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Calculate previous period for comparison
  v_prev_end_date := v_start_date - INTERVAL '1 day';
  v_prev_start_date := v_prev_end_date - (v_end_date - v_start_date);
  
  -- Build result JSON
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(CASE 
      WHEN event_date BETWEEN v_start_date AND v_end_date 
      THEN estimated_budget 
      ELSE 0 
    END), 0),
    'confirmed_revenue', COALESCE(SUM(CASE 
      WHEN event_date BETWEEN v_start_date AND v_end_date 
        AND status IN ('confirmed', 'in_progress', 'completed')
      THEN estimated_budget 
      ELSE 0 
    END), 0),
    'completed_revenue', COALESCE(SUM(CASE 
      WHEN event_date BETWEEN v_start_date AND v_end_date 
        AND status = 'completed'
      THEN estimated_budget 
      ELSE 0 
    END), 0),
    'previous_period_revenue', COALESCE(SUM(CASE 
      WHEN event_date BETWEEN v_prev_start_date AND v_prev_end_date 
        AND status IN ('confirmed', 'in_progress', 'completed')
      THEN estimated_budget 
      ELSE 0 
    END), 0),
    'average_booking_value', COALESCE(AVG(CASE 
      WHEN event_date BETWEEN v_start_date AND v_end_date 
        AND status IN ('confirmed', 'in_progress', 'completed')
      THEN estimated_budget 
      ELSE NULL 
    END), 0),
    'period_start', v_start_date,
    'period_end', v_end_date
  ) INTO v_result
  FROM public.bookings
  WHERE provider_id = p_provider_id
    AND event_date BETWEEN v_prev_start_date AND v_end_date;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_revenue_metrics IS 
'Calculates revenue metrics for a provider within a date range with period-over-period comparison';

-- ============================================================================
-- FUNCTION 2: GET BOOKING STATISTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_booking_statistics(
  p_provider_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Build result JSON
  SELECT json_build_object(
    'total_bookings', COUNT(*),
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed_count', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'in_progress_count', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'completed_count', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'upcoming_bookings', COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE AND status IN ('confirmed', 'in_progress')),
    'total_guests', COALESCE(SUM(guest_count), 0),
    'average_guests', COALESCE(AVG(guest_count), 0),
    'period_start', v_start_date,
    'period_end', v_end_date
  ) INTO v_result
  FROM public.bookings
  WHERE provider_id = p_provider_id
    AND event_date BETWEEN v_start_date AND v_end_date;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_booking_statistics IS 
'Calculates booking statistics for a provider within a date range';

-- ============================================================================
-- FUNCTION 3: GET STAFF UTILIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_utilization(
  p_provider_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_start_date DATE;
  v_end_date DATE;
  v_total_hours NUMERIC;
  v_actual_hours NUMERIC;
BEGIN
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Calculate total scheduled hours
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 3600
  ), 0) INTO v_total_hours
  FROM public.shifts s
  JOIN public.bookings b ON s.booking_id = b.id
  WHERE b.provider_id = p_provider_id
    AND s.scheduled_start::DATE BETWEEN v_start_date AND v_end_date
    AND s.status != 'cancelled';
  
  -- Calculate actual hours worked
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (actual_end - actual_start)) / 3600
  ), 0) INTO v_actual_hours
  FROM public.shifts s
  JOIN public.bookings b ON s.booking_id = b.id
  WHERE b.provider_id = p_provider_id
    AND s.actual_start::DATE BETWEEN v_start_date AND v_end_date
    AND s.status = 'checked_out'
    AND s.actual_start IS NOT NULL
    AND s.actual_end IS NOT NULL;
  
  -- Build result JSON
  SELECT json_build_object(
    'total_shifts', COUNT(*),
    'scheduled_shifts', COUNT(*) FILTER (WHERE s.status = 'scheduled'),
    'checked_in_shifts', COUNT(*) FILTER (WHERE s.status = 'checked_in'),
    'completed_shifts', COUNT(*) FILTER (WHERE s.status = 'checked_out'),
    'cancelled_shifts', COUNT(*) FILTER (WHERE s.status = 'cancelled'),
    'total_scheduled_hours', ROUND(v_total_hours, 2),
    'total_actual_hours', ROUND(v_actual_hours, 2),
    'unique_staff_count', COUNT(DISTINCT COALESCE(s.user_id, s.worker_profile_id)),
    'team_member_shifts', COUNT(*) FILTER (WHERE s.user_id IS NOT NULL),
    'worker_profile_shifts', COUNT(*) FILTER (WHERE s.worker_profile_id IS NOT NULL),
    'period_start', v_start_date,
    'period_end', v_end_date
  ) INTO v_result
  FROM public.shifts s
  JOIN public.bookings b ON s.booking_id = b.id
  WHERE b.provider_id = p_provider_id
    AND s.scheduled_start::DATE BETWEEN v_start_date AND v_end_date;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_staff_utilization IS 
'Calculates staff utilization metrics for a provider within a date range';

-- ============================================================================
-- FUNCTION 4: GET EXPENSE SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_expense_summary(
  p_provider_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_start_date DATE;
  v_end_date DATE;
  v_category_breakdown JSON;
BEGIN
  -- Default to last 30 days if not specified
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Get category breakdown
  SELECT json_agg(
    json_build_object(
      'category', category,
      'total', total_amount,
      'count', expense_count
    )
  ) INTO v_category_breakdown
  FROM (
    SELECT 
      category,
      COALESCE(SUM(amount), 0) as total_amount,
      COUNT(*) as expense_count
    FROM public.expenses
    WHERE provider_id = p_provider_id
      AND expense_date BETWEEN v_start_date AND v_end_date
    GROUP BY category
    ORDER BY total_amount DESC
  ) category_data;
  
  -- Build result JSON
  SELECT json_build_object(
    'total_expenses', COALESCE(SUM(amount), 0),
    'expense_count', COUNT(*),
    'average_expense', COALESCE(AVG(amount), 0),
    'category_breakdown', COALESCE(v_category_breakdown, '[]'::JSON),
    'period_start', v_start_date,
    'period_end', v_end_date
  ) INTO v_result
  FROM public.expenses
  WHERE provider_id = p_provider_id
    AND expense_date BETWEEN v_start_date AND v_end_date;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_expense_summary IS 
'Calculates expense summary and category breakdown for a provider within a date range';

-- ============================================================================
-- FUNCTION 5: GET MONTHLY TREND DATA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_trend_data(
  p_provider_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Build monthly trend data for the last N months
  SELECT json_agg(
    json_build_object(
      'month', TO_CHAR(month_date, 'Month'),
      'month_short', TO_CHAR(month_date, 'Mon'),
      'year', EXTRACT(YEAR FROM month_date),
      'bookings', COALESCE(booking_count, 0),
      'revenue', COALESCE(total_revenue, 0),
      'expenses', COALESCE(total_expenses, 0),
      'net', COALESCE(total_revenue, 0) - COALESCE(total_expenses, 0)
    ) ORDER BY month_date
  ) INTO v_result
  FROM (
    SELECT
      DATE_TRUNC('month', month_series)::DATE as month_date,
      (
        SELECT COUNT(*)
        FROM public.bookings
        WHERE provider_id = p_provider_id
          AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', month_series)
          AND status IN ('confirmed', 'in_progress', 'completed')
      ) as booking_count,
      (
        SELECT COALESCE(SUM(estimated_budget), 0)
        FROM public.bookings
        WHERE provider_id = p_provider_id
          AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', month_series)
          AND status IN ('confirmed', 'in_progress', 'completed')
      ) as total_revenue,
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.expenses
        WHERE provider_id = p_provider_id
          AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', month_series)
      ) as total_expenses
    FROM generate_series(
      DATE_TRUNC('month', CURRENT_DATE - (p_months || ' months')::INTERVAL),
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::INTERVAL
    ) as month_series
  ) monthly_data;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

COMMENT ON FUNCTION public.get_monthly_trend_data IS
'Generates monthly trend data for bookings, revenue, and expenses over the specified number of months';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_revenue_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_utilization TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_trend_data TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

RAISE NOTICE 'Dashboard analytics RPC functions created successfully';
RAISE NOTICE 'Functions: get_revenue_metrics, get_booking_statistics, get_staff_utilization, get_expense_summary, get_monthly_trend_data';

COMMIT;

