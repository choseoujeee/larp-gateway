# Komunikace (Etapa 2)

Sekce **Komunikace** žije v detailu běhu (`/larp/:larpSlug/beh/:runSlug/komunikace`). Pokrývá šablony e-mailů, hromadné rozesílky hráčům/CP přiřazeným k danému běhu, rozesílku magic linků a kompletní log odeslaných zpráv. Odesílání jde přes vestavěnou Lovable e-mailovou infrastrukturu.

## Předpoklady infrastruktury

1. Ověřit e-mailovou doménu (`check_email_domain_status`). Pokud chybí, ukázat dialog na nastavení domény.
2. Nasadit `setup_email_infra` (fronty, log, cron, suppression).
3. Scaffoldovat `send-transactional-email` a vytvořit jednu obecnou šablonu `larp-broadcast`, která dostává `{ subject, html }` jako `templateData` — díky tomu může každá LARP šablona mít vlastní HTML uložené v DB a do edge funkce posíláme už hotový obsah.

## UI: stránka `V2RunCommunicationPage`

Tři záložky.

### 1. Composer (rozeslat zprávu)
- Výběr příjemců: checkboxy „Všichni hráči“, „Všichni CP“, „Organizátoři“ + multi-select konkrétních osob / skupin (`run_person_assignments` JOIN `persons`). Vedle se ukazuje finální počet adresátů a kolik z nich má vyplněný e-mail.
- Výběr šablony (volitelně) → předvyplní předmět a HTML.
- Editor předmětu (text) + TipTap editoru těla (stejné nastavení jako u dokumentů, DOMPurify pravidla z `mem://ui/wysiwyg-editor`).
- Proměnné: `{{jmeno}}`, `{{postava}}`, `{{skupina}}`, `{{larp}}`, `{{beh}}`, `{{portal_link}}`, `{{magic_link}}`. Náhled pro vybranou osobu.
- Tlačítko „Odeslat“ zavolá edge funkci `send-run-broadcast` (viz níže), která zařadí jednu zprávu na adresáta do fronty `transactional_emails`.

### 2. Šablony (`email_templates`)
- CRUD seznam pro daný LARP (sdílené mezi běhy), filtr podle `kind` (pozvánka / info / díky / magic-link / vlastní).
- Editor stejný jako composer; uložení do `email_templates` (sloupce už existují: `subject`, `body_html`, `body_text`, `kind`, `larp_id`).
- Tlačítko „Použít v rozesílce“ otevře composer s předvyplněnými hodnotami.

### 3. Magic linky (přístupové údaje)
- Tabulka hráčů/CP přiřazených k běhu se sloupci: jméno, postava, e-mail, stav (vygenerováno / odesláno / přihlášeno), tlačítko „Vygenerovat link“ a „Poslat e-mailem“.
- Generování jednorázových tokenů do `magic_links` (token, person_id, run_id, expires_at, used_at). Odkaz ve tvaru `/portal/magic/:token` — frontend ho směňuje za standardní portálovou session přes existující RPC.
- Možnost hromadné akce „Vygenerovat a rozeslat všem“ — použije pevnou šablonu kind `magic-link`.

### 4. Historie (`email_log_v2`)
- Tabulka logů filtrovaná na aktuální `run_id`: čas, příjemce, předmět, šablona, stav (pending/sent/failed/suppressed), chybová zpráva.
- Filtry: stav, šablona, časový rozsah; tlačítko „Odeslat znovu“ u failed.
- Stat karty (odesláno / čeká / selhalo / blokováno) v hlavičce.

## Backend

### Migrace
- Nová tabulka `magic_links` (id, token uuid unique, person_id fk persons, run_id fk runs, expires_at timestamptz, used_at timestamptz nullable, created_at). RLS: insert/select jen pro vlastníky LARPu; portálová směna přes security definer RPC `consume_magic_link(p_token)`.
- Sloupec `email` u `run_person_assignments` už existuje (`player_email`), využijeme ho — pokud chybí u CP, fallback na `persons.email` (přidat sloupec `persons.email`, pokud chybí).
- `email_templates` nepřidávat sloupce — schéma stačí. Doplnit chybějící GRANT pokud chybí.

### Edge funkce
- `send-run-broadcast`: ověří JWT a `is_run_owner(p_run_id)`. Vstup: `{ runId, recipients: { groups, personIds, includeOrganizers }, subject, html, templateKind? }`. Server expanduje na seznam příjemců, nahradí proměnné per osoba, vytvoří `magic_link` pokud HTML obsahuje `{{magic_link}}`, vloží řádek do `email_log_v2` se stavem `pending` a zavolá `enqueue_email` šablony `larp-broadcast` s `{ subject, html }`. Idempotency key: `broadcast-<runId>-<personId>-<timestamp>`.
- `send-transactional-email` + `larp-broadcast.tsx` šablona: jednoduchý wrapper, který vrenderuje předaný `html` přes React Email (s povolenými inline styly, bez DOMPurify protože jde přes naše vlastní UI).
- `handle-email-unsubscribe` se nepoužije pro provozní zprávy (jsou transakční), ale ponecháme defaultní patička s odkazem na portál.

### Aktualizace logů
- Stav `pending` zapisuje `send-run-broadcast` při enqueue, stav `sent`/`failed` aktualizuje queue worker (`process-email-queue`) po pokusu o odeslání. Korelace přes `idempotency_key` uložený v `email_log_v2.metadata` (nový jsonb sloupec, pokud chybí).

## Routing a navigace

- `V2Routes.tsx`: nahradit `V2Stub` v `:larpSlug/beh/:runSlug/komunikace` za `V2RunCommunicationPage`.
- Pod ní vnořené taby přes `?tab=` query param: `composer` (default), `templates`, `magic`, `log`.
- Sekce v menu „Komunikace“ už existuje v `V2Shell`.

## Otevřené technické detaily

- Délka platnosti magic linku: 30 dní od vytvoření; jednorázové použití generuje portálovou session (cookie/localStorage podle existujícího portál mechanismu).
- Rate limit pro hromadnou rozesílku spoléhá na `email_send_state` (default 120/min) — žádné vlastní omezení.
- Odesílatel: `notify.<domena-larpu>` (z `larp_email_config`) — pokud není nastaveno, fallback na výchozí Lovable doménu.
