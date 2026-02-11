
-- Security definer RPC: return portal session data for a person by slug WITHOUT password check.
-- Used when navigating from CP portal to individual person/CP portals.
CREATE OR REPLACE FUNCTION public.get_portal_session_without_password(p_slug text)
RETURNS TABLE (
  person_id uuid,
  person_name text,
  person_type public.person_type,
  larp_id uuid,
  larp_name text,
  larp_slug text,
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
  person_medailonek text,
  run_footer_text text,
  run_contact text,
  run_payment_account text,
  run_payment_amount text,
  run_payment_due_date date,
  person_paid_at timestamptz,
  player_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE p.slug = p_slug;
END;
$$;
