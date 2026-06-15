
# Etapa 2 — Běhy, hráči, magic linky, e-maily

Začneme rychlou opravou cockpitu (editace běhu), pak postupně postavíme tvorbu běhu, přihlášky hráčů, hráčský portál a e-mail šablony. Každá podetapa je samostatně deploynutelná.

## 2.0 Editovatelný cockpit běhu (rychlá oprava)

Cockpit dnes jen ukazuje `RunHeader` — nelze nic změnit.

- Tlačítko "Upravit běh" v hlavičce cockpitu → otevře dialog/sheet `RunEditDialog`.
- Editovatelná pole: `name`, `slug`, `date_from`, `date_to`, `location`, `address`, `contact`, `mission_briefing`, `footer_text`, `is_active`.
- Platby (`payment_*`) zůstávají ve své vlastní sekci (později), v základním dialogu ne.
- Validace: `date_to >= date_from`, slug unikátní per LARP (DB constraint už existuje).
- Update přes existující RLS policy `Vlastník upravuje běhy`.
- Po uložení: invalidate `useRun`, pokud se změní slug → navigace na nový URL.

Drobnost: do `RunHeader` přidat malé pero/edit ikonu, aby šlo otevřít dialog i kliknutím na hlavičku.

## 2.1 Tvorba běhu (3-krokový wizard)

Nová stránka `/larp/:larpSlug/beh/novy` (link z `V2LarpHome` a `V2PastRunsPage`).

Wizard kroky:
1. **Základ** — name, slug (auto z name), date_from/to, location, address, contact.
2. **Postavy z katalogu** — checkbox list všech `persons` LARPu typu `postava`. Default: všechny zaškrtnuté. Vybrané se po dokončení připojí přes `persons.run_id` (nebo zůstanou na LARPu a vytvoří se prázdné `run_person_assignments`? — viz technická poznámka).
3. **CP z katalogu** — totéž pro typ `cp`.

Po dokončení redirect na cockpit nového běhu.

## 2.2 Hráči, magic linky a pozvánky

Stránka `/larp/:larpSlug/beh/:runSlug/hraci` (dnes stub).

Tabulka hráčů (řádek = postava v běhu):
- postava (z katalogu)
- jméno hráče + e-mail (editovatelné inline / přes drawer)
- stav magic linku: nevygenerován / odeslán / kliknuto (last_seen_at) / expirován
- stav platby: nezaplaceno / zaplaceno (paid_at)
- akce: "Poslat pozvánku", "Poslat znovu", "Zkopírovat link", "Označit zaplaceno"
- hromadné akce: "Pozvat všechny nevyzvané", "Připomenout platbu nezaplaceným"

Magic linky:
- Tabulka `magic_links` už existuje — ověřit schéma a doplnit, co chybí (token, person_id, run_id, expires_at, last_seen_at, sent_at, purpose).
- Default expirace: `run.date_to + 30 dnů`.
- Veřejná route `/m/:token` → ověří token (RPC `consume_magic_link`), nastaví `last_seen_at`, uloží token do localStorage, přesměruje na `/p/:larpSlug/:personSlug` (hráčský portál) — bez hesla.
- Stará portálová route (`/portal/...`) zůstává v `_archiv/` pro legacy.

E-mail odeslání přes Lovable Emails (auth už máme; pro app-emails zavoláme `email_domain--scaffold_transactional_email`).

## 2.3 Hráčský portál (mobile-first)

Nová route `/p/:larpSlug/:personSlug` — bez hesla, autorizace přes localStorage token (validace přes RPC `verify_magic_link_session`).

Layout single-column, mobile-first, používá `LarpThemeProvider` (vizuální identita per LARP).

Sekce (sticky tabs nebo akordeon):
1. **Moje postava** — jméno, skupina, medailonek, performer.
2. **Dokumenty** — řazeno: organizační → herní osobní → herní skupinové → herní obecné. Klik na dokument zapíše `document_views.last_seen_at` (per person × document).
3. **Harmonogram** — read-only view veřejných eventů běhu.
4. **Kontakt na org** — `run.contact`, `larp.contact`.
5. **Platba** — `run.payment_*`, stav zaplaceno + instrukce.

Tisk: zachovat současný PDF export přes hidden iframe.

## 2.4 Pre-flight v cockpitu

Rozšířit `get_run_cockpit_stats` o:
- magic linky: vygenerováno / odesláno / kliknuto
- dokumenty: % postav, které otevřely všechny své povinné dokumenty (přes `document_views`)

V cockpitu přidat 5. StatCard "Pozvánky" a nové issues:
- "X hráčů nemá pozvánku"
- "X hráčů ještě nekliklo"
- "X hráčů nečetlo dokumenty"

## 2.5 E-mail šablony per LARP

Tabulka `email_templates` už existuje — využít.

Stránka `/larp/:larpSlug/beh/:runSlug/komunikace` (dnes stub):
- Seznam šablon (per LARP): Pozvánka, Připomenutí platby, Nový dokument, D-1 reminder, Po akci.
- WYSIWYG editor (TipTap, stejný jako u dokumentů) s podporou proměnných `{{postava}}`, `{{datum}}`, `{{odkaz}}`, `{{hrac}}`, `{{larp}}`.
- Náhled s testovacími daty.
- Historie odeslaných (`email_log_v2`): komu, kdy, šablona, stav (sent/bounced/opened).
- Odeslání: hromadně z této stránky NEBO per osoba z karty hráče (2.2).

Odesílání přes scaffoldnutou `send-transactional-email` edge funkci. Před prvním sendem volá agent `email_domain--scaffold_transactional_email`.

## Akceptační kritéria etapy 2

- V cockpitu lze upravit místo, čas, termín i ostatní pole běhu.
- Org vytvoří nový běh přes wizard, vybere postavy a CP z katalogu.
- Org pozve hráče e-mailem; hráč kliknutím přijde do portálu bez hesla.
- Magic link expiruje 30 dnů po `date_to`.
- Cockpit ukazuje kompletní pre-flight (linky, platby, čtenost dokumentů).
- E-mail šablony lze editovat, odeslat hromadně i jednotlivě, historie viditelná.

## Technické poznámky

- Migrace: rozšířit `magic_links` (pokud chybí sloupce), přidat `document_views(person_id, document_id, last_seen_at)` unikátní index. Vždy `GRANT` + RLS policies (security definer RPC pro insert z hráčského portálu bez auth.uid()).
- RPC funkce: `create_magic_link(p_run_id, p_person_id, p_email, p_purpose)`, `consume_magic_link(p_token)`, `verify_magic_link_session(p_token)`, `log_document_view(p_token, p_document_id)`, `get_player_portal_data(p_token)`.
- E-maily: Lovable Cloud + `email_domain--scaffold_transactional_email`. Šablony per LARP renderujeme v edge funkci z `email_templates` řádků (template body z DB, ne z `_shared/`).
- Vazba postava ↔ běh: rozhodnout zda používáme `persons.run_id` (1:1) nebo `run_person_assignments` (M:N s rolí hráče). Dnes existuje obojí — sjednotit na `run_person_assignments` jako zdroj pravdy pro pozvánky/platby; `persons.run_id` zachovat pro legacy a postupně odstranit.
- Routing: nová route `/m/:token` se přidá do hlavního `App.tsx` mimo `V2Routes`.

## Pořadí implementace

1. 2.0 cockpit editace (1 PR).
2. 2.1 wizard nového běhu.
3. 2.2 + 2.3 + 2.4 magic linky a hráčský portál (DB + RPC + UI + cockpit stats).
4. 2.5 e-mail šablony a odesílání.

Začnu s 2.0 hned po schválení.
