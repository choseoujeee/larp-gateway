-- Přidat pole medailonek do tabulky persons
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS medailonek text;

-- Nejdřív smazat starou funkci
DROP FUNCTION IF EXISTS public.verify_person_by_slug(text, text);

-- Vytvořit novou verzi s medailonkem
CREATE OR REPLACE FUNCTION public.verify_person_by_slug(p_slug text, p_password text)
RETURNS TABLE(
    person_id uuid,
    person_name text,
    person_type person_type,
    larp_id uuid,
    larp_name text,
    larp_theme text,
    larp_motto text,
    group_name text,
    performer text,
    performance_times text,
    run_id uuid,
    run_name text,
    run_date_from date,
    run_date_to date,
    run_location text,
    run_address text,
    mission_briefing text,
    person_medailonek text
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
        l.motto,
        p.group_name,
        p.performer,
        p.performance_times,
        r.id,
        r.name,
        r.date_from,
        r.date_to,
        r.location,
        r.address,
        r.mission_briefing,
        p.medailonek
    FROM public.persons p
    JOIN public.larps l ON p.larp_id = l.id
    LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
    WHERE p.slug = p_slug 
      AND p.password_hash = crypt(p_password, p.password_hash);
END;
$function$;