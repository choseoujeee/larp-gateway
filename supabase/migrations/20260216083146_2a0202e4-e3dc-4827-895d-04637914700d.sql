
-- 1. Add checklist_group column to run_checklist
ALTER TABLE public.run_checklist
ADD COLUMN IF NOT EXISTS checklist_group text NOT NULL DEFAULT 'Hlavní';

-- 2. Create RPC for passwordless production portal access
CREATE OR REPLACE FUNCTION public.create_production_portal_access_no_password(
  p_larp_id uuid,
  p_run_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
BEGIN
  -- Check ownership
  IF NOT can_access_larp(p_larp_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO production_portal_access (larp_id, run_id, password_hash)
  VALUES (p_larp_id, p_run_id, '')
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- 3. Create RPC to remove password (set empty hash)
CREATE OR REPLACE FUNCTION public.remove_production_portal_password(
  p_access_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE production_portal_access
  SET password_hash = ''
  WHERE id = p_access_id
    AND is_larp_owner(larp_id);
  RETURN FOUND;
END;
$$;

-- 4. Create RPC to check if portal has empty password (passwordless access)
CREATE OR REPLACE FUNCTION public.check_production_portal_passwordless(
  p_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Only allow passwordless if password_hash is empty
  IF v_row.password_hash IS NOT NULL AND v_row.password_hash <> '' THEN
    RETURN NULL;
  END IF;
  
  SELECT * INTO v_larp FROM larps WHERE id = v_row.larp_id;
  
  IF v_row.run_id IS NOT NULL THEN
    SELECT * INTO v_run FROM runs WHERE id = v_row.run_id;
  END IF;
  
  RETURN jsonb_build_object(
    'larp_id', v_row.larp_id,
    'larp_name', v_larp.name,
    'run_id', v_row.run_id,
    'run_name', v_run.name
  );
END;
$$;
