# Cleanup Idempotency Keys Edge Function

This Edge Function automatically cleans up expired idempotency keys from the database.

## Purpose

Idempotency keys are stored with a 24-hour expiration time. This function deletes expired keys to prevent the table from growing indefinitely.

## Setup

### Option 1: GitHub Actions (Recommended)

The GitHub Actions workflow is already configured in `.github/workflows/cleanup-idempotency-keys.yml`.

**Required GitHub Secrets:**
1. `SUPABASE_URL` - Your Supabase project URL
2. `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
3. `CLEANUP_SECRET_TOKEN` - A random secret token for additional security

To add secrets:
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add the three secrets above

The workflow runs daily at 2 AM UTC and can also be triggered manually.

### Option 2: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Create a new cron job
2. Set URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-idempotency-keys`
3. Set schedule: Daily at 2 AM
4. Add headers:
   - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - `X-Cleanup-Token: YOUR_SECRET_TOKEN`
   - `Content-Type: application/json`

### Option 3: Manual Cleanup

You can also call the cleanup function manually via SQL:

```sql
SELECT public.cleanup_expired_idempotency_keys();
```

Or via the Supabase client:

```typescript
const { data, error } = await supabase.rpc('cleanup_expired_idempotency_keys');
console.log(`Deleted ${data} expired keys`);
```

## Testing

Test the Edge Function locally:

```bash
# Start Supabase locally
npx supabase start

# Serve the function
npx supabase functions serve cleanup-idempotency-keys

# Call it
curl -X POST http://localhost:54321/functions/v1/cleanup-idempotency-keys \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-Cleanup-Token: test-token"
```

Test in production:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-idempotency-keys \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "X-Cleanup-Token: YOUR_SECRET_TOKEN"
```

## Monitoring

Check the Edge Function logs in the Supabase Dashboard:
1. Go to Edge Functions
2. Select `cleanup-idempotency-keys`
3. View logs to see how many keys are being deleted

## Security

- The function requires either a service role key OR a secret token
- Never expose the service role key in client-side code
- Rotate the `CLEANUP_SECRET_TOKEN` periodically

