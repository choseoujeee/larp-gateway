-- Název scény a předherní scény (nehlídá se kolize času)
ALTER TABLE public.cp_scenes
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_preherni BOOLEAN NOT NULL DEFAULT false;

-- get_cp_scenes_for_portal: přidat title do výstupu
DROP FUNCTION IF EXISTS public.get_cp_scenes_for_portal(uuid);

CREATE OR REPLACE FUNCTION public.get_cp_scenes_for_portal(p_person_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  day_number integer,
  start_time time,
  duration_minutes integer,
  location text,
  props text,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  SELECT r.id INTO v_run_id
  FROM public.persons p
  JOIN public.larps l ON p.larp_id = l.id
  JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
  WHERE p.id = p_person_id;

  RETURN QUERY
  SELECT
    cs.id,
    cs.title,
    cs.day_number,
    cs.start_time,
    cs.duration_minutes,
    cs.location,
    cs.props,
    cs.description
  FROM public.cp_scenes cs
  WHERE cs.cp_id = p_person_id
    AND cs.run_id = v_run_id
  ORDER BY cs.day_number, cs.start_time;
END;
$$;
