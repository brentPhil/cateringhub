-- =========================================================================
-- Remove duplicate membership creation trigger
-- =========================================================================
-- Migration: 20251030060000_remove_duplicate_membership_trigger.sql
-- 
-- Problem: The `on_provider_created` trigger automatically creates an owner
--          membership when a provider is inserted. However, the simplified
--          `create_provider_with_membership` RPC also creates the owner
--          membership explicitly. This causes a unique constraint violation
--          on `provider_members(provider_id, user_id)`.
--
-- Solution: Drop the trigger since the RPC now handles membership creation
--           explicitly and atomically in the same transaction.
--
-- Impact: Provider creation will now only create memberships when done via
--         the RPC. Direct INSERTs to providers table (e.g., seed scripts)
--         will NOT auto-create memberships.
-- =========================================================================

BEGIN;

-- Drop the trigger that auto-creates owner membership
DROP TRIGGER IF EXISTS on_provider_created ON public.providers;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS public.handle_new_provider();

-- Comment on why this was removed
COMMENT ON TABLE public.providers IS 
'Providers table. Owner membership is created explicitly by create_provider_with_membership RPC, not by trigger.';

COMMIT;

