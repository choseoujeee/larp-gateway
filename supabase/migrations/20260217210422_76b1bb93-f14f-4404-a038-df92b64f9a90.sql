-- Drop both functions first
DROP FUNCTION IF EXISTS public.check_production_portal_passwordless(uuid);

-- Recreate with larp_slug included (returns json)
CREATE FUNCTION public.check_production_portal_passwordless(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row production_portal_access%ROWTYPE;
  v_larp larps%ROWTYPE;
  v_run runs%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM production_portal_access WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  IF v_row.password_hash IS NOT NULL AND v_row.password_hash <> '' THEN
    RETURN NULL;
  END IF;
  
  SELECT * INTO v_larp FROM larps WHERE id = v_row.larp_id;
  
  IF v_row.run_id IS NOT NULL THEN
    SELECT * INTO v_run FROM runs WHERE id = v_row.run_id;
  END IF;
  
  RETURN json_build_object(
    'larp_id', v_row.larp_id,
    'larp_name', v_larp.name,
    'larp_slug', v_larp.slug,
    'run_id', v_row.run_id,
    'run_name', v_run.name
  );
END;
$$;