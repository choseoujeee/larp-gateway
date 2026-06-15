
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS audience text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_documents_audience ON public.documents USING GIN (audience);

DO $$
DECLARE
  d RECORD;
  tags text[];
  pid uuid;
  gname text;
  ptype person_type;
  is_cp_group bool;
BEGIN
  FOR d IN SELECT * FROM public.documents LOOP
    tags := ARRAY[]::text[];

    IF d.target_type = 'vsichni' THEN
      tags := array_append(tags, 'players:all');
      IF COALESCE(d.visible_to_cp,false) THEN
        tags := array_append(tags, 'cp:all');
      END IF;
    ELSIF d.target_type = 'skupina' AND d.target_group IS NOT NULL THEN
      IF d.target_group = 'CP' THEN
        tags := array_append(tags, 'cp:all');
      ELSE
        SELECT bool_and(type='cp') INTO is_cp_group
          FROM public.persons WHERE larp_id=d.larp_id AND group_name=d.target_group;
        IF is_cp_group IS TRUE THEN
          tags := array_append(tags, 'cp:all');
        ELSE
          tags := array_append(tags, 'players:group:'||d.target_group);
        END IF;
      END IF;
    ELSIF d.target_type = 'osoba' AND d.target_person_id IS NOT NULL THEN
      SELECT type INTO ptype FROM public.persons WHERE id = d.target_person_id;
      IF ptype = 'cp' THEN
        tags := array_append(tags, 'cp:person:'||d.target_person_id::text);
      ELSIF ptype IS NOT NULL THEN
        tags := array_append(tags, 'players:person:'||d.target_person_id::text);
      END IF;
    END IF;

    IF d.extra_target_person_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY d.extra_target_person_ids LOOP
        SELECT type INTO ptype FROM public.persons WHERE id = pid;
        IF ptype = 'cp' THEN
          tags := array_append(tags, 'cp:person:'||pid::text);
        ELSIF ptype IS NOT NULL THEN
          tags := array_append(tags, 'players:person:'||pid::text);
        END IF;
      END LOOP;
    END IF;

    IF d.extra_target_group_names IS NOT NULL THEN
      FOREACH gname IN ARRAY d.extra_target_group_names LOOP
        IF gname = 'CP' THEN
          tags := array_append(tags, 'cp:all');
        ELSE
          SELECT bool_and(type='cp') INTO is_cp_group
            FROM public.persons WHERE larp_id=d.larp_id AND group_name=gname;
          IF is_cp_group IS TRUE THEN
            tags := array_append(tags, 'cp:all');
          ELSE
            tags := array_append(tags, 'players:group:'||gname);
          END IF;
        END IF;
      END LOOP;
    END IF;

    SELECT ARRAY(SELECT DISTINCT unnest(tags)) INTO tags;
    UPDATE public.documents SET audience = tags WHERE id = d.id;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.get_person_documents(uuid);

CREATE OR REPLACE FUNCTION public.get_person_documents(p_person_id uuid)
 RETURNS TABLE(id uuid, title text, content text, doc_type document_type, target_type document_target, sort_order integer, priority integer, is_shared boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_larp_id UUID;
    v_group_name TEXT;
    v_person_type person_type;
    v_run_date_from DATE;
    v_my_tags text[];
    v_other_prefix text;
BEGIN
    SELECT larp_id, group_name, type INTO v_larp_id, v_group_name, v_person_type FROM public.persons WHERE persons.id = p_person_id;
    SELECT date_from INTO v_run_date_from FROM public.runs WHERE larp_id = v_larp_id AND is_active = true LIMIT 1;

    IF v_person_type = 'cp' THEN
      v_my_tags := ARRAY['cp:all', 'cp:person:'||p_person_id::text];
      v_other_prefix := 'players:';
    ELSE
      v_my_tags := ARRAY['players:all', 'players:person:'||p_person_id::text];
      IF v_group_name IS NOT NULL THEN
        v_my_tags := array_append(v_my_tags, 'players:group:'||v_group_name);
      END IF;
      v_other_prefix := 'cp:';
    END IF;

    RETURN QUERY
    SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order, d.priority,
      EXISTS (SELECT 1 FROM unnest(d.audience) a WHERE a LIKE v_other_prefix||'%') AS is_shared
    FROM public.documents d
    WHERE d.larp_id = v_larp_id
      AND d.doc_type <> 'produkční'
      AND d.audience && v_my_tags
      AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
      AND NOT EXISTS (SELECT 1 FROM public.hidden_document_groups hdg WHERE hdg.document_id = d.id AND v_group_name IS NOT NULL AND hdg.group_name = v_group_name)
      AND (
        d.visibility_mode = 'immediate'
        OR (d.visibility_mode = 'delayed' AND v_run_date_from IS NOT NULL AND CURRENT_DATE >= (v_run_date_from - d.visible_days_before))
      )
    ORDER BY d.doc_type, d.priority, d.sort_order, d.created_at;
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
            FROM cp_scenes cs WHERE cs.run_id = p_run_id) s
    ),
    'larp_footer_text', (SELECT footer_text FROM larps WHERE id = p_larp_id)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_document_legacy_targets()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  has_players_all bool := 'players:all' = ANY(NEW.audience);
  has_cp_all bool := 'cp:all' = ANY(NEW.audience);
BEGIN
  IF has_players_all AND has_cp_all THEN
    NEW.target_type := 'vsichni';
    NEW.visible_to_cp := true;
  ELSIF has_players_all THEN
    NEW.target_type := 'vsichni';
    NEW.visible_to_cp := false;
  ELSIF has_cp_all THEN
    NEW.target_type := 'skupina';
    NEW.target_group := 'CP';
    NEW.visible_to_cp := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_document_legacy_targets ON public.documents;
CREATE TRIGGER trg_sync_document_legacy_targets
  BEFORE INSERT OR UPDATE OF audience ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_document_legacy_targets();
