-- Skrytí dokumentu před celou skupinou (group_name = persons.group_name)
CREATE TABLE IF NOT EXISTS public.hidden_document_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, group_name)
);

ALTER TABLE public.hidden_document_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vlastník vidí skryté dokumenty skupin" ON public.hidden_document_groups
FOR SELECT USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = hidden_document_groups.document_id AND public.is_larp_owner(d.larp_id)));

CREATE POLICY "Vlastník vytváří skryté dokumenty skupin" ON public.hidden_document_groups
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = hidden_document_groups.document_id AND public.is_larp_owner(d.larp_id)));

CREATE POLICY "Vlastník maže skryté dokumenty skupin" ON public.hidden_document_groups
FOR DELETE USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = hidden_document_groups.document_id AND public.is_larp_owner(d.larp_id)));

-- RPC get_person_documents: vyloučit dokumenty skryté i podle skupiny
DROP FUNCTION IF EXISTS public.get_person_documents(uuid);

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

    IF v_person_type = 'cp' THEN
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order, d.priority
        FROM public.documents d
        WHERE d.larp_id = v_larp_id
        AND d.target_type = 'osoba' AND d.target_person_id = p_person_id
        AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
        AND (v_group_name IS NULL OR NOT EXISTS (SELECT 1 FROM public.hidden_document_groups hdg WHERE hdg.document_id = d.id AND hdg.group_name = v_group_name))
        AND (
            d.visibility_mode = 'immediate'
            OR (d.visibility_mode = 'delayed' AND v_run_date_from IS NOT NULL AND CURRENT_DATE >= (v_run_date_from - d.visible_days_before))
        )
        ORDER BY d.doc_type, d.priority, d.sort_order, d.created_at;
    ELSE
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order, d.priority
        FROM public.documents d
        WHERE d.larp_id = v_larp_id
        AND (d.target_type = 'vsichni' OR (d.target_type = 'skupina' AND d.target_group = v_group_name) OR (d.target_type = 'osoba' AND d.target_person_id = p_person_id))
        AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
        AND (v_group_name IS NULL OR NOT EXISTS (SELECT 1 FROM public.hidden_document_groups hdg WHERE hdg.document_id = d.id AND hdg.group_name = v_group_name))
        AND (
            d.visibility_mode = 'immediate'
            OR (d.visibility_mode = 'delayed' AND v_run_date_from IS NOT NULL AND CURRENT_DATE >= (v_run_date_from - d.visible_days_before))
        )
        ORDER BY d.doc_type, d.priority, d.sort_order, d.created_at;
    END IF;
END;
$function$;
