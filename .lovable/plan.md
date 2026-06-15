## Co se mění

CP scény i položky harmonogramu se přesunou z úrovně **Běh (Run)** na úroveň **LARP**. Jeden zdroj pravdy pro celý larp — úprava scény nebo bodu programu se okamžitě projeví ve všech bězích.

## Datová migrace

`cp_scenes` a `schedule_events` dostanou sloupec `larp_id` a ztratí `run_id`.

- **cp_scenes:** všech 62 záznamů patří k běhu 9 → backfill `larp_id` z toho běhu, zrušení `run_id`.
- **schedule_events:** 64 záznamů ve 2 bězích. Backfill `larp_id`. Protože sloupec `run_id` zmizí, **deduplikujeme** podle `(larp_id, cp_scene_id)` / `(larp_id, material_id)` / `(larp_id, day_number, start_time, title)` — z duplikátů zachováme záznam z aktivního běhu, ostatní smažeme. Ručně si můžeš ověřit, jestli něco nezahodit nechceš (viz technické detaily).
- RLS politiky obou tabulek se přepnou na `can_view/edit_larp_section('schedule')` resp. `('cp')`.
- Aktualizují se RPC, které filtrují přes `run_id`: `get_schedule_portal_events`, `get_cp_scenes_for_portal`, `get_cp_portal_full_data`, `get_run_schedule`, `get_run_cockpit_stats`, `get_production_portal_data` — všechny budou filtrovat přes `larp_id` daného běhu.
- `schedule_portal_access` zůstává per-run (token vázaný na běh), ale data čte přes larp.

## Změny v kódu

- `V2RunSchedulePage.tsx` — všechny dotazy a inserty na `schedule_events` / `cp_scenes` budou používat `larp_id` místo `run_id`. UI zůstává v rámci „běhu", ale data jsou společná.
- `CpScenesSection.tsx` — načítání scén podle `larp_id`.
- `V2RunCpPage.tsx` — netýká se (pracuje s `cp_performers`, který zůstává per-run).
- `get_run_cockpit_stats` — počet eventů se počítá přes larp.
- Aktualizace memory: harmonogram a CP scény přesunuty do LARP-global vrstvy.

## Co zůstává per-běh

- `cp_performers` (kdo hraje kterou CP v daném běhu)
- `run_person_assignments` (přiřazení hráčů)
- `run_checklist`, `schedule_portal_access`, `payment_*`, `runs`

## Technické detaily

```text
cp_scenes:        ADD larp_id uuid → backfill z runs.larp_id → NOT NULL → DROP run_id
schedule_events:  ADD larp_id uuid → backfill → dedupe → NOT NULL → DROP run_id
```

Deduplikační pravidlo pro `schedule_events`:
1. Pokud mají dva řádky stejný `(larp_id, cp_scene_id)` se shodným cp_scene_id ≠ null → zachovat z aktivního běhu.
2. Stejně pro `material_id`.
3. Pro ručně vytvořené eventy bez vazby porovnat `(larp_id, day_number, start_time, title)`.

Po migraci se přegenerují Supabase typy a kód se upraví v jednom commitu.

## Riziko a rollback

Před migrací udělám `cp_scenes_backup_v2` a `schedule_events_backup_v2` kopie. Pokud bude potřeba se vrátit, data jsou k dispozici.