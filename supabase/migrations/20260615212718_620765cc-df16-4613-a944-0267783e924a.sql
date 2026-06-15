
-- 1. persons.email
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS email text;

-- 2. email_log_v2.metadata
ALTER TABLE public.email_log_v2 ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.email_log_v2 ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE INDEX IF NOT EXISTS email_log_v2_idem_key_idx ON public.email_log_v2(idempotency_key);
CREATE INDEX IF NOT EXISTS email_log_v2_run_id_idx ON public.email_log_v2(run_id, created_at DESC);

-- 3. RPC: create magic link (returns plain token once)
CREATE OR REPLACE FUNCTION public.create_run_magic_link(
  p_run_id uuid,
  p_person_id uuid,
  p_scope text DEFAULT 'player',
  p_ttl_days integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
  v_hash text;
BEGIN
  IF NOT public.is_run_owner(p_run_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  INSERT INTO public.magic_links (run_id, person_id, scope, token_hash, valid_until, created_by)
  VALUES (p_run_id, p_person_id, p_scope, v_hash, now() + (p_ttl_days || ' days')::interval, auth.uid());
  RETURN v_token;
END;
$$;

-- 4. RPC: consume magic link
CREATE OR REPLACE FUNCTION public.consume_magic_link(p_token text)
RETURNS TABLE(person_id uuid, person_slug text, larp_slug text, run_id uuid, scope text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_link magic_links%ROWTYPE;
BEGIN
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  SELECT * INTO v_link FROM public.magic_links
   WHERE token_hash = v_hash
     AND revoked_at IS NULL
     AND valid_from <= now()
     AND valid_until >= now()
   LIMIT 1;
  IF v_link.id IS NULL THEN RETURN; END IF;
  UPDATE public.magic_links SET last_used_at = now() WHERE id = v_link.id;
  RETURN QUERY
  SELECT p.id, p.slug, l.slug, v_link.run_id, v_link.scope
    FROM public.persons p
    JOIN public.larps l ON l.id = p.larp_id
   WHERE p.id = v_link.person_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_run_magic_link(uuid, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_magic_link(text) TO anon, authenticated;
