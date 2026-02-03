-- Unikátnost: žádná scéna ani materiál nesmí být v jednom běhu přiřazena v harmonogramu víc než jednou.
-- Parciální unikátní indexy: jen řádky s vyplněným cp_scene_id resp. material_id.

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_events_run_cp_scene_unique
  ON public.schedule_events (run_id, cp_scene_id)
  WHERE cp_scene_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_events_run_material_unique
  ON public.schedule_events (run_id, material_id)
  WHERE material_id IS NOT NULL;
