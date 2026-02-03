-- Performer v harmonogramu: volný text pro jednorázové role (pošťák, strážce…).
-- Zobrazí se v boxu harmonogramu s předností před run_person_assignments.player_name.
-- Nezakládá se entita performera – jen zobrazení.
ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS performer_text TEXT;

COMMENT ON COLUMN public.schedule_events.performer_text IS 'Volný text – jméno performera jen pro zobrazení v harmonogramu (jednorázové role). Přednost před přiřazením z run_person_assignments.';
