-- Přístup k produkčnímu portálu: token + heslo pro „ruce organizace“ (bez přístupu do adminu)
-- pgcrypto je potřeba pro crypt() a gen_salt() při hashování hesel
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.production_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    larp_id UUID NOT NULL REFERENCES public.larps(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.runs(id) ON DELETE CASCADE,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_portal_access_token ON public.production_portal_access(token);
CREATE INDEX IF NOT EXISTS idx_production_portal_access_larp_id ON public.production_portal_access(larp_id);

ALTER TABLE public.production_portal_access ENABLE ROW LEVEL SECURITY;

-- RLS: pouze vlastník LARPu vidí/upravuje přístupy
CREATE POLICY "Vlastník vidí production portal access" ON public.production_portal_access
    FOR SELECT USING (public.is_larp_owner(larp_id));

CREATE POLICY "Vlastník vytváří production portal access" ON public.production_portal_access
    FOR INSERT WITH CHECK (public.is_larp_owner(larp_id));

CREATE POLICY "Vlastník upravuje production portal access" ON public.production_portal_access
    FOR UPDATE USING (public.is_larp_owner(larp_id));

CREATE POLICY "Vlastník maže production portal access" ON public.production_portal_access
    FOR DELETE USING (public.is_larp_owner(larp_id));

-- Ověření přístupu: token + heslo -> vrací session (larp_id, run_id, run_name, larp_name)
CREATE OR REPLACE FUNCTION public.verify_production_portal_access(p_token UUID, p_password TEXT)
RETURNS TABLE (
    larp_id UUID,
    larp_name TEXT,
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
        ppa.larp_id,
        l.name,
        ppa.run_id,
        r.name
    FROM public.production_portal_access ppa
    JOIN public.larps l ON l.id = ppa.larp_id
    LEFT JOIN public.runs r ON r.id = ppa.run_id
    WHERE ppa.token = p_token
      AND ppa.password_hash = extensions.crypt(p_password, ppa.password_hash)
    LIMIT 1;
END;
$$;

-- Načtení dat pro produkční portál: jeden řádek JSON s documents, materials, checklist
CREATE OR REPLACE FUNCTION public.get_production_portal_data(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_larp_id UUID;
    v_run_id UUID;
    v_docs JSONB;
    v_mats JSONB;
    v_check JSONB;
BEGIN
    SELECT ppa.larp_id, ppa.run_id INTO v_larp_id, v_run_id
    FROM public.production_portal_access ppa
    WHERE ppa.token = p_token
    LIMIT 1;

    IF v_larp_id IS NULL THEN
        RETURN json_build_object('documents', '[]'::jsonb, 'materials', '[]'::jsonb, 'checklist', '[]'::jsonb);
    END IF;

    SELECT COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title, 'content', d.content, 'run_id', d.run_id) ORDER BY d.sort_order, d.title)
         FROM public.documents d
         WHERE d.larp_id = v_larp_id
           AND d.doc_type = 'produkční'
           AND (v_run_id IS NULL OR d.run_id IS NULL OR d.run_id = v_run_id)),
        '[]'::jsonb
    ) INTO v_docs;

    SELECT COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', pm.id, 'material_type', pm.material_type, 'title', pm.title, 'url', pm.url, 'note', pm.note, 'sort_order', pm.sort_order) ORDER BY pm.sort_order, pm.title)
         FROM public.production_materials pm
         WHERE pm.larp_id = v_larp_id
           AND (v_run_id IS NULL OR pm.run_id IS NULL OR pm.run_id = v_run_id)),
        '[]'::jsonb
    ) INTO v_mats;

    IF v_run_id IS NOT NULL THEN
        SELECT COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('id', rc.id, 'title', rc.title, 'completed', rc.completed, 'sort_order', rc.sort_order) ORDER BY rc.sort_order, rc.title)
             FROM public.run_checklist rc
             WHERE rc.run_id = v_run_id),
            '[]'::jsonb
        ) INTO v_check;
    ELSE
        v_check := '[]'::jsonb;
    END IF;

    RETURN json_build_object('documents', COALESCE(v_docs, '[]'::jsonb), 'materials', COALESCE(v_mats, '[]'::jsonb), 'checklist', COALESCE(v_check, '[]'::jsonb));
END;
$$;

-- Nastavení zaškrtnutí položky checklistu z portálu (ověří token a run)
CREATE OR REPLACE FUNCTION public.set_checklist_item_completed(p_token UUID, p_item_id UUID, p_completed BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_item_run_id UUID;
BEGIN
    SELECT ppa.run_id INTO v_run_id
    FROM public.production_portal_access ppa
    WHERE ppa.token = p_token
    LIMIT 1;

    IF v_run_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT rc.run_id INTO v_item_run_id
    FROM public.run_checklist rc
    WHERE rc.id = p_item_id
    LIMIT 1;

    IF v_item_run_id IS NULL OR v_item_run_id != v_run_id THEN
        RETURN false;
    END IF;

    UPDATE public.run_checklist
    SET completed = p_completed
    WHERE id = p_item_id;

    RETURN true;
END;
$$;

-- Vytvoření přístupu k produkčnímu portálu (volá jen vlastník LARPu; heslo se zahashuje)
CREATE OR REPLACE FUNCTION public.create_production_portal_access(p_larp_id UUID, p_run_id UUID, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID;
BEGIN
    IF NOT public.is_larp_owner(p_larp_id) THEN
        RETURN NULL;
    END IF;
    IF p_password IS NULL OR trim(p_password) = '' THEN
        RETURN NULL;
    END IF;
    v_token := gen_random_uuid();
    INSERT INTO public.production_portal_access (larp_id, run_id, token, password_hash)
    VALUES (p_larp_id, p_run_id, v_token, extensions.crypt(p_password, extensions.gen_salt('bf')));
    RETURN v_token;
END;
$$;

-- Změna hesla přístupu (volá jen vlastník LARPu)
CREATE OR REPLACE FUNCTION public.set_production_portal_password(p_access_id UUID, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_larp_id UUID;
BEGIN
    SELECT ppa.larp_id INTO v_larp_id
    FROM public.production_portal_access ppa
    WHERE ppa.id = p_access_id
    LIMIT 1;
    IF v_larp_id IS NULL OR NOT public.is_larp_owner(v_larp_id) THEN
        RETURN false;
    END IF;
    IF p_new_password IS NULL OR trim(p_new_password) = '' THEN
        RETURN false;
    END IF;
    UPDATE public.production_portal_access
    SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
    WHERE id = p_access_id;
    RETURN true;
END;
$$;

-- Volání z adminu (přihlášený uživatel)
GRANT EXECUTE ON FUNCTION public.create_production_portal_access(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_production_portal_password(UUID, TEXT) TO authenticated;

-- Volání z produkčního portálu (bez přihlášení, jen token)
GRANT EXECUTE ON FUNCTION public.verify_production_portal_access(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_production_portal_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.set_checklist_item_completed(UUID, UUID, BOOLEAN) TO anon;
