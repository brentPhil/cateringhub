-- ============================================================================
-- CLEANUP EXPIRED IDEMPOTENCY KEYS
-- ============================================================================
-- Purpose: Manual script to clean up expired idempotency keys
-- Usage: Run this periodically (e.g., daily) to remove old keys
-- 
-- For automated cleanup, consider setting up pg_cron:
-- SELECT cron.schedule(
--   'cleanup-idempotency-keys',
--   '0 2 * * *', -- Run at 2 AM daily
--   'SELECT public.cleanup_expired_idempotency_keys();'
-- );
-- ============================================================================

SELECT public.cleanup_expired_idempotency_keys();

