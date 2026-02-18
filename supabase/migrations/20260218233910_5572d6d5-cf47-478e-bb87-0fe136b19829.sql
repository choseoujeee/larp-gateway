
-- RPC: Create schedule portal access without password
CREATE OR REPLACE FUNCTION public.create_schedule_portal_access_no_password(p_run_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_token UUID;
BEGIN
    IF NOT public.is_run_owner(p_run_id) THEN RETURN NULL; END IF;
    INSERT INTO public.schedule_portal_access (run_id, token, password_hash)
    VALUES (p_run_id, gen_random_uuid(), '')
    ON CONFLICT (run_id) DO UPDATE SET password_hash = ''
    RETURNING token INTO v_token;
    RETURN v_token;
END;
$function$;

-- RPC: Remove schedule portal password (set to empty)
CREATE OR REPLACE FUNCTION public.remove_schedule_portal_password(p_access_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_run_id UUID;
BEGIN
    SELECT spa.run_id INTO v_run_id FROM public.schedule_portal_access spa WHERE spa.id = p_access_id LIMIT 1;
    IF v_run_id IS NULL OR NOT public.is_run_owner(v_run_id) THEN RETURN false; END IF;
    UPDATE public.schedule_portal_access SET password_hash = '' WHERE id = p_access_id;
    RETURN true;
END;
$function$;

-- RPC: Check schedule portal passwordless access
CREATE OR REPLACE FUNCTION public.check_schedule_portal_passwordless(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row schedule_portal_access%ROWTYPE;
  v_run runs%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM schedule_portal_access WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_row.password_hash IS NOT NULL AND v_row.password_hash <> '' THEN RETURN NULL; END IF;
  SELECT * INTO v_run FROM runs WHERE id = v_row.run_id;
  RETURN json_build_object('run_id', v_row.run_id, 'run_name', v_run.name);
END;
$function$;
