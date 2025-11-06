-- ============================================================================
-- Prevent removing the last supervisor from a team
-- ============================================================================
-- Enforces that a team must always have at least one active supervisor.
-- Blocks UPDATEs that would move/remove the only supervisor and DELETEs of the
-- only supervisor. Surfaces a clear error message.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_removing_last_supervisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_team_id UUID;
  v_provider_id UUID;
  v_remaining_supervisors INT;
BEGIN
  -- Determine affected team and provider from OLD values
  v_team_id := OLD.team_id;
  v_provider_id := OLD.provider_id;

  -- If no team context or not a supervisor, allow
  IF v_team_id IS NULL OR OLD.role <> 'supervisor' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- UPDATE: if change would remove/move supervisor away from this team
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'supervisor' AND NEW.team_id = v_team_id THEN
      -- Still supervisor of same team; allow
      RETURN NEW;
    END IF;
  END IF;

  -- For both UPDATE (moving/removing) and DELETE, ensure another supervisor exists
  SELECT COUNT(*) INTO v_remaining_supervisors
  FROM public.provider_members pm
  WHERE pm.provider_id = v_provider_id
    AND pm.team_id = v_team_id
    AND pm.role = 'supervisor'
    AND pm.status = 'active'
    AND pm.id <> OLD.id;

  IF v_remaining_supervisors = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last supervisor from this team. Assign another supervisor first.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- UPDATE trigger
DROP TRIGGER IF EXISTS trg_prevent_last_supervisor_update ON public.provider_members;
CREATE TRIGGER trg_prevent_last_supervisor_update
BEFORE UPDATE ON public.provider_members
FOR EACH ROW
WHEN (OLD.role = 'supervisor' AND OLD.team_id IS NOT NULL)
EXECUTE FUNCTION public.prevent_removing_last_supervisor();

-- DELETE trigger
DROP TRIGGER IF EXISTS trg_prevent_last_supervisor_delete ON public.provider_members;
CREATE TRIGGER trg_prevent_last_supervisor_delete
BEFORE DELETE ON public.provider_members
FOR EACH ROW
WHEN (OLD.role = 'supervisor' AND OLD.team_id IS NOT NULL)
EXECUTE FUNCTION public.prevent_removing_last_supervisor();

COMMIT;

