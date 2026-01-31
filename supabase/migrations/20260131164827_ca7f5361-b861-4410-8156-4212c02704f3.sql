-- Fix create_person_with_password to use extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.create_person_with_password(
  p_larp_id uuid, 
  p_name text, 
  p_slug text, 
  p_type person_type, 
  p_password text, 
  p_group_name text DEFAULT NULL, 
  p_performer text DEFAULT NULL, 
  p_performance_times text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_person_id uuid;
BEGIN
    INSERT INTO public.persons (larp_id, name, slug, type, password_hash, group_name, performer, performance_times)
    VALUES (p_larp_id, p_name, p_slug, p_type, crypt(p_password, gen_salt('bf')), p_group_name, p_performer, p_performance_times)
    RETURNING id INTO v_person_id;
    RETURN v_person_id;
END;
$$;

-- Fix create_person_assignment_with_password similarly
CREATE OR REPLACE FUNCTION public.create_person_assignment_with_password(
  p_run_id uuid, 
  p_person_id uuid, 
  p_password text, 
  p_player_name text DEFAULT NULL, 
  p_player_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_assignment_id uuid;
BEGIN
    INSERT INTO public.run_person_assignments (run_id, person_id, password_hash, player_name, player_email)
    VALUES (p_run_id, p_person_id, crypt(p_password, gen_salt('bf')), p_player_name, p_player_email)
    RETURNING id INTO v_assignment_id;
    RETURN v_assignment_id;
END;
$$;