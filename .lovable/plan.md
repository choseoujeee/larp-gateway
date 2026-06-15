## Cíl

V archivu V1 existuje propracovaný harmonogram (`/_archiv/admin/harmonogram` → `src/pages/admin/SchedulePage.tsx`, 1029 řádků). V novém v2 je dnes na `:larpSlug/beh/:runSlug/harmonogram` jen `V2Stub`. Postavíme plnohodnotný harmonogram v2 a převezmeme všechny funkce z V1.

## Funkce, které přebíráme z V1

- **Časová osa** — vertikální mřížka po dnech (1 min = 4 px, slot = 5 min), s popisky času, půlhodinovými a hodinovými linkami, „live" ukazatelem aktuálního času.
- **Drag & drop v gridu** — událost se chytne a pustí do jiného slotu/dne; auto-update `start_time` a `day_number`. Při tažení CP události se synchronizuje i `cp_scenes.start_time/day_number`.
- **Seznam (list) view s D&D** — alternativní pohled s přetahováním celého pořadí; po pádu se časy přepočítají od 08:00 s respektem k `duration_minutes`.
- **Lanes (vícestopé řazení)** — kolidující události se zobrazí vedle sebe (`assignLanes`).
- **Popovery na blocích** — detail s CP, lokací, performerem, popisem; akce Upravit / Scéna / Odebrat.
- **Vstupy CP (CP scény)** — pre-fill events ze seznamu `cp_scenes` daného běhu (scény ještě nezařazené do harmonogramu), s vazbou `cp_scene_id` a obousměrnou synchronizací času.
- **Vstupy dalších událostí** — pre-fill z LARP `production_materials` (typ `material`) a `documents` doc_type = `produkční` (typ `organizacni`). Také ruční typy: `programovy_blok`, `jidlo`, `presun`, `informace`, `vystoupeni_cp`, `material`, `organizacni`.
- **CRUD dialog** — den, čas, trvání, typ, název, popis (rich), místo, CP, scéna, materiál, dokument, barva CP v gridu, performer (volný text + autocomplete z minulých běhů).
- **Filtry** — fulltext, den, typ + přepínač Grid / Seznam.
- **Live mode** — „Spustit běh" zobrazí červenou linku aktuálního času + zvýrazní právě běžící blok.
- **Portal access** — vytvoření veřejného odkazu `/{larpSlug}/harmonogram/{token}` s heslem nebo bez (RPC `create_schedule_portal_access[_no_password]`, `set/remove_schedule_portal_password`). Read-only verze už existuje (`SchedulePortalPage`) a zůstává.

## Nové vs. V1

1. **Routování v2** — místo kontextů `useRunContext`/`useLarpContext` čteme `larpSlug` + `runSlug` z URL a doplníme query na `larps`/`runs` pro `larp_id` a `run_id`. Stejný vzor jako `V2RunProductionPage`.
2. **LARP úroveň harmonogramu** — `:larpSlug/harmonogram` přidat jako přehled: select běhu (jako u produkce) → render stejné komponenty s vybraným `run_id`. Sdílené pre-fill zdroje (materiály, produkční dokumenty) zůstávají LARP-scoped.
3. **Layout** — použít `V2Shell` + `RunHeader` (pro běh) / standardní LARP header.

## Soubory

Nové:
- `src/v2/pages/V2RunSchedulePage.tsx` — harmonogram konkrétního běhu (port z V1 SchedulePage s v2 routováním).
- `src/v2/pages/V2LarpSchedulePage.tsx` — wrapper s výběrem běhu (analogie `V2LarpProductionPage`).
- `src/v2/components/schedule/ScheduleEventDialog.tsx` — vytažený create/edit dialog (rozdělení 1000řádkového souboru pro čitelnost).
- `src/v2/components/schedule/SchedulePortalAccessBar.tsx` — vytažený portal access bar.

Znovupoužito beze změny:
- `src/components/schedule/*` (ScheduleGridDay, AdminScheduleEventBox, GridSlotDroppable, konstanty, typy, utils) — komponenty jsou prezentační, fungují i v v2.
- `src/lib/scheduleGridUtils.ts` (assignLanes, timeToMinutes).
- `src/components/admin/CpSceneDialog.tsx` pro editaci scény z popoveru.

Upravené:
- `src/v2/V2Routes.tsx` — `/:larpSlug/beh/:runSlug/harmonogram` → `V2RunSchedulePage`; přidat `/:larpSlug/harmonogram` → `V2LarpSchedulePage`.
- `src/v2/pages/V2LarpHome.tsx` + případně `V2RunCockpit.tsx` / navigaci — odkaz na nový harmonogram (pokud chybí).

## Datový model

Beze změn — používáme existující tabulky `schedule_events`, `cp_scenes`, `production_materials`, `documents`, `persons`, `run_person_assignments`, `schedule_portal_access` a stávající RPC funkce.

## Postup implementace

1. Vytvořit `V2RunSchedulePage.tsx` portem `SchedulePage.tsx` — nahradit `AdminLayout` za v2 shell, `useRunContext`/`useLarpContext` za URL params + ad-hoc fetche `larp_id`/`run_id`/`larp.slug`.
2. Vytáhnout dialog a portal-bar do vlastních komponent (zachovat chování 1:1).
3. Vytvořit `V2LarpSchedulePage.tsx` s `Select` běhu (vzor `V2LarpProductionPage`).
4. Přidat obě routy do `V2Routes.tsx`.
5. Propojit z V2 navigace (LARP home → „Harmonogram", běh cockpit → „Harmonogram"), pokud odkaz chybí.
6. Smoke-test: otevřít stránku, přidat událost, drag & drop v gridu, list-mode reorder, vstup CP scény, materiálu, dokumentu, live mode, portal odkaz.

## Mimo rozsah

- Read-only portal stránka `SchedulePortalPage` zůstává beze změn.
- Žádné DB migrace.
