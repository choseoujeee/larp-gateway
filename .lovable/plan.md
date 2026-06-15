
# Plán: Kompletní přestavba LARP Portálu (v2)

## Strategie

**Greenfield vedle staré aplikace.** Stará UI zůstane funkční na současných cestách jako "archiv/legacy" (čtení i editace), nová verze poroste paralelně pod `/v2/*` a v okamžiku, kdy bude kompletní, přepneme `/` na ni a legacy zarchivujeme (smazání kódu, ne dat).

**Databáze:** refaktor schématu při zachování veškerých obsahů (zejména LARP Krypta 1942 — všechny dokumenty, postavy, CP, harmonogram). Změny děláme přes migrace s `INSERT INTO ... SELECT` ze starých tabulek do nových; staré tabulky se nemažou dokud v2 nepřevezme provoz.

**Mobile-first.** Každá obrazovka se navrhuje od 360px a teprve potom škáluje. Žádné desktop-only tabulky bez mobilní alternativy.

**Provázanost (klíčové).** Každý dokument, postava, scéna nebo událost je odkazem na všech místech, kde dává smysl — z postavy do dokumentů a opačně, ze scény do CP, z dokumentu do osob/skupin, z harmonogramu do scén. Organizátor edituje vše inline z místa, kde to čte.

## Otevřené otázky vyřešené ze zadání

- Rozsah: **(a) greenfield na `/v2`**, stará aplikace zůstává jako archiv.
- DB obsah: NIKDY nemazat obsahy dokumentů; Krypta 1942 musí přežít.
- Kategorie dokumentů: doporučuji **2 kategorie — Organizační a Herní** + flag "Osobní" (= obsah konkrétní postavy, např. medailonek, vztahy). Důvod: dnešní rozdělení Organizační/Herní/Postava se uživatelsky překrývá ("Postava" = vlastně herní dokument cílený na jednu osobu). Cílení (komu se zobrazí) řešíme zvlášť od typu (o čem to je).
- E-maily: **Lovable Emails** s vlastní odesílací adresou per LARP (kryptalarp@gmail.com apod.) jako reply-to; from doména bude Lovable (subdoména `notify.larpportal...`). Vlastní SMTP per-larp doděláme později.
- Identita hráče: **magic link per (běh, postava)** s časovou platností (od pozvání do +30 dnů po konci běhu). Žádné globální hráčské účty.
  - URL formát: `larpportal.lovable.app/krypta/1942/postava-jan-novak?t=<token>`
  - Token je dlouhý random, uložený hashovaně v DB, jednorázové uložení do localStorage prohlížeče po prvním kliknutí (pak už hráč nemusí mít odkaz po ruce).
  - Heslo se ruší. CP portál stejně, jen scope na celý běh.
- Mobil pro CP: jen responzivní web, žádné PWA/Capacitor.

## Cílová architektura (high-level)

```text
/                            → marketing/landing (nová, čistá)
/login                       → org login (jediné místo)
/admin                       → org dashboard (přehled všech LARPů, kde jsem org)
/admin/:larp                 → LARP workspace (sticky context)
  ├─ /                       → přehled LARPu + běhy
  ├─ /dokumenty              → globální dokumenty LARPu
  ├─ /postavy                → katalog postav (znovupoužitelné napříč běhy)
  ├─ /cp                     → katalog CP rolí + performeři
  ├─ /design                 → vizuální identita
  └─ /beh/:run               → workspace běhu (sticky context)
       ├─ /                  → cockpit běhu (pre-flight, stav přihlášek, platby)
       ├─ /hraci             → přiřazení hráčů k postavám, magic linky, e-maily
       ├─ /cp                → přiřazení performerů, scény
       ├─ /harmonogram       → grid
       ├─ /produkce          → checklist, materiály, tiskoviny
       └─ /komunikace        → e-mail šablony, historie odeslaných

/:larp/:run/:persona?t=...   → hráčský portál (magic link)
/:larp/:run/cp?t=...         → CP portál pro daný běh
```

## Datový model (změny oproti stávajícímu)

| Akce | Co | Proč |
|------|----|------|
| **Sjednotit** | `documents.doc_type` na `('organizacni','herni')` + boolean `is_personal` | UX: méně kategorií, jasnější rozlišení |
| **Přidat** | `magic_links` (id, run_id, person_id, token_hash, valid_from, valid_until, last_used_at, revoked) | Magic-link autentizace |
| **Přidat** | `email_templates` (larp_id, kind, subject, body_html, body_text) + `email_log` | Per-LARP komunikace |
| **Přidat** | `larp_email_config` (larp_id, reply_to, sender_name) | Per-LARP odesílací identita |
| **Migrovat** | `password_hash` na `persons` a `run_person_assignments` → nepoužívat, ponechat sloupec pro legacy | Magic link nahrazuje hesla |
| **Migrovat** | `doc_type='postava'` → `doc_type='herni', is_personal=true` | Sjednocení |
| **Migrovat** | `doc_type='medailonek'` → `doc_type='herni', is_personal=true, sort_order` | Sjednocení |
| **Migrovat** | `doc_type='cp'` → `doc_type='herni'` + cílení skupina='CP' | Sjednocení |
| **Migrovat** | `doc_type='organizacni'` → beze změny | OK |
| **Migrovat** | `doc_type='produkční'` → zůstává mimo (interní pro org/produkci) | OK |
| **Ponechat** | obsahy `documents.content`, `persons`, `runs`, `schedule_events`, `cp_scenes` | NIKDY nemazat |

Všechny migrace mají assert: `SELECT count(*) FROM documents WHERE content IS NOT NULL` před a po — musí být stejný.

## Etapy (priority)

### Etapa 0 — Příprava (1 PR)
- Zazálohovat současný stav (export tabulek `documents`, `persons`, `runs` do `*_backup_v1`).
- Založit `src/v2/` strukturu (nová UI komponentová knihovna a routing).
- Přidat feature flag `?v2=1` pro postupné testování.
- Routovat `/v2/*` na nový kód, vše ostatní beze změny.

### Etapa 1 — Admin + tvorba dokumentů (a)
Splňuje vaše priority "a" z otázky.

- **Globální shell**: levý sidebar s LARP-switcher → run-switcher (vždy viditelný kontext), na mobilu sheet menu.
- **LARP workspace**: přehled, dokumenty, postavy, CP, design.
- **Editor dokumentů — kompletní redesign**:
  - Single-page editor (ne dialog) s živým náhledem.
  - Cílení: chip selector (Všichni / Skupiny… / Konkrétní osoby…).
  - "Osobní dokument" je samostatný switch (default: vytvořeno z karty postavy → on, jinak off).
  - Odkazy na související dokumenty (interlinking) jako native funkce editoru — `@dokument` zmínka.
  - Hromadné operace: skrýt před skupinou, duplikovat, posunout do jiného běhu.
  - Drag & drop řazení s autosave.
  - Mobilní editace: full-screen modal s minimální toolbar.
- **Karta postavy**: vše o postavě na jedné stránce (medailonek, vztahy, dokumenty, scény s CP, materiály, přiřazení v bězích).
- **Migrace dat dokumentů** podle tabulky výše.

**Akceptační kritéria etapy 1:**
- Krypta 1942 je beze změny obsahu zobrazitelná v novém adminu.
- Z karty postavy se otevře každý souvisejicí dokument jedním klikem (a opačně).
- Editor funguje na mobilu (testováno na 360px).
- Žádné tlačítko v adminu není mrtvé.

### Etapa 2 — Portál hráče s magic linky a e-maily (b)
Včetně tvorby běhu, profilů hráčů a přiřazení.

- **Tvorba běhu**: 1 stránka, wizard 3 kroky (základ → postavy z katalogu → CP).
- **Přihlášky hráčů**:
  - Org přidá hráče (jméno, e-mail) → vygeneruje magic link → odešle pozvánku přes Lovable Emails.
  - Hráč klikne, portál si pamatuje token v localStorage.
  - V cockpitu běhu pre-flight: kdo má link, kdo klikl, kdo zaplatil, kdo si přečetl jaké dokumenty (track `last_seen_at` per dokument).
- **Hráčský portál (nový)**:
  - Mobile-first single-column layout.
  - Sekce: Moje postava → Dokumenty (organizační, herní osobní, herní skupinové, herní obecné) → Harmonogram → Kontakt na org → Platba.
  - Tisk přes PDF export (zachováno).
  - Vizuální identita per LARP (theme provider zůstává).
- **E-mail šablony**:
  - Per LARP: Pozvánka / Připomenutí platby / Nový dokument / D-1 reminder / Po akci.
  - WYSIWYG s proměnnými (`{{postava}}`, `{{datum}}`, `{{odkaz}}`).
  - Odesílání hromadně nebo per osoba z karty hráče.

**Akceptační kritéria etapy 2:**
- Org vytvoří běh, pozve hráče e-mailem, hráč se přes magic link dostane na svůj portál bez hesla.
- Link expiruje po nastaveném datu (+30 dnů po `run.date_to`).
- Org vidí v cockpitu kompletní pre-flight stav běhu.

### Etapa 3 — Běhový režim pro CP na mobilu (c)
Včetně vytvoření CP performerů a přiřazení.

- **CP performeři**: katalog na úrovni LARPu, přiřazení k roli per běh.
- **CP portál (mobile-first)**:
  - Velké tlačítka, čitelné na slunci, kontrastní theme.
  - "Co teď, co dál" view — aktuální scéna velkým písmem, další scéna pod ní.
  - Detail scény: lokace, props, popis, kdo s kým, ovládání "splněno".
  - Sticky bottom nav: Teď · Harmonogram · Postavy · Materiály.
- **Magic link pro CP** s scope na celý běh.

### Etapa 4 — Přepnutí
- Přesměrování `/` → nový landing.
- Stará aplikace v `legacy/*` (read-only), s upozorněním "archiv".
- Smazání mrtvého kódu po 2 týdnech provozu.

## Technické detaily

### Magic link tok
1. Org klikne "Pozvat" → backend (Edge Function `create-magic-link`) vygeneruje 32B random, uloží `sha256(token)` do `magic_links` s `valid_until = run.date_to + 30 days`.
2. Edge Function `send-transactional-email` pošle e-mail se šablonou "Pozvánka" a URL `https://app/.../:persona?t=<token>`.
3. Hráč otevře URL → frontend zavolá RPC `redeem_magic_link(token)` → backend ověří hash + expiraci, vrátí session JWT s claims `{run_id, person_id, scope:'player'}`, uloží do localStorage.
4. Všechny další volání používají JWT; RLS na `documents`, `persons`, `schedule_events` kontroluje `auth.jwt() ->> 'person_id'`.

### Refaktor doc_type
Migrace přidá nový enum `doc_category` s hodnotami `('organizacni','herni')` a sloupec `is_personal boolean`, naplní z `doc_type`, ponechá `doc_type` jako legacy sloupec do přepnutí.

### Provázanost (interlinking)
- TipTap rozšíření `@mention` typů `document`, `person`, `scene` → ukládá se jako `<a data-ref="document:uuid">…</a>`.
- Render hláška vždy klikací; pro orga navíc edit ikona vedle.

### Mobile-first checklist (CI)
- Lighthouse mobile score ≥ 90 na klíčových stránkách.
- Vizuální regrese (Playwright) na šířkách 360 / 768 / 1280.

## Co plán NEdělá
- Žádná PWA, žádný Capacitor (potvrzeno).
- Žádné globální hráčské účty (potvrzeno).
- Nemažu obsah dokumentů, postav, harmonogramu, scén.
- Nesnažím se zachovat současný design starého portálu — nová identita per LARP zůstává (theme provider), zbytek dostane nový clean shell.

## Co potřebuju od tebe před spuštěním Etapy 1
1. **Potvrzení sloučení kategorií** dokumentů na 2 (organizační + herní s flagem osobní). Nebo zachovat 3?
2. **Doménu pro odesílání e-mailů** — Lovable Emails potřebuje subdoménu (např. `notify.larpportal.lovable.app`). Stačí default Lovable doména, nebo chceš vlastní?
3. **Délka platnosti magic linku po skončení běhu** — navrhuju +30 dnů, OK?

Pokud OK se vším, jdeme do Etapy 0 a 1 v jednom PR (založení `/v2`, shell, dokumenty + migrace).
