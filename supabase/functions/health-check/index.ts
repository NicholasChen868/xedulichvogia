// Health Check Edge Function
// Endpoint: /functions/v1/health-check
// Dùng cho UptimeRobot, Pingdom, hoặc CI/CD verify

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, unknown> = {};
  let overallStatus = "healthy";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // 1. Database connection check
    try {
      const { data, error } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true });

      checks["database"] = {
        status: error ? "error" : "ok",
        error: error?.message || null,
      };
      if (error) overallStatus = "degraded";
    } catch (e) {
      checks["database"] = { status: "error", error: (e as Error).message };
      overallStatus = "unhealthy";
    }

    // 2. Tables existence check
    const requiredTables = ["bookings", "drivers", "payments", "vehicle_types", "pricing_tiers"];
    const tableChecks: Record<string, string> = {};

    for (const table of requiredTables) {
      try {
        const { error } = await db.from(table).select("id", { head: true });
        tableChecks[table] = error ? "missing" : "ok";
        if (error) overallStatus = "degraded";
      } catch {
        tableChecks[table] = "error";
        overallStatus = "degraded";
      }
    }
    checks["tables"] = tableChecks;

    // 3. System health (from SQL function)
    try {
      const { data, error } = await db.rpc("system_health_check");
      checks["system_health"] = error
        ? { status: "error", error: error.message }
        : data;
      if (data?.status === "warning") overallStatus = "degraded";
    } catch {
      checks["system_health"] = { status: "unavailable" };
    }

    // 4. Edge Functions runtime check
    checks["edge_functions"] = {
      status: "ok",
      runtime: "deno",
      version: Deno.version.deno,
    };

    // 5. Recent activity stats
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { count: bookings24h } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneDayAgo.toISOString());

      const { count: driversActive } = await db
        .from("drivers")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("is_available", true);

      checks["activity"] = {
        bookings_24h: bookings24h || 0,
        drivers_online: driversActive || 0,
      };
    } catch {
      checks["activity"] = { status: "unavailable" };
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        version: "1.0.0",
        checks,
      }),
      {
        status: overallStatus === "unhealthy" ? 503 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
        error: (error as Error).message,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
