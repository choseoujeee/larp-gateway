
DROP FUNCTION IF EXISTS public.get_production_portal_data(uuid);

CREATE FUNCTION public.get_production_portal_data(p_token uuid)
RETURNS json
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
            (SELECT jsonb_agg(jsonb_build_object('id', rc.id, 'title', rc.title, 'completed', rc.completed, 'sort_order', rc.sort_order, 'checklist_group', rc.checklist_group) ORDER BY rc.checklist_group, rc.sort_order, rc.title)
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
