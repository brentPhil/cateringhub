import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function: cleanup-idempotency-keys
 * 
 * Purpose: Automatically clean up expired idempotency keys from the database
 * 
 * Trigger: Should be called daily via:
 * - GitHub Actions cron job
 * - External cron service (e.g., cron-job.org, EasyCron)
 * - Vercel Cron (if using Vercel)
 * 
 * Authentication: Requires service role key or valid auth token
 */

Deno.serve(async (req: Request) => {
  try {
    // Verify request is authorized (check for secret token or service role)
    const authHeader = req.headers.get("Authorization");
    const secretToken = Deno.env.get("CLEANUP_SECRET_TOKEN");
    
    // Simple authentication: either service role or secret token
    if (!authHeader && !secretToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // If using secret token, verify it matches
    if (secretToken) {
      const providedToken = req.headers.get("X-Cleanup-Token");
      if (providedToken !== secretToken) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Call the cleanup function
    const { data, error } = await supabase.rpc("cleanup_expired_idempotency_keys");
    
    if (error) {
      console.error("Error cleaning up idempotency keys:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const deletedCount = data as number;
    
    console.log(`Successfully cleaned up ${deletedCount} expired idempotency keys`);
    
    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Connection": "keep-alive",
        },
      }
    );
  } catch (err) {
    console.error("Unexpected error in cleanup function:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

