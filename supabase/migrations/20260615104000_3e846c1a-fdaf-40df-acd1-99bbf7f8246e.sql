
CREATE OR REPLACE FUNCTION public.get_person_documents(p_person_id uuid)
 RETURNS TABLE(id uuid, title text, content text, doc_type document_type, target_type document_target, sort_order integer, priority integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_larp_id UUID;
    v_group_name TEXT;
    v_person_type person_type;
    v_run_date_from DATE;
BEGIN
    SELECT larp_id, group_name, type INTO v_larp_id, v_group_name, v_person_type FROM public.persons WHERE persons.id = p_person_id;

    SELECT date_from INTO v_run_date_from FROM public.runs WHERE larp_id = v_larp_id AND is_active = true LIMIT 1;

    RETURN QUERY
    SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order, d.priority
    FROM public.documents d
    WHERE d.larp_id = v_larp_id
      AND d.doc_type <> 'produkční'
      AND (
        -- explicit per-person
        (d.target_type = 'osoba' AND d.target_person_id = p_person_id)
        -- extra people list (works regardless of base target)
        OR (p_person_id = ANY (d.extra_target_person_ids))
        -- for non-CP also honor "everyone" and group targeting
        OR (v_person_type <> 'cp' AND d.target_type = 'vsichni')
        OR (v_person_type <> 'cp' AND d.target_type = 'skupina' AND d.target_group = v_group_name)
        OR (v_person_type <> 'cp' AND v_group_name = ANY (d.extra_target_group_names))
      )
      AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
      AND NOT EXISTS (SELECT 1 FROM public.hidden_document_groups hdg WHERE hdg.document_id = d.id AND v_group_name IS NOT NULL AND hdg.group_name = v_group_name)
      AND (
        d.visibility_mode = 'immediate'
        OR (d.visibility_mode = 'delayed' AND v_run_date_from IS NOT NULL AND CURRENT_DATE >= (v_run_date_from - d.visible_days_before))
      )
    ORDER BY d.doc_type, d.priority, d.sort_order, d.created_at;
END;
$function$;
