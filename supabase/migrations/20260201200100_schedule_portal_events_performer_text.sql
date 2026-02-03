-- Portál harmonogramu: zahrnout performer_text do RPC get_schedule_portal_events
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
                'performer_text', se.performer_text,
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
