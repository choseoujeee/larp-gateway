
-- 1. Backupy
CREATE TABLE public.cp_scenes_backup_v2 AS TABLE public.cp_scenes;
CREATE TABLE public.schedule_events_backup_v2 AS TABLE public.schedule_events;

-- 2. cp_scenes: přidat larp_id, backfill, drop run_id
ALTER TABLE public.cp_scenes ADD COLUMN larp_id uuid REFERENCES public.larps(id) ON DELETE CASCADE;
UPDATE public.cp_scenes cs SET larp_id = r.larp_id FROM public.runs r WHERE r.id = cs.run_id;
ALTER TABLE public.cp_scenes ALTER COLUMN larp_id SET NOT NULL;

-- Drop staré politiky
DROP POLICY IF EXISTS "cps_delete" ON public.cp_scenes;
DROP POLICY IF EXISTS "cps_insert" ON public.cp_scenes;
DROP POLICY IF EXISTS "cps_select" ON public.cp_scenes;
DROP POLICY IF EXISTS "cps_update" ON public.cp_scenes;

ALTER TABLE public.cp_scenes DROP COLUMN run_id;

CREATE POLICY "cps_select" ON public.cp_scenes FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'cp'));
CREATE POLICY "cps_insert" ON public.cp_scenes FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'cp'));
CREATE POLICY "cps_update" ON public.cp_scenes FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'cp')) WITH CHECK (public.can_edit_larp_section(larp_id, 'cp'));
CREATE POLICY "cps_delete" ON public.cp_scenes FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'cp'));

-- 3. schedule_events: přidat larp_id, backfill
ALTER TABLE public.schedule_events ADD COLUMN larp_id uuid REFERENCES public.larps(id) ON DELETE CASCADE;
UPDATE public.schedule_events se SET larp_id = r.larp_id FROM public.runs r WHERE r.id = se.run_id;

-- Drop staré unique indexy (obsahují run_id)
DROP INDEX IF EXISTS public.idx_schedule_events_run_cp_scene_unique;
DROP INDEX IF EXISTS public.idx_schedule_events_run_material_unique;

-- Deduplikace: zachovat záznam z aktivnějšího (=novějšího) běhu pro každou kombinaci
-- pravidlo 1: stejný (larp_id, cp_scene_id)
DELETE FROM public.schedule_events se
WHERE cp_scene_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.schedule_events se2
    JOIN public.runs r2 ON r2.id = se2.run_id
    JOIN public.runs r1 ON r1.id = se.run_id
    WHERE se2.id <> se.id
      AND se2.larp_id = se.larp_id
      AND se2.cp_scene_id = se.cp_scene_id
      AND (r2.is_active, r2.created_at) > (r1.is_active, r1.created_at)
  );

-- pravidlo 2: stejný (larp_id, material_id)
DELETE FROM public.schedule_events se
WHERE material_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.schedule_events se2
    JOIN public.runs r2 ON r2.id = se2.run_id
    JOIN public.runs r1 ON r1.id = se.run_id
    WHERE se2.id <> se.id
      AND se2.larp_id = se.larp_id
      AND se2.material_id = se.material_id
      AND (r2.is_active, r2.created_at) > (r1.is_active, r1.created_at)
  );

-- pravidlo 3: stejný (larp_id, day_number, start_time, title) bez vazby
DELETE FROM public.schedule_events se
WHERE cp_scene_id IS NULL AND material_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.schedule_events se2
    JOIN public.runs r2 ON r2.id = se2.run_id
    JOIN public.runs r1 ON r1.id = se.run_id
    WHERE se2.id <> se.id
      AND se2.larp_id = se.larp_id
      AND se2.day_number = se.day_number
      AND se2.start_time = se.start_time
      AND se2.title = se.title
      AND se2.cp_scene_id IS NULL AND se2.material_id IS NULL
      AND (r2.is_active, r2.created_at) > (r1.is_active, r1.created_at)
  );

ALTER TABLE public.schedule_events ALTER COLUMN larp_id SET NOT NULL;

-- Drop staré politiky
DROP POLICY IF EXISTS "Vlastník maže harmonogram" ON public.schedule_events;
DROP POLICY IF EXISTS "Vlastník upravuje harmonogram" ON public.schedule_events;
DROP POLICY IF EXISTS "Vlastník vidí harmonogram" ON public.schedule_events;
DROP POLICY IF EXISTS "Vlastník vytváří harmonogram" ON public.schedule_events;
DROP POLICY IF EXISTS "se_delete" ON public.schedule_events;
DROP POLICY IF EXISTS "se_insert" ON public.schedule_events;
DROP POLICY IF EXISTS "se_select" ON public.schedule_events;
DROP POLICY IF EXISTS "se_update" ON public.schedule_events;

ALTER TABLE public.schedule_events DROP COLUMN run_id;

-- nové unique indexy bez run_id
CREATE UNIQUE INDEX idx_schedule_events_larp_cp_scene_unique ON public.schedule_events (larp_id, cp_scene_id) WHERE cp_scene_id IS NOT NULL;
CREATE UNIQUE INDEX idx_schedule_events_larp_material_unique ON public.schedule_events (larp_id, material_id) WHERE material_id IS NOT NULL;

CREATE POLICY "se_select" ON public.schedule_events FOR SELECT TO authenticated USING (public.can_view_larp_section(larp_id, 'schedule'));
CREATE POLICY "se_insert" ON public.schedule_events FOR INSERT TO authenticated WITH CHECK (public.can_edit_larp_section(larp_id, 'schedule'));
CREATE POLICY "se_update" ON public.schedule_events FOR UPDATE TO authenticated USING (public.can_edit_larp_section(larp_id, 'schedule')) WITH CHECK (public.can_edit_larp_section(larp_id, 'schedule'));
CREATE POLICY "se_delete" ON public.schedule_events FOR DELETE TO authenticated USING (public.can_edit_larp_section(larp_id, 'schedule'));

-- 4. Update RPC funkcí

CREATE OR REPLACE FUNCTION public.get_schedule_portal_events(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_larp_id UUID;
    v_result JSONB;
BEGIN
    SELECT r.larp_id INTO v_larp_id
    FROM public.schedule_portal_access spa
    JOIN public.runs r ON r.id = spa.run_id
    WHERE spa.token = p_token
    LIMIT 1;

    IF v_larp_id IS NULL THEN
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
         WHERE se.larp_id = v_larp_id),
        '[]'::jsonb
    ) INTO v_result;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cp_scenes_for_portal(p_person_id uuid)
 RETURNS TABLE(id uuid, day_number integer, start_time time without time zone, duration_minutes integer, location text, props text, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_larp_id uuid;
BEGIN
  SELECT p.larp_id INTO v_larp_id FROM public.persons p WHERE p.id = p_person_id;
  RETURN QUERY
  SELECT cs.id, cs.day_number, cs.start_time, cs.duration_minutes, cs.location, cs.props, cs.description
  FROM public.cp_scenes cs
  WHERE cs.cp_id = p_person_id AND cs.larp_id = v_larp_id
  ORDER BY cs.day_number, cs.start_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cp_portal_full_data(p_larp_id uuid, p_run_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'cp_persons', (
      SELECT COALESCE(json_agg(row_to_json(cp) ORDER BY cp.name), '[]'::json)
      FROM (SELECT id, name, slug, performer, performance_times FROM persons WHERE larp_id = p_larp_id AND type = 'cp') cp
    ),
    'player_persons', (
      SELECT COALESCE(json_agg(row_to_json(pl) ORDER BY pl.name), '[]'::json)
      FROM (SELECT id, name, slug, group_name FROM persons WHERE larp_id = p_larp_id AND type = 'postava') pl
    ),
    'cp_documents', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.priority, d.sort_order), '[]'::json)
      FROM (
        SELECT id, title, content, doc_type, target_type, sort_order, priority
        FROM documents
        WHERE larp_id = p_larp_id AND doc_type <> 'produkční'
          AND EXISTS (SELECT 1 FROM unnest(audience) a WHERE a LIKE 'cp:%')
          AND NOT EXISTS (SELECT 1 FROM unnest(audience) a WHERE a LIKE 'players:%')
      ) d
    ),
    'cp_documents_only', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.priority, d.sort_order), '[]'::json)
      FROM (
        SELECT id, title, content, doc_type, target_type, sort_order, priority
        FROM documents
        WHERE larp_id = p_larp_id AND doc_type <> 'produkční'
          AND EXISTS (SELECT 1 FROM unnest(audience) a WHERE a LIKE 'cp:%')
          AND NOT EXISTS (SELECT 1 FROM unnest(audience) a WHERE a LIKE 'players:%')
      ) d
    ),
    'cp_documents_shared', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.priority, d.sort_order), '[]'::json)
      FROM (
        SELECT id, title, content, doc_type, target_type, sort_order, priority
        FROM documents
        WHERE larp_id = p_larp_id AND doc_type <> 'produkční'
          AND EXISTS (SELECT 1 FROM unnest(audience) a WHERE a LIKE 'cp:%')
          AND EXISTS (SELECT 1 FROM unnest(audience) a WHERE a LIKE 'players:%')
      ) d
    ),
    'cp_scenes', (
      SELECT COALESCE(json_agg(row_to_json(s) ORDER BY s.day_number, s.start_time), '[]'::json)
      FROM (SELECT cs.id, cs.cp_id, cs.day_number, cs.start_time, cs.title, cs.duration_minutes, cs.location, cs.description, cs.props
            FROM cp_scenes cs WHERE cs.larp_id = p_larp_id) s
    ),
    'larp_footer_text', (SELECT footer_text FROM larps WHERE id = p_larp_id)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_run_schedule(p_run_id uuid)
 RETURNS TABLE(id uuid, day_number integer, start_time time without time zone, duration_minutes integer, event_type event_type, title text, description text, location text, cp_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_larp_id uuid;
BEGIN
    SELECT larp_id INTO v_larp_id FROM public.runs WHERE id = p_run_id;
    RETURN QUERY
    SELECT se.id, se.day_number, se.start_time, se.duration_minutes, se.event_type, se.title, se.description, se.location, p.name
    FROM public.schedule_events se
    LEFT JOIN public.persons p ON se.cp_id = p.id
    WHERE se.larp_id = v_larp_id
    ORDER BY se.day_number, se.start_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_run_cockpit_stats(p_run_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_larp_id uuid;
  v_persons int;
  v_assigned int;
  v_paid int;
  v_cp int;
  v_cp_with_perf int;
  v_events int;
  v_checklist_total int;
  v_checklist_done int;
BEGIN
  SELECT larp_id INTO v_larp_id FROM runs WHERE id = p_run_id;
  IF v_larp_id IS NULL THEN RETURN NULL; END IF;
  IF NOT is_run_owner(p_run_id) THEN RETURN NULL; END IF;

  SELECT count(*) INTO v_persons FROM persons WHERE larp_id = v_larp_id AND type = 'postava';
  SELECT count(*) INTO v_cp FROM persons WHERE larp_id = v_larp_id AND type = 'cp';
  SELECT count(*) INTO v_cp_with_perf FROM persons WHERE larp_id = v_larp_id AND type = 'cp' AND performer IS NOT NULL AND trim(performer) <> '';

  SELECT count(*) INTO v_assigned FROM run_person_assignments WHERE run_id = p_run_id;
  SELECT count(*) INTO v_paid FROM run_person_assignments WHERE run_id = p_run_id AND paid_at IS NOT NULL;
  SELECT count(*) INTO v_events FROM schedule_events WHERE larp_id = v_larp_id;
  SELECT count(*) INTO v_checklist_total FROM run_checklist WHERE run_id = p_run_id;
  SELECT count(*) INTO v_checklist_done FROM run_checklist WHERE run_id = p_run_id AND completed = true;

  RETURN json_build_object(
    'persons', v_persons,
    'assigned', v_assigned,
    'paid', v_paid,
    'cp', v_cp,
    'cp_with_performer', v_cp_with_perf,
    'events', v_events,
    'checklist_total', v_checklist_total,
    'checklist_done', v_checklist_done
  );
END;
$function$;
