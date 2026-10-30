import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const allowedOrigins = new Set([siteUrl, ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim().replace(/\/$/, ""))].filter(Boolean));
const baseCorsHeaders = { "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
function corsHeadersFor(origin: string | null): Headers {
  const headers = new Headers(baseCorsHeaders);
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null) {
  return Response.json(body, { status, headers: corsHeadersFor(origin) });
}
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = corsHeadersFor(origin);
  if (origin && !allowedOrigins.has(origin)) return jsonResponse({ error: "Origin not allowed" }, 403, null);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin);
  try {
    if (!siteUrl || !siteUrl.startsWith("http")) return jsonResponse({ error: "SITE_URL must be configured as an absolute URL." }, 500, origin);
    const authorization = req.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Unauthorized" }, 401, origin);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

    const { data: isAdmin, error: roleError } = await caller.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) return jsonResponse({ error: "Not authorized" }, 403, origin);

    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const referralCode = String(body.referralCode ?? "").trim().toUpperCase();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Nom et adresse e-mail valides obligatoires." }, 400, origin);
    }
    if (!/^[A-Z0-9_-]{3,24}$/.test(referralCode)) {
      return jsonResponse({ error: "Le code doit contenir 3 à 24 caractères : lettres, chiffres, _ ou -." }, 400, origin);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/ambassador/activate`,
      data: { full_name: fullName },
    });
    if (inviteError || !invited.user) {
      return jsonResponse({ error: inviteError?.message ?? "Invitation impossible." }, 400, origin);
    }

    const { error: insertError } = await admin.from("ambassadors").insert({
      user_id: invited.user.id,
      full_name: fullName,
      email,
      referral_code: referralCode,
      is_active: true,
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      return jsonResponse({ error: insertError.message }, 400, origin);
    }

    return jsonResponse({ success: true, message: "Invitation envoyée par e-mail." }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erreur interne." }, 500, origin);
  }
});
