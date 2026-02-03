-- Portál harmonogramu: token + heslo pro read-only zobrazení harmonogramu běhu
-- pgcrypto už je v DB (production_portal_access); použijeme extensions.crypt

CREATE TABLE IF NOT EXISTS public.schedule_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_portal_access_run_id ON public.schedule_portal_access(run_id);
CREATE INDEX IF NOT EXISTS idx_schedule_portal_access_token ON public.schedule_portal_access(token);

ALTER TABLE public.schedule_portal_access ENABLE ROW LEVEL SECURITY;

-- RLS: pouze vlastník běhu vidí/upravuje přístup
CREATE POLICY "Vlastník vidí schedule portal access" ON public.schedule_portal_access
    FOR SELECT USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník vytváří schedule portal access" ON public.schedule_portal_access
    FOR INSERT WITH CHECK (public.is_run_owner(run_id));

CREATE POLICY "Vlastník upravuje schedule portal access" ON public.schedule_portal_access
    FOR UPDATE USING (public.is_run_owner(run_id));

CREATE POLICY "Vlastník maže schedule portal access" ON public.schedule_portal_access
    FOR DELETE USING (public.is_run_owner(run_id));

-- Ověření přístupu: token + heslo -> vrací run_id, run_name
CREATE OR REPLACE FUNCTION public.verify_schedule_portal_access(p_token UUID, p_password TEXT)
RETURNS TABLE (
    run_id UUID,
    run_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        spa.run_id,
        r.name
    FROM public.schedule_portal_access spa
    JOIN public.runs r ON r.id = spa.run_id
    WHERE spa.token = p_token
      AND spa.password_hash = extensions.crypt(p_password, spa.password_hash)
    LIMIT 1;
END;
$$;

-- Načtení událostí harmonogramu pro portál (read-only)
CREATE OR REPLACE FUNCTION public.get_schedule_portal_events(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_result JSONB;
BEGIN
    SELECT spa.run_id INTO v_run_id
    FROM public.schedule_portal_access spa
    WHERE spa.token = p_token
    LIMIT 1;

    IF v_run_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
                'id', se.id,
                'day_number', se.day_number,
                'start_time', se.start_time,
                'duration_minutes', se.duration_minutes,
                'event_type', se.event_type,
                'title', se.title,
                'description', se.description,
                'location', se.location,
                'cp_id', se.cp_id,
                'cp_scene_id', se.cp_scene_id,
                'material_id', se.material_id,
                'document_id', se.document_id,
                'persons', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('name', p.name, 'schedule_color', p.schedule_color) ELSE NULL END,
                'cp_scenes', CASE WHEN cs.id IS NOT NULL THEN jsonb_build_object('title', cs.title) ELSE NULL END
            ) ORDER BY se.day_number, se.start_time
        )
         FROM public.schedule_events se
         LEFT JOIN public.persons p ON se.cp_id = p.id
         LEFT JOIN public.cp_scenes cs ON se.cp_scene_id = cs.id
         WHERE se.run_id = v_run_id),
        '[]'::jsonb
    ) INTO v_result;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Vytvoření přístupu k portálu harmonogramu (volá jen vlastník běhu)
CREATE OR REPLACE FUNCTION public.create_schedule_portal_access(p_run_id UUID, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID;
BEGIN
    IF NOT public.is_run_owner(p_run_id) THEN
        RETURN NULL;
    END IF;
    IF p_password IS NULL OR trim(p_password) = '' THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.schedule_portal_access (run_id, token, password_hash)
    VALUES (p_run_id, gen_random_uuid(), extensions.crypt(p_password, extensions.gen_salt('bf')))
    ON CONFLICT (run_id) DO UPDATE SET
        password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
    RETURNING token INTO v_token;
    RETURN v_token;
END;
$$;

-- Změna hesla přístupu (volá jen vlastník běhu přes run_id z access)
CREATE OR REPLACE FUNCTION public.set_schedule_portal_password(p_access_id UUID, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
BEGIN
    SELECT spa.run_id INTO v_run_id
    FROM public.schedule_portal_access spa
    WHERE spa.id = p_access_id
    LIMIT 1;
    IF v_run_id IS NULL OR NOT public.is_run_owner(v_run_id) THEN
        RETURN false;
    END IF;
    IF p_new_password IS NULL OR trim(p_new_password) = '' THEN
        RETURN false;
    END IF;
    UPDATE public.schedule_portal_access
    SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
    WHERE id = p_access_id;
    RETURN true;
END;
$$;

-- Unikátní constraint: jeden přístup na běh (ON CONFLICT (run_id) výše vyžaduje UNIQUE na run_id)
-- Už máme CREATE UNIQUE INDEX idx_schedule_portal_access_run_id

-- Granty
GRANT EXECUTE ON FUNCTION public.verify_schedule_portal_access(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_portal_events(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.create_schedule_portal_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_schedule_portal_password(UUID, TEXT) TO authenticated;
