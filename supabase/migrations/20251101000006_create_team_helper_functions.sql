-- ============================================================================
-- CREATE TEAM HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================================================
-- Migration: 20251101000006_create_team_helper_functions.sql
-- Date: November 1, 2025
-- Task: Database & Schema Design - Create helper functions
--
-- Purpose:
--   Create database functions to encapsulate team-based access logic
--   for use in RLS policies. These functions determine team membership
--   and booking access based on the team-based assignment model.
--
-- Functions:
--   1. get_team_for_booking(booking_id) - Returns team_id for a booking
--   2. is_team_member_for_booking(booking_id, user_id) - Checks if user is on booking's team
--   3. get_user_teams(user_id, provider_id) - Returns all teams a user belongs to
--   4. is_team_member(team_id, user_id) - Checks if user is member of a team
--
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: get_team_for_booking
-- ============================================================================
-- Returns the team_id responsible for a booking
-- Returns NULL if booking has no team assigned

CREATE OR REPLACE FUNCTION public.get_team_for_booking(p_booking_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT team_id
  FROM public.bookings
  WHERE id = p_booking_id;
$$;

COMMENT ON FUNCTION public.get_team_for_booking(UUID) IS 
'Returns the team_id responsible for a booking. Returns NULL if no team assigned.';

-- ============================================================================
-- FUNCTION 2: is_team_member_for_booking
-- ============================================================================
-- Checks if a user is a member of the team responsible for a booking
-- Returns TRUE if:
--   - User is on the booking's team (via provider_members.team_id)
--   - User is a manager/admin/owner (has access to all bookings)
-- Returns FALSE if:
--   - Booking has no team assigned
--   - User is not on the team
--   - User is not a provider member

CREATE OR REPLACE FUNCTION public.is_team_member_for_booking(
  p_booking_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_booking_team_id UUID;
  v_booking_provider_id UUID;
  v_user_role provider_role;
  v_user_team_id UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Get booking's team and provider
  SELECT team_id, provider_id
  INTO v_booking_team_id, v_booking_provider_id
  FROM public.bookings
  WHERE id = p_booking_id;
  
  -- If booking not found, return FALSE
  IF v_booking_provider_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's role and team within the provider
  SELECT role, team_id
  INTO v_user_role, v_user_team_id
  FROM public.provider_members
  WHERE provider_id = v_booking_provider_id
    AND user_id = p_user_id
    AND status = 'active';
  
  -- If user is not an active member of the provider, return FALSE
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Managers, admins, and owners have access to all bookings
  IF v_user_role IN ('owner', 'admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- If booking has no team assigned, only managers+ can access
  IF v_booking_team_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user's team matches booking's team
  RETURN v_user_team_id = v_booking_team_id;
END;
$$;

COMMENT ON FUNCTION public.is_team_member_for_booking(UUID, UUID) IS 
'Checks if a user is a member of the team responsible for a booking. Managers/admins/owners always have access.';

-- ============================================================================
-- FUNCTION 3: get_user_teams
-- ============================================================================
-- Returns all team IDs that a user belongs to within a provider
-- Returns empty array if user has no team assignments

CREATE OR REPLACE FUNCTION public.get_user_teams(
  p_user_id UUID,
  p_provider_id UUID
)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY_AGG(team_id)
  FROM public.provider_members
  WHERE user_id = p_user_id
    AND provider_id = p_provider_id
    AND status = 'active'
    AND team_id IS NOT NULL;
$$;

COMMENT ON FUNCTION public.get_user_teams(UUID, UUID) IS 
'Returns array of team IDs that a user belongs to within a provider. Returns NULL if no teams.';

-- ============================================================================
-- FUNCTION 4: is_team_member
-- ============================================================================
-- Checks if a user is a member of a specific team
-- Returns TRUE if user is an active member of the team
-- Returns FALSE otherwise

CREATE OR REPLACE FUNCTION public.is_team_member(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.provider_members pm
    WHERE pm.team_id = p_team_id
      AND pm.user_id = p_user_id
      AND pm.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_team_member(UUID, UUID) IS 
'Checks if a user is an active member of a specific team.';

-- ============================================================================
-- FUNCTION 5: get_team_capacity_info
-- ============================================================================
-- Returns capacity information for a team on a specific date
-- Useful for capacity checks before assigning bookings

CREATE OR REPLACE FUNCTION public.get_team_capacity_info(
  p_team_id UUID,
  p_event_date DATE
)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  daily_capacity INTEGER,
  max_concurrent_events INTEGER,
  bookings_on_date BIGINT,
  remaining_capacity INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.daily_capacity,
    t.max_concurrent_events,
    COUNT(b.id) as bookings_on_date,
    CASE 
      WHEN t.daily_capacity IS NULL THEN NULL
      ELSE t.daily_capacity - COUNT(b.id)::INTEGER
    END as remaining_capacity
  FROM public.teams t
  LEFT JOIN public.bookings b ON b.team_id = t.id 
    AND b.event_date = p_event_date
    AND b.status IN ('confirmed', 'in_progress')
  WHERE t.id = p_team_id
  GROUP BY t.id, t.name, t.daily_capacity, t.max_concurrent_events;
END;
$$;

COMMENT ON FUNCTION public.get_team_capacity_info(UUID, DATE) IS 
'Returns capacity information for a team on a specific date, including current bookings and remaining capacity.';

-- ============================================================================
-- FUNCTION 6: can_team_accept_booking
-- ============================================================================
-- Checks if a team has capacity to accept a new booking on a specific date
-- Returns TRUE if team has capacity or no capacity limits set
-- Returns FALSE if team is at or over capacity

CREATE OR REPLACE FUNCTION public.can_team_accept_booking(
  p_team_id UUID,
  p_event_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_daily_capacity INTEGER;
  v_current_bookings BIGINT;
BEGIN
  -- Get team's daily capacity
  SELECT daily_capacity
  INTO v_daily_capacity
  FROM public.teams
  WHERE id = p_team_id;
  
  -- If no capacity limit set, always return TRUE
  IF v_daily_capacity IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Count current bookings for the date
  SELECT COUNT(*)
  INTO v_current_bookings
  FROM public.bookings
  WHERE team_id = p_team_id
    AND event_date = p_event_date
    AND status IN ('confirmed', 'in_progress');
  
  -- Check if team has remaining capacity
  RETURN v_current_bookings < v_daily_capacity;
END;
$$;

COMMENT ON FUNCTION public.can_team_accept_booking(UUID, DATE) IS 
'Checks if a team has capacity to accept a new booking on a specific date. Returns TRUE if capacity available or unlimited.';

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Test get_team_for_booking:
-- SELECT public.get_team_for_booking('booking-uuid');

-- Test is_team_member_for_booking:
-- SELECT public.is_team_member_for_booking('booking-uuid', auth.uid());

-- Test get_user_teams:
-- SELECT public.get_user_teams(auth.uid(), 'provider-uuid');

-- Test is_team_member:
-- SELECT public.is_team_member('team-uuid', auth.uid());

-- Test get_team_capacity_info:
-- SELECT * FROM public.get_team_capacity_info('team-uuid', CURRENT_DATE);

-- Test can_team_accept_booking:
-- SELECT public.can_team_accept_booking('team-uuid', CURRENT_DATE + 7);

