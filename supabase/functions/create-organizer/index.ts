// Edge Function: vytvoření organizátora s loginem a heslem.
// Volá jen super admin (email = chousef@gmail.com).
// Vytvoří uživatele v auth s e-mailem login@organizer.local, zapíše organizer_accounts a larp_organizers.

import "jsr:@supabase/functions-js/edge_runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORGANIZER_EMAIL_DOMAIN = Deno.env.get("ORGANIZER_EMAIL_DOMAIN") ?? "organizer.local";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrganizerBody {
  login: string;
  password: string;
  display_name?: string;
  contact_email?: string;
  contact_phone?: string;
  larp_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Chybí autorizace" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Neplatný token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.email !== "chousef@gmail.com") {
      return new Response(
        JSON.stringify({ error: "Pouze super admin může vytvářet organizátory" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as CreateOrganizerBody;
    const login = String(body.login ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const password = String(body.password ?? "").trim();
    const larpId = String(body.larp_id ?? "").trim();

    if (!login || !password || !larpId) {
      return new Response(
        JSON.stringify({ error: "Vyplňte login, heslo a LARP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Heslo musí mít alespoň 6 znaků" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authEmail = `${login}@${ORGANIZER_EMAIL_DOMAIN}`;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Login je již obsazen" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser.user?.id) {
      return new Response(
        JSON.stringify({ error: "Vytvoření uživatele selhalo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertAccountError } = await supabaseAdmin.from("organizer_accounts").insert({
      login,
      user_id: newUser.user.id,
      auth_email: authEmail,
      display_name: body.display_name?.trim() || null,
      contact_email: body.contact_email?.trim() || null,
      contact_phone: body.contact_phone?.trim() || null,
    });

    if (insertAccountError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: insertAccountError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contactEmail = body.contact_email?.trim() || authEmail;
    const { error: insertLarpError } = await supabaseAdmin.from("larp_organizers").insert({
      larp_id: larpId,
      user_id: newUser.user.id,
      email: contactEmail,
    });

    if (insertLarpError) {
      await supabaseAdmin.from("organizer_accounts").delete().eq("user_id", newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: insertLarpError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, login }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
