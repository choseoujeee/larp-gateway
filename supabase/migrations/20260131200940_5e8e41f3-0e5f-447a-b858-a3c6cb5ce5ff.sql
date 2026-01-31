-- Add priority column to documents table
-- priority: 1 = prioritní (first), 2 = normální (middle), 3 = volitelné (last)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 2;

-- Update get_person_documents function to sort by priority, then sort_order, then created_at
DROP FUNCTION IF EXISTS public.get_person_documents(uuid);

CREATE OR REPLACE FUNCTION public.get_person_documents(p_person_id uuid)
RETURNS TABLE(
    id uuid, 
    title text, 
    content text, 
    doc_type document_type, 
    target_type document_target, 
    sort_order integer,
    priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_larp_id UUID;
    v_group_name TEXT;
    v_person_type person_type;
BEGIN
    SELECT larp_id, group_name, type INTO v_larp_id, v_group_name, v_person_type FROM public.persons WHERE persons.id = p_person_id;
    
    IF v_person_type = 'cp' THEN
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order, d.priority
        FROM public.documents d WHERE d.larp_id = v_larp_id
        AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
        ORDER BY d.doc_type, d.priority, d.sort_order, d.created_at;
    ELSE
        RETURN QUERY
        SELECT d.id, d.title, d.content, d.doc_type, d.target_type, d.sort_order, d.priority
        FROM public.documents d WHERE d.larp_id = v_larp_id
        AND (d.target_type = 'vsichni' OR (d.target_type = 'skupina' AND d.target_group = v_group_name) OR (d.target_type = 'osoba' AND d.target_person_id = p_person_id))
        AND NOT EXISTS (SELECT 1 FROM public.hidden_documents hd WHERE hd.document_id = d.id AND hd.person_id = p_person_id)
        ORDER BY d.doc_type, d.priority, d.sort_order, d.created_at;
    END IF;
END;
$$;