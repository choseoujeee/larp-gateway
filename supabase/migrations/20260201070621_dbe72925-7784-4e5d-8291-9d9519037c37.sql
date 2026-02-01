-- RPC funkce pro ověření přístupu do CP portálu
-- Ověří heslo proti libovolné CP v daném LARPu
CREATE OR REPLACE FUNCTION public.verify_cp_portal_access(p_larp_slug text, p_password text)
RETURNS TABLE (
  larp_id uuid,
  larp_name text,
  larp_theme text,
  larp_motto text,
  run_id uuid,
  run_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.theme,
    l.motto,
    r.id,
    r.name
  FROM public.larps l
  LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
  WHERE l.slug = p_larp_slug
    AND EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.larp_id = l.id 
        AND p.type = 'cp'
        AND p.password_hash = crypt(p_password, p.password_hash)
    );
END;
$$;

-- RPC funkce pro načtení scén CP pro portál
CREATE OR REPLACE FUNCTION public.get_cp_scenes_for_portal(p_person_id uuid)
RETURNS TABLE (
  id uuid,
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
  -- Získání aktivního běhu pro tuto osobu
  SELECT r.id INTO v_run_id 
  FROM public.persons p
  JOIN public.larps l ON p.larp_id = l.id
  JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
  WHERE p.id = p_person_id;
  
  RETURN QUERY
  SELECT 
    cs.id,
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