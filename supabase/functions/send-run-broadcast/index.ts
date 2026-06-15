import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  runId: string;
  recipients: {
    players?: boolean;
    cp?: boolean;
    organizers?: boolean;
    personIds?: string[];
  };
  subject: string;
  html: string;
  templateKind?: string;
}

function renderTemplate(html: string, ctx: Record<string, string>) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as Body;
    if (!body.runId || !body.subject || !body.html) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: canEdit } = await supabaseUser.rpc("can_edit_run_section", { p_run_id: body.runId, p_section: "communication" });
    if (!canEdit) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: run } = await admin.from("runs").select("id, name, larp_id, larps(name, slug)").eq("id", body.runId).maybeSingle();
    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const larpId = run.larp_id;
    const larpName = (run as any).larps?.name ?? "";

    // Resolve recipients
    const personSet = new Set<string>(body.recipients.personIds ?? []);
    if (body.recipients.players) {
      const { data: rpa } = await admin.from("run_person_assignments").select("person_id").eq("run_id", body.runId);
      (rpa ?? []).forEach((r) => personSet.add(r.person_id));
    }
    if (body.recipients.cp) {
      const { data: cps } = await admin.from("persons").select("id").eq("larp_id", larpId).eq("type", "cp");
      (cps ?? []).forEach((p) => personSet.add(p.id));
    }

    const personIds = Array.from(personSet);
    const { data: persons } = await admin.from("persons").select("id, name, email, group_name, type, slug").in("id", personIds.length ? personIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data: rpaAll } = await admin.from("run_person_assignments").select("person_id, player_name, player_email").eq("run_id", body.runId);
    const rpaMap: Record<string, { name: string | null; email: string | null }> = {};
    (rpaAll ?? []).forEach((r) => { rpaMap[r.person_id] = { name: r.player_name, email: r.player_email }; });

    type Recipient = { personId: string; name: string; email: string; group: string; characterName: string };
    const recipients: Recipient[] = [];
    (persons ?? []).forEach((p) => {
      const isPlayer = p.type === "postava";
      const email = (isPlayer ? rpaMap[p.id]?.email : null) ?? p.email;
      const name = (isPlayer ? rpaMap[p.id]?.name : null) ?? p.name;
      if (!email || !email.includes("@")) return;
      recipients.push({
        personId: p.id, name, email,
        group: p.group_name ?? "",
        characterName: p.name,
      });
    });

    if (body.recipients.organizers) {
      const { data: orgs } = await admin.from("larp_organizers").select("email").eq("larp_id", larpId);
      (orgs ?? []).forEach((o) => {
        if (o.email && o.email.includes("@") && !recipients.some((r) => r.email === o.email)) {
          recipients.push({ personId: "", name: "Organizátor", email: o.email, group: "", characterName: "" });
        }
      });
    }

    // Check email infra
    const { data: domains } = await admin.from("email_domains" as any).select("status").limit(1);
    const hasDomain = Array.isArray(domains) && domains.length > 0;

    // Log + enqueue
    const ts = Date.now();
    const rows = recipients.map((r) => {
      const ctx = {
        jmeno: r.name, postava: r.characterName, skupina: r.group,
        larp: larpName, beh: run.name, magic_link: "", portal_link: "", odkaz_na_portal: "",
      };
      const renderedSubject = renderTemplate(body.subject, ctx);
      const renderedHtml = renderTemplate(body.html, ctx);
      return {
        larp_id: larpId,
        run_id: body.runId,
        person_id: r.personId || null,
        recipient_email: r.email,
        subject: renderedSubject,
        template_kind: body.templateKind ?? "vlastni",
        status: hasDomain ? "pending" : "failed",
        error: hasDomain ? null : "Email doména není nastavena. Nastav ji v Cloud → Emails.",
        idempotency_key: `broadcast-${body.runId}-${r.personId || r.email}-${ts}`,
        metadata: { html: renderedHtml.slice(0, 500), recipient_name: r.name },
      };
    });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ queued: 0, warning: "Žádní příjemci s e-mailem" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insErr } = await admin.from("email_log_v2").insert(rows);
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        queued: rows.length,
        warning: hasDomain ? null : "Nastav e-mailovou doménu, e-maily zatím čekají v logu jako failed.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
