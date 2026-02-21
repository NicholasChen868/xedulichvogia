// Health Check Edge Function
// Endpoint: /functions/v1/health-check
// SECURITY: Requires admin API key or service_role to access
// Dùng cho UptimeRobot, Pingdom, hoặc CI/CD verify

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple API key for health check access (set via: supabase secrets set HEALTH_CHECK_KEY=xxx)
const HEALTH_CHECK_KEY = Deno.env.get("HEALTH_CHECK_KEY") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // SECURITY: Require auth — either health check key or service_role JWT
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = req.headers.get("x-health-key") || new URL(req.url).searchParams.get("key") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
  const isValidKey = HEALTH_CHECK_KEY && apiKey === HEALTH_CHECK_KEY;

  if (!isServiceRole && !isValidKey) {
    return new Response(
      JSON.stringify({ status: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();
  let overallStatus = "healthy";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(supabaseUrl, serviceRoleKey);

    // 1. Database connection check (generic — no error details)
    try {
      const { error } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true });

      if (error) overallStatus = "degraded";
    } catch {
      overallStatus = "unhealthy";
    }

    // 2. Tables existence check (ok/error only, no error messages)
    const requiredTables = ["bookings", "drivers", "payments", "vehicle_types", "pricing_tiers"];
    let tablesOk = 0;

    for (const table of requiredTables) {
      try {
        const { error } = await db.from(table).select("id", { head: true });
        if (!error) tablesOk++;
        else overallStatus = "degraded";
      } catch {
        overallStatus = "degraded";
      }
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        version: "1.0.0",
        checks: {
          database: overallStatus !== "unhealthy" ? "ok" : "error",
          tables: `${tablesOk}/${requiredTables.length}`,
          runtime: "ok",
        },
      }),
      {
        status: overallStatus === "unhealthy" ? 503 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[health-check] Error:", error);
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
