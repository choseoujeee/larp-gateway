-- Nová RPC funkce pro ověření přístupu pomocí slugu postavy
-- Tato funkce ověří heslo přímo v tabulce persons (pro obecný přístup k LARPu)
CREATE OR REPLACE FUNCTION public.verify_person_by_slug(p_slug text, p_password text)
RETURNS TABLE(
    person_id uuid,
    person_name text,
    person_type person_type,
    larp_id uuid,
    larp_name text,
    larp_theme text,
    group_name text,
    performer text,
    performance_times text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        p.larp_id,
        l.name,
        l.theme,
        p.group_name,
        p.performer,
        p.performance_times
    FROM public.persons p
    JOIN public.larps l ON p.larp_id = l.id
    WHERE p.slug = p_slug 
      AND p.password_hash = crypt(p_password, p.password_hash);
END;
$function$;