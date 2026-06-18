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

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getOrCreateUnsubscribeToken(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase();
  const { data: existingToken, error: lookupError } = await admin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (lookupError) return null;
  if (existingToken && !existingToken.used_at) return existingToken.token;
  if (existingToken?.used_at) return null;

  const token = generateToken();
  const { error: upsertError } = await admin
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });
  if (upsertError) return null;

  const { data: storedToken } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .maybeSingle();
  return storedToken?.token ?? null;
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

    // Email sender config (matches send-transactional-email)
    const SITE_NAME = "LARP Portal";
    const SENDER_DOMAIN = "notify.larpportal.cz";
    const FROM_DOMAIN = "larpportal.cz";

    // Log + enqueue
    const ts = Date.now();
    const logRows: any[] = [];
    const enqueueResults: { ok: number; failed: number; errors: string[] } = { ok: 0, failed: 0, errors: [] };

    for (const r of recipients) {
      const ctx = {
        jmeno: r.name, postava: r.characterName, skupina: r.group,
        larp: larpName, beh: run.name, magic_link: "", portal_link: "", odkaz_na_portal: "",
      };
      const renderedSubject = renderTemplate(body.subject, ctx);
      const renderedHtml = renderTemplate(body.html, ctx);
      const messageId = crypto.randomUUID();
      const idempotencyKey = `broadcast-${body.runId}-${r.personId || r.email}-${ts}`;

      // Suppression check
      const { data: suppressed } = await admin
        .from("suppressed_emails")
        .select("id")
        .eq("email", r.email.toLowerCase())
        .maybeSingle();

      let status: "pending" | "failed" | "suppressed" = "pending";
      let error: string | null = null;

      if (suppressed) {
        status = "suppressed";
        error = "Příjemce je na suppression listu (bounce/unsubscribe).";
      } else {
        const unsubscribeToken = await getOrCreateUnsubscribeToken(admin, r.email);
        if (!unsubscribeToken) {
          status = "failed";
          error = "Nepodařilo se připravit odhlašovací token.";
          enqueueResults.failed++;
          enqueueResults.errors.push(error);
          logRows.push({
            larp_id: larpId,
            run_id: body.runId,
            person_id: r.personId || null,
            recipient_email: r.email,
            subject: renderedSubject,
            template_kind: body.templateKind ?? "vlastni",
            status,
            error,
            idempotency_key: idempotencyKey,
            metadata: { html: renderedHtml.slice(0, 500), recipient_name: r.name, message_id: messageId },
          });
          continue;
        }

        const { error: enqErr } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: r.email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: renderedSubject,
            html: renderedHtml,
            text: renderedHtml.replace(/<[^>]+>/g, " "),
            purpose: "transactional",
            label: body.templateKind ?? "broadcast",
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        });
        if (enqErr) {
          status = "failed";
          error = `Enqueue selhal: ${enqErr.message}`;
          enqueueResults.failed++;
          enqueueResults.errors.push(enqErr.message);
        } else {
          enqueueResults.ok++;
        }
      }

      logRows.push({
        larp_id: larpId,
        run_id: body.runId,
        person_id: r.personId || null,
        recipient_email: r.email,
        subject: renderedSubject,
        template_kind: body.templateKind ?? "vlastni",
        status,
        error,
        idempotency_key: idempotencyKey,
        metadata: { html: renderedHtml.slice(0, 500), recipient_name: r.name, message_id: messageId },
      });
    }

    if (logRows.length === 0) {
      return new Response(JSON.stringify({ queued: 0, warning: "Žádní příjemci s e-mailem" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insErr } = await admin.from("email_log_v2").insert(logRows);
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        queued: enqueueResults.ok,
        failed: enqueueResults.failed,
        total: logRows.length,
        warning: enqueueResults.failed > 0 ? `${enqueueResults.failed} e-mailů selhalo při zařazení do fronty.` : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
