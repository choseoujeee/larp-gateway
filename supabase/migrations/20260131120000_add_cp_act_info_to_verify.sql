-- Rozšíření verify_person_access: group_name, performer, performance_times (Act Info CP), contact, footer_text (zápatí portálu)
CREATE OR REPLACE FUNCTION public.verify_person_access(
    p_access_token UUID,
    p_password TEXT
)
RETURNS TABLE (
    person_id UUID,
    person_name TEXT,
    person_type person_type,
    run_id UUID,
    larp_name TEXT,
    run_name TEXT,
    mission_briefing TEXT,
    group_name TEXT,
    performer TEXT,
    performance_times TEXT,
    run_contact TEXT,
    run_footer_text TEXT,
    larp_theme TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        p.run_id,
        l.name,
        r.name,
        r.mission_briefing,
        p.group_name,
        p.performer,
        p.performance_times,
        r.contact,
        r.footer_text,
        l.theme
    FROM public.persons p
    JOIN public.runs r ON p.run_id = r.id
    JOIN public.larps l ON r.larp_id = l.id
    WHERE p.access_token = p_access_token
    AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;
