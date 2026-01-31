/**
 * Seed skript: načte data ze složky zaloha (LARP Krypta ze starého portálu)
 * a vloží je do Supabase (larp, běh, osoby, dokumenty).
 *
 * Požadavky: .env s VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LARP_OWNER_ID.
 * LARP_OWNER_ID = UUID organizátora z Supabase Auth (Dashboard → Authentication → Users).
 * Zaloha: složka ../zaloha vůči larp-gateway-app, nebo ZALOHA_PATH.
 *
 * Spuštění: npm run seed:krypta
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import { readFileSync, readdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PASSWORD = "krypta2024";

const POSTAVA_DISPLAY_NAMES = {
  bublik: "Bublík",
  gabcik: "Gabčík",
  hruby: "Hrubý",
  kubis: "Kubiš",
  opalka: "Opálka",
  petrek: "Petřek",
  svarc: "Švarc",
  valcik: "Valčík",
};

function getZalohaPath() {
  const envPath = process.env.ZALOHA_PATH;
  if (envPath) return resolve(envPath);
  return resolve(__dirname, "..", "..", "zaloha");
}

/**
 * Parsuje frontmatter z .md (řádky název dokumentu:, typ dokumentu:, komu:, priorita: a tělo za ---).
 */
function parseMdFile(content) {
  const lines = content.split(/\r?\n/);
  let title = "";
  let typ = "";
  let komu = "";
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("---")) {
      i++;
      break;
    }
    if (line.startsWith("název dokumentu:")) title = line.replace(/^název dokumentu:\s*/, "").trim();
    else if (line.startsWith("typ dokumentu:")) typ = line.replace(/^typ dokumentu:\s*/, "").trim();
    else if (line.startsWith("komu:")) komu = line.replace(/^komu:\s*/, "").trim();
  }
  const body = lines.slice(i).join("\n").trim();
  return { title, typ, komu, body };
}

/**
 * Rekurzivně najde všechny .md soubory (kromě Vzor* a souborů v .cursor).
 */
function findMdFiles(dir, baseDir = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.name === "desktop.ini" || e.name.startsWith(".")) continue;
    if (e.isDirectory()) {
      if (e.name === ".cursor") continue;
      files.push(...findMdFiles(full, baseDir));
    } else if (e.name.endsWith(".md") && !e.name.startsWith("Vzor")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Určí složku zdroje (organizacni, herni, postava, postava/medailonky, cp) z cesty.
 */
function getSourceFolder(filePath, zalohaPath) {
  const rel = filePath.slice(zalohaPath.length + 1).replace(/\\/g, "/");
  if (rel.startsWith("organizacni/")) return "organizacni";
  if (rel.startsWith("herni/")) return "herni";
  if (rel.startsWith("postava/medailonky/")) return "medailonky";
  if (rel.startsWith("postava/")) return "postava";
  if (rel.startsWith("cp/")) return "cp";
  return "other";
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.LARP_OWNER_ID;

  if (!url || !serviceKey) {
    console.error("Chybí VITE_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env");
    process.exit(1);
  }
  if (!ownerId) {
    console.error("Chybí LARP_OWNER_ID v .env (UUID organizátora z Supabase Auth → Users)");
    process.exit(1);
  }

  const zalohaPath = getZalohaPath();
  console.log("Záloha:", zalohaPath);

  const mdFiles = findMdFiles(zalohaPath);
  const parsed = [];
  for (const f of mdFiles) {
    const raw = readFileSync(f, "utf-8");
    const { title, typ, komu, body } = parseMdFile(raw);
    if (!title || title === "…" || !typ || typ === "…") continue;
    const sourceFolder = getSourceFolder(f, zalohaPath);
    let docType = typ;
    if (sourceFolder === "medailonky") docType = "medailonek";
    if (sourceFolder === "cp" && docType !== "cp") docType = "cp";
    parsed.push({
      path: f,
      title,
      typ: docType,
      komu: komu === "…" ? "" : komu,
      body,
      sourceFolder,
    });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. LARP
  const { data: larp, error: larpErr } = await supabase
    .from("larps")
    .insert({
      name: "Krypta",
      slug: "krypta",
      description: "LARP Krypta – import ze zálohy starého portálu",
      theme: "wwii",
      owner_id: ownerId,
    })
    .select("id")
    .single();

  if (larpErr) {
    console.error("Chyba při vytváření LARPu:", larpErr.message);
    process.exit(1);
  }
  const larpId = larp.id;
  console.log("LARP vytvořen:", larpId);

  // 2. Běh
  const { data: run, error: runErr } = await supabase
    .from("runs")
    .insert({
      larp_id: larpId,
      name: "Běh 1",
      slug: "beh-1",
      mission_briefing: "Krypta – běh importovaný ze zálohy. DDM Šultysova, Slaný.",
      contact: "Kontakt na organizátory",
      footer_text: "",
    })
    .select("id")
    .single();

  if (runErr) {
    console.error("Chyba při vytváření běhu:", runErr.message);
    process.exit(1);
  }
  const runId = run.id;
  console.log("Běh vytvořen:", runId);

  // 3. Osoby – postavy (8) + CP (unikátní komu z cp/)
  const postavaSlugs = [...new Set(Object.keys(POSTAVA_DISPLAY_NAMES))];
  const cpKomuFromDocs = [...new Set(parsed.filter((p) => p.sourceFolder === "cp" && p.komu && p.komu !== "vsichni").map((p) => p.komu))];
  const cpNamesBySlug = {};
  for (const p of parsed.filter((p) => p.sourceFolder === "cp" && p.komu && p.komu !== "vsichni")) {
    if (!cpNamesBySlug[p.komu]) cpNamesBySlug[p.komu] = p.title;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const slugToPersonId = {};

  for (const slug of postavaSlugs) {
    const { data: row, error } = await supabase
      .from("persons")
      .insert({
        run_id: runId,
        type: "postava",
        slug,
        name: POSTAVA_DISPLAY_NAMES[slug],
        password_hash: passwordHash,
        access_token: crypto.randomUUID(),
      })
      .select("id")
      .single();
    if (error) {
      console.error("Chyba při vkládání postavy", slug, error.message);
      continue;
    }
    slugToPersonId[slug] = row.id;
  }

  for (const slug of cpKomuFromDocs) {
    const { data: row, error } = await supabase
      .from("persons")
      .insert({
        run_id: runId,
        type: "cp",
        slug,
        name: cpNamesBySlug[slug] || slug,
        password_hash: passwordHash,
        access_token: crypto.randomUUID(),
      })
      .select("id")
      .single();
    if (error) {
      console.error("Chyba při vkládání CP", slug, error.message);
      continue;
    }
    slugToPersonId[slug] = row.id;
  }

  console.log("Osoby vytvořeny (postavy + CP):", Object.keys(slugToPersonId).length);

  // 4. Dokumenty
  let sortOrder = 0;
  for (const p of parsed) {
    const targetType = p.komu === "vsichni" || !p.komu ? "vsichni" : "osoba";
    const targetPersonId = targetType === "osoba" && slugToPersonId[p.komu] ? slugToPersonId[p.komu] : null;
    if (targetType === "osoba" && !targetPersonId) continue;

    const contentHtml = await marked.parse(p.body);
    const { error } = await supabase.from("documents").insert({
      run_id: runId,
      title: p.title,
      doc_type: p.typ,
      target_type: targetType,
      target_person_id: targetPersonId,
      content: typeof contentHtml === "string" ? contentHtml : "",
      sort_order: sortOrder++,
    });
    if (error) console.error("Chyba dokumentu", p.title, error.message);
  }

  console.log("Dokumenty vloženy:", parsed.length);
  console.log("\nHotovo. LARP Krypta je v aplikaci.");
  console.log("Výchozí heslo pro všechny osoby (postavy i CP):", DEFAULT_PASSWORD);
  console.log("Po přihlášení do aplikace změň hesla v adminu u jednotlivých osob.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
