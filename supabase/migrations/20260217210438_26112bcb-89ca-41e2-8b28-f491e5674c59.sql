DROP FUNCTION IF EXISTS public.verify_production_portal_access(uuid, text);

CREATE FUNCTION public.verify_production_portal_access(p_token uuid, p_password text)
RETURNS TABLE(larp_id uuid, larp_name text, larp_slug text, run_id uuid, run_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ppa.larp_id, l.name, l.slug, ppa.run_id, r.name
    FROM public.production_portal_access ppa
    JOIN public.larps l ON l.id = ppa.larp_id
    LEFT JOIN public.runs r ON r.id = ppa.run_id
    WHERE ppa.token = p_token
      AND ppa.password_hash = extensions.crypt(p_password, ppa.password_hash)
    LIMIT 1;
END;
$$;