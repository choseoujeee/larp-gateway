
-- 1) Update verify_person_by_slug to accept optional p_larp_slug
CREATE OR REPLACE FUNCTION public.verify_person_by_slug(p_slug text, p_password text, p_larp_slug text DEFAULT NULL)
 RETURNS TABLE(person_id uuid, person_name text, person_type person_type, larp_id uuid, larp_name text, larp_slug text, larp_theme text, larp_motto text, group_name text, performer text, performance_times text, run_id uuid, run_name text, run_date_from date, run_date_to date, run_location text, run_address text, mission_briefing text, person_medailonek text, run_footer_text text, run_contact text, run_payment_account text, run_payment_amount text, run_payment_due_date date, person_paid_at timestamp with time zone, player_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.name, p.type, p.larp_id, l.name, l.slug, l.theme, l.motto, p.group_name,
        COALESCE(NULLIF(trim(rpa.player_name), ''), p.performer),
        p.performance_times,
        r.id, r.name, r.date_from, r.date_to, r.location, r.address, r.mission_briefing,
        p.medailonek, l.footer_text, r.contact, r.payment_account, r.payment_amount, r.payment_due_date, p.paid_at,
        rpa.player_name
    FROM public.persons p
    JOIN public.larps l ON p.larp_id = l.id
    LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
    LEFT JOIN public.run_person_assignments rpa ON rpa.person_id = p.id AND rpa.run_id = r.id
    WHERE p.slug = p_slug
      AND (p_larp_slug IS NULL OR l.slug = p_larp_slug)
      AND (
        (p.type = 'cp' AND (p.password_hash IS NULL OR trim(p.password_hash) = '') AND (COALESCE(trim(p_password), '') = ''))
        OR (p.type = 'cp' AND (p.password_hash IS NOT NULL AND trim(p.password_hash) != '') AND p.password_hash = crypt(p_password, p.password_hash))
        OR (p.type = 'postava' AND p.password_hash = crypt(p_password, p.password_hash))
      );
END;
$function$;

-- 2) Update get_portal_session_without_password to accept optional p_larp_slug
CREATE OR REPLACE FUNCTION public.get_portal_session_without_password(p_slug text, p_larp_slug text DEFAULT NULL)
 RETURNS TABLE(person_id uuid, person_name text, person_type person_type, larp_id uuid, larp_name text, larp_slug text, larp_theme text, larp_motto text, group_name text, performer text, performance_times text, run_id uuid, run_name text, run_date_from date, run_date_to date, run_location text, run_address text, mission_briefing text, person_medailonek text, run_footer_text text, run_contact text, run_payment_account text, run_payment_amount text, run_payment_due_date date, person_paid_at timestamp with time zone, player_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id              AS person_id,
    p.name            AS person_name,
    p.type            AS person_type,
    l.id              AS larp_id,
    l.name            AS larp_name,
    l.slug            AS larp_slug,
    l.theme           AS larp_theme,
    l.motto           AS larp_motto,
    p.group_name,
    p.performer,
    p.performance_times,
    r.id              AS run_id,
    r.name            AS run_name,
    r.date_from       AS run_date_from,
    r.date_to         AS run_date_to,
    r.location        AS run_location,
    r.address         AS run_address,
    r.mission_briefing,
    p.medailonek      AS person_medailonek,
    r.footer_text     AS run_footer_text,
    r.contact         AS run_contact,
    r.payment_account AS run_payment_account,
    r.payment_amount  AS run_payment_amount,
    r.payment_due_date AS run_payment_due_date,
    rpa.paid_at       AS person_paid_at,
    rpa.player_name   AS player_name
  FROM persons p
  JOIN larps l ON l.id = p.larp_id
  LEFT JOIN runs r ON r.id = p.run_id
  LEFT JOIN run_person_assignments rpa
    ON rpa.person_id = p.id AND rpa.run_id = r.id
  WHERE p.slug = p_slug
    AND (p_larp_slug IS NULL OR l.slug = p_larp_slug);
END;
$function$;

-- 3) Update get_portal_session_as_organizer to accept optional p_larp_slug
CREATE OR REPLACE FUNCTION public.get_portal_session_as_organizer(p_person_slug text, p_larp_slug text DEFAULT NULL)
 RETURNS TABLE(person_id uuid, person_name text, person_type person_type, larp_id uuid, larp_name text, larp_slug text, larp_theme text, larp_motto text, group_name text, performer text, performance_times text, run_id uuid, run_name text, run_date_from date, run_date_to date, run_location text, run_address text, mission_briefing text, person_medailonek text, run_footer_text text, run_contact text, run_payment_account text, run_payment_amount text, run_payment_due_date date, person_paid_at timestamp with time zone, player_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_access_portal_as_organizer(p_person_slug) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.name, p.type, p.larp_id, l.name, l.slug, l.theme, l.motto, p.group_name,
    COALESCE(NULLIF(trim(rpa.player_name), ''), p.performer),
    p.performance_times,
    r.id, r.name, r.date_from, r.date_to, r.location, r.address, r.mission_briefing,
    p.medailonek, l.footer_text, r.contact, r.payment_account, r.payment_amount, r.payment_due_date, p.paid_at,
    rpa.player_name
  FROM public.persons p
  JOIN public.larps l ON p.larp_id = l.id
  LEFT JOIN public.runs r ON r.larp_id = l.id AND r.is_active = true
  LEFT JOIN public.run_person_assignments rpa ON rpa.person_id = p.id AND rpa.run_id = r.id
  WHERE p.slug = p_person_slug
    AND (p_larp_slug IS NULL OR l.slug = p_larp_slug)
  LIMIT 1;
END;
$function$;

-- 4) Create larp_design_settings table
CREATE TABLE public.larp_design_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  larp_id uuid NOT NULL UNIQUE REFERENCES public.larps(id) ON DELETE CASCADE,
  primary_color text,
  primary_foreground text,
  secondary_color text,
  secondary_foreground text,
  accent_color text,
  accent_foreground text,
  background_color text,
  foreground_color text,
  card_color text,
  card_foreground text,
  border_color text,
  muted_color text,
  muted_foreground text,
  destructive_color text,
  destructive_foreground text,
  font_heading text,
  font_body text,
  button_radius text,
  sidebar_background text,
  sidebar_foreground text,
  custom_css text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.larp_design_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vlastník vidí design settings"
ON public.larp_design_settings FOR SELECT
USING (can_access_larp(larp_id));

CREATE POLICY "Vlastník vytváří design settings"
ON public.larp_design_settings FOR INSERT
WITH CHECK (can_access_larp(larp_id));

CREATE POLICY "Vlastník upravuje design settings"
ON public.larp_design_settings FOR UPDATE
USING (can_access_larp(larp_id));

CREATE POLICY "Vlastník maže design settings"
ON public.larp_design_settings FOR DELETE
USING (can_access_larp(larp_id));

CREATE TRIGGER update_larp_design_settings_updated_at
BEFORE UPDATE ON public.larp_design_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
