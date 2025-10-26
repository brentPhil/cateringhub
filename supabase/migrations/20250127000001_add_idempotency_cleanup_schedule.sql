-- ============================================================================
-- ADD SCHEDULED CLEANUP FOR IDEMPOTENCY KEYS
-- ============================================================================
-- Migration: 20250127000001_add_idempotency_cleanup_schedule.sql
-- Purpose: Set up automatic cleanup of expired idempotency keys
-- Note: This uses pg_cron if available, otherwise provides manual cleanup instructions
-- ============================================================================

-- ============================================================================
-- OPTION 1: AUTOMATIC CLEANUP WITH PG_CRON (if extension is available)
-- ============================================================================

-- Check if pg_cron extension is available and enable it
-- Note: pg_cron requires superuser privileges and may not be available on all Supabase plans
-- If this fails, use Option 2 (manual cleanup) instead

DO $$
BEGIN
  -- Try to create the pg_cron extension if it doesn't exist
  -- This will fail silently if pg_cron is not available
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Schedule cleanup job to run daily at 2 AM UTC
    -- This will delete idempotency keys older than their expiration time
    PERFORM cron.schedule(
      'cleanup-expired-idempotency-keys',  -- Job name
      '0 2 * * *',                          -- Cron schedule (2 AM daily)
      $$SELECT public.cleanup_expired_idempotency_keys();$$
    );
    
    RAISE NOTICE 'pg_cron cleanup job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Use manual cleanup or Edge Function instead.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not set up pg_cron: %. Use manual cleanup instead.', SQLERRM;
END;
$$;

-- ============================================================================
-- OPTION 2: MANUAL CLEANUP INSTRUCTIONS
-- ============================================================================

-- If pg_cron is not available, you can:
-- 1. Call the cleanup function manually via SQL:
--    SELECT public.cleanup_expired_idempotency_keys();
--
-- 2. Set up a Supabase Edge Function to run on a schedule:
--    - Create an Edge Function that calls the cleanup RPC
--    - Use GitHub Actions or external cron service to trigger it daily
--
-- 3. Use a serverless cron service (e.g., Vercel Cron, AWS EventBridge):
--    - POST to your Supabase Function URL daily
--    - The function calls cleanup_expired_idempotency_keys()

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- To verify cleanup is working, run this query to see expired keys:
-- SELECT COUNT(*) as expired_keys_count
-- FROM public.idempotency_keys
-- WHERE expires_at < now();

-- To manually trigger cleanup:
-- SELECT public.cleanup_expired_idempotency_keys();

