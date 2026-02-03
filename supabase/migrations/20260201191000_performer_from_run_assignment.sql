-- Provázání performera: RPC vrací COALESCE(rpa.player_name, p.performer), aby "Hraje:" na portálu
-- a v běhu odpovídalo přiřazení z běhu (Přiřadit CP) i z CP (persons.performer).

DROP FUNCTION IF EXISTS public.verify_person_by_slug(text, text);

CREATE OR REPLACE FUNCTION public.verify_person_by_slug(p_slug text, p_password text)
 RETURNS TABLE(person_id uuid, person_name text, person_type person_type, larp_id uuid, larp_name text, larp_slug text, larp_theme text, larp_motto text, group_name text, performer text, performance_times text, run_id uuid, run_name text, run_date_from date, run_date_to date, run_location text, run_address text, mission_briefing text, person_medailonek text, run_footer_text text, run_contact text, run_payment_account text, run_payment_amount text, run_payment_due_date date, person_paid_at timestamp with time zone, player_name text)
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
        l.slug,
        l.theme,
        l.motto,
        p.group_name,
        COALESCE(NULLIF(trim(rpa.player_name), ''), p.performer),
        p.performance_times,
        r.id,
        r.name,
        r.date_from,
        r.date_to,
        r.location,
        r.address,
        r.mission_briefing,
        p.medailonek,
        l.footer_text,
        r.contact,
        r.payment_account,
        r.payment_amount,
        r.payment_due_date,
        p.paid_at,
        rpa.player_name
    FROM public.persons p
    JOIN public.larps l ON p.larp_id = l.id
    LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
    LEFT JOIN public.run_person_assignments rpa ON rpa.person_id = p.id AND rpa.run_id = r.id
    WHERE p.slug = p_slug
      AND (
        (p.type = 'cp' AND (p.password_hash IS NULL OR trim(p.password_hash) = '') AND (COALESCE(trim(p_password), '') = ''))
        OR
        (p.type = 'cp' AND (p.password_hash IS NOT NULL AND trim(p.password_hash) != '') AND p.password_hash = crypt(p_password, p.password_hash))
        OR
        (p.type = 'postava' AND p.password_hash = crypt(p_password, p.password_hash))
      );
END;
$function$;

DROP FUNCTION IF EXISTS public.get_portal_session_as_organizer(text);

CREATE OR REPLACE FUNCTION public.get_portal_session_as_organizer(p_person_slug text)
RETURNS TABLE(person_id uuid, person_name text, person_type person_type, larp_id uuid, larp_name text, larp_slug text, larp_theme text, larp_motto text, group_name text, performer text, performance_times text, run_id uuid, run_name text, run_date_from date, run_date_to date, run_location text, run_address text, mission_briefing text, person_medailonek text, run_footer_text text, run_contact text, run_payment_account text, run_payment_amount text, run_payment_due_date date, person_paid_at timestamp with time zone, player_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_portal_as_organizer(p_person_slug) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.type,
    p.larp_id,
    l.name,
    l.slug,
    l.theme,
    l.motto,
    p.group_name,
    COALESCE(NULLIF(trim(rpa.player_name), ''), p.performer),
    p.performance_times,
    r.id,
    r.name,
    r.date_from,
    r.date_to,
    r.location,
    r.address,
    r.mission_briefing,
    p.medailonek,
    l.footer_text,
    r.contact,
    r.payment_account,
    r.payment_amount,
    r.payment_due_date,
    p.paid_at,
    rpa.player_name
  FROM public.persons p
  JOIN public.larps l ON p.larp_id = l.id
  LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
  LEFT JOIN public.run_person_assignments rpa ON rpa.person_id = p.id AND rpa.run_id = r.id
  WHERE p.slug = p_person_slug
  LIMIT 1;
END;
$$;
