-- ============================================================================
-- UPDATE provider_members RLS: managers and supervisors team assignment scope
-- ============================================================================
-- Purpose:
--  - Allow managers to assign staff/supervisors to teams within their provider
--  - Allow supervisors to manage staff membership within their own team only
-- Notes:
--  - Keeps existing admin/owner full-access policies intact
--  - Prevents managers from escalating to admin/owner/viewer
--  - Prevents supervisors from changing roles or managing outside their team
-- ============================================================================

BEGIN;

-- Managers can assign supervisors/staff to teams within their provider
DROP POLICY IF EXISTS "Managers can assign team for staff/supervisors" ON public.provider_members;
CREATE POLICY "Managers can assign team for staff/supervisors"
ON public.provider_members
FOR UPDATE
TO authenticated
USING (
  -- Caller is an active manager/admin/owner of this provider
  EXISTS (
    SELECT 1
    FROM public.provider_members pm
    WHERE pm.provider_id = provider_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('manager','admin','owner')
  )
)
WITH CHECK (
  -- Target remains staff or supervisor (no escalation to admin/owner/viewer)
  role IN ('staff','supervisor')
  AND provider_id IN (
    SELECT pm.provider_id
    FROM public.provider_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role IN ('manager','admin','owner')
  )
);

COMMENT ON POLICY "Managers can assign team for staff/supervisors" ON public.provider_members IS
'Managers (and above) can update staff/supervisor records within their provider, e.g., assigning team_id or promoting staff to supervisor.';

-- Supervisors can manage staff in their own team (assign/remove from their team)
DROP POLICY IF EXISTS "Supervisors can manage staff in their team" ON public.provider_members;
CREATE POLICY "Supervisors can manage staff in their team"
ON public.provider_members
FOR UPDATE
TO authenticated
USING (
  -- Caller is an active supervisor with a team
  EXISTS (
    SELECT 1
    FROM public.provider_members sup
    WHERE sup.provider_id = provider_id
      AND sup.user_id = auth.uid()
      AND sup.status = 'active'
      AND sup.role = 'supervisor'
      AND sup.team_id IS NOT NULL
      AND sup.team_id = provider_members.team_id
  )
  -- Target is staff (supervisors cannot change other supervisors)
  AND role = 'staff'
)
WITH CHECK (
  -- Keep role as staff and restrict team change to supervisor's team or removal (NULL)
  role = 'staff'
  AND (
    team_id = (
      SELECT sup.team_id
      FROM public.provider_members sup
      WHERE sup.provider_id = provider_id
        AND sup.user_id = auth.uid()
        AND sup.status = 'active'
        AND sup.role = 'supervisor'
    )
    OR team_id IS NULL
  )
);

COMMENT ON POLICY "Supervisors can manage staff in their team" ON public.provider_members IS
'Supervisors can assign/remove staff from their own team only. They cannot change roles or manage other supervisors.';

COMMIT;

