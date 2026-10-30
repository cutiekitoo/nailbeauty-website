import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") ?? "*";

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
    if (roleError || !isAdmin) return Response.json({ error: "Not authorized" }, { status: 403, headers: corsHeaders });

    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const referralCode = String(body.referralCode ?? "").trim().toUpperCase();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Nom et adresse e-mail valides obligatoires." }, { status: 400, headers: corsHeaders });
    }
    if (!/^[A-Z0-9_-]{3,24}$/.test(referralCode)) {
      return Response.json({ error: "Le code doit contenir 3 à 24 caractères : lettres, chiffres, _ ou -." }, { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/ambassador/login`,
      data: { full_name: fullName },
    });
    if (inviteError || !invited.user) {
      return Response.json({ error: inviteError?.message ?? "Invitation impossible." }, { status: 400, headers: corsHeaders });
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
      return Response.json({ error: insertError.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ success: true, message: "Invitation envoyée par e-mail." }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erreur interne." }, { status: 500, headers: corsHeaders });
  }
});
