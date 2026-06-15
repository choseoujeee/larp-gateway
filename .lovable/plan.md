# Etapa 2 — Sekce běhu

Etapa 1 (LARP-level admin) je hotová: Dashboard, LARP Home, Dokumenty + editor, Postavy + detail, CP + detail, Organizátoři, Dřívější běhy. Zbývající stránky jsou stuby. Etapa 2 je naplní reálným obsahem.

## Co se postaví (v tomto pořadí)

### 1. Cockpit běhu — `/larp/:larpSlug/beh/:runSlug`
Hlavní rozcestník konkrétního běhu. Obsahuje:
- **Hlavička**: název běhu, termín, lokace, badge "Aktuální/Minulý/Plánovaný"
- **Klíčová čísla** (karty): počet postav / přiřazených hráčů / zaplacených, počet CP / s performerem, počet událostí v harmonogramu, % splněného checklistu
- **Rychlé akce**: tlačítka na všechny podsekce běhu (Hráči, CP, Harmonogram, Produkce)
- **Pre-flight stav**: krátký seznam "co chybí" (postavy bez hráče, CP bez performera, neuhrazené platby, chybějící materiály) — odkazy směřují přímo na řešení
- **Portálové odkazy**: tokeny produkčního a harmonogramového portálu pro tento běh (vygenerovat / zobrazit / heslo)

### 2. Hráči běhu + magic linky — `/larp/:larpSlug/beh/:runSlug/hraci`
Tabulka postav s přiřazením hráče v daném běhu (`run_person_assignments`):
- Sloupce: Postava | Skupina | Hráč (jméno + email) | Stav platby | Magic link
- Inline edit jména/emailu hráče, ruční označení "zaplaceno"
- **Hromadné akce**: pozvat vybrané hráče (Lovable Emails → magic link na portál postavy), znovu poslat pozvánku
- **Šablona pozvánky** se bere z `email_templates` (přepsatelná na úrovni LARPu)
- Filtr "nepřiřazené", "bez emailu", "nezaplaceno"

### 3. Harmonogram — `/larp/:larpSlug/beh/:runSlug/harmonogram`
Přenést grid z V1 do nové shellu:
- Grid 1 min = 4 px, dny vertikálně, popovery pro detail události
- CRUD na `schedule_events` (typy událostí, CP scéna, materiály, dokument)
- Drag & drop, kolize (warning při překryvu performera)
- Tlačítko "live mód" (omezení editace) — zachovat chování z V1

### 4. Produkce běhu + sdílená produkce
**Na úrovni LARPu** — `/larp/:larpSlug/produkce`:
- Sdílené produkční dokumenty (`documents` kde `doc_type='produkční'` a `run_id IS NULL`)
- Sdílené materiály a odkazy (`production_materials` / `production_links` bez `run_id`)
- Šablony checklistu (nová tabulka `production_checklist_templates` nebo využití existující struktury)

**Na úrovni běhu** — `/larp/:larpSlug/beh/:runSlug/produkce`:
- Checklist tohoto běhu (`run_checklist`) — odškrtávání, skupiny
- Materiály a dokumenty s `run_id = tento běh` + dědění ze sdílených
- Tlačítko "naimportovat ze šablony" pro vytvoření checklistu z LARP šablony
- Správa tokenu produkčního portálu (vytvořit / heslo / zrušit)

### 5. CP performeři — `/larp/:larpSlug/beh/:runSlug/cp`
- Tabulka CP postav s přiřazením performera pro tento běh (jméno + kontakt)
- Přiřazení k CP scénám (`cp_scenes` s `run_id`)
- Detekce kolizí performera napříč scénami
- Inline edit a kopírování ze šablon LARP-level CP

## Sdílené komponenty / utility

- `RunHeader` — hlavička s metadaty běhu (sdílí všech 5 stránek)
- `V2Shell` zůstává; aktivní stav v menu už funguje
- Hook `useRun(runSlug)` — načte běh + jeho LARP, zachytí 404
- Hook `useRunStats(runId)` — agregovaná čísla pro cockpit (jeden RPC)

## Backend (nutné nové RPC / edge funkce)

- `get_run_cockpit_stats(p_run_id)` — agregace pro cockpit kartu (postavy, hráči, CP, checklist %)
- `get_run_preflight_issues(p_run_id)` — seznam chybějících věcí
- `assign_player_to_person(p_run_id, p_person_id, p_player_name, p_player_email)` — upsert do `run_person_assignments`
- Edge funkce `send-player-invitation` — pošle magic link přes Lovable Emails (využít existující auth/transactional email infra; pokud chybí, založit)
- Existující RPC pro produkci/harmonogram (`get_production_portal_data`, `get_run_schedule`, ...) využijeme; doplníme jen owner-side mutace (`upsert_schedule_event`, `set_checklist_item`)

Všechny nové funkce: `SECURITY DEFINER`, `is_run_owner(p_run_id)` kontrola, hesla nikdy ven.

## Mimo rozsah Etapy 2 (necháváme na Etapu 3)

- Email šablony jako samostatná sekce "Komunikace" (UI pro správu + historie odeslaných)
- Přesun "Design" (vizuální identita) z archivu
- Portál stránky pro hráče/CP/produkci — fungují přes V1 routy, nepřepisujeme

## Pořadí implementace

1. `RunHeader` + `useRun` + Cockpit (čtení) — uživatel hned vidí strukturu
2. Hráči + magic linky (největší užitek)
3. Produkce běhu + sdílená produkce LARP
4. CP performeři
5. Harmonogram (port z V1 — největší kus práce, dáme na konec)

Po každém kroku zůstávají ostatní stránky stuby — appka je celou dobu použitelná.
