-- =============================================================================
-- Spusť v Supabase SQL Editoru.
-- 1) Smaže duplicitní záznamy v schedule_events (stejná scéna resp. materiál
--    v jednom běhu víc než jednou) – u každé dvojice zůstane jeden záznam (s menším id).
-- 2) Vytvoří unikátní indexy (pak už duplicity nepůjdou založit).
-- =============================================================================

-- 1. Duplicity cp_scene_id: v každém běhu nech jen jeden záznam pro danou cp_scene_id (ten s nejmenším id)
DELETE FROM public.schedule_events a
USING public.schedule_events b
WHERE a.cp_scene_id IS NOT NULL
  AND a.run_id = b.run_id
  AND a.cp_scene_id = b.cp_scene_id
  AND a.id > b.id;

-- 2. Duplicity material_id: v každém běhu nech jen jeden záznam pro daný material_id (ten s nejmenším id)
DELETE FROM public.schedule_events a
USING public.schedule_events b
WHERE a.material_id IS NOT NULL
  AND a.run_id = b.run_id
  AND a.material_id = b.material_id
  AND a.id > b.id;

-- 3. Unikátní indexy (teď už nepadnou na duplicity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_events_run_cp_scene_unique
  ON public.schedule_events (run_id, cp_scene_id)
  WHERE cp_scene_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_events_run_material_unique
  ON public.schedule_events (run_id, material_id)
  WHERE material_id IS NOT NULL;
